import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState,assertState,serialize,deserialize } from '../src/core/state.js';
import { reduce,replay,sceneOptions } from '../src/core/reducer.js';
import { market,quoteSale,priceMultiplier,brokerRoll } from '../src/rules/trade.js';
import { createScene } from '../src/rules/scenes/index.js';
import { damageShip,damagePerson,cargoUsed,escapePods,healCrew } from '../src/rules/ship.js';
import { derive } from '../src/core/rng.js';
import { distance } from '../src/rules/subsector.js';
import { simulate,resolveAutomatically } from './sim-economy.mjs';
import { generateCharacter } from '../src/rules/chargen.js';
import { encounter } from '../src/rules/encounters.js';
import { advanceCollector } from '../src/rules/collector.js';
import { check } from '../src/rules/scenes/shared.js';
import { repoRecovery } from './repo-recovery.mjs';

function ready(seed='test'){return reduce(createInitialState(seed),{t:'CHARGEN_DONE'});}
test('state serialization, invalid actions and reducer immutability',()=>{const state=ready();const before=JSON.stringify(state);const invalid=reduce(state,{t:'BUY',goodId:'x',tons:-1});assert.equal(invalid.lastError,'INVALID_QUANTITY');assert.equal(JSON.stringify(state),before);assert.deepEqual({...invalid,lastError:null},state);assert.deepEqual(deserialize(serialize(state)),state);assert.equal(assertState(state),true);});
test('malformed lifepath payloads are rejected before generation',()=>{const state=createInitialState('invalid-chargen');for(const [payload,error]of [[{terms:'broken'},'INVALID_TERMS'],[{terms:0},'INVALID_TERMS'],[{terms:6},'INVALID_TERMS'],[{terms:2.5},'INVALID_TERMS'],[{career:'Unknown'},'INVALID_CAREER'],[{table:'Unknown'},'INVALID_TABLE'],[{gender:'Unknown'},'INVALID_GENDER'],[{name:''},'INVALID_NAME']]){const result=reduce(state,{t:'CHARGEN_PICK',index:0,...payload});assert.equal(result.lastError,error);assert.deepEqual({...result,lastError:null},state);}});
test('the single reroll survives subsequent career picks and express generation',()=>{const seed='keep-reroll';let state=createInitialState(seed);state=reduce(state,{t:'CHARGEN_ROLL',index:1});assert.equal(state.crew[1].rerollRevision,1);state=reduce(state,{t:'CHARGEN_PICK',index:1,career:'Merchant',terms:3,table:'service'});assert.equal(state.crew[1].rerollRevision,1);assert.deepEqual(state.crew[1].characteristics,generateCharacter(seed,1,{career:'Merchant',terms:3,table:'service',reroll:1}).characteristics);state=reduce(state,{t:'CHARGEN_EXPRESS'});assert.equal(state.crew[1].rerollRevision,1);assert.deepEqual(state.crew[1].characteristics,generateCharacter(seed,1,{reroll:1}).characteristics);assert.equal(reduce(state,{t:'CHARGEN_ROLL',index:2}).lastError,'REROLL_UNAVAILABLE');assert.equal(reduce(createInitialState(seed,{daily:true}),{t:'CHARGEN_ROLL',index:1}).lastError,'REROLL_UNAVAILABLE');});
test('replay is byte-identical, including a split replay',()=>{const seed='replay-seed';const actions=[{t:'CHARGEN_EXPRESS'},{t:'CHARGEN_DONE'},...Array.from({length:3},()=>({t:'END_WEEK'})),{t:'ABANDON'}];const a=replay(seed,{},actions),b=replay(seed,{},actions);assert.equal(JSON.stringify(a),JSON.stringify(b));const partial=replay(seed,{},actions.slice(0,3));assert.equal(JSON.stringify(actions.slice(3).reduce(reduce,partial)),JSON.stringify(a));});
test('market is deterministic, remaining stock tracks purchases, SRD prices bounded',()=>{for(let i=0;i<100;i++){let state=ready(`market-${i}`);assert.deepEqual(market(state),market(state));for(const offer of market(state).goods){assert.ok(offer.buyPrice>=offer.basePrice*.2&&offer.buyPrice<=offer.basePrice*2);const hex=state.subsector.worlds.find(w=>w.hex!==state.ship.hex).hex;const quoted=quoteSale(state,{goodId:offer.goodId},hex);assert.ok(quoted>=offer.basePrice*.4&&quoted<=offer.basePrice*4);}state.economy.credits=10000000;const offer=market(state).goods.find(g=>g.tons>0);const bought=reduce(state,{t:'BUY',goodId:offer.goodId,tons:1});if(!bought.lastError&&bought.cargo.length){assert.equal(market(bought).goods.find(g=>g.goodId===offer.goodId).tons,offer.tons-1);const sold=reduce(bought,{t:'SELL',cargoId:bought.cargo[0].id});assert.equal(sold.lastError,'SAME_WEEK_RESALE');}}assert.equal(priceMultiplier(-99),2);assert.equal(priceMultiplier(99),.2);assert.equal(priceMultiplier(99,'sell'),4);});
test('freight bookings cannot be duplicated or overflow the hold',()=>{let state=ready('freight');for(const offer of market(state).freight){const result=reduce(state,{t:'BOOK_FREIGHT',id:offer.id});if(!result.lastError){state=result;assert.ok(cargoUsed(state)<=82);assert.equal(reduce(state,{t:'BOOK_FREIGHT',id:offer.id}).lastError,'OFFER_UNAVAILABLE');}else assert.equal(result.lastError,'CARGO_FULL');}assertState(state);});
test('booking passengers, freight or a contract never rerolls remaining offers',()=>{
  for(const seed of ['market-stability-2','market-stability-3','market-stability-4']){
    const state=ready(seed),before=market(state);
    const bookings=[...before.passengers.filter(p=>p.class==='Middle').map(offer=>({t:'BOOK_PASSENGER',id:offer.id,count:1})),...before.freight.map(offer=>({t:'BOOK_FREIGHT',id:offer.id})),...before.contracts.map(offer=>({t:'ACCEPT_CONTRACT',id:offer.id}))];
    assert.ok(bookings.length>0);
    for(const action of bookings){
      const next=reduce(state,action);if(next.lastError)continue;
      const after=market(next);
      for(const group of ['goods','freight','passengers','contracts'])assert.deepEqual(after[group],before[group].filter(offer=>offer.id!==action.id),seed+' '+action.t+' '+group);
    }
  }
});
test('an absent or unconscious broker grants no skill or characteristic bonus',()=>{
  const state=ready('broker-availability'),broker=state.crew[4];broker.skills.Broker=4;broker.characteristics.INT=15;broker.characteristics.SOC=15;
  assert.equal(brokerRoll(state).skill,4);assert.equal(brokerRoll(state).dm,3);
  broker.active=false;const absent=brokerRoll(state);assert.equal(absent.skill,-3);assert.equal(absent.dm,0);
  broker.active=true;broker.unconscious=true;assert.deepEqual(brokerRoll(state),absent);
});
test('a paid-up bank sighting never seizes the player; real contact is opened only by pursuit',()=>{
  const state=ready('calm-bank-audit-7');state.ship.hex=state.subsector.bankHex;state.collector.hex=state.subsector.bankHex;state.collector.pressure=0;
  const world={...state.subsector.worlds.find(w=>w.hex===state.ship.hex),starport:'A',naval:true,zone:'Green',pirate:false,law:5};
  assert.deepEqual(encounter(state,world,()=>.999),{type:'repo-sighting'});
  assert.equal(advanceCollector(state),false);assert.equal(state.collector.mode,'docked');
  state.collector.pressure=2;state.collector.lastKnownHex=state.ship.hex;assert.equal(advanceCollector(state),true);
  state.sceneQueue=[{type:'repo'}];assert.equal(encounter(state,world,()=>.999),null);
});
test('jump requires fuel, drive and an adjacent inhabited world',()=>{const state=ready();const dest=state.subsector.worlds.find(w=>distance(w.hex,state.ship.hex)===1);assert.ok(dest);const noFuel={...state,ship:{...state.ship,fuel:0}};assert.equal(reduce(noFuel,{t:'DEPART',hex:dest.hex}).lastError,'NO_FUEL_PORT');const noJump={...state,ship:{...state.ship,systems:{...state.ship.systems,jump:0}}};assert.equal(reduce(noJump,{t:'DEPART',hex:dest.hex}).lastError,'JUMP_OFFLINE');const bad=state.subsector.worlds.find(w=>distance(w.hex,state.ship.hex)>1);assert.equal(reduce(state,{t:'DEPART',hex:bad.hex}).lastError,'DESTINATION_UNREACHABLE');});
test('monthly invoice can be partly paid or skipped and creates pursuit pressure',()=>{let state=ready();state.clock.week=4;state.economy.credits=1000;state=reduce(state,{t:'STAY'});assert.equal(state.phase,'payment');assert.equal(state.clock.week,5);assert.equal(state.economy.pendingPayment,154500);state=reduce(state,{t:'SKIP_PAY'});assert.equal(state.economy.arrears,154500);assert.ok(state.collector.pressure>=1);assert.equal(state.economy.billedMonths,1);assert.ok(state.log.some(l=>l.key==='log.missedPayment'));});
test('scene rounds are independent of choice message arrival order',()=>{const base=ready();base.phase='scene';base.scene=createScene('pirate',base);const selections={1:'evade',2:'overload',3:'fire',4:'heal',5:'bluff'};const forward=[1,2,3,4,5].reduce((s,n)=>reduce(s,{t:'SCENE_CHOICE',station:n,choice:selections[n]}),base);const reverse=[5,4,3,2,1].reduce((s,n)=>reduce(s,{t:'SCENE_CHOICE',station:n,choice:selections[n]}),base);assert.equal(JSON.stringify(forward),JSON.stringify(reverse));});
test('surrender produces repossession; every principal ending is reachable',()=>{let repo=ready();repo.phase='scene';repo.scene=createScene('repo',repo);for(let station=1;station<=5;station++)repo=reduce(repo,{t:'SCENE_CHOICE',station,choice:station===1?'surrender':'hold'});assert.equal(repo.ending?.type,'repo');let rich=ready();rich.clock.week=52;rich.economy.credits=5000000;rich=reduce(rich,{t:'STAY'});assert.equal(rich.ending?.type,'victory');let poor=ready();poor.clock.week=52;poor.economy.credits=0;poor=reduce(poor,{t:'STAY'});assert.equal(poor.ending?.type,'defeat');const wreck=ready();damageShip(wreck,100,derive('damage'));const ended=reduce(wreck,{t:'PORT_ACTION',station:1,choice:'rest'});assert.ok(['destroyed','stranded'].includes(ended.ending?.type));});
test('personal damage applies END then physical characteristics; healing cannot resurrect',()=>{const state=ready();const person=state.crew[0];damagePerson(person,1000,derive('injury'));assert.equal(person.alive,false);assert.equal(person.characteristics.END,0);assert.equal(person.characteristics.STR,0);assert.equal(person.characteristics.DEX,0);});
test('discharged crew cannot be injured, healed, escape, or contribute a bond bonus',()=>{
  const state=ready('inactive-crew'),absent=state.crew[4];absent.active=false;absent.characteristics.END=1;absent.characteristics.DEX=15;absent.skills['Vacc Suit']=4;
  const snapshot=JSON.stringify(absent);assert.equal(damagePerson(absent,100,derive('inactive-damage')),0);healCrew(state,20);assert.equal(JSON.stringify(absent),snapshot);
  for(let i=0;i<4;i++)state.crew[i].alive=false;assert.equal(escapePods(state),0);assert.equal(absent.alive,true);
  const bonds=ready('ghost-bond');bonds.phase='scene';bonds.scene=createScene('pirate',bonds);bonds.bonds=[{a:bonds.crew[0].id,b:bonds.crew[1].id,type:'comrades'}];
  const active=check(bonds,1,'Pilot',{label:'ghost-check'});bonds.crew[1].active=false;const inactive=check(bonds,1,'Pilot',{label:'ghost-check'});assert.equal(active.situation,inactive.situation+1);
  const injuries=ready('inactive-injury');for(let i=1;i<4;i++)injuries.crew[i].alive=false;injuries.crew[4].active=false;
  const exile=JSON.stringify(injuries.crew[4]),oldEnd=injuries.crew[0].characteristics.END,rng=()=>.999;rng.pick=values=>values.at(-1);
  damageShip(injuries,1,rng);assert.equal(JSON.stringify(injuries.crew[4]),exile);assert.ok(injuries.crew[0].characteristics.END<oldEnd);
});
test('a new recruit does not inherit the previous occupant’s bonds',()=>{
  const state=ready('ghost-audit'),old=state.crew[1],oldBonds=state.bonds.filter(bond=>bond.a===old.id||bond.b===old.id);assert.ok(oldBonds.length>0);
  old.alive=false;const replaced=reduce(state,{t:'RECRUIT',station:2});assert.equal(replaced.lastError,null);assert.equal(replaced.crew[1].alive,true);
  assert.equal(replaced.bonds.some(bond=>bond.a===old.id||bond.b===old.id),false);assert.equal(replaced.bonds.length,state.bonds.length-oldBonds.length);
});
test('Diligence can be defeated after round six through a natural campaign without injected funds or damage',()=>{
  const result=repoRecovery();assert.equal(result.won,true);assert.ok(result.maxRound>6&&result.maxRound<=12);assert.equal(result.state.ending,null);assert.ok(result.state.ship.structure>0);
  assert.equal(result.state.collector.pressure,0);assert.equal(result.state.collector.replacementWeek,result.state.clock.week+12);
  assert.ok(result.state.log.some(entry=>entry.key==='log.enemyDefeated'&&entry.params.type==='repo'));
  assert.equal(JSON.stringify(replay(result.seed,result.config,result.actions)),JSON.stringify(result.state));
});
test('hostile combat retains negotiation and flight; talking requires a real ceasefire',()=>{
  const base=ready('repo-ceasefire');base.phase='scene';base.scene=createScene('repo',base);base.scene.enemy.hostile=true;base.collector.bailiff.type='courteous';
  assert.ok(sceneOptions(base.scene,base,1).some(option=>option.id==='flee'));
  assert.ok(sceneOptions(base.scene,base,5).some(option=>option.id==='negotiate'));
  let peaceful=base;
  for(let station=1;station<=5;station++)peaceful=reduce(peaceful,{t:'SCENE_CHOICE',station,choice:station===5?'negotiate':'hold'});
  assert.equal(peaceful.lastError,null);assert.equal(peaceful.log.some(entry=>entry.key==='log.enemyTask'),false);
  let shooting=base;
  for(let station=1;station<=5;station++)shooting=reduce(shooting,{t:'SCENE_CHOICE',station,choice:station===3?'fire':station===5?'negotiate':'hold'});
  assert.equal(shooting.lastError,null);assert.ok(shooting.log.some(entry=>entry.key==='log.ceasefireRequired'));
  assert.ok(shooting.log.some(entry=>entry.key==='log.enemyTask'));
});
test('normal port plus jump takes two weeks; completed routines are not charged twice',()=>{const base=ready('port-clock');base.crew[1].skills.Engineering=4;base.crew[1].characteristics.INT=15;const hex=base.subsector.worlds.find(w=>distance(w.hex,base.ship.hex)===1).hex;const direct=reduce(base,{t:'DEPART',hex});assert.equal(direct.clock.completedWeeks,2);assert.equal(direct.clock.week,3);let routine=reduce(base,{t:'END_WEEK'});assert.equal(routine.portWeekComplete,true);routine=reduce(routine,{t:'DEPART',hex});assert.equal(routine.clock.completedWeeks,2);assert.equal(routine.clock.week,3);});
test('quick stop takes one jump week and disallows port work or trade',()=>{const base=ready('quick-clock');base.crew[1].skills.Engineering=4;base.crew[1].characteristics.INT=15;base.arrivalWeek=base.clock.week;const hex=base.subsector.worlds.find(w=>distance(w.hex,base.ship.hex)===1).hex;const quick=reduce(base,{t:'QUICK_STOP',hex});assert.equal(quick.clock.completedWeeks,1);assert.equal(quick.clock.week,2);const worked=reduce(base,{t:'PORT_ACTION',station:1,choice:'rest'});const refused=reduce(worked,{t:'QUICK_STOP',hex});assert.equal(refused.lastError,'QUICK_STOP_UNAVAILABLE');assert.equal(refused.clock.week,1);});
test('refined purge drains the tank, costs a full 30 tonnes and changes fuel quality',()=>{const state=ready('fuel-purge');state.ship.fuel=30;state.ship.fuelType='raw';const before=state.economy.credits;const purged=reduce(state,{t:'REFUEL',type:'refined',purge:true});assert.equal(purged.lastError,null);assert.equal(purged.ship.fuel,30);assert.equal(purged.ship.fuelType,'refined');assert.equal(purged.economy.credits,before-15000);assert.equal(state.ship.fuelType,'raw');assert.equal(reduce(state,{t:'REFUEL',type:'refined',purge:'yes'}).lastError,'INVALID_FUEL');state.ship.fuel=5;const topped=reduce(state,{t:'REFUEL',type:'refined'});assert.equal(topped.ship.fuelType,'raw');assert.equal(topped.ship.fuel,30);assert.equal(topped.economy.credits,before-12500);});
test('an invoice during the port week pauses departure and resumes the jump only once',()=>{let state=ready('pending-departure');state.crew[1].skills.Engineering=4;state.crew[1].characteristics.INT=15;state.clock.week=4;state.economy.credits=0;const origin=state.ship.hex,hex=state.subsector.worlds.find(w=>distance(w.hex,origin)===1).hex;state=reduce(state,{t:'DEPART',hex});assert.equal(state.phase,'payment');assert.equal(state.ship.hex,origin);assert.equal(state.clock.week,5);assert.equal(state.pendingDeparture.hex,hex);state=reduce(state,{t:'SKIP_PAY'});if(state.scene?.type==='repo')state=resolveAutomatically(state);assert.equal(state.ship.hex,hex);assert.equal(state.clock.completedWeeks,5);assert.equal(state.clock.week,6);assert.equal(state.pendingDeparture,null);});
test('52-week scripted campaign reaches an ending, retains a chronicle and replays exactly',()=>{let result;for(let i=0;i<20;i++){const run=simulate(`campaign-${i}`);if(run.state.clock.completedWeeks===52){result=run;break;}}assert.ok(result,'at least one of 20 deterministic trade routes reaches week52');assert.ok(result.state.ending);assert.equal(result.state.clock.week,52);assert.ok(result.state.log.length<=400);assert.ok(result.state.milestones.length<=60);assert.equal(result.state.milestones.filter(e=>e.key==='log.jump').length,1);assert.ok(result.state.milestones.some(e=>e.key==='log.runStarted'));assert.ok(result.state.milestones.some(e=>e.key==='log.ending'));assert.ok(Buffer.byteLength(JSON.stringify(result.state))<150000);assertState(result.state);assert.equal(JSON.stringify(replay(result.seed,{difficulty:'normal'},result.actions)),JSON.stringify(result.state));});
