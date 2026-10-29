import { derive } from '../core/rng.js';
import { task, d6 } from '../core/dice.js';

export const SYSTEMS = Object.freeze(['jump','maneuver','power','turret','sensors','sickbay','cargo','quarters']);
export const CAPACITY = Object.freeze({cargo:82,fuel:30,cabins:5,low:20,hull:40,structure:40});
export function createShip(name,hex) { return {name:String(name || 'La Lanterne').slice(0,40),hex,hull:40,structure:40,fuel:30,fuelType:'refined',systems:Object.fromEntries(SYSTEMS.map(id=>[id,3])),partsUntil:0,suppliesUntil:0,aim:0,flightplan:false,guard:false}; }
export function cargoUsed(state) { return state.cargo.reduce((n,lot)=>n+lot.tons,0); }
export function cabinsUsed(state) { return state.passengers.reduce((n,p)=>n+(p.class === 'High'? p.count : p.class === 'Middle' ? p.count/2 : 0),0); }
export function lowUsed(state) { return state.passengers.filter(p=>p.class === 'Low').reduce((n,p)=>n+p.count,0); }
export function systemDM(state,id) { return -(3-(state.ship.systems[id]??3))-(state.ship.systems.power === 0 && id !== 'power'?1:0); }
export function damagePerson(person,amount,rng) {
  if (!person?.alive||person.active===false) return 0;
  let remaining=Math.max(0,Math.floor(amount));
  const physical=['END', ...(rng() < .5 ? ['STR','DEX']:['DEX','STR'])];
  for (const c of physical) { const lost=Math.min(person.characteristics[c],remaining); person.characteristics[c]-=lost; remaining-=lost; }
  const zeros=physical.filter(c=>person.characteristics[c] <= 0).length;
  person.wounded=zeros >= 1; person.unconscious=zeros >= 2; person.alive=zeros < 3;
  return amount-remaining;
}
export function healCrew(state,points=1) {
  let healed=0;
  for(const person of state.crew.filter(p=>p.alive&&p.active!==false)) {
    let left=points;
    for(const c of ['END','STR','DEX']) { const max=person.maxCharacteristics?.[c] ?? 8; const add=Math.min(left,Math.max(0,max-person.characteristics[c])); person.characteristics[c]+=add; left-=add; healed+=add; }
    person.wounded=['END','STR','DEX'].some(c=>person.characteristics[c]===0); person.unconscious=['END','STR','DEX'].filter(c=>person.characteristics[c]===0).length>=2;
  }
  return healed;
}
export function damageShip(state,amount,rng) {
  const hullDamage=Math.min(state.ship.hull,Math.max(0,amount)); state.ship.hull-=hullDamage;
  const penetrating=Math.max(0,amount-hullDamage); state.ship.structure=Math.max(0,state.ship.structure-penetrating);
  let system=null;
  if(penetrating>0) { system=rng.pick(SYSTEMS); state.ship.systems[system]=Math.max(0,state.ship.systems[system]-1); if(system==='cargo' && state.cargo.length) { let lost=d6(rng)*5; for(const lot of state.cargo) { const n=Math.min(lost,lot.tons); lot.tons-=n; lost-=n; } state.cargo=state.cargo.filter(lot=>lot.tons>0); } }
  if(d6(rng)===6 && state.crew.some(p=>p.alive&&p.active!==false)) damagePerson(rng.pick(state.crew.filter(p=>p.alive&&p.active!==false)),Math.max(0,d6(rng)-2),rng);
  return {damage:amount,hullDamage,penetrating,system};
}
export function escapePods(state) {
  let escaped=0;
  for(const p of state.crew.filter(c=>c.alive&&c.active!==false)) { const check=task({rng:derive(state.meta.seed,'escape',state.clock.week,p.id),skill:p.skills['Vacc Suit'],characteristic:p.characteristics.DEX,joat:p.skills['Jack-of-all-Trades']||0}); if(check.success) escaped++; else p.alive=false; }
  return escaped;
}
