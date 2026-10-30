import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,assertState,serialize,rulesAtLeast,CURRENT_RULES_EDITION} from '../src/core/state.js';
import {reduce,replay} from '../src/core/reducer.js';
import {validateAction,ACTION_TYPES} from '../src/core/actions.js';
import {createLocal,validateSave} from '../src/net/local.js';
import {market,quoteSale,quoteSaleTotal,saleUnitPrice,activeDemand} from '../src/rules/trade.js';
import {settlementAmount,upcomingBill,monthlyCosts,berthingCost} from '../src/rules/economy.js';
import {getScore,SETTLEMENT_WEEK_BONUS} from '../src/rules/score.js';
import {createScene,resolveScene,voyageRules} from '../src/rules/scenes/index.js';
import {TRAVEL_EVENTS} from '../src/rules/encounters.js';
import {installedRefits,refitPreview} from '../src/rules/ship.js';
import {generateSubsector} from '../src/rules/subsector.js';
import {departurePreview} from '../src/ui/navigation.js';
import {distance} from '../src/rules/subsector.js';
import {GOODS} from '../src/data/goods.js';
import {simulate} from './sim-economy.mjs';
import {setLanguage,hasTranslation,t} from '../src/ui/i18n.js';

const ready=(seed,edition=5,config={})=>reduce(createInitialState(seed,{...config,...(edition?{rulesEdition:edition}:{})}),{t:'CHARGEN_DONE'});
function send(state,action){const next=reduce(state,action);assert.equal(next.lastError,null,`${action.t}: ${next.lastError}`);assertState(next);return next;}
function rejected(state,action,error){const before=serialize(state),next=reduce(state,action);assert.equal(next.lastError,error);assert.equal(serialize(state),before);return next;}
function withStorage(fn){const previous=globalThis.localStorage,storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))};try{return fn();}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}}
const originLot=(state,price=.2,good=GOODS.find(g=>g.basePrice>=5000))=>({id:'origin-lot',kind:'speculative',goodId:good.id,nameKey:good.nameKey,tons:10,basePrice:good.basePrice,buyPrice:Math.round(good.basePrice*price),origin:state.ship.hex,boughtWeek:state.clock.week-1,illegal:false});

test('edition helper normalises integer editions 4..current and treats everything else as legacy',()=>{
 assert.equal(CURRENT_RULES_EDITION,5);
 for(const edition of [4,5])assert.equal(createInitialState('edition-norm',{rulesEdition:edition}).meta.config.rulesEdition,edition);
 for(const edition of [3,6,'5',4.5,null,undefined,0])assert.equal(Object.hasOwn(createInitialState('edition-norm',{rulesEdition:edition}).meta.config,'rulesEdition'),false,String(edition));
 const legacy=createInitialState('edition-norm'),v4=createInitialState('edition-norm',{rulesEdition:4}),v5=createInitialState('edition-norm',{rulesEdition:5});
 assert.deepEqual([rulesAtLeast(legacy,3),rulesAtLeast(legacy,4),rulesAtLeast(v4,4),rulesAtLeast(v4,5),rulesAtLeast(v5,4),rulesAtLeast(v5,5)],[true,false,true,false,true,true]);
 assert.equal(rulesAtLeast(v5.meta.config,5),true);assert.equal(rulesAtLeast({difficulty:'normal'},4),false);
 assert.deepEqual(v5.voyage,{stories:[]});assert.deepEqual(v5.demandDeliveries,{});assert.equal(Object.hasOwn(legacy,'voyage'),false);
 assert.deepEqual(v5.subsector,v4.subsector);assert.deepEqual(v5.crew,v4.crew);assert.deepEqual(v5.economy,v4.economy);
});

