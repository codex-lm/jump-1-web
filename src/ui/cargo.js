import {t,esc,money,number,worldName,badge} from './common.js';
import {market,quoteSaleTotal,activeDemand} from '../rules/trade.js';
import {cargoUsed,cabinsUsed,lowUsed,cargoCapacity,cabinCapacity} from '../rules/ship.js';
import {distance} from '../rules/subsector.js';

function marketLink(tab,label){
  return `<button class="small" data-action="market" data-tab="${tab}">${esc(t(label))}</button>`;
}

export function cargoManifest(state,full=false){
  const used=cargoUsed(state),capacity=cargoCapacity(state),canTrade=state.phase==='port';
  const lots=state.cargo.map(l=>{
    const delivery=l.kind==='mission'?state.contracts.find(c=>c.id===l.contractId):l;
    const saleQuote=quoteSaleTotal(state,l),salePrice=saleQuote.unitPrice;
    const canSell=['port','payment'].includes(state.phase)&&(state.phase==='payment'||salePrice>0);
    return `<article class="cargo-item"><div class="cargo-item-title"><strong>${esc(l.kind==='freight'?t('cargo.freight',{world:worldName(state,l.destination)}):l.nameKey?t(l.nameKey):t('contract.smuggle'))}</strong><span class="mono">${number(l.tons)} t</span></div>${l.kind==='speculative'?`<div class="cargo-item-detail">${esc(t('cargo.origin',{world:worldName(state,l.origin),week:l.boughtWeek}))}</div>${salePrice>0?`<div class="cargo-sale"><span>${esc(t('cargo.value',{price:money(salePrice)}))}</span><strong>${money(saleQuote.total)} Cr</strong></div>`:''}${saleQuote.bonus?`<p class="trade-sale-bonus">${esc(t('trade.saleBonus',{amount:money(saleQuote.bonus),tons:saleQuote.bonusTons}))}</p>`:''}${!canSell&&state.phase==='port'?`<p class="cargo-sale-note">${esc(t('cargo.nosale'))}</p>`:''}<div class="actions"><button class="small" data-action="sell" data-id="${esc(l.id)}" ${canSell?'':'disabled'}>${esc(t('market.sell'))} · ${number(l.tons)} t</button>${l.illegal?badge(t('market.illegal'),'red'):''}</div>`:`<div class="cargo-item-detail">${delivery?`${l.kind==='mission'?`→ ${esc(worldName(state,delivery.destination))}<br>`:''}${esc(t('market.deadline',{week:delivery.deadline}))} · <span class="mono">${money(delivery.pay)} Cr</span>`:esc(t('common.none'))}</div>`}</article>`;
  }).join('');
  return `<section class="cargo-manifest ${full?'cargo-manifest-full':'cargo-manifest-compact'}"><div class="cargo-heading"><h3>${esc(t('cargo.manifest'))}</h3><span class="mono brass">${number(used)} / ${number(capacity)} t</span></div><div class="cargo-grid" role="meter" aria-label="${esc(t('cargo.manifest'))}" aria-valuemin="0" aria-valuemax="${capacity}" aria-valuenow="${used}">${state.cargo.map(l=>`<div class="cargo-block ${l.kind==='freight'?'freight':''} ${l.illegal?'illegal':''}" style="width:${l.tons/capacity*100}%" title="${l.tons} t"></div>`).join('')}</div>${lots||`<div class="cargo-empty"><p>${esc(t(full?'cargo.empty':'cargo.emptyshort'))}</p>${full&&canTrade?marketLink('goods','cargo.browse'):''}</div>`}<div class="cargo-passengers"><h3>${esc(t('cargo.passengers'))}</h3><div class="cargo-berths"><span>${esc(t('cargo.cabins'))} <strong>${number(cabinsUsed(state),1)} / ${number(cabinCapacity(state))}</strong></span><span>${esc(t('cargo.lowberths'))} <strong>${number(lowUsed(state))} / 20</strong></span></div>${state.passengers.length?state.passengers.map(p=>`<article class="cargo-item"><div class="cargo-item-title"><strong>${number(p.count)} × ${esc(t(`market.${p.class.toLowerCase()}`))}</strong><span class="mono">${money(p.pay)} Cr</span></div><div class="cargo-item-detail">→ ${esc(worldName(state,p.destination))}</div></article>`).join(''):`<div class="cargo-empty"><p>${esc(t('common.none'))}</p>${full&&canTrade?marketLink('passengers','market.passengers'):''}</div>`}</div></section>`;
}

