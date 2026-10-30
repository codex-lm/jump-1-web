import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,assertState,serialize} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {PORT_CHOICES,DEFAULT_ROUTINES} from '../src/core/actions.js';
import {market,isIllegal,contrabandCategory,CONTRABAND_LAW,currentWorld,activePatronOffer,PATRON_PAY_BONUS} from '../src/rules/trade.js';
import {WORKING_CAPITAL_FLOOR} from '../src/rules/economy.js';
import {portOrderEffect,WORLD_ORDERS,GUARD_INSPECTION_DM,GUARD_TOLL_FACTOR} from '../src/rules/orders.js';
import {createScene,resolveScene} from '../src/rules/scenes/index.js';
import {distance} from '../src/rules/subsector.js';
import {GOODS} from '../src/data/goods.js';
import {setLanguage,hasTranslation,t} from '../src/ui/i18n.js';

const ready=(seed,edition=5)=>reduce(createInitialState(seed,edition?{rulesEdition:edition}:{}),{t:'CHARGEN_DONE'});
function send(state,action){const next=reduce(state,action);assert.equal(next.lastError,null,`${action.t}: ${next.lastError}`);assertState(next);return next;}
function rejected(state,action,error){const before=serialize(state),next=reduce(state,action);assert.equal(next.lastError,error);assert.equal(serialize(state),before);return next;}
const vitality=state=>state.crew.filter(p=>p.alive&&p.active!==false).reduce((sum,p)=>sum+p.characteristics.END+p.characteristics.STR+p.characteristics.DEX,0);
const allHexes=Array.from({length:80},(_,i)=>`${String(Math.floor(i/10)+1).padStart(2,'0')}${String(i%10+1).padStart(2,'0')}`);
const emptyHex=state=>allHexes.find(hex=>!state.subsector.worlds.some(w=>w.hex===hex));
const adjacentWorld=state=>state.subsector.worlds.find(w=>distance(state.ship.hex,w.hex)===1);
const hold=state=>{for(let station=1;station<=5;station++)if(state.phase==='scene'&&!state.scene.choices[station])state=send(state,{t:'SCENE_CHOICE',station,choice:'hold'});return state;};
// Only the captain is hurt: everyone else is at their maximum, and the captain's END maximum leaves room to heal.
const wound=state=>{for(const c of state.crew)c.maxCharacteristics={...c.characteristics};const p=state.crew[0];p.maxCharacteristics.END=12;p.characteristics.END=0;p.wounded=true;return p;};

test('edition 5 heals the crew naturally while the medic works the hospital; edition 4 does not',()=>{
 for(const edition of [4,5]){
  let state=ready('v05-medic',edition);const p=wound(state);assert.equal(DEFAULT_ROUTINES[4],'hospital');assert.ok(state.crew.find(c=>c.station===4).alive);
  for(let i=0;i<3;i++)state=send(state,{t:'END_WEEK'});
  const captain=state.crew.find(c=>c.id===p.id);
  if(edition===5){assert.equal(captain.characteristics.END,3);assert.equal(captain.wounded,false);}
  else{assert.equal(captain.characteristics.END,0);assert.equal(captain.wounded,true);}
 }
});

test('edition 5: a week the medic treats the crew replaces natural recovery rather than adding to it',()=>{
 let state=ready('v05-medic-heal',5);wound(state);const before=vitality(state);
 state=send(state,{t:'PORT_ACTION',station:4,choice:'heal'});
 const treated=state.log.filter(e=>e.key==='log.heal').at(-1).params.points;assert.ok(treated>=1);
 state=send(state,{t:'END_WEEK'});
 assert.equal(vitality(state)-before,treated);
 // The following week, on the default routine, natural recovery is back.
 const next=vitality(state);state=send(state,{t:'END_WEEK'});assert.equal(vitality(state)-next,1);
});

