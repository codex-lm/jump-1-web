import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createInitialState } from '../src/core/state.js';
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
/** A transparent heuristic using the visible favourable-world hint, never unrevealed future prices. */
export function simulate(seed,config={difficulty:'normal'}) {
  const actions=[];let state=createInitialState(seed,config);const act=action=>{const next=reduce(state,action);if(!next.lastError)actions.push(action);state=next;return !next.lastError;};
  act({t:'CHARGEN_EXPRESS'});act({t:'CHARGEN_DONE'});
  let safety=0,usedPortWeek=-1;
  while(!state.ending&&safety++<500) {
    if(state.phase==='payment'){act({t:'SKIP_PAY'});continue;}
    if(state.scene){state=resolveAutomatically(state,actions);continue;}
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
    // The simple captain risks a quarter of available working capital per port, not the entire treasury.
    let tradeBudget=Math.max(0,Math.floor((state.economy.credits-reserve)*.25));
    for(const offer of best.profitable){const tons=Math.min(offer.tons,82-cargoUsed(state),Math.max(0,Math.floor(tradeBudget/offer.buyPrice)));if(tons>0&&act({t:'BUY',goodId:offer.goodId,tons}))tradeBudget-=tons*offer.buyPrice;}
    for(const offer of offers.freight.filter(o=>o.destination===destination.hex).sort((a,b)=>b.tons-a.tons))if(cargoUsed(state)+offer.tons<=82)act({t:'BOOK_FREIGHT',id:offer.id});
    for(const offer of offers.passengers.filter(o=>o.destination===destination.hex).sort((a,b)=>b.pay-a.pay)){const max=offer.class==='Low'?20-lowUsed(state):Math.floor((5-cabinsUsed(state))*(offer.class==='Middle'?2:1));const count=Math.min(offer.count,max);if(count>0)act({t:'BOOK_PASSENGER',id:offer.id,count});}
    for(const offer of offers.contracts.filter(o=>o.destination===destination.hex&&o.type==='courier'))act({t:'ACCEPT_CONTRACT',id:offer.id});
    if(!act({t:'DEPART',hex:destination.hex}))act({t:'END_WEEK'});
  }
  return {seed,state,actions,safety};
}
export function summary(runs){const outcomes={};for(const r of runs)outcomes[r.state.ending?.type||'unfinished']=(outcomes[r.state.ending?.type||'unfinished']||0)+1;const cash=runs.map(r=>r.state.economy.credits).sort((a,b)=>a-b);return {runs:runs.length,outcomes,victoryRate:(outcomes.victory||0)/runs.length,cash:{p10:cash[Math.floor(cash.length*.1)],median:cash[Math.floor(cash.length*.5)],p90:cash[Math.floor(cash.length*.9)]},strategy:'Risk 25% of working capital on legal goods below base price, use visible favourable-world hints; freight, passengers, courier contracts; no future prices or injected credits.'};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==='--export'){
    const filename=process.argv[3]||'.local/browser-campaign.json',seed=process.argv[4]||'campaign-0';const result=simulate(seed);
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
  }else{const count=Math.max(1,Math.min(1000,Number(process.argv[2])||200));const runs=Array.from({length:count},(_,i)=>simulate(`economy-${i}`));console.log(JSON.stringify(summary(runs),null,2));}
}
