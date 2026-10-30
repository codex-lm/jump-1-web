import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,serialize} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {PORT_CHOICES} from '../src/core/actions.js';
import {market,currentWorld,quoteSaleTotal} from '../src/rules/trade.js';
import {upcomingBill,monthlyCosts,settlementAmount,WORKING_CAPITAL_FLOOR} from '../src/rules/economy.js';
import {portOrderEffect} from '../src/rules/orders.js';
import {distance} from '../src/rules/subsector.js';
import {GOODS} from '../src/data/goods.js';
import {setLanguage,t,money} from '../src/ui/i18n.js';
import {hudStats,billView,plannedOrders,routineSkipped,repairCost,settlementOffer,signedMoney,forcedSaleValue} from '../src/ui/decision.js';
import {renderPort,standardWeekSummary} from '../src/ui/port.js';
import {renderPortObjective,bestSale} from '../src/ui/feedback.js';
import {paymentPanel,paymentOutcomes,bankPanel,settlementDialog} from '../src/ui/journal.js';
import {renderMarket,cargoManifest,updateMarketTotal,bestSeen} from '../src/ui/cargo.js';
import {renderDestination,destinationBusiness} from '../src/ui/navigation.js';
import {shipDetail,repairEstimate} from '../src/ui/ship.js';
import {chargenScreen,boardingAdvance} from '../src/ui/chargen.js';

const ready=(seed,edition=5)=>reduce(createInitialState(seed,edition?{rulesEdition:edition}:{}),{t:'CHARGEN_DONE'});
function send(state,action){const next=reduce(state,action);assert.equal(next.lastError,null,`${action.t}: ${next.lastError}`);return next;}
const operating=state=>Object.values(monthlyCosts(state)).reduce((a,b)=>a+b,0);
const noKeys=html=>{assert.doesNotMatch(html,/>undefined</);assert.doesNotMatch(html,/\b(?:hud|bank|settle|feedback|portOrder|standard|cargo|market|navigation|repair|chargen|port)\.[a-zA-Z]+\b(?![^<]*>)/);};
const adjacentWorld=state=>state.subsector.worlds.find(w=>distance(state.ship.hex,w.hex)===1);

test('HUD shows the full month-end bill with running costs and turns red when the treasury does not cover it',()=>{
 setLanguage('en');
 const state=ready('ui05-hud');state.economy.credits=165000;
 const bill=upcomingBill(state),html=hudStats(state);
 assert.equal(bill.total,state.economy.monthlyPayment+operating(state));
 assert.ok(html.includes(`${money(bill.total)} Cr`));
 assert.match(html,/data-hud="cash"><span>[^<]+<\/span><strong class="red">/);
 assert.ok(html.includes(money(operating(state))),'tooltip names the running costs');
 assert.ok(html.includes(t('hud.short',{amount:money(bill.total-165000)})));
 // The audit's case: 165,000 Cr looked covered but END_WEEKs to the bill leave the treasury negative.
 let next=state;while(next.clock.week<5)next=send(next,{t:'END_WEEK',routines:false});
 assert.ok(next.economy.credits<0);
 state.economy.credits=bill.total+1;assert.match(hudStats(state),/<strong class="brass">/);
 const deferred=structuredClone(state);deferred.economy.deferNext=true;
 assert.equal(billView(deferred).total,operating(deferred));assert.ok(hudStats(deferred).includes(t('hud.deferredShort')));
 setLanguage('fr');noKeys(hudStats(deferred));setLanguage('en');
});

test('from week 49 the HUD bill is the final settlement including arrears and deferred instalments',()=>{
 setLanguage('en');
 const state=ready('ui05-final');state.clock.week=49;state.economy.arrears=309000;state.economy.deferredBalance=154500;state.economy.credits=state.economy.balloon+100000;
 const view=billView(state),html=hudStats(state);
 assert.equal(view.final,true);assert.equal(view.week,52);assert.equal(view.weeks,3);
 assert.equal(view.total,state.economy.balloon+309000+154500);
 assert.ok(html.includes(t('hud.final')));assert.ok(html.includes(`${money(view.total)} Cr`));
 assert.match(html,/<strong class="red">/,'cash that covers only the balloon is not shown as enough');
});

