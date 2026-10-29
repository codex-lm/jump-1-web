import {t,esc,money,number,worldName,logText,icon} from './common.js';
import {cargoUsed} from '../rules/ship.js';

// The journal is capped at 400 entries. Match its retained suffix rather than
// subtracting array lengths, so a late-game report cannot silently go empty.
export function newJournalEntries(before,after){
 const old=(before.log||[]).map(e=>JSON.stringify(e)),now=(after.log||[]).map(e=>JSON.stringify(e));
 let overlap=Math.min(old.length,now.length);
 while(overlap&&!old.slice(-overlap).every((entry,i)=>entry===now[i]))overlap--;
 return (after.log||[]).slice(overlap);
}

export function actionReport(before,after,action){
 if(!before||!after||after.lastError||before===after)return null;
 const entries=newJournalEntries(before,after);
 const delta={credits:after.economy.credits-before.economy.credits,fuel:after.ship.fuel-before.ship.fuel,cargo:cargoUsed(after)-cargoUsed(before),hull:after.ship.hull-before.ship.hull};
 if(!entries.length&&!Object.values(delta).some(Boolean))return null;
 const expenses=Object.entries(after.economy.expenses).map(([category,amount])=>({category,amount:amount-(before.economy.expenses[category]||0)})).filter(e=>e.amount>0);
 const arrival=entries.findLast(e=>e.key==='log.arrive');
 const jumped=entries.findLast(e=>e.key==='log.jump');
 return {action,scene:before.scene?.type,arrival:arrival?.params.name,destination:jumped?worldName(after,jumped.params.hex):null,week:after.clock.week,weeks:after.clock.week-before.clock.week,delta,entries,expenses};
}

export function renderActionReport(report){
 if(!report)return '';
 const title=report.arrival?t('feedback.arrival',{world:report.arrival}):report.destination?t('feedback.jump',{world:report.destination}):report.scene?t('feedback.round',{scene:t(`scene.${report.scene}`)}):t(`feedback.${report.action}`);
 const important=report.entries.filter(e=>!e.roll&&!['log.scene','log.sceneResolved'].includes(e.key)&&!e.key.startsWith('log.bank.'));
 const rolls=report.entries.filter(e=>e.roll);
 const shown=important.length?important.slice(-5):rolls.length?rolls.slice(-3):report.entries.slice(-3);
 const metric=(key,unit='')=>{const value=report.delta[key];return value?`<span class="result-metric ${key==='credits'?(value>0?'result-gain':'result-loss'):key==='hull'&&value<0?'result-loss':''}">${esc(t(`feedback.${key}`))} <strong>${value>0?'+':'−'}${key==='credits'?money(Math.abs(value)):number(Math.abs(value),1)}${unit}</strong></span>`:'';};
 return `<section class="action-report" aria-label="${esc(t('feedback.title'))}"><header><div><span class="eyebrow">${esc(t('feedback.title'))} · ${esc(t('common.week'))} ${report.week}</span><h3>${esc(title)}</h3></div><button class="icon-button" data-action="dismiss-report" aria-label="${esc(t('feedback.dismiss'))}">${icon('close')}</button></header><div class="result-metrics">${metric('credits',' Cr')}${metric('fuel',' t')}${metric('cargo',' t')}${metric('hull')}${report.weeks?`<span class="result-metric">${esc(t('feedback.elapsed',{count:report.weeks}))}</span>`:''}</div><ul>${shown.map(e=>`<li>${esc(logText(e))}</li>`).join('')}</ul>${report.expenses?.length?`<p class="result-expenses">${esc(t('feedback.expenses'))} ${report.expenses.map(e=>`${esc(t(`feedback.cost.${e.category}`))} ${money(e.amount)} Cr`).join(' · ')}</p>`:''}<button class="quiet small" data-action="report-log">${esc(t('feedback.details'))} →</button></section>`;
}

export function renderPortObjective(state){
 const deliveries=[...state.cargo.filter(l=>l.kind==='freight'),...state.passengers,...state.contracts];
 const targets=[...new Set(deliveries.map(l=>l.destination).filter(Boolean))];
 const fuelNeeded=state.portWeekComplete?20:22.5;
 const fuelLow=state.ship.fuel<fuelNeeded;
 const broken=state.ship.systems.jump===0;
 return `<section class="port-objective"><div><span class="eyebrow">${esc(t('feedback.next'))}</span><p>${esc(t(broken?'feedback.fix':fuelLow?'feedback.fuelLow':targets.length?'feedback.deliver':'feedback.findWork',{fuel:number(fuelNeeded,1)}))}</p></div><div class="actions">${broken?`<button class="small" data-action="repair" data-system="jump">${esc(t('ship.repair'))}</button>`:fuelLow?`<button class="small" data-action="fuel-options">${esc(t('feedback.fuelOptions'))}</button>`:targets.length?targets.slice(0,3).map(hex=>`<button class="small" data-action="destination" data-hex="${esc(hex)}">${esc(worldName(state,hex))} →</button>`).join(''):`<button class="small" data-action="market" data-tab="freight">${esc(t('market.freight'))} →</button>`}</div></section>`;
}
