import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {market} from '../src/rules/trade.js';
import {reduce} from '../src/core/reducer.js';
import {renderMarket,cargoManifest,updateMarketTotal} from '../src/ui/cargo.js';
import {setLanguage,money,t} from '../src/ui/i18n.js';

function rowContaining(html,id){
  const row=html.match(/<tr>.*?<\/tr>/gs)?.find(value=>value.includes(`id="${id}"`));
  assert.ok(row,`Offer ${id} must remain actionable`);
  return row;
}

test('exchange quotes show an exact affordable total without changing deterministic offers',()=>{
  setLanguage('en');
  const state=createInitialState('commerce-ui');state.phase='port';state.economy.credits=1000000;
  const before=JSON.stringify(state),offers=market(state),html=renderMarket(state);
  for(const offer of offers.goods){
    const quantity=Math.min(10,offer.tons,Math.floor(state.economy.credits/offer.buyPrice));
    const row=rowContaining(html,`qty-${offer.id}`);
    assert.ok(row.includes(`value="${quantity}"`));
    assert.ok(row.includes(`>${money(quantity*offer.buyPrice)} Cr</output>`));
    assert.ok(row.includes(`data-good="${offer.goodId}"`));
    assert.ok(row.includes(`data-id="${offer.id}"`));
  }
  assert.equal(JSON.stringify(state),before);
  assert.deepEqual(market(state),offers);
  const tooExpensive=structuredClone(state);tooExpensive.economy.credits=0;
  const blocked=renderMarket(tooExpensive);
  assert.ok(blocked.includes('data-market-available="false" disabled'));
  assert.doesNotMatch(blocked,/<button data-action="buy"[^>]*(?<!disabled)>/);
});

test('passenger quote uses the selected available berths rather than the whole advertised group',()=>{
  setLanguage('en');
  const state=createInitialState('commerce-ui');state.phase='port';
  state.passengers=[{class:'High',count:4,destination:'0205',pay:32000}];
  const offer=market(state).passengers.find(p=>p.class==='Middle'&&p.count>2);
  assert.ok(offer);
  const row=rowContaining(renderMarket(state,'passengers'),`paxcount-${offer.id}`);
  assert.ok(row.includes('max="2" step="1" value="2"'));
  assert.ok(row.includes(`data-market-unit-price="${offer.pay/offer.count}"`));
  assert.ok(row.includes(`>${money(offer.pay/offer.count*2)} Cr</output>`));
  assert.ok(row.includes(`data-id="${offer.id}"`));
});

test('live quotes reject blank, fractional and over-capacity quantities and recover on a valid amount',()=>{
  setLanguage('fr');
  const output={textContent:''},button={disabled:false},attributes={};
  const input={value:'3',max:'4',dataset:{marketUnitPrice:'8400',marketAvailable:'true'},
    matches:()=>true,closest:()=>({querySelector:selector=>selector==='button'?button:output}),
    setAttribute:(key,value)=>{attributes[key]=value;}};
  assert.equal(updateMarketTotal(input),true);
  assert.equal(output.textContent,`${money(25200)} Cr`);assert.equal(button.disabled,false);
  for(const amount of ['', '0','2.5','5','not a number']){
    input.value=amount;updateMarketTotal(input);
    assert.equal(button.disabled,true);assert.equal(output.textContent,t('market.selectquantity'));
    assert.equal(attributes['aria-invalid'],'true');
  }
  input.value='4';updateMarketTotal(input);
  assert.equal(button.disabled,false);assert.equal(output.textContent,`${money(33600)} Cr`);
  input.dataset.marketAvailable='false';updateMarketTotal(input);
  assert.equal(button.disabled,true);assert.equal(output.textContent,'—');
  assert.equal(updateMarketTotal({matches:()=>false}),false);
});

test('empty manifests stay compact in the sidebar and offer port actions only in the full view',()=>{
  const state=createInitialState('commerce-ui');state.phase='port';
  const compact=cargoManifest(state),full=cargoManifest(state,true);
  assert.match(compact,/cargo-manifest-compact/);assert.doesNotMatch(compact,/data-action="market"/);
  assert.match(full,/cargo-manifest-full/);assert.match(full,/data-tab="goods"/);assert.match(full,/data-tab="passengers"/);
  state.phase='scene';assert.doesNotMatch(cargoManifest(state,true),/data-action="market"/);
});

test('mission cargo shows its actual contract delivery rather than invented defaults',()=>{
  setLanguage('en');
  let state=reduce(createInitialState('commerce-ui'),{t:'CHARGEN_DONE'});
  const offer=market(state).contracts.find(c=>c.tons>0);assert.ok(offer);
  state=reduce(state,{t:'ACCEPT_CONTRACT',id:offer.id});assert.equal(state.lastError,null);
  const html=cargoManifest(state,true);
  assert.ok(html.includes(t('market.deadline',{week:offer.deadline})));
  assert.ok(html.includes(`${money(offer.pay)} Cr`));
  assert.doesNotMatch(html,/Due week 52/);
});
