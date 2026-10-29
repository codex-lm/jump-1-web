import { roll } from '../core/dice.js';
export const TRAVEL_EVENTS=Object.freeze(['bond','illness','cards','fire','homesick','bank-letter','dream','rumor','birthday','secret','rivalry','debt','shared-past','leak','stowaway','music','signals','anomaly','quiet-watch','good-meal']);
export function encounter(state,world,rng) { const dm=(world.starport==='A'?1:0)+(world.naval?1:0)+(state.ship.flightplan?1:0)-(world.pirate?2:0)-(world.zone==='Amber'?1:0)-(world.law===0?1:0); const result=roll(rng,2,6)+dm; if(result<=4)return {type:'pirate',level:result<=2?2:1}; if(result===5)return {type:'derelict'}; if(result<=8)return null; if(result<=10)return state.ship.flightplan?null:{type:'patrol'}; if(result===11)return {type:'trader'};
  // A sighting is information, not a seizure. Only advanceCollector's real,
  // pressured same-hex contact can open repo; a docked bank never attacks.
  if(state.scene?.type==='repo'||state.sceneQueue?.some(scene=>scene.type==='repo'))return null;
  return {type:'repo-sighting'};
}
