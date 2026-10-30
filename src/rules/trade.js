import { derive } from '../core/rng.js';
import { rulesAtLeast } from '../core/state.js';
import { task, roll } from '../core/dice.js';
import { GOODS, PURCHASE_MULTIPLIERS, SALE_MULTIPLIERS } from '../data/goods.js';
import { distance } from './subsector.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const bestDM=(goods,codes,kind)=>Math.max(0,...codes.map(code=>Number(goods[kind]?.[code]||0)));
export function currentWorld(state,hex=state.ship.hex) { return state.subsector.worlds.find(w=>w.hex===hex)||null; }
/** Editions 3 and 4 classify contraband from the good id; kept verbatim so older voyages replay. */
function legacyIsIllegal(goods,world) { if(!goods||!world) return false;if(/luxury/i.test(goods.id))return false;const category=/weapon|military/i.test(goods.id)?'weapons':/drug|pharmaceutical|medical-research/i.test(goods.id)?'drugs':/advanced/i.test(goods.id)?'technology':typeof goods.illegal==='string'?goods.illegal:null;return (category==='weapons' && world.law>=5)||(category==='drugs' && world.law>=3)||(category==='technology' && world.law>=7 && world.tech<10); }
/** Edition 5: the minimum law level at which each contraband category is seized. */
export const CONTRABAND_LAW=Object.freeze({weapons:5,drugs:3,luxury:6});
/** Edition 5: only goods the data marks illegal are contraband; legal goods are legal everywhere. */
export function contrabandCategory(goods) { if(goods?.illegal!==true&&typeof goods?.illegal!=='string')return null;if(typeof goods.illegal==='string')return goods.illegal;return /weapon|military/i.test(goods.id)?'weapons':/luxury/i.test(goods.id)?'luxury':'drugs'; }
/** Pass the state (or config) so the voyage's rules edition decides; without it the legacy rule applies. */
export function isIllegal(goods,world,state) { if(!rulesAtLeast(state,5))return legacyIsIllegal(goods,world);if(!goods||!world)return false;const category=contrabandCategory(goods);return !!category&&world.law>=(CONTRABAND_LAW[category]??Infinity); }
export function brokerRoll(state,hex=state.ship.hex) { const p=state.crew.find(c=>c.station===5&&c.alive&&c.active!==false&&!c.unconscious); return task({rng:derive(state.meta.seed,'broker',hex,state.clock.week),skill:p?.skills.Broker,characteristic:Math.max(p?.characteristics.INT??7,p?.characteristics.SOC??7),situation:(state.economy.reputation[hex]||0)+(p?.mood<0?-1:0),joat:p?.skills['Jack-of-all-Trades']||0}); }
export function priceMultiplier(value,kind='buy') { const table=kind==='buy'?PURCHASE_MULTIPLIERS:SALE_MULTIPLIERS; return table[clamp(Math.floor(value),2,16)]; }
/** Edition 5: a lot resold at its own origin never fetches more than was paid per ton. */
function originCap(state,lot,price,hex){return rulesAtLeast(state,5)&&lot.origin===hex&&Number.isFinite(lot.buyPrice)?Math.min(price,lot.buyPrice):price;}
/** The unit price an accepted SELL pays now; quotes and the reducer share it. The payment-phase distress sale pays half the base price. */
export function saleUnitPrice(state,lot,hex=state.ship.hex){return state.phase==='payment'?originCap(state,lot,Math.round((lot.basePrice||0)*.5),hex):quoteSale(state,lot,hex);}
export function quoteSale(state,lot,hex=state.ship.hex) {
  const good=GOODS.find(g=>g.id===lot.goodId); if(!good) return lot.basePrice||0;
  if(lot.origin===hex) return lot.boughtWeek===state.clock.week?0:originCap(state,lot,Math.round(good.basePrice*.5),hex);
  const world=currentWorld(state,hex); const rng=derive(state.meta.seed,'sale',hex,state.clock.week,lot.goodId);
  const effect=brokerRoll(state,hex).effect;
  // The source SRD uses 2d6 and a 2..16 table, unlike the draft specification's approximate 3d6 example.
  return Math.round(good.basePrice*priceMultiplier(roll(rng,2,6)+bestDM(good,world?.codes||[],'sellDM')+effect,'sell'));
}

/** Public buying requests last six weeks. Their prices are fixed premiums on
 * imported goods, not predictions of the destination's future market roll. */