test('edition 5 keeps every 0.4.0 voyage, demand, refit and route rule identical to edition 4',()=>{
 for(let i=0;i<40;i++)assert.deepEqual(generateSubsector(`v05-routes-${i}`,{rulesEdition:5}),generateSubsector(`v05-routes-${i}`,{rulesEdition:4}));
 for(const event of [...TRAVEL_EVENTS,'breakdown']){
  const rows=[4,5].map(edition=>{const state=createInitialState(`v05-voyage-${event}`,{rulesEdition:edition});state.phase='scene';state.economy.credits=20000;
   state.scene=createScene(event==='breakdown'?'breakdown':'travel',state,{event,system:'jump'});state.ship.systems.jump=1;
   state.scene.choices={1:'hold',2:'repair',3:'hold',4:'heal',5:'hold'};const result=resolveScene(state);state.meta.config.rulesEdition=0;return JSON.stringify({result,state});});
  assert.equal(rows[1],rows[0],event);
 }
 for(let i=0;i<20;i++){
  const v4=ready(`v05-port-${i}`,4),v5=ready(`v05-port-${i}`,5);
  assert.equal(voyageRules(v5),true);
  assert.deepEqual(market(v5),market(v4));assert.deepEqual(activeDemand(v5),activeDemand(v4));
  assert.deepEqual(refitPreview(v5,'reserve'),refitPreview(v4,'reserve'));
  v4.ship.outfits=v5.ship.outfits=['reserve'];assert.deepEqual(installedRefits(v5),['reserve']);
  // The edition-4 automatic refuelling threshold (exact missing fuel cost) also applies to edition 5.
  for(const state of [v4,v5]){state.ship.fuel=28;state.economy.credits=1500;}
  const a=reduce(v4,{t:'END_WEEK'}),b=reduce(v5,{t:'END_WEEK'});
  assert.equal(b.ship.fuel,a.ship.fuel);assert.equal(b.economy.credits,a.economy.credits);
 }
});

test('resale at the origin port is capped at the purchase price on edition 5 only, and quotes equal what SELL pays',()=>{
 for(const edition of [4,5]){
  const state=ready('v05-resale',edition);state.clock.week=3;state.economy.credits=0;const lot=originLot(state);state.cargo=[lot];
  const expected=edition===5?lot.buyPrice:Math.round(lot.basePrice*.5);
  assert.equal(quoteSale(state,lot),expected);assert.equal(saleUnitPrice(state,lot),expected);
  const quote=quoteSaleTotal(state,lot),sold=send(state,{t:'SELL',cargoId:lot.id});
  assert.equal(quote.total,expected*lot.tons);assert.equal(sold.economy.credits,quote.total);
  // A lot bought above half its base price keeps the ordinary floor.
  const dear={...lot,buyPrice:lot.basePrice};assert.equal(quoteSale(state,dear),Math.round(lot.basePrice*.5));
  // Same-week resale is still refused, and imported lots are unaffected.
  rejected({...state,cargo:[{...lot,boughtWeek:3}]},{t:'SELL',cargoId:lot.id},'SAME_WEEK_RESALE');
  const imported={...lot,origin:state.subsector.worlds.find(w=>w.hex!==state.ship.hex).hex};
  const v4=ready('v05-resale',4);v4.clock.week=3;assert.equal(quoteSale(state,imported),quoteSale(v4,imported));
 }
});

test('payment-phase distress sales cap only lots bought at the current port, on edition 5 only',()=>{
 for(const edition of [4,5]){
  const state=ready('v05-distress',edition);state.clock.week=5;state.phase='payment';state.economy.pendingPayment=154500;state.economy.pendingKind='monthly';state.economy.credits=0;
  const local=originLot(state),imported={...originLot(state),id:'imported-lot',origin:state.subsector.worlds.find(w=>w.hex!==state.ship.hex).hex};
  state.cargo=[local,imported];
  const half=Math.round(local.basePrice*.5);
  assert.equal(saleUnitPrice(state,local),edition===5?local.buyPrice:half);assert.equal(saleUnitPrice(state,imported),half);
  for(const lot of [local,imported]){const quote=quoteSaleTotal(state,lot),sold=send(state,{t:'SELL',cargoId:lot.id});assert.equal(sold.economy.credits,quote.total);assert.equal(quote.bonus,0);}
 }
});