test('edition 5 drops a queued drift once the ship is docked at a world with fuel; edition 4 still opens it',()=>{
 for(const edition of [4,5]){
  let state=ready('v05-drift-drop',edition);assert.ok(currentWorld(state));state.sceneQueue=[{type:'drift'}];
  state=send(state,{t:'END_WEEK'});
  if(edition===5){assert.equal(state.scene,null);assert.equal(state.phase,'port');assert.equal(state.sceneQueue.some(s=>s.type==='drift'),false);}
  else assert.equal(state.scene?.type,'drift');
 }
});

function misjumpIntoVoid(edition){
 for(let i=0;i<400;i++){
  let state=ready(`v05-void-${i}`,edition);const destination=adjacentWorld(state);if(!destination)continue;
  const engineer=state.crew.find(p=>p.station===2);engineer.skills={};engineer.characteristics.INT=1;state.ship.systems.jump=1;state.ship.fuelType='raw';
  for(const p of state.crew)p.mood=0;state.ship.fuel=20;state.portWeekComplete=true;
  const next=reduce(state,{t:'DEPART',hex:destination.hex,rushed:true});
  if(!next.lastError&&next.log.some(e=>e.key==='log.misjump')&&!currentWorld(next))return next;
 }
 return null;
}
test('edition 5 never queues a second drift scene after a misjump into empty space',()=>{
 const drifts=state=>[state.scene,...state.sceneQueue].filter(s=>s?.type==='drift').length;
 const v4=misjumpIntoVoid(4),v5=misjumpIntoVoid(5);assert.ok(v4);assert.ok(v5);
 assert.equal(drifts(v4),2);assert.equal(drifts(v5),1);
});

test('a deferred departure that can no longer jump is cancelled with a log line instead of failing the scene choice',()=>{
 for(const edition of [4,5]){
  let state=ready('v05-deferred',edition);const destination=adjacentWorld(state);assert.ok(destination);
  state.phase='scene';state.scene=createScene('patron',state);state.pendingDeparture={hex:destination.hex,rushed:false};state.ship.systems.jump=0;
  const hex=state.ship.hex,week=state.clock.week;state=hold(state);
  assert.equal(state.phase,'port');assert.equal(state.scene,null);assert.equal(state.pendingDeparture,null);assert.equal(state.ship.hex,hex);assert.equal(state.clock.week,week);
  const entry=state.log.find(e=>e.key==='log.departureCancelled');assert.ok(entry);assert.equal(entry.params.hex,destination.hex);assert.equal(entry.params.name,destination.name);
  // A jump that is still possible goes ahead exactly as before.
  let fine=ready('v05-deferred',edition);fine.phase='scene';fine.scene=createScene('patron',fine);fine.pendingDeparture={hex:destination.hex,rushed:false};
  fine=hold(fine);assert.equal(fine.log.some(e=>e.key==='log.departureCancelled'),false);assert.equal(fine.route.at(-1),fine.ship.hex);assert.equal(fine.stats.jumps,1);
 }
});

test('edition 5 refuses world services in empty space and END_WEEK routines skip them; edition 4 is unchanged',()=>{
 for(const edition of [4,5]){
  const state=ready('v05-void-port',edition);state.ship.hex=emptyHex(state);assert.equal(currentWorld(state),null);state.economy.credits=100000;
  const vacant=state.crew.find(p=>p.station===3);vacant.alive=false;
  if(edition===5){
   rejected(state,{t:'RECRUIT',station:3},'RECRUIT_UNAVAILABLE');
   for(const choice of WORLD_ORDERS){const station=Object.keys(PORT_CHOICES).find(s=>PORT_CHOICES[s].includes(choice));if(station==='3')continue;rejected(state,{t:'PORT_ACTION',station:Number(station),choice},'NO_WORLD');}
   state.routines[1]='patron';state.routines[4]='supplies';
   const next=send(state,{t:'END_WEEK'}),added=next.log.slice(state.log.length).map(e=>e.key);
   for(const key of ['log.hospital','log.supplies','log.patronFound','log.traffic'])assert.equal(added.includes(key),false,key);
   assert.ok(added.includes('log.maintenance')||added.includes('log.task'));assert.equal(next.clock.week,state.clock.week+1);
   assert.equal(next.economy.income.hospital,0);assert.equal(next.economy.expenses.repairs||0,0);
  }else{
   const recruited=send(state,{t:'RECRUIT',station:3});assert.ok(recruited.crew[2].alive);
   const shift=send(state,{t:'PORT_ACTION',station:4,choice:'hospital'});assert.ok(shift.economy.income.hospital>=500);
  }
 }
 // A populated world still allows recruiting on edition 5.
 const port=ready('v05-void-port',5);port.subsector.worlds.find(w=>w.hex===port.ship.hex).population=6;port.crew[2].alive=false;port.economy.credits=100000;
 assert.ok(send(port,{t:'RECRUIT',station:3}).crew[2].alive);
});