export function activeDemand(state,hex=state.ship.hex){
  if(!rulesAtLeast(state,4))return null;
  const world=currentWorld(state,hex);if(!world||world.population<1)return null;
  const suppliers=state.subsector.worlds.filter(w=>distance(hex,w.hex)===1);
  const candidates=GOODS.filter(g=>g.basePrice<=75000&&!isIllegal(g,world,state)&&!g.illegal&&suppliers.some(w=>!g.available?.length||g.available.some(code=>w.codes.includes(code))));
  if(!candidates.length)return null;
  const preferred=candidates.filter(g=>bestDM(g,world.codes,'sellDM')>0),period=Math.floor((state.clock.week-1)/6);
  const rng=derive(state.meta.seed,'demand-v4',hex,period),good=rng.pick(preferred.length?preferred:candidates);
  const id=`demand-${hex}-${period}`,volume=rng.int(2,5)*5,delivered=Math.max(0,Math.min(volume,state.demandDeliveries?.[id]||0));
  return {id,hex,goodId:good.id,nameKey:good.nameKey,volume,delivered,remaining:volume-delivered,fromWeek:period*6+1,untilWeek:Math.min(52,(period+1)*6),bonusPerTon:Math.max(250,Math.min(5000,Math.round(good.basePrice*.15)))};
}

export function demandBonus(state,lot,tons=lot.tons,hex=state.ship.hex){
  if(state.phase!=='port'||lot.kind!=='speculative'||!lot.origin||lot.origin===hex||!Number.isInteger(tons)||tons<=0)return null;
  const demand=activeDemand(state,hex);
  if(!demand||demand.goodId!==lot.goodId||!demand.remaining)return null;
  const amountTons=Math.min(tons,lot.tons,demand.remaining);
  if(amountTons<=0)return null;
  return {demandId:demand.id,tons:amountTons,amount:amountTons*demand.bonusPerTon};
}

/** Call once inside an accepted SELL, before reducing the lot quantity. */
export function recordDemandDelivery(state,lot,tons=lot.tons,hex=state.ship.hex){
  const bonus=demandBonus(state,lot,tons,hex);if(!bonus)return null;
  state.demandDeliveries||={};state.demandDeliveries[bonus.demandId]=(state.demandDeliveries[bonus.demandId]||0)+bonus.tons;
  return bonus;
}

export function quoteSaleTotal(state,lot,tons=lot.tons,hex=state.ship.hex){
  const unitPrice=saleUnitPrice(state,lot,hex);
  const bonus=unitPrice>0?demandBonus(state,lot,tons,hex):null,base=unitPrice*tons;
  return {unitPrice,base,bonus:bonus?.amount||0,total:base+(bonus?.amount||0),bonusTons:bonus?.tons||0};
}

