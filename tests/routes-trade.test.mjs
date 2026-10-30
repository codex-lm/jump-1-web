import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateSubsector,distance,neighbors} from '../src/rules/subsector.js';
import {tradeCodes} from '../src/rules/worldgen.js';
import {createInitialState} from '../src/core/state.js';
import {activeDemand,demandBonus,recordDemandDelivery,quoteSaleTotal,quoteSale} from '../src/rules/trade.js';
import {cargoManifest,renderMarket} from '../src/ui/cargo.js';
import {renderDestination,departurePreview} from '../src/ui/navigation.js';
import {t,esc,money} from '../src/ui/common.js';
import {getLanguage,setLanguage} from '../src/ui/i18n.js';
import {GOODS} from '../src/data/goods.js';

test('route guarantees are edition-gated and retain exact legacy subsectors',()=>{
 const expected={'audit-visuel-2026':'9f1943d02040ae7b684d893348c1269ce7c5a944d2f2a2f45674bc45cc401c32','routes-legacy':'169f23000f753b22f7f5ad33e0e72ac33b97ac0d055f3d62f043f49cfad0590d','campaign-0':'afaaeb8b8067f474908b1db36c0fad16d92c3d724c1ca09d8814489adf72f69b'};
 for(const [seed,digest]of Object.entries(expected)){
  const legacy=generateSubsector(seed);
  assert.equal(createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),digest);
  assert.deepEqual(generateSubsector(seed,{rulesEdition:3}),legacy);
 }
});

test('300 new subsectors offer viable opening branches and onward exits with only local changes',()=>{
 const viable=w=>['A','B','C','D'].includes(w.starport)||w.gasGiant;
 const tradeProfile=w=>JSON.stringify(GOODS.map(g=>[
  !g.available?.length||g.available.includes('All')||g.available.some(code=>w.codes.includes(code)),
  Math.max(0,...w.codes.map(code=>g.buyDM?.[code]||0)),
  Math.max(0,...w.codes.map(code=>g.sellDM?.[code]||0))
 ]));
 for(let i=0;i<300;i++){
  const seed=`routes-${i}`,legacy=generateSubsector(seed),sector=generateSubsector(seed,{rulesEdition:4});
  assert.deepEqual(generateSubsector(seed,{rulesEdition:4}),sector);
  assert.deepEqual(generateSubsector(seed,{rulesEdition:5}),sector,`${seed}: edition 5 keeps the 0.4 opening routes`);
  assert.equal(sector.startHex,legacy.startHex);assert.equal(sector.bankHex,legacy.bankHex);
  const first=sector.worlds.filter(w=>distance(sector.startHex,w.hex)===1);
  assert.ok(first.filter(viable).length>=2,seed);
  assert.ok(first.filter(w=>w.population>0).length>=2,seed);
  assert.ok(new Set(first.map(w=>w.codes.join('|'))).size>=2,seed);
  assert.ok(new Set(first.map(tradeProfile)).size>=2,`${seed}: genuinely distinct trade opportunities`);
  for(const world of first){
   assert.ok(viable(world));
   const exits=sector.worlds.filter(w=>w.hex!==sector.startHex&&distance(world,w)===1&&viable(w));
   assert.ok(exits.length>=Math.min(2,neighbors(world).filter(h=>h!==sector.startHex).length),`${seed} ${world.hex}`);
  }
  for(const world of sector.worlds)assert.deepEqual(world.codes,tradeCodes(world));
  for(const world of legacy.worlds)if(distance(sector.startHex,world)>2)assert.deepEqual(sector.worlds.find(w=>w.hex===world.hex),world);
 }
});

function demandFixture(){
 const state=createInitialState('demand-ledger',{rulesEdition:4});state.phase='port';
 const world=state.subsector.worlds.find(w=>activeDemand(state,w.hex));state.ship.hex=world.hex;
 const demand=activeDemand(state),good=GOODS.find(g=>g.id===demand.goodId);
 const lot={id:'imports',kind:'speculative',origin:state.subsector.worlds.find(w=>w.hex!==world.hex).hex,goodId:good.id,nameKey:good.nameKey,basePrice:good.basePrice,buyPrice:good.basePrice,tons:demand.volume+9,boughtWeek:1};
 state.cargo=[lot];return {state,lot,demand};
}