test('edition 5 contraband table follows the goods data at law 0 and law 9',()=>{
 const expected={'illicit-luxury-goods':'luxury','illicit-pharmaceuticals':'drugs','medical-research-material':'drugs','military-equipment':'weapons','personal-weapons-armor':'weapons'};
 const v5=ready('v05-law',5),v4=ready('v05-law',4);
 for(const good of GOODS){
  const category=expected[good.id]||null;assert.equal(contrabandCategory(good),category,good.id);assert.equal(!!good.illegal,!!category,good.id);
  for(const law of [0,9]){const world={law,tech:8};assert.equal(isIllegal(good,world,v5),law===9&&!!category,`${good.id} law ${law}`);}
 }
 // Thresholds per category.
 for(const [category,law] of Object.entries(CONTRABAND_LAW)){const good=GOODS.find(g=>contrabandCategory(g)===category);assert.equal(isIllegal(good,{law:law-1,tech:8},v5),false);assert.equal(isIllegal(good,{law,tech:8},v5),true);}
 // Older editions keep the id-based rule verbatim, quirks included.
 const goods=id=>GOODS.find(g=>g.id===id);
 for(const legacy of [v4,undefined]){
  assert.equal(isIllegal(goods('pharmaceuticals'),{law:9,tech:8},legacy),true);assert.equal(isIllegal(goods('illicit-luxury-goods'),{law:9,tech:8},legacy),false);
  assert.equal(isIllegal(goods('advanced-electronics'),{law:9,tech:8},legacy),true);assert.equal(isIllegal(goods('advanced-electronics'),{law:9,tech:12},legacy),false);
 }
 assert.equal(isIllegal(goods('pharmaceuticals'),{law:9,tech:8},v5),false);assert.equal(isIllegal(goods('advanced-electronics'),{law:9,tech:8},v5),false);
});

test('edition 5 market and customs use the new contraband rule',()=>{
 for(let i=0;i<60;i++){
  const v4=ready(`v05-contraband-${i}`,4),v5=ready(`v05-contraband-${i}`,5),world=currentWorld(v5);
  for(const [j,offer] of market(v5).goods.entries()){const good=GOODS.find(g=>g.id===offer.goodId);assert.equal(offer.illegal,isIllegal(good,world,v5));assert.equal(market(v4).goods[j].illegal,isIllegal(good,world));}
 }
 // Legal pharmaceuticals no longer trigger the forced customs inspection.
 let found=0;
 for(let i=0;i<80&&found<3;i++){
  const state=ready(`v05-pharma-${i}`,5),destination=state.subsector.worlds.find(w=>distance(state.ship.hex,w.hex)===1&&w.law>=3&&!['E','X'].includes(w.starport));if(!destination)continue;
  const good=GOODS.find(g=>g.id==='pharmaceuticals');state.crew.find(p=>p.station===2).skills.Engineering=4;
  state.cargo=[{id:'pharma',kind:'speculative',goodId:good.id,nameKey:good.nameKey,tons:5,basePrice:good.basePrice,buyPrice:good.basePrice,origin:'0000',boughtWeek:0,illegal:false}];
  // Edition 4 always inspects legal pharmaceuticals; on edition 5 they make no difference to the ordinary customs roll.
  const legacy=JSON.parse(JSON.stringify(state));legacy.meta.config.rulesEdition=4;const empty=JSON.parse(JSON.stringify(state));empty.cargo=[];
  const [a,b,c]=[legacy,state,empty].map(s=>reduce(s,{t:'DEPART',hex:destination.hex}));
  if([a,b,c].some(s=>s.lastError||s.ship.hex!==destination.hex))continue;
  const customs=s=>[s.scene,...s.sceneQueue].some(x=>x?.type==='customs');
  assert.equal(customs(a),true);assert.equal(customs(b),customs(c));found++;
 }
 assert.ok(found>=1);
});

