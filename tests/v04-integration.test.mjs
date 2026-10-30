import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,assertState,serialize,deserialize,CURRENT_RULES_EDITION} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {createLocal,validateSave} from '../src/net/local.js';
import {fuelCapacity,cargoCapacity,cabinCapacity} from '../src/rules/ship.js';
import {market,activeDemand,quoteSaleTotal} from '../src/rules/trade.js';
import {GOODS} from '../src/data/goods.js';

function fixture(seed='v04-integration',edition=4){
  const state=reduce(createInitialState(seed,{rulesEdition:edition}),{t:'CHARGEN_DONE'});
  state.economy.credits=1000000;
  state.subsector.worlds.find(world=>world.hex===state.ship.hex).starport='A';
  return state;
}
function send(state,action){const next=reduce(state,action);assert.equal(next.lastError,null,JSON.stringify(action));assertState(next);return next;}
function rejected(state,action,error){
  const before=serialize(state),next=reduce(state,action);
  assert.equal(next.lastError,error);assert.equal(serialize(state),before);
  assert.equal(serialize({...next,lastError:state.lastError}),before);
}

// Every 0.4.0 feature must behave identically in later rules editions.
for(const edition of [4,CURRENT_RULES_EDITION]){
test(`edition ${edition} refit integrates fuel purchase, purge cost and bounded quantities`,()=>{
  const initial=fixture(undefined,edition),before=serialize(initial);
  let state=send(initial,{t:'REFIT',id:'reserve'});
  assert.equal(serialize(initial),before);assert.equal(fuelCapacity(state),50);assert.equal(cargoCapacity(state),62);
  assert.equal(state.portWorked,true);assert.equal(state.economy.expenses.refits,25000);
  const cash=state.economy.credits;state=send(state,{t:'REFUEL'});
  assert.equal(state.ship.fuel,50);assert.equal(state.economy.credits,cash-10000);
  state.ship.fuel=10;state.ship.fuelType='raw';const beforePurge=state.economy.credits;
  state=send(state,{t:'REFUEL',type:'refined',purge:true,tons:50});
  assert.equal(state.ship.fuel,50);assert.equal(state.ship.fuelType,'refined');assert.equal(state.economy.credits,beforePurge-25000);
  rejected(state,{t:'REFUEL',tons:51},'INVALID_QUANTITY');
  state.clock.week++;rejected(state,{t:'REFIT',id:'reserve',remove:true},'REFIT_FUEL_CAPACITY');
  assert.deepEqual(deserialize(serialize(state)),state);
});

test(`edition ${edition} reduced cargo capacity rejects goods, freight and mission cargo consistently`,()=>{
  let state=send(fixture(undefined,edition),{t:'REFIT',id:'reserve'});
  state.cargo=[{id:'existing-freight',kind:'freight',tons:62,destination:'0101'}];
  const offers=market(state),good=offers.goods.find(g=>g.tons>0),freight=offers.freight[0];
  assert.ok(good);assert.ok(freight);
  rejected(state,{t:'BUY',goodId:good.goodId,tons:1},'CARGO_FULL');
  rejected(state,{t:'BOOK_FREIGHT',id:freight.id},'CARGO_FULL');
  // Edition 5 only honours a patron offer secured at this port this week; the extra fields are ignored by edition 4.
  state.patronOffer={id:'capacity-mission',type:'smuggle',destination:'0101',pay:25000,deadline:4,tons:5,hex:state.ship.hex,week:state.clock.week};
  rejected(state,{t:'ACCEPT_CONTRACT',id:'capacity-mission'},'CARGO_FULL');
  state.cargo[0].tons=57;state=send(state,{t:'ACCEPT_CONTRACT',id:'capacity-mission'});
  assert.equal(state.cargo.reduce((sum,lot)=>sum+lot.tons,0),62);assert.equal(state.contracts.length,1);
  state.cargo.push({id:'overflow',kind:'freight',tons:1});assert.throws(()=>assertState(state),/INVALID_CARGO/);
});

test(`edition ${edition} cabin refit allows seven occupied cabins while low berths remain twenty`,()=>{
  let state,offer;
  for(let i=0;i<100;i++){
    const candidate=fixture(`v04-passengers-${i}`,edition),found=market(candidate).passengers.find(p=>p.class==='Middle'&&p.count>=4);
    if(found){state=candidate;offer=found;break;}
  }
  assert.ok(offer);state=send(state,{t:'REFIT',id:'cabins'});
  state.passengers=[{id:'aboard',class:'High',count:5,destination:'0101',pay:40000}];
  assert.equal(cabinCapacity(state),7);state=send(state,{t:'BOOK_PASSENGER',id:offer.id,count:4});
  state.clock.week++;rejected(state,{t:'REFIT',id:'cabins',remove:true},'REFIT_CABIN_CAPACITY');
  const low=market(state).passengers.find(p=>p.class==='Low');assert.ok(low);
  state.passengers.push({id:'low-aboard',class:'Low',count:20,destination:'0101',pay:20000});
  rejected(state,{t:'BOOK_PASSENGER',id:low.id,count:1},'CABINS_FULL');
});

test(`edition ${edition} exported refit actions and configuration replay exactly; rejected actions are not saved`,()=>{
  const previousStorage=globalThis.localStorage,storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  try{
    let local;
    for(let i=0;i<100;i++){
      const candidate=createLocal(`v04-refit-save-${i}`,{rulesEdition:edition});candidate.send({t:'CHARGEN_DONE'});
      if(candidate.getState().economy.credits>=35000){local=candidate;break;}
    }
    assert.ok(local);assert.equal(local.send({t:'REFIT',id:'reserve'}).error,undefined);
    assert.equal(local.send({t:'REFUEL'}).error,undefined);
    const save=local.exportSave();assert.equal(save.config.rulesEdition,edition);assert.equal(validateSave(save),true);
    assert.deepEqual(createLocal(save.seed,save.config,save.actions).getState(),local.getState());
    const length=save.actions.length;assert.equal(local.send({t:'REFIT',id:'reserve',remove:true}).error,'REFIT_WEEK_USED');
    assert.equal(local.exportSave().actions.length,length);
    const legacy=createLocal('v04-legacy-unchanged',{});legacy.send({t:'CHARGEN_DONE'});
    assert.equal(Object.hasOwn(legacy.exportSave().config,'rulesEdition'),false);
    assert.equal(legacy.send({t:'REFIT',id:'reserve'}).error,'REFIT_UNAVAILABLE');
    assert.equal(legacy.send({t:'REFUEL',tons:40}).error,'INVALID_QUANTITY');
  }finally{if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
});

test(`edition ${edition} partial sales pay the quoted demand premium once and respect its finite volume`,()=>{
  let state=fixture(undefined,edition);const demand=activeDemand(state);assert.ok(demand);
  const good=GOODS.find(g=>g.id===demand.goodId),tons=demand.volume+5;
  state.cargo=[{id:'demand-import',kind:'speculative',goodId:good.id,nameKey:good.nameKey,tons,basePrice:good.basePrice,buyPrice:100,origin:state.ship.hex==='0101'?'0102':'0101',boughtWeek:1}];
  const firstQuote=quoteSaleTotal(state,state.cargo[0],demand.volume-1),firstCash=state.economy.credits;
  state=send(state,{t:'SELL',cargoId:'demand-import',tons:demand.volume-1});
  assert.equal(state.economy.credits-firstCash,firstQuote.total);
  assert.equal(state.demandDeliveries[demand.id],demand.volume-1);
  const secondQuote=quoteSaleTotal(state,state.cargo[0]),secondCash=state.economy.credits;
  assert.equal(secondQuote.bonusTons,1);state=send(state,{t:'SELL',cargoId:'demand-import'});
  assert.equal(state.economy.credits-secondCash,secondQuote.total);assert.equal(state.demandDeliveries[demand.id],demand.volume);
  assert.equal(state.cargo.length,0);assert.equal(activeDemand(state).remaining,0);
});
}
