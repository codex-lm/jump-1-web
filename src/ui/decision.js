import {t,esc,money} from './common.js';
import {rulesAtLeast} from '../core/state.js';
import {DEFAULT_ROUTINES} from '../core/actions.js';
import {COSTS,upcomingBill,monthlyCosts,settlementAmount} from '../rules/economy.js';
import {saleUnitPrice,currentWorld} from '../rules/trade.js';
import {SYSTEMS,fuelCapacity} from '../rules/ship.js';
import {WORLD_ORDERS} from '../rules/orders.js';
import {actor} from '../rules/scenes/shared.js';

// Display-only previews of what the reducer will do. They read state and never change it; the reducer stays the authority.

export function signedMoney(value){return `${value>0?'+':value<0?'−':''}${money(Math.abs(value))}`;}

/** The next month-end bill as the HUD shows it: total incl. running costs, and the week-52 settlement incl. arrears and deferrals. */
export function billView(state){
 const bill=upcomingBill(state),costs=monthlyCosts(state),e=state.economy,weeks=Math.max(0,bill.week-state.clock.week),short=Math.max(0,bill.total-e.credits);
 const breakdown=bill.final?t('hud.billBreakdownFinal',{balloon:money(e.balloon),arrears:money(e.arrears),deferred:money(e.deferredBalance)}):t(bill.deferred?'hud.billBreakdownDeferred':'hud.billBreakdown',{week:bill.week,mortgage:money(bill.mortgage),operating:money(bill.operating),maintenance:money(costs.maintenance),support:money(costs.support),salaries:money(costs.salaries)});
 return {...bill,weeks,short,breakdown};
}

/** Treasury and next-payment HUD cells. Cash is red whenever it does not cover the full bill. */
export function hudStats(state){
 const bill=billView(state),label=t(bill.final?'hud.final':'hud.due');
 return `<div class="top-stat" data-hud="cash"><span>${esc(t('hud.cash'))}</span><strong class="${bill.short?'red':'brass'}">${money(state.economy.credits)} Cr</strong>${bill.short?`<span class="sr-only">${esc(t('hud.short',{amount:money(bill.short)}))}</span>`:''}</div><div class="top-stat hud-bill" data-hud="bill" title="${esc(bill.breakdown)}"><span>${esc(label)} · ${esc(t('hud.inweeks',{weeks:bill.weeks}))}</span><strong class="${bill.short?'red':''}">${money(bill.total)} Cr</strong>${bill.deferred?`<small class="hud-note">${esc(t('hud.deferredShort'))}</small>`:''}<span class="sr-only">${esc(bill.breakdown)}</span></div>`;
}

/** Edition 5 early settlement, mirroring the SETTLE_LOAN reducer case. */
export function settlementOffer(state){
 if(!rulesAtLeast(state,5)||state.ending)return null;
 const e=state.economy,amount=settlementAmount(state);
 return {amount,weeks:53-state.clock.week,instalments:Math.max(0,12-e.billedMonths),short:Math.max(0,amount-e.credits),available:state.phase==='port'&&e.credits>=amount,cashAfter:e.credits-amount};
}

/** What speculative cargo would fetch here if it had to be sold during a payment notice. */
export function forcedSaleValue(state){const payment={...state,phase:'payment'};return state.cargo.filter(l=>l.kind==='speculative').reduce((sum,l)=>sum+saleUnitPrice(payment,l)*l.tons,0);}

/** Mirrors the REPAIR reducer case. */
export function repairCost(state,system='all'){
 const s=state.ship,all=system==='all',world=currentWorld(state);
 const hull=all||system==='hull'?{points:40-s.hull,amount:(40-s.hull)*COSTS.hull}:{points:0,amount:0};
 const structure=all||system==='structure'?{points:40-s.structure,amount:(40-s.structure)*COSTS.structure}:{points:0,amount:0};
 const systems=SYSTEMS.filter(id=>(all||system===id)&&s.systems[id]<3).map(id=>({id,points:3-s.systems[id],amount:(3-s.systems[id])*COSTS.system}));
 const total=hull.amount+structure.amount+systems.reduce((sum,x)=>sum+x.amount,0);
 return {system,hull,structure,systems,total,available:['A','B','C','D','E'].includes(world?.starport),partsRisk:['D','E'].includes(world?.starport),affordable:state.economy.credits>=total};
}

/** True when END_WEEK with routines would skip this station's routine (same guards as the reducer). */
export function routineSkipped(state,station,choice=state.routines[station]||DEFAULT_ROUTINES[station]){
 const e=state.economy,world=currentWorld(state),person=actor(state,station);
 if(!person)return true;
 if(choice==='parts')return e.credits<COSTS.parts;
 if(choice==='supplies')return e.credits<COSTS.supplies;
 if(choice==='refuel')return e.credits<(rulesAtLeast(state,4)?(fuelCapacity(state)-state.ship.fuel)*(['A','B'].includes(world?.starport)?500:100):15000)||!['A','B','C','D'].includes(world?.starport);
 if(choice==='bank')return !!e.deferred;
 if(choice==='train')return !!person.trainingDone;
 return rulesAtLeast(state,5)&&WORLD_ORDERS.includes(choice)&&!world;
}

/** Why a port order cannot usefully be applied now, as a catalog key, or null. Train and bank are permanent refusals. */
export function orderBlock(state,station,choice){
 const person=actor(state,station);
 if(choice==='train'&&person?.trainingDone)return 'portOrder.unavailable.train';
 if(choice==='bank'&&state.economy.deferred)return 'portOrder.unavailable.bank';
 if(choice==='parts'&&state.economy.credits<COSTS.parts||choice==='supplies'&&state.economy.credits<COSTS.supplies)return 'portOrder.noCredits';
 return null;
}

/** The order each station will follow on a standard week: a valid unapplied draft, else its routine. */
export function plannedOrders(state,drafts={}){
 return state.crew.filter(p=>p.alive&&p.active!==false).map(p=>{
  const station=p.station,acted=state.portActions[station],draft=drafts[station];
  const choice=acted||(draft&&!orderBlock(state,station,draft)&&!routineSkipped(state,station,draft)?draft:state.routines[station]||DEFAULT_ROUTINES[station]);
  return {station,person:p,choice,acted:!!acted,send:!acted&&choice!==state.routines[station],skipped:!acted&&routineSkipped(state,station,choice)};
 });
}
