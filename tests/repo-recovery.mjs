import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createInitialState,assertState} from '../src/core/state.js';
import {reduce,sceneOptions,replay} from '../src/core/reducer.js';

/** Natural public-action proof: stay at port until the bank arrives, then fight. */
export function repoRecovery(seed='repo-recovery-57'){
  const config={difficulty:'normal'},actions=[];
  let state=createInitialState(seed,config),iterations=0,maxRound=0;
  const act=action=>{
    const next=reduce(state,action);
    if(next.lastError)throw new Error('Rejected recovery action: '+next.lastError);
    actions.push(action);state=next;
  };
  act({t:'CHARGEN_EXPRESS'});act({t:'CHARGEN_DONE'});
  while(!state.ending&&iterations++<150){
    if(state.collector.replacementWeek>state.clock.week)break;
    if(state.phase==='payment'){act({t:'SKIP_PAY'});continue;}
    if(state.scene){
      const type=state.scene.type,round=state.scene.round;
      maxRound=Math.max(maxRound,round);
      for(let station=1;station<=5;station++){
        if(!state.scene||state.scene.type!==type||state.scene.round!==round)break;
        if(state.scene.choices[station])continue;
        const available=sceneOptions(state.scene,state,station).map(option=>option.id);
        const preferences=station===1
          ?[(round===1&&state.crew[2].secret==='pacifist')?'flee':'evade','hold']
          :station===2?['repair','hold']
          :station===3?['fire','hold']
          :station===4?['heal','hold']
          :round===1?['bluff','reassure','hold']:['reassure','hold'];
        act({t:'SCENE_CHOICE',station,choice:preferences.find(choice=>available.includes(choice))||'hold'});
      }
    }else act({t:'STAY'});
  }
  assertState(state);
  return {seed,config,state,actions,maxRound,won:state.collector.replacementWeek>state.clock.week};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=repoRecovery(process.argv[3]||'repo-recovery-57');
  const replayed=replay(result.seed,result.config,result.actions);
  if(!result.won||JSON.stringify(replayed)!==JSON.stringify(result.state))throw new Error('Recovery proof failed');
  const save={version:1,seed:result.seed,config:result.config,actions:result.actions};
  const filename=process.argv[2]||'.local/repo-combat-recovery-v2.json';
  writeFileSync(filename,JSON.stringify(save,null,2));
  console.log(JSON.stringify({seed:result.seed,won:result.won,actions:result.actions.length,maxRound:result.maxRound,week:result.state.clock.week,hull:result.state.ship.hull,structure:result.state.ship.structure,credits:result.state.economy.credits,replacementWeek:result.state.collector.replacementWeek,save:filename,method:'Initial seed and accepted public actions only; no cash, scene, crew, clock or damage injection.'},null,2));
}