test('payment notice states the result of each button exactly as the reducer settles it',()=>{
 setLanguage('en');
 let state=ready('ui05-payment');state.economy.credits=149300;
 while(state.phase!=='payment')state=send(state,{t:'STAY'});
 const view=paymentOutcomes(state),pending=state.economy.pendingPayment;
 assert.equal(view.operating,operating(state));
 const part=view.options.find(o=>o.choice==='partpay'),skip=view.options.find(o=>o.choice==='skip');
 assert.ok(!view.options.some(o=>o.choice==='pay'),'cannot pay in full');
 const afterPart=send(state,{t:'PAY',amount:part.amount}),afterSkip=send(state,{t:'SKIP_PAY'});
 assert.equal(afterPart.economy.credits,part.cash);assert.equal(afterPart.economy.arrears,part.arrears);
 assert.equal(afterSkip.economy.credits,skip.cash);assert.equal(afterSkip.economy.arrears,pending);
 assert.ok(afterPart.collector.pressure-state.collector.pressure>=part.pressure);
 assert.ok(afterSkip.collector.pressure-state.collector.pressure>=skip.pressure);
 const html=paymentPanel(state);
 assert.ok(html.includes(t('bank.partpay',{amount:money(part.amount)})));
 assert.ok(html.includes(t('bank.outcome.partpay',{cash:money(part.cash),arrears:money(part.arrears),pressure:part.pressure})));
 assert.ok(html.includes(t('bank.outcome.negative')));
 const rich=structuredClone(state);rich.economy.credits=400000;
 const pay=paymentOutcomes(rich).options.find(o=>o.choice==='pay');
 assert.equal(send(rich,{t:'PAY'}).economy.credits,pay.cash);
 setLanguage('fr');noKeys(paymentPanel(state));setLanguage('en');
});

test('early settlement is offered with a confirmation only on edition 5 when the treasury covers everything owed',()=>{
 setLanguage('en');
 const state=ready('ui05-settle');state.clock.week=20;state.economy.arrears=10000;
 const amount=settlementAmount(state);state.economy.credits=amount-1;
 assert.equal(settlementOffer(state).available,false);
 assert.doesNotMatch(bankPanel(state),/data-action="settle-prompt"/);
 assert.ok(bankPanel(state).includes(t('bank.settleShort',{amount:money(amount),short:money(1)})));
 assert.doesNotMatch(renderPortObjective(state),/settle-prompt/);
 state.economy.credits=amount+5000;
 const offer=settlementOffer(state),bank=bankPanel(state),objective=renderPortObjective(state),dialog=settlementDialog(state);
 assert.equal(offer.weeks,33);assert.equal(offer.cashAfter,5000);
 assert.ok(bank.includes(t('bank.settle',{weeks:33})));assert.match(objective,/data-action="settle-prompt"/);
 assert.ok(dialog.includes(`${money(amount)} Cr`));assert.match(dialog,/data-action="settle"/);assert.match(dialog,/data-action="close"/);
 assert.ok(dialog.includes(t('settle.end',{weeks:33,bonus:money(10000)})));
 const settled=send(state,{t:'SETTLE_LOAN'});
 assert.equal(settled.ending.type,'victory');assert.equal(settled.economy.credits,offer.cashAfter);assert.equal(settled.ending.weeksRemaining,offer.weeks);
 const legacy=ready('ui05-settle',4);legacy.economy.credits=1e9;
 assert.equal(settlementOffer(legacy),null);assert.doesNotMatch(bankPanel(legacy),/settle/);assert.doesNotMatch(renderPortObjective(legacy),/settle-prompt/);
 setLanguage('fr');noKeys(dialog.length?settlementDialog(state)+bankPanel(state):'');setLanguage('en');
});