test('edition 5 tops the starting treasury up to the floor and adds the advance to the final payment',()=>{
 let low=null,high=null;
 for(let i=0;i<60&&(!low||!high);i++){const seed=`v05-cash-${i}`,v4=ready(seed,4);if(v4.economy.credits<WORKING_CAPITAL_FLOOR)low??=seed;else high??=seed;}
 assert.ok(low);assert.ok(high);
 const a4=ready(low,4),a5=ready(low,5),advance=WORKING_CAPITAL_FLOOR-a4.economy.credits;
 assert.equal(a5.economy.credits,WORKING_CAPITAL_FLOOR);assert.equal(a5.economy.advance,advance);assert.equal(a5.economy.balloon,a4.economy.balloon+advance);
 assert.equal(a5.economy.debt,a4.economy.debt+advance);assert.equal(Object.hasOwn(a4.economy,'advance'),false);
 const entry=a5.log.find(e=>e.key==='log.workingCapitalAdvance');assert.deepEqual(entry.params,{amount:advance,balloon:a5.economy.balloon});
 assert.equal(a5.log.find(e=>e.key==='log.runStarted').params.credits,WORKING_CAPITAL_FLOOR);
 const b4=ready(high,4),b5=ready(high,5);
 assert.equal(b5.economy.credits,b4.economy.credits);assert.equal(b5.economy.balloon,b4.economy.balloon);assert.equal(b5.economy.advance,0);assert.equal(b5.log.some(e=>e.key==='log.workingCapitalAdvance'),false);
 const legacy=ready(low,null);assert.equal(legacy.economy.credits,a4.economy.credits);
});

test('edition 5 guard order: the watch carries into the next jump and is spent there; edition 4 keeps it inert',()=>{
 for(const edition of [4,5]){
  let state=ready('v05-guard',edition);state=send(state,{t:'END_WEEK'});
  assert.equal(state.ship.guard,edition===5,'default gunner routine guards');
  state.routines[3]='train';state=send(state,{t:'END_WEEK'});assert.equal(state.ship.guard,false);
 }
 let found=false;
 for(let i=0;i<80&&!found;i++){
  let state=ready(`v05-guard-${i}`,5);const destination=state.subsector.worlds.find(w=>distance(state.ship.hex,w.hex)===1&&w.law>=3);if(!destination)continue;
  const good=GOODS.find(g=>g.id==='illicit-pharmaceuticals');state.crew.find(p=>p.station===2).skills.Engineering=4;
  state.cargo=[{id:'contraband',kind:'speculative',goodId:good.id,nameKey:good.nameKey,tons:5,basePrice:good.basePrice,buyPrice:good.basePrice,origin:'0000',boughtWeek:0,illegal:true}];
  state=send(state,{t:'PORT_ACTION',station:3,choice:'guard'});const next=reduce(state,{t:'DEPART',hex:destination.hex});
  if(next.lastError||next.ship.hex!==destination.hex)continue;
  const customs=[next.scene,...next.sceneQueue].find(s=>s?.type==='customs');assert.ok(customs);assert.equal(customs.guarded,true);assert.equal(next.ship.guard,false);found=true;
 }
 assert.ok(found);
});

