import { derive } from '../../core/rng.js';
import { task } from '../../core/dice.js';
import { systemDM } from '../ship.js';
export function addLog(state,key,params={},roll=null) {
  const entry={week:state.clock.week,key,params};if(roll)entry.roll=roll;state.log.push(entry);if(state.log.length>400)state.log.splice(0,state.log.length-400);
  const essential=['log.runStarted','log.missedPayment','log.secret','log.ending','log.jump'];
  const memorable=[...essential,'log.voyage.friend','log.voyage.friendCredits','log.voyage.friendParts','log.voyage.promise','log.voyage.promiseKept','log.voyage.promiseBroken','log.refitInstalled','log.demandBonus','log.payment','log.misjump','log.scene','log.collectorPaid','log.negotiated','log.informantTurned','log.informantDismissed','log.contractDelivered','log.enemyDefeated'];
  state.milestones ||= [];
  const firstJump=key==='log.jump'&&!state.milestones.some(e=>e.key==='log.jump');
  const largeSale=key==='log.sell'&&params.profit>=50000&&params.profit>(state.meta.bestTradeProfit||0);
  if((memorable.includes(key)&&(key!=='log.jump'||firstJump))||largeSale){
    if(largeSale){state.meta.bestTradeProfit=params.profit;state.milestones=state.milestones.filter(e=>e.key!=='log.sell');}
    state.milestones.push({week:entry.week,key,params:{...params}});
    if(state.milestones.length>60){const disposable=state.milestones.findIndex(e=>!essential.includes(e.key));state.milestones.splice(disposable>=0?disposable:0,1);}
  }
  return entry;
}
export function actor(state,station) { return state.crew.find(c=>c.station===Number(station)&&c.alive&&c.active!==false&&!c.unconscious)||null; }
export function check(state,station,skill,{difficulty=0,situation=0,characteristic,system,label='task'}={}) {
  const p=actor(state,station);const defaults={'Pilot':'DEX','Navigation':'INT','Engineering':'INT','Mechanics':'INT','Gunnery':'DEX','Medicine':'EDU','Steward':'SOC','Broker':'INT','Admin':'EDU','Streetwise':'INT','Carousing':'SOC','Leadership':'SOC','Tactics':'INT','Gun Combat':'DEX','Melee':'STR','Comms':'EDU','Computer':'INT','Sensors':'INT','Vacc Suit':'DEX','Zero-G':'DEX','Survival':'END'};const characteristicKey=characteristic||defaults[skill]||'INT';
  let dm=situation+(p?.mood<0?-1:0)+(p?.wounded?-2:0)+(system?systemDM(state,system):0);
  if(state.scene&&p) for(const bond of state.bonds) { const other=bond.a===p.id?bond.b:bond.b===p.id?bond.a:null; if(other&&state.crew.some(c=>c.id===other&&c.alive&&c.active!==false&&!c.unconscious)) { if(bond.type==='comrades')dm++;if(bond.type==='shared-secret'&&label==='cover')dm+=2;if(bond.type==='rivals'&&skill==='Leadership')dm--; } }
  const rng=derive(state.meta.seed,'turn',state.clock.week,state.scene?.round||0,p?.id||`vacant-${station}`,state.scene?.type||'port',label);
  const parameters={rng,skill:p?.skills[skill],characteristic:(p?.characteristics[characteristicKey]??7)+(p?.secret==='noble'&&characteristicKey==='SOC'?2:0),difficulty,situation:dm,joat:p?.skills['Jack-of-all-Trades']||0};
  let result=task(parameters);
  addLog(state,'log.task',{name:p?.name||'—',station,skill,characteristic:characteristicKey,difficulty,effect:result.effect},result);
  if(!result.success&&station!==1&&state.scene?.flags.leadership&&!state.scene.flags.leadershipUsed){state.scene.flags.leadershipUsed=true;result=task({...parameters,rng:derive(state.meta.seed,'turn',state.clock.week,state.scene.round,p?.id||station,'leadership',label)});addLog(state,'log.leadershipReroll',{name:p?.name||'—'});addLog(state,'log.task',{name:p?.name||'—',station,skill,characteristic:characteristicKey,difficulty,effect:result.effect},result);}
  return result;
}