test('the Trust advance is explained on the crew summary and at the first port, on edition 5 only',()=>{
 setLanguage('en');
 const fresh=createInitialState('ui05-23',{rulesEdition:5}),advance=boardingAdvance(fresh);
 assert.ok(advance>0);
 assert.ok(chargenScreen(fresh).includes(t('chargen.advance',{amount:money(advance)})));
 const state=reduce(fresh,{t:'CHARGEN_DONE'});
 assert.equal(state.economy.advance,advance);assert.equal(state.economy.credits,WORKING_CAPITAL_FLOOR);
 const port=renderPort(state);
 assert.ok(port.includes(t('port.advance',{amount:money(advance),floor:money(WORKING_CAPITAL_FLOOR),balloon:money(state.economy.balloon)})));
 const later=structuredClone(state);later.clock.week=2;assert.ok(!renderPort(later).includes(t('port.advance',{amount:money(advance),floor:money(WORKING_CAPITAL_FLOOR),balloon:money(state.economy.balloon)})));
 assert.equal(boardingAdvance(createInitialState('ui05-23',{rulesEdition:4})),0);
 assert.ok(!chargenScreen(createInitialState('ui05-23',{rulesEdition:4})).includes('chargen-advance'));
 setLanguage('fr');noKeys(chargenScreen(fresh)+renderPort(state));setLanguage('en');
});

test('port orders show their concrete effect, keep unapplied drafts and disable refusals before they happen',()=>{
 setLanguage('en');
 const state=ready('ui05-orders'),before=serialize(state);
 let html=renderPort(state);
 for(let station=1;station<=5;station++){
  const effect=portOrderEffect(state,state.routines[station]);
  assert.ok(html.includes(`aria-describedby="order-effect-${station}"`));
  assert.ok(html.includes(t(effect.key)),`station ${station}`);
 }
 html=renderPort(state,{drafts:{2:'parts'}});
 assert.match(html,/<option value="parts" selected/);assert.ok(html.includes(t(portOrderEffect(state,'parts').key)));
 const gunner=state.crew.find(p=>p.station===3);gunner.trainingDone=true;state.routines[3]='train';state.economy.deferred=true;
 html=renderPort(state);
 assert.match(html,/<option value="train" selected/,'a finished routine stays visible');
 assert.ok(html.includes(t('portOrder.unavailable.train')));
 assert.match(html,/<button data-action="order" data-station="3" disabled>/);
 assert.match(html,/<option value="bank"\s+disabled>/);
 assert.equal(serialize(ready('ui05-orders')),before);
 for(const stationChoices of Object.values(PORT_CHOICES))for(const choice of stationChoices)assert.ok(t(portOrderEffect(state,choice).key)!==portOrderEffect(state,choice).key);
 setLanguage('fr');noKeys(renderPort(state));setLanguage('en');
});

test('a standard week sends only changed drafts and lets the reducer guard every routine, from any panel',()=>{
 setLanguage('en');
 const state=ready('ui05-standard');state.routines[3]='train';state.crew.find(p=>p.station===3).trainingDone=true;
 const drafts={2:'parts',4:state.routines[4]};
 const planned=plannedOrders(state,drafts);
 assert.deepEqual(planned.filter(o=>o.send).map(o=>[o.station,o.choice]),[[2,'parts']]);
 assert.equal(planned.find(o=>o.station===3).skipped,true);
 let next=state;for(const o of planned.filter(o=>o.send))next=send(next,{t:'PORT_ACTION',by:o.station,station:o.station,choice:o.choice});
 next=send(next,{t:'END_WEEK',routines:true});
 assert.equal(next.clock.week,state.clock.week+1);assert.equal(next.routines[2],'parts');
 assert.ok(next.log.some(e=>e.key==='log.parts'));assert.ok(!next.log.some(e=>e.key==='log.training'||e.key==='log.trainingProgress'));
 const summary=standardWeekSummary(state,drafts);
 assert.match(summary,/data-action="standard-confirm"/);assert.ok(summary.includes(t('action.parts')));assert.ok(summary.includes(t('standard.skipped')));
 // routineSkipped mirrors the reducer guard for unaffordable and finished routines.
 const poor=structuredClone(state);poor.economy.credits=1500;poor.routines[2]='parts';
 assert.equal(routineSkipped(poor,2),true);assert.equal(routineSkipped(poor,1),false);
 const skipped=send(poor,{t:'END_WEEK'});assert.ok(!skipped.log.some(e=>e.key==='log.parts'));
 const draftInvalid=plannedOrders(poor,{2:'parts'});assert.equal(draftInvalid.find(o=>o.station===2).send,false);
});