test('edition 5 guard adds +1 to inspection checks and halves the pirate toll; edition 4 ignores the flag',()=>{
 for(const edition of [4,5]){
  const situations=[false,true].map(guarded=>{const state=ready('v05-guard-inspect',edition);state.phase='scene';state.scene=createScene('customs',state,guarded?{guarded:true}:{});state.scene.choices={1:'comply',2:'hold',3:'hold',4:'hold',5:'paperwork'};resolveScene(state);return state.log.filter(e=>e.key==='log.task'&&['Comms','Admin'].includes(e.params.skill)).map(e=>e.roll.situation);});
  assert.equal(situations[0].length,2);assert.deepEqual(situations[1],situations[0].map(n=>n+(edition===5?GUARD_INSPECTION_DM:0)));
  const tolls=[false,true].map(guarded=>{const state=ready('v05-guard-toll',edition);const good=GOODS[0];state.cargo=[{id:'hold',kind:'speculative',goodId:good.id,nameKey:good.nameKey,tons:80,basePrice:good.basePrice,buyPrice:good.basePrice,origin:'0000',boughtWeek:0}];state.phase='scene';state.scene=createScene('pirate',state,{level:1,...(guarded?{guarded:true}:{})});state.scene.choices={1:'yield',2:'hold',3:'hold',4:'hold',5:'hold'};resolveScene(state);return {lost:80-(state.cargo[0]?.tons||0),log:state.log.some(e=>e.key==='log.guardToll')};});
  assert.ok(tolls[0].lost>=10);
  if(edition===5){assert.equal(tolls[1].lost,Math.ceil(tolls[0].lost*GUARD_TOLL_FACTOR));assert.equal(tolls[1].log,true);}
  else{assert.equal(tolls[1].lost,tolls[0].lost);assert.equal(tolls[1].log,false);}
 }
});

test('edition 5 steward orders add one offer per neighbour from a separate stream; edition 4 is unchanged',()=>{
 let checked=0;
 for(let i=0;i<20;i++){
  for(const edition of [4,5]){
   const state=ready(`v05-steward-${i}`,edition),neighbours=state.subsector.worlds.filter(w=>distance(state.ship.hex,w.hex)===1);if(!neighbours.length||!state.crew.find(p=>p.station===5).alive)continue;
   const base=market(state);
   for(const choice of ['freight','passengers']){
    const after=send(state,{t:'PORT_ACTION',station:5,choice}),boosted=market(after),list=choice==='freight'?'freight':'passengers',other=choice==='freight'?'passengers':'freight';
    assert.deepEqual(boosted.goods,base.goods);assert.deepEqual(boosted.contracts,base.contracts);assert.deepEqual(boosted[other],base[other]);
    assert.deepEqual(boosted[list].slice(0,base[list].length),base[list]);
    const extra=boosted[list].slice(base[list].length);
    if(edition===4){assert.equal(extra.length,0);continue;}
    assert.equal(extra.length,neighbours.length);assert.deepEqual(extra.map(o=>o.destination).sort(),neighbours.map(w=>w.hex).sort());
    assert.ok(extra.every(o=>o.steward&&o.id.endsWith('-steward')));
    assert.equal(after.log.at(-1).key,'log.stewardTraffic');
    // The offers are bookable this week and only at this port.
    const offer=extra[0],booked=choice==='freight'?send(after,{t:'BOOK_FREIGHT',id:offer.id}):send(after,{t:'BOOK_PASSENGER',id:offer.id,count:1});
    assert.equal(market(booked)[list].some(o=>o.id===offer.id),false);
    const elsewhere=market(after,neighbours[0].hex)[list];assert.equal(elsewhere.some(o=>o.steward),false);
    const later=send(after,{t:'END_WEEK'});assert.equal(market(later)[list].some(o=>o.steward),false);
    checked++;
   }
  }
 }
 assert.ok(checked>=10);
});

