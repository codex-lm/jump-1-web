import {t,esc,portrait,worldHeader,icon,number,money} from './common.js';
import {assetMarkup} from './assets.js';
import {renderPortObjective} from './feedback.js';
import {PORT_CHOICES} from '../core/actions.js';
import {distance} from '../rules/subsector.js';
import {fuelCapacity} from '../rules/ship.js';
import {rulesAtLeast} from '../core/state.js';
import {portOrderEffect} from '../rules/orders.js';
import {berthingCost} from '../rules/economy.js';
import {orderBlock,plannedOrders,repairCost} from './decision.js';

function voyageReminder(state){
 if(!rulesAtLeast(state,4))return '';
 const stories=(state.voyage?.stories||[]).filter(story=>story.status==='open'&&(story.type==='merchant'||story.type==='birthday'&&state.crew.some(p=>p.id===story.personId&&p.alive&&p.active!==false)));
 if(!stories.length)return '';
 return `<aside class="voyage-followup" aria-label="${esc(t('openSpace.memories'))}"><strong>${esc(t('openSpace.memories'))}</strong>${stories.map(story=>`<p>${esc(t(story.type==='merchant'?'openSpace.merchantReminder':'openSpace.birthdayReminder',{name:story.type==='birthday'?state.crew.find(p=>p.id===story.personId).name:story.name}))}</p>`).join('')}</aside>`;
}

function renderOpenSpace(state){
 const adjacent=state.subsector.worlds.filter(world=>distance(state.ship.hex,world.hex)===1);
 const minimum=state.portWeekComplete?20:22.5,needsFuel=state.ship.fuel<minimum,broken=state.ship.systems.jump===0;
 const engineer=state.crew.find(p=>p.station===2),canMaintain=engineer?.alive&&engineer.active!==false&&!engineer.unconscious&&!state.portActions[2]&&Object.values(state.ship.systems).some(value=>value<3);
 const metric=(label,value,detail)=>`<div class="departure-metric"><dt>${esc(label)}</dt><dd>${esc(value)}</dd><small>${esc(detail)}</small></div>`;
 return `<section class="inspection-compact open-space" aria-labelledby="open-space-title"><span class="eyebrow">${esc(state.ship.hex)}</span><h2 id="open-space-title">${esc(t('openSpace.title'))}</h2><p>${esc(t('openSpace.intro'))}</p>
 <dl class="departure-metrics">${metric(t('ship.fuel'),`${number(state.ship.fuel,1)} / ${fuelCapacity(state)} t`,t(state.ship.fuelType==='raw'?'ship.raw':'ship.refined'))}${metric(t('ship.hull'),`${state.ship.hull} / 40`,`${t('ship.structure')} ${state.ship.structure} / 40`)}${metric(t('system.jump'),`${state.ship.systems.jump} / 3`,t(broken?'openSpace.driveOffline':'openSpace.driveReady'))}</dl>
 <p class="${broken||needsFuel||!adjacent.length?'navigation-warning':'navigation-note'}">${esc(t(broken?'openSpace.needRepair':needsFuel?'openSpace.needFuel':!adjacent.length?'openSpace.noWorld':'openSpace.choose',{fuel:number(minimum,1)}))}</p>
 ${adjacent.length?`<h3>${esc(t('openSpace.nearby'))}</h3><div class="actions">${adjacent.map(world=>`<button class="small" data-action="destination" data-hex="${esc(world.hex)}">${esc(world.name)} · ${esc(world.hex)} →</button>`).join('')}</div>`:''}
 ${canMaintain?`<div class="voyage-followup"><strong>${esc(t('openSpace.maintenance'))} · ${esc(engineer.name)}</strong><p>${esc(t('openSpace.maintenanceHint'))}</p><div class="action-row"><label class="sr-only" for="order-2">${esc(t('openSpace.maintenance'))}</label><select id="order-2"><option value="maintenance">${esc(t('action.maintenance'))}</option></select><button data-action="order" data-station="2">${esc(t('common.apply'))}</button></div></div>`:''}
 <p class="navigation-note">${esc(t('openSpace.waitHint'))}</p><div class="actions"><button class="primary" data-action="map">${icon('map')} ${esc(t('openSpace.map'))}</button><button data-action="stay">${icon('clock')} ${esc(t('openSpace.wait'))}</button></div></section>${voyageReminder(state)}`;
}