test('a wounded crew prompts the medic order until treatment is drafted or given',()=>{
 setLanguage('en');
 const state=ready('ui05-wounded');const p=state.crew[0];p.characteristics.END=0;p.wounded=true;state.routines[4]='hospital';
 let html=renderPortObjective(state);
 assert.ok(html.includes(t('feedback.wounded',{names:p.name})));assert.match(html,/data-action="draft-order" data-station="4" data-choice="heal"/);
 assert.doesNotMatch(renderPortObjective(state,{drafts:{4:'heal'}}),/draft-order/);
 state.portActions[4]='hospital';assert.doesNotMatch(renderPortObjective(state),/draft-order/);
});

test('speculative cargo shows its purchase price and result, is sellable from the exchange and is the next move where it sells',()=>{
 setLanguage('en');
 let state=ready('ui05-trade');state.economy.credits=1000000;
 const offer=market(state).goods.find(g=>g.tons>=2);state=send(state,{t:'BUY',goodId:offer.goodId,tons:2});
 const lot=state.cargo.find(l=>l.kind==='speculative');
 let goods=renderMarket(state,'goods');
 assert.match(goods,/class="market-hold"/);assert.ok(goods.includes(t('cargo.bought',{price:money(lot.buyPrice)})));
 assert.equal(bestSale(state),null,'no advice to dump cargo at its own origin');
 const target=adjacentWorld(state);
 const away=structuredClone(state);away.ship.hex=target.hex;away.clock.week+=1;
 const quote=quoteSaleTotal(away,away.cargo[0]),result=quote.total-lot.buyPrice*2;
 goods=renderMarket(away,'goods');
 assert.match(goods,new RegExp(`data-action="sell" data-id="${lot.id}"`));
 assert.ok(goods.includes(t('cargo.result',{amount:signedMoney(result)})));
 assert.ok(cargoManifest(away,true).includes(result>=0?'trade-gain':'trade-loss'));
 const objective=renderPortObjective(away);
 assert.ok(objective.includes(t(result>=0?'feedback.sellHere':'feedback.sellHereLoss',{tons:'2',good:t(lot.nameKey),total:money(quote.total),result:signedMoney(result),loss:money(-result)})));
 assert.match(objective,/data-action="market" data-tab="goods"/);
 const sold=send(away,{t:'SELL',cargoId:lot.id,tons:2});assert.equal(sold.economy.credits-away.economy.credits,quote.total);
 away.ship.fuel=1;assert.doesNotMatch(renderPortObjective(away),/data-tab="goods"/,'fuel blocker keeps priority');
});

test('buy orders show the cash left against the next bill and update it live',()=>{
 setLanguage('en');
 const state=ready('ui05-cash');state.economy.credits=200000;
 const offer=market(state).goods.find(g=>g.tons>=1),bill=billView(state),html=renderMarket(state,'goods');
 const row=html.match(/<tr>.*?<\/tr>/gs).find(r=>r.includes(`qty-${offer.id}"`));
 const quantity=Math.min(10,offer.tons,Math.floor(200000/offer.buyPrice));
 assert.ok(row.includes(t('market.cashAfter',{cash:money(200000-quantity*offer.buyPrice),bill:money(bill.total),weeks:bill.weeks})));
 assert.ok(row.includes(`data-market-bill="${bill.total}"`));
 const cash={textContent:'',dataset:{marketCredits:'200000',marketBill:'178590',marketWeeks:'3'},classList:{value:false,toggle(name,on){this.value=on;}}};
 const output={textContent:''},button={disabled:false};
 const input={value:'2',max:'5',dataset:{marketUnitPrice:'15000',marketAvailable:'true'},matches:()=>true,setAttribute(){},
  closest:()=>({querySelector:s=>s==='button'?button:s==='[data-market-cash]'?cash:output})};
 updateMarketTotal(input);
 assert.equal(cash.textContent,t('market.cashAfter',{cash:money(170000),bill:money(178590),weeks:3}));assert.equal(cash.classList.value,true);
 input.value='0';updateMarketTotal(input);assert.equal(cash.classList.value,false);
});

