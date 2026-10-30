import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {upcomingBill} from '../src/rules/economy.js';
import {setLanguage,t,money} from '../src/ui/i18n.js';
import {billView,settlementOffer} from '../src/ui/decision.js';
import {paymentPanel,settlementDialog} from '../src/ui/journal.js';
import {renderMarket} from '../src/ui/cargo.js';
import {destinationBusiness} from '../src/ui/navigation.js';

const ready=(seed,edition=5)=>reduce(createInitialState(seed,edition?{rulesEdition:edition}:{}),{t:'CHARGEN_DONE'});
function send(state,action){const next=reduce(state,action);assert.equal(next.lastError,null,`${action.t}: ${next.lastError}`);return next;}

test('the market contracts tab shows the patron bonus pay that ACCEPT_CONTRACT will store',()=>{
 setLanguage('en');
 const state=ready('pat-0');state.crew[0].skills.Carousing=4;
 const found=send(state,{t:'PORT_ACTION',station:1,choice:'patron'}),offer=found.patronOffer;
 assert.ok(offer&&offer.pay>offer.basePay,'patron offer secured');
 const html=renderMarket(found,'contracts');
 assert.ok(html.includes(money(offer.pay)),'bonus pay shown');assert.ok(!html.includes(`>${money(offer.basePay)}<`),'base pay not shown');
 assert.ok(html.includes(t('market.patronBonus')));
 assert.equal(destinationBusiness(found,offer.destination).contracts.pay>=offer.pay,true);
 const accepted=send(found,{t:'ACCEPT_CONTRACT',id:offer.id});
 assert.equal(accepted.contracts.find(c=>c.id===offer.id).pay,offer.pay);
 assert.ok(!renderMarket(state,'contracts').includes(t('market.patronBonus')),'no badge without a patron offer');
 setLanguage('fr');assert.ok(renderMarket(found,'contracts').includes(t('market.patronBonus')));setLanguage('en');
});

test('the bill breakdown warns that maintenance may be waived when a maintenance order is due on an undamaged ship',()=>{
 setLanguage('en');
 let state=ready('maint-1');state.economy.credits=1e6;for(let i=0;i<3;i++)state=send(state,{t:'STAY'});
 const view=billView(state);
 assert.equal(view.total,upcomingBill(state).total,'total stays conservative');
 assert.equal(view.mayWaive,true);assert.ok(view.breakdown.includes(t('hud.maintenanceMayWaive')));
 const damaged=structuredClone(state);damaged.ship.systems.jump=2;assert.equal(billView(damaged).mayWaive,false);
 const other=structuredClone(state);other.routines[2]='parts';assert.equal(billView(other).mayWaive,false);
 const waived=structuredClone(state);waived.economy.maintenanceWaived=true;assert.equal(billView(waived).mayWaive,false);
});

test('early settlement after the last instalment is billed does not mention zero remaining instalments',()=>{
 for(const lang of ['en','fr']){
  setLanguage(lang);
  const state=ready('settle-final');state.clock.week=50;state.economy.billedMonths=12;state.economy.credits=2e6;
  const offer=settlementOffer(state);assert.equal(offer.instalments,0);
  const html=settlementDialog(state);
  assert.ok(html.includes(t('settle.bodyFinal',{amount:money(offer.amount)})));assert.doesNotMatch(html,/\b0 (?:remaining|mensualit)/);
  state.clock.week=20;state.economy.billedMonths=5;
  assert.ok(settlementDialog(state).includes(t('settle.body',{amount:money(settlementOffer(state).amount),instalments:settlementOffer(state).instalments})));
 }
 setLanguage('en');
});

test('a payment notice that interrupts a multi-week transit says the remaining weeks are not included',()=>{
 setLanguage('en');
 let state=ready('lost-weeks');while(state.phase!=='payment')state=send(state,{t:'STAY'});
 assert.doesNotMatch(paymentPanel(state),new RegExp(t('bank.lostWeeks',{weeks:2}).slice(0,20)));
 const lost=structuredClone(state);lost.clock.lostWeeksPending=2;
 assert.ok(paymentPanel(lost).includes(t('bank.lostWeeks',{weeks:2})));
 lost.clock.lostWeeksPending=1;assert.ok(paymentPanel(lost).includes(t('bank.lostWeeks',{weeks:1})));
 setLanguage('fr');assert.ok(paymentPanel(lost).includes('1 semaine après'));setLanguage('en');
});

test('review text fixes: guard toll, sale lines and status tags read correctly',()=>{
 setLanguage('en');
 assert.match(t('portOrder.effect.guard'),/half the usual tonnage/);
 assert.match(t('feedback.summaryCash',{amount:'+500'}),/^Treasury/);
 setLanguage('fr');
 assert.equal(t('standard.skipped'),'ignoré');
 assert.equal(t('feedback.sellHere',{tons:'1',good:'Électronique avancée',total:'4 000',result:'+500'}).replace(/[  ]/g,' '),'Ce port achète votre lot « Électronique avancée » (1 t) pour 4 000 Cr (+500 Cr par rapport au prix d’achat).');
 assert.match(t('portOrder.effect.market'),/^Indique/);
 assert.doesNotMatch(t('error.REFIT_UNAVAILABLE'),/nouveau voyage 0\.4/);
 setLanguage('en');
});
