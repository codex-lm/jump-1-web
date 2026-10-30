import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInitialState,assertState,CURRENT_RULES_EDITION} from '../src/core/state.js';
import {reduce,sceneOptions} from '../src/core/reducer.js';
import {stateHash} from '../src/net/protocol.js';
import {currentWorld} from '../src/rules/trade.js';
import {distance} from '../src/rules/subsector.js';
import {simulate} from '../tests/sim-economy.mjs';

/** Endings are proved under the rules every new run uses. */
const CONFIG=Object.freeze({difficulty:'normal',rulesEdition:CURRENT_RULES_EDITION});

const root=new URL('../',import.meta.url),localRoot=new URL('.local/',root),evidence=new URL('endings-evidence.json',localRoot);
mkdirSync(new URL('endings/',localRoot),{recursive:true});
const found={},search={limit:100,seedsAttempted:0,outcomes:{},destructionStrategies:{}};

function codeFingerprint(){const hash=createHash('sha256');for(const dir of ['src/core','src/rules','src/data']){const walk=path=>readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).forEach(entry=>{const full=join(path,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.js')){hash.update(relative(fileURLToPath(root),full));hash.update(readFileSync(full));}});walk(fileURLToPath(new URL(dir,root)));}return hash.digest('hex');}
const sourceFingerprint=codeFingerprint();

function record(result,strategy){
  const type=result.state.ending?.type;if(!type||found[type])return;
  let checked=createInitialState(result.seed,result.config??CONFIG);
  result.actions.forEach((action,index)=>{const before=JSON.stringify(checked);const next=reduce(checked,action);assert.equal(next.lastError,null,`${result.seed} action ${index} rejected: ${next.lastError}`);assert.equal(JSON.stringify(checked),before,'reducer mutated previous state');checked=next;});
  assertState(checked);assert.equal(JSON.stringify(checked),JSON.stringify(result.state));
  const save={version:1,seed:result.seed,config:result.config??CONFIG,actions:result.actions};
  const file=`endings/${type}-${result.seed}.json`;
  writeFileSync(new URL(file,localRoot),JSON.stringify(save,null,2));
  found[type]={seed:result.seed,strategy,config:save.config,actions:save.actions.length,completedWeeks:checked.clock.completedWeeks,week:checked.clock.week,ending:checked.ending,hull:checked.ship.hull,structure:checked.ship.structure,credits:checked.economy.credits,bankPressure:checked.collector.pressure,hash:stateHash(checked),save:`.local/${file}`,fired:save.actions.filter(a=>a.t==='SCENE_CHOICE'&&a.choice==='fire').length,combatRounds:save.actions.filter(a=>a.t==='SCENE_CHOICE'&&a.station===1&&['flee','evade'].includes(a.choice)).length,route:checked.route};
  console.log(JSON.stringify({found:type,seed:result.seed,week:checked.clock.week,actions:save.actions.length,fired:found[type].fired,hash:found[type].hash}));
}

function dangerousCaptain(seed){
  const config={...CONFIG},actions=[];let state=createInitialState(seed,config),iterations=0;
  const act=action=>{const next=reduce(state,action);if(next.lastError)return false;actions.push(action);state=next;return true;};
  act({t:'CHARGEN_EXPRESS'});act({t:'CHARGEN_DONE'});
  while(!state.ending&&iterations++<450){
    if(state.phase==='payment'){act({t:'SKIP_PAY'});continue;}
    if(state.scene){
      const scene=state.scene,type=scene.type,round=scene.round;
      for(let station=1;station<=5;station++){
        if(!state.scene||state.scene.type!==type||state.scene.round!==round||state.ending)break;
        if(state.scene.choices[station])continue;
        const available=sceneOptions(state.scene,state,station).map(o=>o.id);
        let preference;
        if(type==='pirate'||type==='repo')preference=station===1&&round===1?['flee','hold']:station===3&&round===1?['fire','hold']:['hold'];
        else preference=({1:['distress','deliver','comply','leave','scan','hold'],2:['improvise','repair','hold'],3:['guard','hold'],4:['hold'],5:['paperwork','hold']})[station];
        const choice=preference.find(c=>available.includes(c))??'hold';
        if(!act({t:'SCENE_CHOICE',station,choice}))throw new Error('Unexpected rejected scene choice');
      }
      continue;
    }
    const world=currentWorld(state);
    if(!world)break;
    // Legal, deliberately risky play: repeated gas-giant skimming wears down
    // the hull; unpaid bills attract the bank. No damage values are injected.
    if(world.gasGiant&&state.ship.fuel<30){if(act({t:'REFUEL',type:'skim'}))continue;}
    if(world.gasGiant){act({t:'STAY'});continue;}
    const destinations=state.subsector.worlds.filter(w=>distance(world.hex,w.hex)===1).sort((a,b)=>Number(b.gasGiant)-Number(a.gasGiant)||a.hex.localeCompare(b.hex));
    if(!destinations.length){act({t:'STAY'});continue;}
    if(state.ship.systems.jump===0&&!act({t:'REPAIR',system:'jump'})){act({t:'STAY'});continue;}
    if(state.ship.fuel<25&&!act({t:'REFUEL'})){act({t:'STAY'});continue;}
    if(!act({t:'DEPART',hex:destinations[0].hex}))act({t:'STAY'});
  }
  return {seed,config,state,actions,iterations};
}

for(let i=0;i<100;i++){
  const seed=`economy-${i}`;search.seedsAttempted++;
  if(!found.victory||!found.defeat||!found.repo){const standard=simulate(seed,CONFIG);if(['victory','defeat','repo'].includes(standard.state.ending?.type))record(standard,'Visible-market trading heuristic from tests/sim-economy.mjs; no credit or state injection.');}
  if(!found.destroyed||!found.stranded){const danger=dangerousCaptain(seed);const type=danger.state.ending?.type??'unfinished';search.outcomes[type]=(search.outcomes[type]??0)+1;
    const fired=danger.actions.some(a=>a.t==='SCENE_CHOICE'&&a.choice==='fire');
    if(type==='destroyed'||type==='stranded'&&fired)record(danger,fired?'Repeated gas-giant skimming, unpaid bills, then hostile combat: flee once to establish hostility, fire once, hold positions without hull repairs.':'Repeated gas-giant skimming without hull repairs causes natural hull and structure destruction before any combat.');
  }
  if(found.victory&&found.defeat&&found.repo&&found.destroyed&&found.stranded)break;
}
const report={verifiedAt:new Date().toISOString(),sourceFingerprint,sourceUnchangedDuringSearch:sourceFingerprint===codeFingerprint(),method:'All states originate from createInitialState(seed, config); only accepted reduce(state, action) transitions are recorded. Every saved ending replays byte-identically and passes assertState. No credits, damage, clock, scene, or crew values are injected or modified.',search,found,allFourNaturallyDemonstrated:['victory','defeat','repo','destroyed'].every(type=>found[type])};
writeFileSync(evidence,JSON.stringify(report,null,2));
console.log(JSON.stringify({allFourNaturallyDemonstrated:report.allFourNaturallyDemonstrated,seedsAttempted:search.seedsAttempted,outcomes:search.outcomes,sourceUnchanged:report.sourceUnchangedDuringSearch}));