test('the same-port resale pump is closed on edition 5 and unchanged on edition 4',()=>{
 let checked=0;
 for(let i=0;i<120&&checked<6;i++){
  const seed=`v05-pump-${i}`,base4=ready(seed,4);base4.economy.credits=2000000;
  const offer=market(base4).goods.find(g=>g.tons>0&&!g.illegal&&g.buyPrice<g.basePrice*.5&&!/weapon/i.test(g.goodId));if(!offer)continue;
  const results={};
  for(const edition of [4,5]){
   let state=ready(seed,edition);state.economy.credits=2000000;const tons=Math.min(offer.tons,10);
   state=send(state,{t:'BUY',goodId:offer.goodId,tons});
   state=send(state,{t:'END_WEEK',routines:false});
   if(state.phase!=='port'||state.ship.hex!==base4.ship.hex)break;
   const lot=state.cargo.find(l=>l.kind==='speculative'&&l.goodId===offer.goodId),cash=state.economy.credits;
   state=send(state,{t:'SELL',cargoId:lot.id});results[edition]={gain:state.economy.credits-cash,cost:offer.buyPrice*tons,tons};
  }
  if(!results[4]||!results[5])continue;
  checked++;
  assert.equal(results[4].gain,Math.round(offer.basePrice*.5)*results[4].tons,seed);assert.ok(results[4].gain>results[4].cost,seed);
  assert.ok(results[5].gain<=results[5].cost,`${seed}: edition 5 resale never profits`);assert.equal(results[5].gain,offer.buyPrice*results[5].tons);
 }
 assert.ok(checked>=3,'enough natural cheap start-port lots were found');
});

test('SETTLE_LOAN is a validated captain action available only in edition 5 ports with enough credits',()=>{
 assert.ok(ACTION_TYPES.includes('SETTLE_LOAN'));assert.equal(validateAction({t:'SETTLE_LOAN'}),null);assert.equal(validateAction({t:'SETTLE_LOAN',by:9}),'INVALID_ACTOR');
 const v4=ready('v05-settle',4);v4.economy.credits=1e9;rejected(v4,{t:'SETTLE_LOAN'},'SETTLEMENT_UNAVAILABLE');
 const legacy=ready('v05-settle',0);legacy.economy.credits=1e9;rejected(legacy,{t:'SETTLE_LOAN'},'SETTLEMENT_UNAVAILABLE');
 const state=ready('v05-settle');const amount=settlementAmount(state);
 assert.equal(amount,12*state.economy.monthlyPayment+state.economy.balloon);
 state.economy.credits=amount-1;rejected(state,{t:'SETTLE_LOAN'},'NO_CREDITS');
 state.economy.credits=amount;rejected(state,{t:'SETTLE_LOAN',by:3},'CAPTAIN_ONLY');
 rejected({...state,phase:'payment'},{t:'SETTLE_LOAN'},'NOT_AT_PORT');rejected({...state,phase:'scene'},{t:'SETTLE_LOAN'},'NOT_AT_PORT');
 const settled=send(state,{t:'SETTLE_LOAN',by:'captain'});
 assert.equal(settled.economy.credits,0);assert.equal(settled.ending.type,'victory');assert.equal(settled.ending.settled,true);assert.equal(settled.ending.weeksRemaining,52);
 assert.equal(settled.phase,'ended');assert.equal(settled.economy.debt,0);assert.equal(settled.economy.paidMonths,12);
 assert.ok(settled.log.some(e=>e.key==='log.loanSettled'&&e.params.amount===amount&&e.params.weeks===52));
 assert.equal(reduce(settled,{t:'SETTLE_LOAN'}).lastError,'RUN_ENDED');
 for(const language of ['en','fr']){setLanguage(language);assert.ok(hasTranslation('log.loanSettled'));assert.ok(hasTranslation('error.SETTLEMENT_UNAVAILABLE'));assert.ok(!t('log.loanSettled',{amount:1,weeks:2}).includes('{'));}
 setLanguage('en');
});