function priceContext(good){
  const difference=Math.round(Math.abs(good.buyPrice/good.basePrice-1)*100);
  const kind=good.buyPrice<good.basePrice?'below':good.buyPrice>good.basePrice?'above':'same';
  return `<span class="price-context price-${kind}">${esc(t(kind==='below'?'market.belowbase':kind==='above'?'market.abovebase':'market.atbase',{percent:number(difference)}))}</span>`;
}

function orderControl({id,unitPrice,max,quantity,action,label,quantityLabel,goodId='',totalLabel='market.total'}){
  const available=max>=1;
  const amount=available?Math.max(1,Math.min(quantity,max)):0;
  return `<div class="market-order"><div class="market-order-controls"><label class="market-quantity"><span>${esc(quantityLabel)}</span><input id="${esc(id)}" aria-label="${esc(quantityLabel)}" type="number" inputmode="numeric" min="1" max="${Math.max(1,max)}" step="1" value="${amount}" data-market-unit-price="${unitPrice}" data-market-available="${available}" ${available?'':'disabled'}></label><button data-action="${action}" data-id="${esc(id.replace(/^(qty-|paxcount-)/,''))}" ${goodId?`data-good="${esc(goodId)}"`:''} ${available?'':'disabled'}>${esc(t(label))}</button></div><div class="market-order-total"><span>${esc(t(totalLabel))}</span><output for="${esc(id)}" data-market-total aria-live="polite">${money(unitPrice*amount)} Cr</output></div></div>`;
}

// Update the displayed quote only. The reducer still validates every submitted order.
export function updateMarketTotal(input){
  if(!input?.matches?.('[data-market-unit-price]'))return false;
  const order=input.closest('.market-order');
  if(!order)return false;
  const output=order.querySelector('[data-market-total]'),button=order.querySelector('button');
  const amount=Number(input.value),unitPrice=Number(input.dataset.marketUnitPrice);
  const available=input.dataset.marketAvailable==='true';
  const valid=available&&Number.isInteger(amount)&&amount>=1&&amount<=Number(input.max)&&Number.isFinite(unitPrice);
  if(output)output.textContent=valid?`${money(unitPrice*amount)} Cr`:available?t('market.selectquantity'):'—';
  if(button)button.disabled=!valid;
  input.setAttribute('aria-invalid',String(available&&!valid));
  return true;
}

function goodsRow(state,g){
  const max=Math.min(g.tons,cargoCapacity(state)-cargoUsed(state),Math.floor(state.economy.credits/g.buyPrice));
  return `<tr><td class="market-identity"><strong>${esc(t(g.nameKey))}</strong>${g.illegal?badge(t('market.illegal'),'red'):''}<div class="good-detail">${esc(t('market.base',{price:money(g.basePrice)}))}</div>${priceContext(g)}${g.favorable.length?`<div class="market-destinations">${esc(t('market.favorable',{worlds:g.favorable.map(h=>worldName(state,h)).join(', ')}))}</div>`:''}</td><td class="market-number" data-label="${esc(t('market.stock'))}">${number(g.tons)} t</td><td class="price market-number" data-label="${esc(t('market.buyprice'))}">${money(g.buyPrice)}</td><td class="market-action">${orderControl({id:`qty-${g.id}`,unitPrice:g.buyPrice,max,quantity:Math.min(10,max),action:'buy',label:'market.buy',quantityLabel:t('market.quantity'),goodId:g.goodId})}</td></tr>`;
}

