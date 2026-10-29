import { derive } from '../core/rng.js';
import { task, roll } from '../core/dice.js';
import { GOODS, PURCHASE_MULTIPLIERS, SALE_MULTIPLIERS } from '../data/goods.js';
import { distance } from './subsector.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const bestDM=(goods,codes,kind)=>Math.max(0,...codes.map(code=>Number(goods[kind]?.[code]||0)));
export function currentWorld(state,hex=state.ship.hex) { return state.subsector.worlds.find(w=>w.hex===hex)||null; }
export function isIllegal(goods,world) { if(!goods||!world) return false;if(/luxury/i.test(goods.id))return false;const category=/weapon|military/i.test(goods.id)?'weapons':/drug|pharmaceutical|medical-research/i.test(goods.id)?'drugs':/advanced/i.test(goods.id)?'technology':typeof goods.illegal==='string'?goods.illegal:null;return (category==='weapons' && world.law>=5)||(category==='drugs' && world.law>=3)||(category==='technology' && world.law>=7 && world.tech<10); }
export function brokerRoll(state,hex=state.ship.hex) { const p=state.crew.find(c=>c.station===5&&c.alive&&c.active!==false&&!c.unconscious); return task({rng:derive(state.meta.seed,'broker',hex,state.clock.week),skill:p?.skills.Broker,characteristic:Math.max(p?.characteristics.INT??7,p?.characteristics.SOC??7),situation:(state.economy.reputation[hex]||0)+(p?.mood<0?-1:0),joat:p?.skills['Jack-of-all-Trades']||0}); }
export function priceMultiplier(value,kind='buy') { const table=kind==='buy'?PURCHASE_MULTIPLIERS:SALE_MULTIPLIERS; return table[clamp(Math.floor(value),2,16)]; }
export function quoteSale(state,lot,hex=state.ship.hex) {
  const good=GOODS.find(g=>g.id===lot.goodId); if(!good) return lot.basePrice||0;
  if(lot.origin===hex) return lot.boughtWeek===state.clock.week?0:Math.round(good.basePrice*.5);
  const world=currentWorld(state,hex); const rng=derive(state.meta.seed,'sale',hex,state.clock.week,lot.goodId);
  const effect=brokerRoll(state,hex).effect;
  // The source SRD uses 2d6 and a 2..16 table, unlike the draft specification's approximate 3d6 example.
  return Math.round(good.basePrice*priceMultiplier(roll(rng,2,6)+bestDM(good,world?.codes||[],'sellDM')+effect,'sell'));
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
    return {id,goodId:g.id,nameKey:g.nameKey,tons:Math.max(0,produced-taken),basePrice:g.basePrice,buyPrice,sellPrice,illegal:isIllegal(g,world),favorable};
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
  return {goods,freight,passengers,contracts};
}
