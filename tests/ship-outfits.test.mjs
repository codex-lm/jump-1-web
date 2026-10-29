import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {createShip,fuelCapacity,cargoCapacity,cabinCapacity,repairBonus,refitPreview,applyRefit} from '../src/rules/ship.js';
import {shipPanel,shipZoom,shipDetail,renderRefits} from '../src/ui/ship.js';

function fixture(){
  const state=createInitialState('ship-refit-contracts');
  state.meta.config.rulesEdition=4;state.phase='port';state.economy.credits=100000;
  state.subsector.worlds.find(world=>world.hex===state.ship.hex).starport='A';
  return state;
}
function rejectsUnchanged(state,id,error,remove=false){
  const before=JSON.stringify(state);
  assert.deepEqual(applyRefit(state,id,remove),{error});
  assert.equal(JSON.stringify(state),before);
}

test('legacy ship capacities and state shape ignore every fitting',()=>{
  const state=fixture();delete state.meta.config.rulesEdition;
  const original=createShip('Legacy','0101');
  assert.equal(Object.hasOwn(original,'outfits'),false);
  assert.equal(Object.hasOwn(original,'refitWeek'),false);
  state.ship.outfits=['reserve','workshop','cabins'];
  assert.equal(fuelCapacity(state),30);assert.equal(cargoCapacity(state),82);
  assert.equal(cabinCapacity(state),5);assert.equal(repairBonus(state),0);
  rejectsUnchanged(state,'reserve','REFIT_UNAVAILABLE');
  assert.equal(renderRefits(state),'');
});

test('fittings spend once, consume two exclusive bays and respect the port-week limit',()=>{
  const state=fixture(),before=JSON.stringify(state);
  const preview=refitPreview(state,'reserve');assert.equal(JSON.stringify(state),before);
  assert.deepEqual(preview.capacities,{fuel:50,cargo:62,cabins:5});
  const installed=applyRefit(state,'reserve');assert.equal(installed.error,undefined);
  assert.equal(state.economy.credits,75000);assert.equal(state.economy.expenses.refits,25000);
  assert.equal(state.ship.fuel,30,'a tank does not grant free fuel');
  assert.equal(state.ship.refitWeek,`${state.ship.hex}:${state.clock.week}`);
  rejectsUnchanged(state,'workshop','REFIT_WEEK_USED');
  state.clock.week++;assert.equal(applyRefit(state,'workshop').error,undefined);
  assert.equal(cargoCapacity(state),54);assert.equal(repairBonus(state),1);
  assert.equal(state.economy.credits,55000);assert.equal(state.economy.expenses.refits,45000);
  state.clock.week++;rejectsUnchanged(state,'cabins','REFIT_SLOTS_FULL');
  rejectsUnchanged(state,'reserve','REFIT_INSTALLED');
});

test('removing a fuel reserve never discards fuel and never refunds the fitting',()=>{
  const state=fixture();applyRefit(state,'reserve');state.clock.week++;
  state.ship.fuel=40;rejectsUnchanged(state,'reserve','REFIT_FUEL_CAPACITY',true);
  state.ship.fuel=30;state.economy.credits=-10;
  const removed=applyRefit(state,'reserve',true);assert.equal(removed.cost,0);
  assert.deepEqual(state.ship.outfits,[]);assert.equal(fuelCapacity(state),30);
  assert.equal(state.economy.credits,-10,'free removal remains possible in debt');
  assert.equal(state.economy.expenses.refits,25000);
});

test('fitting changes preserve cargo and passengers or reject the entire change',()=>{
  const state=fixture();
  state.cargo=[{id:'freight',kind:'freight',tons:60},{id:'mission',kind:'mission',tons:3,contractId:'contract'}];
  state.contracts=[{id:'contract',tons:3}];
  rejectsUnchanged(state,'reserve','REFIT_CARGO_CAPACITY');
  state.cargo[0].tons=59;assert.equal(applyRefit(state,'reserve').error,undefined);
  assert.equal(state.cargo[1].tons,3);assert.equal(state.contracts.length,1);
  const passengerState=fixture();applyRefit(passengerState,'cabins');passengerState.clock.week++;
  passengerState.passengers=[{id:'middle',class:'Middle',count:12},{id:'low',class:'Low',count:20}];
  assert.equal(cabinCapacity(passengerState),7);assert.equal(cargoCapacity(passengerState),70);
  rejectsUnchanged(passengerState,'cabins','REFIT_CABIN_CAPACITY',true);
  passengerState.passengers[0].count=10;
  assert.equal(applyRefit(passengerState,'cabins',true).error,undefined);
  assert.equal(passengerState.passengers[0].count,10);assert.equal(passengerState.passengers[1].count,20);
});

test('refits reject unknown equipment, unavailable yards, transit and unaffordable purchases atomically',()=>{
  const state=fixture();rejectsUnchanged(state,'unknown','INVALID_REFIT');
  rejectsUnchanged(state,'reserve','REFIT_NOT_INSTALLED',true);
  state.phase='scene';rejectsUnchanged(state,'reserve','REFIT_NOT_AT_PORT');state.phase='port';
  const world=state.subsector.worlds.find(world=>world.hex===state.ship.hex);
  for(const port of ['C','D','E','X']){world.starport=port;rejectsUnchanged(state,'reserve','REFIT_YARD_UNAVAILABLE');}
  world.starport='B';state.economy.credits=24999;rejectsUnchanged(state,'reserve','NO_CREDITS');
  state.economy.credits=25000;assert.equal(applyRefit(state,'reserve').error,undefined);
});

test('all ship views and the interactive diagram show fitted capacities without mutating state',()=>{
  const state=fixture();applyRefit(state,'reserve');state.clock.week++;applyRefit(state,'cabins');
  const before=JSON.stringify(state);
  for(const html of [shipPanel(state),shipZoom(state),shipDetail(state)]){
    assert.match(html,/aria-valuemax="50"/);assert.match(html,/aria-valuemax="50" aria-valuenow="0"/);
    assert.match(html,/<title>[^<]*50 t<\/title>/);assert.doesNotMatch(html,/>undefined</);
  }
  const fittings=renderRefits(state);assert.match(fittings,/data-refit="reserve" data-remove="1"/);
  assert.match(fittings,/data-refit="workshop" data-remove="0" disabled/);
  assert.equal(JSON.stringify(state),before);
});