test('edition 5 patron and escort orders secure the first board contract at +25% pay for this port and week',()=>{
 let checked=0;
 for(let i=0;i<40&&checked<4;i++){
  for(const [station,choice,skill] of [[1,'patron','Carousing'],[3,'escort','Streetwise']]){
   const results=[4,5].map(edition=>{const state=ready(`v05-patron-${i}`,edition);const p=state.crew.find(c=>c.station===station);p.skills[skill]=4;p.characteristics.SOC=15;p.characteristics.INT=15;return state;});
   const board=market(results[1]).contracts;if(!board.length)continue;
   const [v4,v5]=results.map(state=>send(state,{t:'PORT_ACTION',station,choice}));
   if(!v5.patronOffer||!v4.patronOffer)continue;
   assert.equal(v4.patronOffer.pay,board[0].pay);assert.equal(v4.log.at(-1).params.amount,board[0].pay);
   assert.equal(v5.patronOffer.id,board[0].id);assert.equal(v5.patronOffer.pay,Math.round(board[0].pay*(1+PATRON_PAY_BONUS)));assert.equal(v5.patronOffer.basePay,board[0].pay);
   assert.equal(v5.log.filter(e=>e.key==='log.patronFound').at(-1).params.amount,v5.patronOffer.pay);
   assert.equal(activePatronOffer(v5),v5.patronOffer);assert.equal(activePatronOffer(v4),null);
   const accepted=send(v5,{t:'ACCEPT_CONTRACT',id:board[0].id});
   assert.equal(accepted.contracts.at(-1).pay,v5.patronOffer.pay);assert.equal(accepted.patronOffer,null);assert.equal(Object.hasOwn(accepted.contracts.at(-1),'hex'),false);
   rejected(accepted,{t:'ACCEPT_CONTRACT',id:board[0].id},'OFFER_UNAVAILABLE');
   assert.equal(send(v4,{t:'ACCEPT_CONTRACT',id:board[0].id}).contracts.at(-1).pay,board[0].pay);
   // The improved offer expires with the week.
   const later=send(v5,{t:'END_WEEK'});assert.equal(activePatronOffer(later),null);
   checked++;
  }
 }
 assert.ok(checked>=2);
});

test('portOrderEffect describes every port order for both rule sets, with catalog text in both languages',()=>{
 const v4=ready('v05-orders',4),v5=ready('v05-orders',5),space=ready('v05-orders',5);space.ship.hex=emptyHex(space);
 for(const [station,choices] of Object.entries(PORT_CHOICES))for(const choice of choices){
  const a=portOrderEffect(v4,choice),b=portOrderEffect(v5,choice),c=portOrderEffect(space,choice);
  assert.equal(b.station,Number(station));assert.equal(a.needsWorld,false);assert.equal(b.needsWorld,WORLD_ORDERS.includes(choice));assert.equal(c.available,!WORLD_ORDERS.includes(choice));assert.equal(b.available,true);
  assert.equal(a.inert,['guard','freight','passengers'].includes(choice));assert.equal(b.inert,false);
  for(const language of ['en','fr']){setLanguage(language);for(const key of [a.key,b.key]){assert.ok(hasTranslation(key),key);assert.ok(!t(key).includes('{'),key);}}
 }
 assert.equal(portOrderEffect(v5,'nonsense'),null);
 assert.deepEqual(portOrderEffect(v5,'guard').effects,{inspectionDM:GUARD_INSPECTION_DM,tollFactor:GUARD_TOLL_FACTOR});
 assert.equal(portOrderEffect(v5,'patron').effects.contractPayBonus,PATRON_PAY_BONUS);assert.equal(portOrderEffect(v4,'patron').effects.contractPayBonus,0);
 for(const language of ['en','fr']){setLanguage(language);
  for(const key of ['log.departureCancelled','log.workingCapitalAdvance','log.stewardTraffic','log.guardToll','error.NO_WORLD','chargen.advance'])assert.ok(hasTranslation(key),key);
  assert.ok(!t('log.workingCapitalAdvance',{amount:1,balloon:2}).includes('{'));assert.ok(!t('log.departureCancelled',{name:'X',hex:'0101'}).includes('{'));
 }
 setLanguage('en');
});