test('settlement amount counts arrears, deferrals and exactly the instalments still to be billed',()=>{
 const state=ready('v05-amount');state.clock.week=10;state.economy.billedMonths=2;state.economy.paidMonths=1;state.economy.arrears=1000;state.economy.deferredBalance=500;
 const e=state.economy,amount=settlementAmount(state);assert.equal(amount,1000+500+10*e.monthlyPayment+e.balloon);
 state.economy.credits=amount+5;const settled=send(state,{t:'SETTLE_LOAN'});
 assert.equal(settled.economy.credits,5);assert.equal(settled.ending.weeksRemaining,43);assert.equal(settled.economy.paidMonths,11);
 assert.equal(settled.economy.arrears,0);assert.equal(settled.economy.deferredBalance,0);assert.equal(settled.economy.debt,0);
 assert.equal(settled.economy.expenses.balloon,e.balloon);assert.equal(settled.economy.expenses.mortgage,amount-e.balloon);
 const noBonus=getScore({...settled,ending:{...settled.ending,weeksRemaining:0}});
 assert.equal(settled.ending.score,noBonus+SETTLEMENT_WEEK_BONUS*43);
 // A month-end bill (paid or deferred by the bank) moves value between lines but never changes the settlement total.
 const paying=ready('v05-amount');paying.clock.week=4;paying.economy.credits=10000000;const before=settlementAmount(paying);
 const paid=send(paying,{t:'END_WEEK',routines:false});assert.equal(paid.economy.billedMonths,1);assert.equal(settlementAmount(paid),before-paying.economy.monthlyPayment);
 const deferring=structuredClone(paying);deferring.economy.deferNext=true;deferring.economy.deferred=true;
 const deferred=send(deferring,{t:'END_WEEK',routines:false});assert.equal(deferred.economy.billedMonths,1);assert.equal(deferred.economy.deferredBalance,paying.economy.monthlyPayment);
 assert.equal(settlementAmount(deferred),before);
 // After the twelfth bill only the final balance remains, exactly what week 52 will ask for.
 const late=ready('v05-amount');late.clock.week=50;late.economy.billedMonths=12;late.economy.arrears=777;late.economy.deferredBalance=1234;
 assert.equal(settlementAmount(late),late.economy.balloon+777+1234);assert.equal(upcomingBill(late).mortgage,settlementAmount(late));
});

test('upcoming bill mirrors the month-end charges exactly, including deferrals and the final balance',()=>{
 const state=ready('v05-bill');state.clock.week=3;
 const operating=Object.values(monthlyCosts(state)).reduce((a,b)=>a+b,0);
 assert.deepEqual(upcomingBill(state),{week:4,mortgage:state.economy.monthlyPayment,operating,total:state.economy.monthlyPayment+operating,final:false,deferred:false});
 for(const deferNext of [false,true]){
  const due=ready('v05-bill');due.clock.week=4;due.economy.credits=10000000;due.economy.deferNext=deferNext;
  const bill=upcomingBill(due),world=due.subsector.worlds.find(w=>w.hex===due.ship.hex),after=send(due,{t:'END_WEEK',routines:false});
  assert.equal(bill.deferred,deferNext);assert.equal(bill.mortgage,deferNext?0:due.economy.monthlyPayment);
  assert.equal(due.economy.credits-after.economy.credits,bill.total+berthingCost(world,7));
 }
 state.economy.deferNext=true;assert.equal(upcomingBill(state,8).deferred,false,'a deferral applies to the next bill only');
 state.clock.week=51;state.economy.arrears=10;state.economy.deferredBalance=20;
 assert.deepEqual(upcomingBill(state),{week:52,mortgage:state.economy.balloon+30,operating:0,total:state.economy.balloon+30,final:true,deferred:false});
 const destination=state.subsector.worlds.find(w=>distance(w.hex,state.ship.hex)===1);
 assert.deepEqual(departurePreview(state,destination.hex).bills,[{week:52,type:'final',payment:state.economy.balloon+30,operating:0}]);
});

