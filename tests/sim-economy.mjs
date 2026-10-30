import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createInitialState,CURRENT_RULES_EDITION } from '../src/core/state.js';
import { reduce,sceneOptions } from '../src/core/reducer.js';
import { market,quoteSale,currentWorld } from '../src/rules/trade.js';
import { cargoUsed,cabinsUsed,lowUsed } from '../src/rules/ship.js';
import { distance } from '../src/rules/subsector.js';
import { stateHash } from '../src/net/protocol.js';

export function resolveAutomatically(state,actions=[]) {
  let safety=0;
  while(state.scene&&!state.ending&&safety++<100) {
    const type=state.scene.type,round=state.scene.round;
    for(let station=1;station<=5;station++) {
      if(!state.scene||state.scene.type!==type||state.scene.round!==round)break;
      if(state.scene.choices[station])continue;
      const ids=sceneOptions(state.scene,state,station).map(o=>o.id);
      const preferences=type==='pirate'||type==='repo' ? {1:['pay','evade'],2:['repair'],3:['aim'],4:['heal'],5:['old-friends','negotiate','reassure']} : {1:['distress','deliver','comply','scan','lead'],2:['improvise','repair','salvage','assist'],3:['board','guard','assist','cards'],4:['rescue','heal'],5:['paperwork','negotiate','reassure']};
      const choice=preferences[station]?.find(id=>ids.includes(id))||'hold';
      const action={t:'SCENE_CHOICE',station,choice};state=reduce(state,action);actions.push(action);
    }
  }
  return state;
}
export const DEFAULT_SIM_CONFIG=Object.freeze({difficulty:'normal',rulesEdition:CURRENT_RULES_EDITION});
/** A transparent heuristic using the visible favourable-world hint, never unrevealed future prices.
 * `risk` is the share of working capital above the reserve committed to speculative goods at each port. */