function offerRow(state,o,tab){
  const passengers=tab==='passengers',contracts=tab==='contracts';
  const unitPrice=passengers?o.pay/o.count:o.pay;
  const max=passengers?Math.floor(Math.min(o.count,o.class==='Low'?20-lowUsed(state):(cabinCapacity(state)-cabinsUsed(state))*(o.class==='Middle'?2:1))):0;
  const disabled=tab==='freight'&&cargoUsed(state)+o.tons>cargoCapacity(state)||contracts&&(state.contracts.length>=4||cargoUsed(state)+(o.tons||0)>cargoCapacity(state));
  return `<tr><td class="market-identity"><button class="destination-link" data-action="destination" data-hex="${esc(o.destination)}" title="${esc(t('feedback.inspect'))}">${esc(worldName(state,o.destination))} ↗</button><div class="good-detail">${contracts?esc(t(`contract.${o.type}`)):passengers?esc(t(`market.${o.class.toLowerCase()}`)):esc(o.destination)}</div><div class="market-deadline">${esc(t('market.deadline',{week:o.deadline}))}</div></td><td class="market-number" data-label="${esc(t(passengers?'market.passengers':'market.quantity'))}">${passengers?number(o.count):contracts&&!o.tons?'—':`${number(o.tons)} t`}</td><td class="price market-number" data-label="${esc(t(passengers?'market.unitpassenger':'market.pay'))}">${money(unitPrice)}</td><td class="market-action">${passengers?orderControl({id:`paxcount-${o.id}`,unitPrice,max,quantity:max,action:'passenger',label:'market.book',quantityLabel:t('market.passengers'),totalLabel:'market.pay'}):`<button data-action="${tab==='freight'?'freight':'contract'}" data-id="${esc(o.id)}" ${disabled?'disabled':''}>${esc(t(contracts?'market.accept':'market.book'))}</button>`}</td></tr>`;
}

function renderDemands(state){
  if(state.meta.config.rulesEdition!==4)return '';
  const demands=state.subsector.worlds.filter(w=>distance(state.ship.hex,w.hex)<=1).map(w=>activeDemand(state,w.hex)).filter(Boolean);
  if(!demands.length)return '';
  return `<section class="trade-demands"><h3>${esc(t('trade.demands'))}</h3><p>${esc(t('trade.demandImport'))}</p><div class="trade-demand-list">${demands.map(d=>`<article class="trade-demand ${d.remaining?'':'trade-demand-filled'}"><button class="destination-link" data-action="destination" data-hex="${esc(d.hex)}">${esc(worldName(state,d.hex))} ↗</button><strong>${esc(t(d.nameKey))}</strong><span>${esc(t('trade.demandTerms',{remaining:d.remaining,volume:d.volume,bonus:money(d.bonusPerTon),week:d.untilWeek}))}</span></article>`).join('')}</div></section>`;
}

export function renderMarket(state,tab='goods'){
  if(!['goods','freight','passengers','contracts'].includes(tab))tab='goods';
  const offers=market(state),goods=tab==='goods',passengers=tab==='passengers';
  return `<section class="market-view"><header class="market-header"><div class="eyebrow">${esc(worldName(state,state.ship.hex))} · ${esc(t('trade.capacity',{used:cargoUsed(state),capacity:cargoCapacity(state)}))}</div><h2>${esc(t('market.title'))}</h2><p class="section-intro">${esc(t('market.description'))}</p></header><div class="market-tabs" aria-label="${esc(t('market.title'))}">${['goods','freight','passengers','contracts'].map(k=>`<button class="${tab===k?'active':''}" data-action="market-tab" data-tab="${k}" aria-pressed="${tab===k}">${esc(t(`market.${k}`))}</button>`).join('')}</div>${offers[tab].length?`<table class="market-table"><thead><tr><th scope="col">${esc(t(goods?'market.good':'market.destination'))}</th><th scope="col" class="market-number">${esc(t(goods?'market.stock':passengers?'market.passengers':'market.quantity'))}</th><th scope="col" class="market-number">${esc(t(goods?'market.buyprice':passengers?'market.unitpassenger':'market.pay'))}</th><th scope="col" class="market-action">${esc(t('market.order'))}</th></tr></thead><tbody>${goods?offers.goods.map(g=>goodsRow(state,g)).join(''):offers[tab].map(o=>offerRow(state,o,tab)).join('')}</tbody></table>`:`<p class="market-empty">${esc(t('market.empty'))}</p>`}${goods?renderDemands(state):''}<footer class="port-footer"><button data-action="cargo">${esc(t('cargo.manifest'))}</button><button class="primary" data-action="map">${esc(t('port.depart'))} →</button></footer></section>`;
}