const PERMANENT_BLOCKS=['portOrder.unavailable.train','portOrder.unavailable.bank'];
/** One station's order select with the concrete effect of the selected order. Unapplied choices live in UI drafts until Assign. */
function orderControl(state,p,drafts){
 const station=p.station,acted=state.portActions[station],selected=acted||drafts[station]||state.routines[station],block=acted?null:orderBlock(state,station,selected),effect=portOrderEffect(state,selected);
 const options=PORT_CHOICES[station].map(choice=>`<option value="${choice}" ${selected===choice?'selected':''} ${choice!==selected&&PERMANENT_BLOCKS.includes(orderBlock(state,station,choice))?'disabled':''}>${esc(t(`action.${choice}`))}</option>`).join('');
 return `<div class="port-order"><div class="action-row"><select id="order-${station}" aria-label="${esc(t(`station.${station}`))}" aria-describedby="order-effect-${station}" ${acted?'disabled':''}>${options}</select><button data-action="order" data-station="${station}" ${acted||block?'disabled':''}>${acted?`${icon('check')} ${esc(t('port.ready'))}`:esc(t('common.apply'))}</button></div><p class="order-effect" id="order-effect-${station}">${effect?esc(t(effect.key)):''}${block?` <strong class="order-blocked">${esc(t(block))}</strong>`:''}</p></div>`;
}
function repairButton(state){
 const cost=repairCost(state);
 return `<button class="small" data-action="repair-options" data-system="all" ${cost.total&&cost.available?'':'disabled'}>${icon('wrench')} ${esc(cost.total?t('ship.repairAll',{amount:money(cost.total)}):t('ship.repair'))}</button>`;
}
/** Confirmation shown before a standard week started from the keyboard: what each station will do and what the week costs. */
export function standardWeekSummary(state,drafts={}){
 const world=state.subsector.worlds.find(w=>w.hex===state.ship.hex);
 return `<p>${esc(t('standard.intro'))}</p><ul class="standard-week-orders">${plannedOrders(state,drafts).map(o=>`<li><strong>${esc(o.person.name)}</strong> · ${esc(t(`station.${o.station}`))} — ${esc(t(`action.${o.choice}`))}${o.acted?` <small>(${esc(t('standard.assigned'))})</small>`:o.skipped?` <small class="order-blocked">(${esc(t('standard.skipped'))})</small>`:''}</li>`).join('')}</ul><p class="navigation-note">${esc(t('standard.berthing',{amount:money(berthingCost(world,7))}))}</p><div class="actions"><button data-action="close">${esc(t('common.cancel'))}</button><button class="primary" data-action="standard-confirm" autofocus>${esc(t('standard.confirm'))}</button></div>`;
}

export function renderPort(state,{drafts={}}={}){
 const world=state.subsector.worlds.find(w=>w.hex===state.ship.hex);
 if(!world)return renderOpenSpace(state);
 const portArt=['A','B'].includes(world.starport)?'port-a':['C','D'].includes(world.starport)?'port-c':'port-e';
 const assigned=Object.keys(state.portActions).length;
 return `<header class="port-arrival">${worldHeader(world)}<div class="port-vignette" aria-hidden="true">${assetMarkup(`scenes/${portArt}`,'')}</div></header>
 ${renderPortObjective(state,{drafts})}
 ${voyageReminder(state)}
 <div class="port-orders-heading"><div><h3>${esc(t('port.actions'))}</h3><p>${esc(t('port.ordersProgress',{count:assigned}))}</p></div><div class="actions"><button class="small" data-action="fuel-options">${icon('fuel')} ${esc(t('feedback.fuelOptions'))}</button>${repairButton(state)}</div></div>
 <section class="port-cards">${state.crew.map((p,index)=>`<article class="port-card ${state.portActions[p.station]?'order-assigned':''}"><button class="port-identity" data-action="crew" data-index="${index}">${portrait(p)}<span><strong>${esc(p.name)}</strong><span class="role">${esc(t(`station.${p.station}`))}</span></span></button>
 ${p.alive&&p.active!==false?orderControl(state,p,drafts):`<button class="small" data-action="recruit" data-station="${p.station}">${esc(t('crew.recruit'))}</button>`}</article>`).join('')}</section>
 <div class="actions port-commerce"><button data-action="market" data-tab="freight">${icon('cargo')} ${esc(t('market.freight'))}</button><button data-action="market" data-tab="passengers">${icon('crew')} ${esc(t('market.passengers'))}</button><button data-action="market" data-tab="goods">${esc(t('market.goods'))}</button></div>
 <footer class="port-footer"><button data-action="standard" title="${esc(t('port.routineshint'))}">${icon('clock')} ${esc(t('port.routines'))}</button><button class="quiet" data-action="stay">${esc(t('port.stay'))}</button><button class="primary" data-action="map">${esc(t('port.depart'))} ${icon('arrow')}</button></footer>`;
}