test('temporary demand quotes are stable and read-only; premium is capped across split sales',()=>{
 const {state,lot,demand}=demandFixture(),before=JSON.stringify(state),unit=quoteSale(state,lot);
 const full=quoteSaleTotal(state,lot);
 assert.equal(full.base,unit*lot.tons);assert.equal(full.bonus,demand.volume*demand.bonusPerTon);
 assert.equal(full.bonusTons,demand.volume);assert.equal(full.total,full.base+full.bonus);
 assert.deepEqual(activeDemand({...state,clock:{...state.clock,week:demand.untilWeek}}),demand);
 assert.equal(JSON.stringify(state),before);
 const first=recordDemandDelivery(state,lot,5);lot.tons-=5;
 assert.equal(first.amount,5*demand.bonusPerTon);
 const remaining=quoteSaleTotal(state,lot);assert.equal(remaining.bonus,(demand.volume-5)*demand.bonusPerTon);
 const second=recordDemandDelivery(state,lot,lot.tons);
 assert.equal(first.amount+second.amount,demand.volume*demand.bonusPerTon);
 assert.equal(activeDemand(state).remaining,0);assert.equal(demandBonus(state,lot),null);
 assert.equal(quoteSale(state,lot),unit);
 state.clock.week=demand.untilWeek+1;
 const renewed=activeDemand(state);assert.notEqual(renewed.id,demand.id);assert.equal(renewed.remaining,renewed.volume);
 assert.equal(state.demandDeliveries[demand.id],demand.volume);
});

test('demand premiums exclude local flips, liquidations, invalid quantities and legacy games',()=>{
 const {state,lot}=demandFixture();
 assert.equal(demandBonus(state,{...lot,origin:state.ship.hex}),null);
 assert.equal(demandBonus(state,{...lot,kind:'freight'}),null);
 for(const amount of [0,-1,.5,Infinity,NaN])assert.equal(demandBonus(state,lot,amount),null);
 state.phase='payment';assert.equal(demandBonus(state,lot),null);assert.equal(quoteSaleTotal(state,lot).bonus,0);
 state.phase='port';delete state.meta.config.rulesEdition;delete state.demandDeliveries;
 assert.equal(activeDemand(state),null);assert.equal(recordDemandDelivery(state,lot),null);
 assert.equal('demandDeliveries' in state,false);
});

test('cargo UI respects refit capacities and shows the real bounded premium',()=>{
 const {state,lot,demand}=demandFixture();state.ship.outfits=['reserve','cabins'];state.economy.credits=1000000;
 lot.tons=10;const before=JSON.stringify(state),html=cargoManifest(state,true),marketHtml=renderMarket(state);
 assert.match(html,/aria-valuemax="50"/);assert.match(html,/0 \/ 7/);assert.match(html,/0 \/ 20/);
 assert.match(html,/trade-sale-bonus/);assert.match(marketHtml,/trade-demands/);
 for(const input of marketHtml.matchAll(/<input[^>]+max="(\d+)"/g))assert.ok(Number(input[1])<=40);
 assert.equal(JSON.stringify(state),before);assert.ok(demand.bonusPerTon<=5000);
});

test('selected destination shows only its current unfilled public request, in both languages',()=>{
 const {state,demand}=demandFixture(),language=getLanguage();
 state.ship.hex=state.subsector.worlds.find(w=>distance(w,demand.hex)===1).hex;
 state.demandDeliveries[demand.id]=3;
 const before=JSON.stringify(state);
 try{
  for(const lang of ['en','fr']){
   setLanguage(lang);
   const html=renderDestination(state,demand.hex);
   const card=html.match(/<div class="trade-demand destination-demand">(.*?)<\/div>/s)?.[1];
   assert.ok(card);assert.ok(card.includes(esc(t(demand.nameKey))));
   assert.ok(card.includes(esc(t('trade.demandTerms',{remaining:demand.volume-3,volume:demand.volume,bonus:money(demand.bonusPerTon),week:demand.untilWeek}))));
   assert.ok(html.indexOf('destination-demand')<html.indexOf('destination-actions'));
   assert.ok(html.indexOf('destination-demand')<html.indexOf('<details'));
  }
 }finally{setLanguage(language);}
 assert.equal(JSON.stringify(state),before);
 state.clock.week=5;state.arrivalWeek=5;
 assert.equal(departurePreview(state,demand.hex).arrivalWeek,7);
 assert.equal(departurePreview(state,demand.hex,{quick:true}).arrivalWeek,6);
 assert.match(renderDestination(state,demand.hex),/destination-demand-expiring/);
 state.clock.week=4;
 assert.doesNotMatch(renderDestination(state,demand.hex),/destination-demand-expiring/);
 state.demandDeliveries[demand.id]=demand.volume;
 assert.doesNotMatch(renderDestination(state,demand.hex),/destination-demand/);
 state.clock.week=7;
 assert.match(renderDestination(state,demand.hex),/destination-demand/);
 delete state.meta.config.rulesEdition;
 assert.doesNotMatch(renderDestination(state,demand.hex),/destination-demand/);
});