export function simulate(seed,config=DEFAULT_SIM_CONFIG,{risk=.25}={}) {
  const actions=[];let state=createInitialState(seed,config);
  const metrics={startCredits:0,firstMissedWeek:null,negativeTreasury:false};
  const observe=()=>{if(state.economy.credits<0)metrics.negativeTreasury=true;};
  const act=action=>{const next=reduce(state,action);if(!next.lastError)actions.push(action);state=next;observe();return !next.lastError;};
  act({t:'CHARGEN_EXPRESS'});act({t:'CHARGEN_DONE'});metrics.startCredits=state.economy.credits;
  let safety=0,usedPortWeek=-1;
  while(!state.ending&&safety++<500) {
    if(state.phase==='payment'){metrics.firstMissedWeek??=state.clock.completedWeeks;act({t:'SKIP_PAY'});continue;}
    if(state.scene){state=resolveAutomatically(state,actions);observe();continue;}
    const world=currentWorld(state);if(!world){break;}
    if(usedPortWeek!==state.clock.week){usedPortWeek=state.clock.week;for(const lot of [...state.cargo].filter(l=>l.kind==='speculative'))if(quoteSale(state,lot)>0)act({t:'SELL',cargoId:lot.id});
      // Routine station work uses the same public actions as a human player.
      for(const [station,choice]of [[1,'flightplan'],[2,'maintenance'],[3,'guard'],[4,'hospital'],[5,'market']])if(!state.portActions[station])act({t:'PORT_ACTION',station,choice});
    }
    let adjacent=state.subsector.worlds.filter(w=>distance(world.hex,w.hex)===1);
    if(!adjacent.length){act({t:'END_WEEK'});continue;}
    if(state.ship.systems.jump===0){if(!act({t:'REPAIR',system:'jump'})){act({t:'END_WEEK'});continue;}}
    if(state.ship.hull<18&&state.economy.credits>50000)act({t:'REPAIR',system:'hull'});
    if(state.ship.fuel<22.5){if(['A','B','C','D'].includes(world.starport)){if(!act({t:'REFUEL',type:['A','B'].includes(world.starport)?'refined':'raw'})){act({t:'END_WEEK'});continue;}}else if(world.gasGiant){act({t:'REFUEL',type:'skim'});continue;}else {act({t:'END_WEEK'});continue;}}
    const offers=market(state);const reserve=Math.max(20000,state.clock.week%4===0?state.economy.monthlyPayment+30000:30000);
    let best=null;
    for(const destination of adjacent.filter(w=>['A','B','C','D'].includes(w.starport)||w.gasGiant)) {
      const profitable=offers.goods.filter(g=>!g.illegal&&g.tons>0&&g.buyPrice<g.basePrice&&g.favorable.includes(destination.hex)).map(g=>({...g,profit:g.basePrice-g.buyPrice})).sort((a,b)=>b.profit/b.buyPrice-a.profit/a.buyPrice);
      const routeFreight=offers.freight.filter(o=>o.destination===destination.hex).reduce((n,o)=>n+o.pay,0);
      const score=(profitable[0]?.profit/profitable[0]?.buyPrice||0)*100000+routeFreight+(destination.starport==='A'?10000:0)-destination.law*1000;
      if(!best||score>best.score)best={destination,profitable,score};
    }
    best ||= {destination:adjacent[0],profitable:[],score:0};const destination=best.destination;
    // The simple captain risks a share (a quarter by default) of available working capital per port, not the entire treasury.
    let tradeBudget=Math.max(0,Math.floor((state.economy.credits-reserve)*risk));
    for(const offer of best.profitable){const tons=Math.min(offer.tons,82-cargoUsed(state),Math.max(0,Math.floor(tradeBudget/offer.buyPrice)));if(tons>0&&act({t:'BUY',goodId:offer.goodId,tons}))tradeBudget-=tons*offer.buyPrice;}
    for(const offer of offers.freight.filter(o=>o.destination===destination.hex).sort((a,b)=>b.tons-a.tons))if(cargoUsed(state)+offer.tons<=82)act({t:'BOOK_FREIGHT',id:offer.id});
    for(const offer of offers.passengers.filter(o=>o.destination===destination.hex).sort((a,b)=>b.pay-a.pay)){const max=offer.class==='Low'?20-lowUsed(state):Math.floor((5-cabinsUsed(state))*(offer.class==='Middle'?2:1));const count=Math.min(offer.count,max);if(count>0)act({t:'BOOK_PASSENGER',id:offer.id,count});}
    for(const offer of offers.contracts.filter(o=>o.destination===destination.hex&&o.type==='courier'))act({t:'ACCEPT_CONTRACT',id:offer.id});
    if(!act({t:'DEPART',hex:destination.hex}))act({t:'END_WEEK'});
  }
  return {seed,config:state.meta.config,risk,state,actions,safety,metrics};
}
const START_BUCKETS=[[-Infinity,100000,'<100k'],[100000,200000,'100k-200k'],[200000,300000,'200k-300k'],[300000,Infinity,'300k+']];
const ending=r=>r.state.ending?.type||'unfinished';
const percentile=(sorted,p)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]:null;
export function summary(runs){
  const outcomes={};for(const r of runs)outcomes[ending(r)]=(outcomes[ending(r)]||0)+1;
  const cash=runs.map(r=>r.state.economy.credits).sort((a,b)=>a-b);
  const startCredits=Object.fromEntries(START_BUCKETS.map(([low,high,label])=>{const bucket=runs.filter(r=>r.metrics&&r.metrics.startCredits>=low&&r.metrics.startCredits<high),counts={};for(const r of bucket)counts[ending(r)]=(counts[ending(r)]||0)+1;return [label,{runs:bucket.length,outcomes:counts,victoryRate:bucket.length?(counts.victory||0)/bucket.length:null}];}));
  const missed=runs.map(r=>r.metrics?.firstMissedWeek).filter(w=>w!=null).sort((a,b)=>a-b),byWeek={};for(const week of missed)byWeek[week]=(byWeek[week]||0)+1;
  const risk=runs[0]?.risk??.25,edition=runs[0]?.config?.rulesEdition??3;
  return {runs:runs.length,edition,risk,outcomes,victoryRate:(outcomes.victory||0)/runs.length,cash:{p10:percentile(cash,.1),median:percentile(cash,.5),p90:percentile(cash,.9)},
    startCredits,firstMissedPayment:{runs:missed.length,neverMissed:runs.length-missed.length,p10:percentile(missed,.1),median:percentile(missed,.5),p90:percentile(missed,.9),byWeek},
    negativeTreasuryRuns:runs.filter(r=>r.metrics?.negativeTreasury).length,
    strategy:`Risk ${Math.round(risk*100)}% of working capital on legal goods below base price, use visible favourable-world hints; freight, passengers, courier contracts; no future prices or injected credits.`};
}
/** CLI flags: [count] [--edition N] [--risk F]. Edition 3 means legacy rules; the default is the edition new runs use. */
export function parseSimArgs(argv){
  const flag=name=>{const index=argv.indexOf(name);return index>=0?argv[index+1]:undefined;};
  const edition=Number(flag('--edition')??CURRENT_RULES_EDITION),risk=Number(flag('--risk')??.25);
  if(!Number.isInteger(edition)||edition<3||edition>CURRENT_RULES_EDITION)throw new Error(`--edition must be an integer from 3 to ${CURRENT_RULES_EDITION}`);
  if(!Number.isFinite(risk)||risk<0||risk>1)throw new Error('--risk must be a number from 0 to 1');
  const positional=argv.filter((arg,index)=>!arg.startsWith('--')&&!['--edition','--risk'].includes(argv[index-1]));
  return {config:{difficulty:'normal',...(edition>=4?{rulesEdition:edition}:{})},risk,positional};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {config,risk,positional}=parseSimArgs(process.argv.slice(2));
  if(process.argv[2]==='--export'){
    const filename=positional[0]||'.local/browser-campaign.json',seed=positional[1]||'campaign-0';const result=simulate(seed,config,{risk});
    const exportedActions=result.actions.map(action=>({by:['PORT_ACTION','SCENE_CHOICE'].includes(action.t)?action.station:'captain',...action}));
    let checked=createInitialState(seed,result.state.meta.config),before;
    for(const action of exportedActions){before=checked;checked=reduce(checked,action);if(checked.lastError)throw new Error(`Rejected export action ${action.t}: ${checked.lastError}`);}
    if(!checked.ending||JSON.stringify(checked)!==JSON.stringify(result.state))throw new Error('Incomplete or mismatching campaign export');
    const save={version:1,seed,config:checked.meta.config,actions:exportedActions};
    writeFileSync(filename,JSON.stringify(save));
    writeFileSync(filename.replace(/\.json$/,'')+'-before-end.json',JSON.stringify({...save,actions:save.actions.slice(0,-1)}));
    const proof={seed,actions:save.actions.length,week:checked.clock.week,jumps:checked.stats.jumps,ending:checked.ending,stateHash:stateHash(checked),finalAction:save.actions.at(-1),beforeFinal:{phase:before.phase,week:before.clock.week,shipHex:before.ship.hex,stateHash:stateHash(before)},milestones:checked.milestones.length,stateBytes:Buffer.byteLength(JSON.stringify(checked)),allActionsAccepted:true};
    writeFileSync(filename.replace(/\.json$/,'')+'-proof.json',JSON.stringify(proof,null,2));
    console.log(JSON.stringify(proof,null,2));
  }else{const count=Math.max(1,Math.min(1000,Number(positional[0])||200));const runs=Array.from({length:count},(_,i)=>simulate(`economy-${i}`,config,{risk}));console.log(JSON.stringify(summary(runs),null,2));}
}