test('the destination sheet sums the business on offer for that world and shows dated broker prices',()=>{
 setLanguage('en');
 const state=ready('ui05-dest'),before=serialize(state);
 const offers=market(state),target=state.subsector.worlds.find(w=>distance(state.ship.hex,w.hex)===1&&[...offers.freight,...offers.passengers].some(o=>o.destination===w.hex));
 assert.ok(target);
 const b=destinationBusiness(state,target.hex),freight=offers.freight.filter(o=>o.destination===target.hex);
 assert.equal(b.freight.count,freight.length);assert.equal(b.freight.pay,freight.reduce((n,o)=>n+o.pay,0));
 assert.equal(b.passengers.count,offers.passengers.filter(o=>o.destination===target.hex).reduce((n,o)=>n+o.count,0));
 let html=renderDestination(state,target.hex);
 assert.match(html,/class="destination-business"/);assert.match(html,/data-action="market" data-tab="(freight|passengers)"/);
 assert.doesNotMatch(renderDestination(state,state.ship.hex),/destination-business/);
 state.knownMarkets[target.hex]={week:1,goods:[{goodId:GOODS[0].id,buyPrice:1234,sellPrice:98765}]};
 html=renderDestination(state,target.hex);
 assert.ok(html.includes(t('navigation.knownPrices',{week:1})));assert.ok(html.includes(money(98765)));
 assert.deepEqual(bestSeen(state,GOODS[0].id),{hex:target.hex,week:1,sellPrice:98765});
 state.clock.week=8;assert.equal(bestSeen(state,GOODS[0].id),null,'stale prices are not advertised');
 assert.equal(serialize(ready('ui05-dest')),before);
 setLanguage('fr');noKeys(renderDestination(state,target.hex));setLanguage('en');
});

test('repairs and refuelling from the ship panel are priced before anything is charged',()=>{
 setLanguage('en');
 const state=ready('ui05-repair');
 assert.equal(repairCost(state).total,0);assert.match(renderPort(state),/data-action="repair-options" data-system="all"\s+disabled/);
 state.ship.hull=35;state.ship.structure=38;state.ship.systems.jump=1;state.economy.credits=1000000;
 const cost=repairCost(state);assert.equal(cost.total,5*1000+2*1500+2*5000);
 const estimate=repairEstimate(state,'all');
 assert.ok(estimate.includes(t('repair.confirm',{amount:money(cost.total)})));assert.match(estimate,/data-action="repair" data-system="all"/);
 assert.ok(renderPort(state).includes(t('ship.repairAll',{amount:money(cost.total)})));
 const world=currentWorld(state);
 if(['A','B','C'].includes(world.starport)){const repaired=send(state,{t:'REPAIR',system:'all'});assert.equal(state.economy.credits-repaired.economy.credits,cost.total);}
 assert.equal(repairCost(state,'jump').total,10000);
 const ship=shipDetail(state);
 assert.match(ship,/data-action="fuel-options"/);assert.doesNotMatch(ship,/data-action="refuel"/);assert.doesNotMatch(ship,/data-action="repair"/);
 state.economy.credits=100;assert.match(repairEstimate(state,'all'),/data-action="repair" data-system="all" disabled/);
 assert.ok(t('ship.repaircost').includes('1,500'));
});

test('the port bill line names the shortfall and the cargo forced-sale value',()=>{
 setLanguage('en');
 let state=ready('ui05-bill');state.economy.credits=1000000;
 const offer=market(state).goods.find(g=>g.tons>=1);state=send(state,{t:'BUY',goodId:offer.goodId,tons:1});
 state.economy.credits=50000;state.clock.week=3;
 const html=renderPortObjective(state),bill=billView(state),cargo=forcedSaleValue(state);
 assert.ok(cargo>0);assert.ok(html.includes(money(bill.total)));assert.ok(html.includes(t('feedback.billCargo',{amount:money(cargo)})));
 assert.match(html,/<li class="navigation-warning"><span>Bill week 4/);
 state.economy.credits=10000000;assert.doesNotMatch(renderPortObjective(state),/Bill week/);
});
