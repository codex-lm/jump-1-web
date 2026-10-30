import {t,esc,money,number,worldName,logText,icon} from './common.js';
import {hasTranslation} from './i18n.js';
import {cargoUsed} from '../rules/ship.js';
import {rulesAtLeast} from '../core/state.js';
import {berthingCost,WORKING_CAPITAL_FLOOR} from '../rules/economy.js';
import {quoteSaleTotal,currentWorld} from '../rules/trade.js';
import {billView,forcedSaleValue,settlementOffer,signedMoney} from './decision.js';

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
 return {action,scene:before.scene?.type,arrival:arrival?.params.name,...(jumped?{origin:worldName(before,before.ship.hex)}:{}),destination:jumped?worldName(after,jumped.params.hex):null,week:after.clock.week,weeks:after.clock.week-before.clock.week,delta,entries,expenses};
}

// These are recorded task checks, never a fresh roll. Opposed checks can beat the
// fixed task threshold and still lose the contest, so label only that threshold.
export function recentReportRolls(report){
 return (report?.entries||[]).filter(e=>['log.task','log.enemyTask'].includes(e.key)&&
  Array.isArray(e.roll?.dice)&&e.roll.dice.length===2&&e.roll.dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&
  Number.isFinite(e.roll.total)&&Number.isFinite(e.roll.difficulty)&&typeof e.roll.success==='boolean').slice(-3);
}

function renderReportRoll(entry){
 const {roll,params={}}=entry;
 const label=entry.key==='log.enemyTask'?t('feedback.rollEnemy'):[params.name,params.skill?t(`skill.${params.skill}`):null].filter(Boolean).join(' · ');
 const modifier=roll.difficulty>0?`+${number(roll.difficulty)}`:number(roll.difficulty),difficultyKey=`difficulty.${roll.difficulty}`;
 const difficulty=hasTranslation(difficultyKey)?`${t(difficultyKey)} (${modifier})`:t('feedback.rollDifficulty',{value:modifier});
 return `<article class="report-roll ${roll.success?'roll-threshold-met':'roll-threshold-missed'}"><div class="report-roll-label">${esc(label)}</div><div class="report-roll-values"><span class="report-dice" role="img" aria-label="${esc(t('feedback.rollDice',{first:roll.dice[0],second:roll.dice[1]}))}">${roll.dice.map(n=>`<span class="report-die" aria-hidden="true">${n}</span>`).join('')}</span><span class="report-roll-total">${esc(t('feedback.rollTotal'))} <strong>${number(roll.total)} <small>/ 8</small></strong></span><span class="report-roll-meta"><span class="report-roll-difficulty">${esc(difficulty)}</span><span class="report-roll-result">${esc(t(roll.success?'feedback.rollMet':'feedback.rollMissed'))}</span></span></div></article>`;
}

export function renderActionReport(report){
 if(!report)return '';
 const title=report.arrival?t('feedback.arrival',{world:report.arrival}):report.destination?t('feedback.jump',{world:report.destination}):report.scene?t('feedback.round',{scene:t(`scene.${report.scene}`)}):t(`feedback.${report.action}`);
 const important=report.entries.filter(e=>!e.roll&&!['log.scene','log.sceneResolved'].includes(e.key)&&!e.key.startsWith('log.bank.'));
 const rolls=report.entries.filter(e=>e.roll);
 const recentRolls=recentReportRolls(report);
 const shown=important.length?important.slice(-5):recentRolls.length?[]:rolls.length?rolls.slice(-3):report.entries.slice(-3);
 const route=report.origin&&report.destination&&report.entries.some(e=>e.key==='log.jump')?`<div class="jump-route"><span class="jump-route-label">${esc(t('feedback.jumpPassage'))}</span><div class="jump-route-worlds"><strong>${esc(report.origin)}</strong><span aria-hidden="true">→</span><strong>${esc(report.destination)}</strong></div><div class="jump-route-rail" aria-hidden="true"><span class="jump-route-ship">${icon('ship')}</span></div></div>`:'';
 const opposed=['pirate','repo','patrol','customs'].includes(report.scene);
 const checks=recentRolls.length?`<div class="report-rolls" aria-label="${esc(t('feedback.rolls'))}">${recentRolls.map(renderReportRoll).join('')}</div>${opposed?`<p class="report-roll-note">${esc(t('feedback.rollOpposed'))}</p>`:''}`:'';
 const metric=(key,unit='')=>{const value=report.delta[key];return value?`<span class="result-metric ${key==='credits'?(value>0?'result-gain':'result-loss'):key==='hull'&&value<0?'result-loss':''}">${esc(t(`feedback.${key}`))} <strong>${value>0?'+':'−'}${key==='credits'?money(Math.abs(value)):number(Math.abs(value),1)}${unit}</strong></span>`:'';};
 return `<section class="action-report" aria-label="${esc(t('feedback.title'))}"><header><div><span class="eyebrow">${esc(t('feedback.title'))} · ${esc(t('common.week'))} ${report.week}</span><h3>${esc(title)}</h3></div><button class="icon-button" data-action="dismiss-report" aria-label="${esc(t('feedback.dismiss'))}">${icon('close')}</button></header>${route}<div class="result-metrics">${metric('credits',' Cr')}${metric('fuel',' t')}${metric('cargo',' t')}${metric('hull')}${report.weeks?`<span class="result-metric">${esc(t('feedback.elapsed',{count:report.weeks}))}</span>`:''}</div>${shown.length?`<ul>${shown.map(e=>`<li>${esc(logText(e))}</li>`).join('')}</ul>`:''}${checks}${report.expenses?.length?`<p class="result-expenses">${esc(t('feedback.expenses'))} ${report.expenses.map(e=>`${esc(t(`feedback.cost.${e.category}`))} ${money(e.amount)} Cr`).join(' · ')}</p>`:''}<button class="quiet small" data-action="report-log">${esc(t('feedback.details'))} →</button></section>`;
}

