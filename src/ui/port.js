import {t,esc,portrait,worldHeader,icon} from './common.js';
import {assetMarkup} from './assets.js';
import {renderPortObjective} from './feedback.js';
import {PORT_CHOICES} from '../core/actions.js';

export function renderPort(state){
 const world=state.subsector.worlds.find(w=>w.hex===state.ship.hex);
 if(!world)return '';
 const portArt=['A','B'].includes(world.starport)?'port-a':['C','D'].includes(world.starport)?'port-c':'port-e';
 const assigned=Object.keys(state.portActions).length;
 return `<header class="port-arrival">${worldHeader(world)}<div class="port-vignette" aria-hidden="true">${assetMarkup(`scenes/${portArt}`,'')}</div></header>
 ${renderPortObjective(state)}
 <div class="port-orders-heading"><div><h3>${esc(t('port.actions'))}</h3><p>${esc(t('port.ordersProgress',{count:assigned}))}</p></div><div class="actions"><button class="small" data-action="fuel-options">${icon('fuel')} ${esc(t('feedback.fuelOptions'))}</button><button class="small" data-action="repair" data-system="all">${icon('wrench')} ${esc(t('ship.repair'))}</button></div></div>
 <section class="port-cards">${state.crew.map((p,index)=>`<article class="port-card ${state.portActions[p.station]?'order-assigned':''}"><button class="port-identity" data-action="crew" data-index="${index}">${portrait(p)}<span><strong>${esc(p.name)}</strong><span class="role">${esc(t(`station.${p.station}`))}</span></span></button>
 ${p.alive&&p.active!==false?`<div class="action-row"><select id="order-${p.station}" aria-label="${esc(t(`station.${p.station}`))}" ${state.portActions[p.station]?'disabled':''}>${PORT_CHOICES[p.station].map(choice=>`<option value="${choice}" ${state.routines[p.station]===choice?'selected':''}>${esc(t(`action.${choice}`))}</option>`).join('')}</select><button data-action="order" data-station="${p.station}" ${state.portActions[p.station]?'disabled':''}>${state.portActions[p.station]?`${icon('check')} ${esc(t('port.ready'))}`:esc(t('common.apply'))}</button></div>`:`<button class="small" data-action="recruit" data-station="${p.station}">${esc(t('crew.recruit'))}</button>`}</article>`).join('')}</section>
 <div class="actions port-commerce"><button data-action="market" data-tab="freight">${icon('cargo')} ${esc(t('market.freight'))}</button><button data-action="market" data-tab="passengers">${icon('crew')} ${esc(t('market.passengers'))}</button><button data-action="market" data-tab="goods">${esc(t('market.goods'))}</button></div>
 <footer class="port-footer"><button data-action="standard" title="${esc(t('port.routineshint'))}">${icon('clock')} ${esc(t('port.routines'))}</button><button class="quiet" data-action="stay">${esc(t('port.stay'))}</button><button class="primary" data-action="map">${esc(t('port.depart'))} ${icon('arrow')}</button></footer>`;
}
