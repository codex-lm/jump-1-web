import { rulesAtLeast } from '../core/state.js';
import { PORT_CHOICES } from '../core/actions.js';
import { PATRON_PAY_BONUS } from './trade.js';

/** Edition 5: port orders that need a world; in empty space they are refused and END_WEEK routines skip them. */
export const WORLD_ORDERS=Object.freeze(['hospital','patron','escort','market','supplies']);
/** Edition 5 'guard': the gunner's watch during the last port week before a jump covers the scenes queued on arrival.
 * Each comply/paperwork/cover inspection check in an arrival customs or patrol scene gets this DM,
 * and a pirate toll (yielding to pirates) takes this share of the tons it would otherwise take, rounded up. */
export const GUARD_INSPECTION_DM=1;
export const GUARD_TOLL_FACTOR=.5;
/** Edition 5 'freight' / 'passengers': extra steward offers per neighbouring world, current port and week only. */
export const STEWARD_EXTRA_OFFERS=1;
export { PATRON_PAY_BONUS };

/** Pure description of what a port order does under this voyage's rules, for the UI. `key` names a UI catalog entry.
 * `effects` is data only: the reducer remains the authority. */
export function portOrderEffect(state,choice) {
  const station=Number(Object.keys(PORT_CHOICES).find(s=>PORT_CHOICES[s].includes(choice)))||null;
  if(!station)return null;
  const v5=rulesAtLeast(state,5),needsWorld=v5&&WORLD_ORDERS.includes(choice),world=!!state?.subsector?.worlds?.some(w=>w.hex===state.ship?.hex);
  const effects={
    patron:{check:'Carousing',contractPayBonus:v5?PATRON_PAY_BONUS:0,salvageWhenBoardEmpty:true},
    escort:{check:'Streetwise',contractPayBonus:v5?PATRON_PAY_BONUS:0,salvageWhenBoardEmpty:true},
    flightplan:{encounterDM:1,noPatrol:true},
    rest:{mood:1},
    maintenance:{check:'Mechanics',repairPoints:1,waivesMaintenance:true},
    parts:{cost:2000,weeks:4},
    refuel:{fillTank:true},
    guard:v5?{inspectionDM:GUARD_INSPECTION_DM,tollFactor:GUARD_TOLL_FACTOR}:{},
    train:{weeks:4,skillLevels:1},
    heal:{check:'Medicine',replacesNaturalRecovery:v5},
    hospital:{check:'Medicine',minimumPay:500},
    supplies:{cost:1000,weeks:8,medicineDM:1},
    market:{check:'Broker',remembersPrices:true},
    freight:v5?{extraFreightPerWorld:STEWARD_EXTRA_OFFERS}:{},
    passengers:v5?{extraPassengersPerWorld:STEWARD_EXTRA_OFFERS}:{},
    bank:{check:'Admin',defersInstalments:1,oncePerVoyage:true}
  }[choice];
  const inert=!v5&&['guard','freight','passengers'].includes(choice);
  const legacy=!v5&&['guard','freight','passengers','patron','escort','heal'].includes(choice);
  return {choice,station,needsWorld,available:!needsWorld||world,inert,effects,key:`portOrder.effect.${choice}${legacy?'.legacy':''}`};
}
