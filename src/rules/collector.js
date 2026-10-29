import { derive } from '../core/rng.js';
import { distance, neighbors } from './subsector.js';
import { task } from '../core/dice.js';

export function createCollector(seed,subsector) { const rng=derive(seed,'bailiff'); return {hex:subsector.bankHex,pressure:0,mode:'docked',lastSeenWeek:0,lastSeenHex:subsector.bankHex,lastKnownHex:subsector.startHex,lastTraceWeek:1,traces:[subsector.startHex],bailiff:{name:rng.pick(['Meral Oskel','Iria Calven','Oyel Ardin','Ena Vossel','Telmar Neri']),type:rng.pick(['courteous','zealous','tired'])},name:'Diligence',hiddenUntil:0,replacementWeek:0,zealUsed:false,negotiated:false}; }
export function recordTrace(state) { const c=state.collector; c.lastKnownHex=state.ship.hex; c.lastTraceWeek=state.clock.week; if(c.traces[c.traces.length-1]!==state.ship.hex)c.traces.push(state.ship.hex); c.traces=c.traces.slice(-8); }
export function paymentPressure(state,paid) { const c=state.collector; if(paid) c.pressure=Math.max(0,c.pressure-1); else { c.pressure+=1+Math.max(0,state.economy.arrearsMonths-1); if(state.crew.some(p=>p.alive&&p.active!==false&&p.secret==='informant'&&!p.revealed)) { c.pressure++; c.extraMove=1; } } if(state.economy.arrears===0 && paid)c.pressure=Math.max(0,c.pressure-2); c.mode=c.pressure===0?'docked':c.pressure===1?'patrol':'hunt'; state.stats.maxPressure=Math.max(state.stats.maxPressure,c.pressure); }
function stepToward(from,to,rng) { const options=neighbors(from); const d=Math.min(...options.map(h=>distance(h,to))); return rng.pick(options.filter(h=>distance(h,to)===d)); }
export function advanceCollector(state) {
  const c=state.collector,week=state.clock.week; const rng=derive(state.meta.seed,'collector',week);
  if(c.replacementWeek && week>=c.replacementWeek) { c.name='Persévérance'; c.hex=state.subsector.bankHex; c.pressure=3; c.replacementWeek=0; }
  if(c.hiddenUntil>week || c.replacementWeek>week) return false;
  c.mode=c.pressure===0?'docked':c.pressure===1?'patrol':'hunt';
  if(c.pressure===0) { c.hex=state.subsector.bankHex; return false; }
  let moves=c.pressure===1?(week%2===0?1:0):1+(c.pressure>=4&&week%2===0?1:0);
  if(c.bailiff.type==='zealous'&&!c.zealUsed&&c.pressure>=2) { moves++;c.zealUsed=true; }
  moves+=c.extraMove||0;c.extraMove=0;
  for(let i=0;i<moves;i++) {
    if(c.hex===c.lastKnownHex) {
      // lastKnownHex is already the newest transaction. Older ledger entries are stale.
      c.traces=[];if(week%2===0)c.hex=rng.pick(neighbors(c.hex));
    } else c.hex=stepToward(c.hex,c.lastKnownHex,rng);
    if(c.hex===state.ship.hex) break;
  }
  const range=distance(c.hex,state.ship.hex);
  if(range<=1) { c.lastSeenHex=c.hex;c.lastSeenWeek=week; }
  else if(range<=2&&state.ship.systems.sensors>0) { const p=state.crew.find(x=>x.station===1&&x.alive);const check=task({rng:derive(state.meta.seed,'turn',week,0,'collector-detection'),skill:p?.skills.Sensors,characteristic:p?.characteristics.INT??7,difficulty:2,joat:p?.skills['Jack-of-all-Trades']||0}); if(check.success) { c.lastSeenHex=c.hex;c.lastSeenWeek=week; } }
  if(range===0) { c.mode='caught';return true; } return false;
}