export function market(state,hex=state.ship.hex) {
  const world=currentWorld(state,hex); if(!world) return {goods:[],freight:[],passengers:[],contracts:[]};
  const rng=derive(state.meta.seed,'market',hex,state.clock.week); const adjacent=state.subsector.worlds.filter(w=>distance(hex,w.hex)===1);
  const count=clamp(rng.int(1,6)+Math.floor(world.population/4)+(['A','B'].includes(world.starport)?1:0),2,8);
  const available=GOODS.filter(g=>!g.available?.length||g.available.includes('All')||g.available.some(c=>world.codes.includes(c)));
  const pool=available.length?available:GOODS;
  const selected=[];
  for(let i=0;i<count;i++) { const choices=pool.filter(g=>!selected.includes(g)); if(!choices.length) break; selected.push(rng.pick(choices)); }
  const effect=brokerRoll(state,hex).effect;
  const goods=selected.map(g=>{
    const id=`${hex}-${state.clock.week}-${g.id}`; const dice=typeof g.tonnage==='object'?g.tonnage.dice:1; const multiplier=typeof g.tonnage==='object'?g.tonnage.multiplier:10;
    const produced=Math.max(1,Math.min(82,roll(rng,dice||1,6)*(multiplier||1))); const taken=state.marketPurchases[id]||0;
    const buyPrice=Math.round(g.basePrice*priceMultiplier(roll(rng,2,6)+bestDM(g,world.codes,'buyDM')+effect));
    const sellPrice=quoteSale(state,{goodId:g.id},hex);
    const favorable=adjacent.filter(w=>bestDM(g,w.codes,'sellDM')>0).map(w=>w.hex);
    return {id,goodId:g.id,nameKey:g.nameKey,tons:Math.max(0,produced-taken),basePrice:g.basePrice,buyPrice,sellPrice,illegal:isIllegal(g,world,state),favorable};
  });
  const freight=[], passengers=[],contracts=[];
  for(const destination of adjacent) {
    // Jump-1 condenses the source's incidental/major freight and traffic bands into selectable lots.
    const traffic=Math.max(0,Math.floor((world.population+destination.population)/3)+(world.codes.includes('In')?1:0)-(world.zone==='Amber'?1:0));
    const lots=clamp(rng.int(0,Math.max(1,traffic)),0,6);
    for(let i=0;i<lots;i++) { const tons=rng.int(1,6)*5; const id=`freight-${hex}-${state.clock.week}-${destination.hex}-${i}`; if(!state.bookedOffers.includes(id)) freight.push({id,destination:destination.hex,tons,pay:tons*1000,deadline:state.clock.week+4}); }
    for(const className of ['High','Middle','Low']) {
      const capacity={High:5,Middle:10,Low:20}[className];
      const demand=Math.max(0,Math.floor((world.population+destination.population)/2)-3+(['A','B'].includes(world.starport)?2:0));
      const count=clamp(rng.int(0,Math.max(1,demand)),0,capacity);
      if(!count)continue;
      const id=`pax-${hex}-${state.clock.week}-${destination.hex}-${className}`;
      // Generate the complete offer before filtering sold/booked entries. Its
      // removal must never consume fewer random values or reroll another offer.
      const quirk=rng.int(1,6)===6?rng.int(1,6):0;
      const offer={id,destination:destination.hex,class:className,count,pay:count*{High:8000,Middle:6000,Low:1000}[className],deadline:state.clock.week+4,quirk};
      if(!state.bookedOffers.includes(id))passengers.push(offer);
    }
    if(rng.int(1,6)>=3) {
      const type=rng.pick(['courier','courier','smuggle','escort']);
      const id=`contract-${hex}-${state.clock.week}-${destination.hex}`;
      const offer={id,type,destination:destination.hex,pay:rng.int(5,60)*1000,deadline:state.clock.week+rng.int(2,6),tons:type==='smuggle'?5:0};
      if(!state.bookedOffers.includes(id))contracts.push(offer);
    }
  }
  if(rulesAtLeast(state,5)&&hex===state.ship.hex&&['freight','passengers'].includes(state.portActions?.[5]))stewardTraffic(state,hex,adjacent,state.portActions[5],freight,passengers);
  return {goods,freight,passengers,contracts};
}
/** Edition 5: a steward who arranges freight or welcomes passengers adds one offer per neighbouring world, this week at this port.
 * The offers come from their own random stream, so the base market above is unchanged. */
function stewardTraffic(state,hex,adjacent,order,freight,passengers){
  const rng=derive(state.meta.seed,'steward-traffic',hex,state.clock.week,order);
  for(const destination of adjacent){
    if(order==='freight'){const tons=rng.int(1,6)*5,id=`freight-${hex}-${state.clock.week}-${destination.hex}-steward`;if(!state.bookedOffers.includes(id))freight.push({id,destination:destination.hex,tons,pay:tons*1000,deadline:state.clock.week+4,steward:true});continue;}
    const className=rng.pick(['High','Middle','Low']),count=rng.int(1,{High:2,Middle:4,Low:8}[className]),quirk=rng.int(1,6)===6?rng.int(1,6):0,id=`pax-${hex}-${state.clock.week}-${destination.hex}-${className}-steward`;
    if(!state.bookedOffers.includes(id))passengers.push({id,destination:destination.hex,class:className,count,pay:count*{High:8000,Middle:6000,Low:1000}[className],deadline:state.clock.week+4,quirk,steward:true});
  }
}
/** Edition 5: a successful patron or escort order secures the first board contract at this bonus on its pay. */
export const PATRON_PAY_BONUS=.25;
/** Edition 5: the improved contract a patron or escort order secured at this port this week, while it is still open. */
export function activePatronOffer(state){const offer=state.patronOffer;return rulesAtLeast(state,5)&&offer&&offer.hex===state.ship.hex&&offer.week===state.clock.week&&!state.bookedOffers.includes(offer.id)?offer:null;}