/** The most valuable speculative lot that this port would buy now (never at its own origin). */
export function bestSale(state){
 return state.cargo.filter(l=>l.kind==='speculative'&&l.origin!==state.ship.hex).map(lot=>{const quote=quoteSaleTotal(state,lot);return {lot,...quote,result:quote.total-(lot.buyPrice||0)*lot.tons};}).filter(s=>s.unitPrice>0).sort((a,b)=>b.total-a.total)[0]||null;
}

function objectiveNotes(state,drafts){
 const notes=[],e=state.economy,world=currentWorld(state),note=(text,kind='navigation-note',button='')=>`<li class="${kind}"><span>${esc(text)}</span>${button}</li>`;
 const settle=settlementOffer(state);
 if(settle?.available)notes.push(note(t('feedback.settle',{amount:money(settle.amount),weeks:settle.weeks}),'objective-settle',`<button class="small" data-action="settle-prompt">${esc(t('feedback.settleButton'))}</button>`));
 const bill=billView(state),berthing=berthingCost(world,7),short=bill.total+berthing-e.credits;
 if(short>0){const cargo=forcedSaleValue(state);notes.push(note([t('feedback.bill',{week:bill.week,total:money(bill.total),credits:money(e.credits),short:money(short)}),berthing?t('feedback.billBerthing',{amount:money(berthing)}):'',cargo?t('feedback.billCargo',{amount:money(cargo)}):''].filter(Boolean).join(' '),bill.weeks<=1?'navigation-warning':'navigation-note'));}
 const medic=state.crew.find(p=>p.station===4&&p.alive&&p.active!==false&&!p.unconscious),wounded=state.crew.filter(p=>p.alive&&p.active!==false&&(p.wounded||p.unconscious));
 if(medic&&wounded.length&&!state.portActions[4]&&(drafts[4]||state.routines[4])!=='heal')notes.push(note(t('feedback.wounded',{names:wounded.map(p=>p.name).join(', ')}),'navigation-warning',`<button class="small" data-action="draft-order" data-station="4" data-choice="heal">${esc(t('feedback.woundedButton'))}</button>`));
 if(rulesAtLeast(state,5)&&e.advance>0&&state.clock.week===1&&!state.stats.jumps)notes.push(note(t('port.advance',{amount:money(e.advance),floor:money(WORKING_CAPITAL_FLOOR),balloon:money(e.balloon)})));
 return notes;
}

export function renderPortObjective(state,{drafts={}}={}){
 const deliveries=[...state.cargo.filter(l=>l.kind==='freight'),...state.passengers,...state.contracts];
 const targets=[...new Set(deliveries.map(l=>l.destination).filter(Boolean))];
 const fuelNeeded=state.portWeekComplete?20:22.5;
 const fuelLow=state.ship.fuel<fuelNeeded;
 const broken=state.ship.systems.jump===0;
 const sale=!broken&&!fuelLow?bestSale(state):null,notes=objectiveNotes(state,drafts);
 const message=broken?t('feedback.fix'):fuelLow?t('feedback.fuelLow',{fuel:number(fuelNeeded,1)}):sale?t(sale.result>=0?'feedback.sellHere':'feedback.sellHereLoss',{tons:number(sale.lot.tons),good:t(sale.lot.nameKey),total:money(sale.total),result:signedMoney(sale.result),loss:money(-sale.result)}):t(targets.length?'feedback.deliver':'feedback.findWork');
 return `<section class="port-objective"><div><span class="eyebrow">${esc(t('feedback.next'))}</span><p>${esc(message)}</p></div><div class="actions">${broken?`<button class="small" data-action="repair-options" data-system="jump">${esc(t('ship.repair'))}</button>`:fuelLow?`<button class="small" data-action="fuel-options">${esc(t('feedback.fuelOptions'))}</button>`:sale?`<button class="small" data-action="market" data-tab="goods">${esc(t('feedback.sellButton'))} →</button>`:targets.length?targets.slice(0,3).map(hex=>`<button class="small" data-action="destination" data-hex="${esc(hex)}">${esc(worldName(state,hex))} →</button>`).join(''):`<button class="small" data-action="market" data-tab="freight">${esc(t('market.freight'))} →</button>`}</div>${notes.length?`<ul class="objective-notes">${notes.join('')}</ul>`:''}</section>`;
}
