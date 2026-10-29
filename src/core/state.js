import { generateSubsector } from '../rules/subsector.js';
import { generateCrew } from '../rules/chargen.js';
import { generateBonds } from '../rules/bonds.js';
import { createShip, fuelCapacity, cargoCapacity, cabinCapacity, cabinsUsed } from '../rules/ship.js';
import { createEconomy } from '../rules/economy.js';
import { createCollector } from '../rules/collector.js';
import { DEFAULT_ROUTINES } from './actions.js';

export const SAVE_VERSION=1;
export function createInitialState(seed,config={}) {
  seed=String(seed||'lantern-01').slice(0,120);
  const difficulty=['easy','normal','hard'].includes(config.difficulty)?config.difficulty:'normal';
  const normalized={difficulty,shipName:String(config.shipName||'La Lanterne').slice(0,40),daily:!!config.daily,showSecrets:!!config.showSecrets&&!config.daily,humanStations:Array.isArray(config.humanStations)?[...new Set(config.humanStations.map(Number).filter(n=>n>=1&&n<=5))].sort():[1]};
  if(config.portraitEdition===2)normalized.portraitEdition=2;
  if(config.rulesEdition===4)normalized.rulesEdition=4;
  if(normalized.daily)normalized.difficulty='normal';
  const subsector=generateSubsector(seed,normalized),crew=generateCrew(seed,normalized);
  return {meta:{seed,config:normalized,version:SAVE_VERSION,actionCount:0,rerollUsed:false,chargenComplete:false},...(normalized.rulesEdition===4?{voyage:{stories:[]},demandDeliveries:{}}:{}),phase:'chargen',clock:{week:1,month:1,day:1,completedWeeks:0,lostWeeksPending:0},crew,ship:createShip(normalized.shipName,subsector.startHex),subsector,economy:createEconomy(normalized),cargo:[],passengers:[],contracts:[],collector:createCollector(seed,subsector),bonds:generateBonds(seed,crew),scene:null,sceneQueue:[],log:[],milestones:[],ending:null,stats:{jumps:0,weeksLost:0,maxPressure:0,contractsCompleted:0,lowDeaths:0,rounds:0},route:[subsector.startHex],routines:{...DEFAULT_ROUTINES},portActions:{},marketPurchases:{},bookedOffers:[],knownMarkets:{},arrivalWeek:0,portPending:false,portWorked:false,portWeekComplete:false,pendingDeparture:null,captainStation:1,objections:[],lastError:null};
}
export function assertState(state) {
  if(!state||state.meta?.version!==SAVE_VERSION||typeof state.meta.seed!=='string')throw new Error('INVALID_STATE');
  if(!state.ship||state.ship.fuel<0||state.ship.fuel>fuelCapacity(state)||state.ship.hull<0||state.ship.hull>40||state.ship.structure<0||state.ship.structure>40)throw new Error('INVALID_SHIP');
  if(!state.economy||!Number.isFinite(state.economy.credits)||state.economy.arrears<0)throw new Error('INVALID_ECONOMY');
  if(state.cargo.reduce((sum,l)=>sum+l.tons,0)>cargoCapacity(state)||state.cargo.some(l=>l.tons<=0))throw new Error('INVALID_CARGO');
  if(state.clock.week<1||state.clock.week>52||!Array.isArray(state.crew)||state.crew.length!==5)throw new Error('INVALID_CLOCK_OR_CREW');
  if(cabinsUsed(state)>cabinCapacity(state))throw new Error('INVALID_CABINS');
  if(state.log.length>400)throw new Error('INVALID_LOG');
  return true;
}
export const serialize=state=>JSON.stringify(state);
export function deserialize(text){if(typeof text!=='string'||text.length>2000000)throw new Error('INVALID_STATE');const state=JSON.parse(text);assertState(state);return state;}