test('edition 5 scores net worth: paying the balloon beats missing it by two credits',()=>{
 const finish=(edition,delta)=>{const state=ready('v05-score',edition);state.clock.week=52;state.economy.billedMonths=12;state.economy.paidMonths=12;state.economy.credits=state.economy.balloon+berthingCost(state.subsector.worlds.find(w=>w.hex===state.ship.hex),7)+delta;return send(state,{t:'END_WEEK',routines:false}).ending;};
 const win=finish(5,1),loss=finish(5,-1);
 assert.equal(win.type,'victory');assert.equal(loss.type,'defeat');assert.ok(win.score>loss.score,`${win.score} > ${loss.score}`);
 // Legacy editions keep their recorded scores byte-identical, including the old inversion.
 const oldWin=finish(4,1),oldLoss=finish(4,-1);assert.ok(oldLoss.score>oldWin.score);
 const repo=ready('v05-score');repo.economy.credits=1000000;repo.economy.arrears=200000;repo.ending={type:'repo',score:0};
 const owed=repo.economy.balloon+200000,v4repo=structuredClone(repo);v4repo.meta.config.rulesEdition=4;
 assert.equal(getScore(v4repo)-getScore(repo),Math.min(1000000,owed));
 assert.equal(getScore({...repo,ending:{type:'abandon',score:0}}),0);
});

test('a late repo negotiation moves arrears into the final balance on edition 5 instead of erasing them',()=>{
 for(const edition of [4,5]){
  const state=ready('v05-negotiate',edition);state.clock.week=50;state.economy.billedMonths=12;state.economy.arrears=463500;state.economy.arrearsMonths=3;state.phase='scene';
  state.collector.bailiff.type='courteous';const steward=state.crew[4];steward.skills.Admin=20;steward.characteristics.INT=15;steward.characteristics.EDU=15;
  state.scene=createScene('repo',state,{});state.scene.choices={1:'hold',2:'hold',3:'hold',4:'hold',5:'negotiate'};
  const result=resolveScene(state);assert.equal(result.closed,true);assert.ok(state.log.some(e=>e.key==='log.negotiated'));
  assert.equal(state.economy.arrears,0);
  assert.equal(state.economy.deferredBalance,edition===5?463500:0);
  if(edition===5)assert.equal(upcomingBill(state).mortgage,state.economy.balloon+463500);
 }
 // Earlier negotiations still fold the arrears into the remaining instalments on both editions.
 const early=ready('v05-negotiate');early.clock.week=40;early.economy.billedMonths=10;early.economy.arrears=100000;early.phase='scene';
 early.collector.bailiff.type='courteous';early.crew[4].skills.Admin=20;early.crew[4].characteristics.INT=15;
 const monthly=early.economy.monthlyPayment;early.scene=createScene('repo',early,{});early.scene.choices={1:'hold',2:'hold',3:'hold',4:'hold',5:'negotiate'};
 resolveScene(early);assert.equal(early.economy.monthlyPayment,Math.round(monthly*1.1)+50000);assert.equal(early.economy.deferredBalance,0);
});

test('edition 5 saves, including an early settlement, replay deterministically through the local save path',()=>withStorage(()=>{
 let done=0;
 for(let i=0;i<40&&done<2;i++){
  const run=simulate(`v05-replay-${i}`,{difficulty:'normal',rulesEdition:5},{risk:.9});
  assert.equal(run.config.rulesEdition,5);
  assert.equal(serialize(replay(run.seed,run.config,run.actions)),serialize(run.state));
  // Find the first port state from which the crew could settle, then settle there.
  let state=createInitialState(run.seed,run.config),index=0;
  for(;index<run.actions.length;index++){if(state.phase==='port'&&!state.ending&&state.economy.credits>=settlementAmount(state))break;state=reduce(state,run.actions[index]);}
  if(index>=run.actions.length)continue;
  const local=createLocal(run.seed,run.config,run.actions.slice(0,index));
  const result=local.send({t:'SETTLE_LOAN',by:'captain'});assert.equal(result.error,undefined);
  const save=local.exportSave();assert.equal(save.config.rulesEdition,5);assert.equal(validateSave(save),true);
  const reloaded=createLocal(save.seed,save.config,save.actions);
  assert.equal(serialize(reloaded.getState()),serialize(local.getState()));
  assert.equal(reloaded.getState().ending.settled,true);assert.ok(reloaded.getState().ending.weeksRemaining>0);
  done++;
 }
 assert.ok(done>=1,'at least one simulated edition 5 run could settle early');
}));
