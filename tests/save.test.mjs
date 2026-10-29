import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,validateSave} from '../src/net/local.js';
import {replay} from '../src/core/reducer.js';
import {createHash} from 'node:crypto';
import {createInitialState} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';

test('legacy visual-edition saves retain their exact pre-refresh replay hashes',()=>{
 const hashes={'audit-visuel-2026':'762af771a504d1d9a822d843d5ae8d55b5b882c8677610a464552605e46ee9d4','campaign-0':'c8d373906f86f9d1815d0481ad8db905d0be0d1859b82a858a43c774fd01639f','legacy-visual':'9b9d4b745f66d82f811c7d19e948ec48e141c4a08dfe6ddcf4565a53282fdcdf'};
 const actions=[{t:'CHARGEN_EXPRESS'},{t:'CHARGEN_DONE'},{t:'END_WEEK',routines:true}];
 for(const [seed,digest]of Object.entries(hashes))assert.equal(createHash('sha256').update(JSON.stringify(replay(seed,{},actions))).digest('hex'),digest);
});

test('new portrait families are distinct, age-matched and cosmetic across career edits and rerolls',()=>{
 const family=p=>(p.portrait-1)%8;
 for(let i=0;i<100;i++){
  const seed=`portraits-${i}`,legacy=createInitialState(seed),updated=createInitialState(seed,{portraitEdition:2});
  assert.equal(new Set(updated.crew.map(family)).size,5);
  const removePortrait=p=>{const {portrait,...rest}=p;return rest;};
  assert.deepEqual(updated.crew.map(removePortrait),legacy.crew.map(removePortrait));
  for(const p of updated.crew)assert.equal(p.portrait>8,p.age>=34);
  let changed=reduce(updated,{t:'CHARGEN_PICK',index:2,career:'Navy',terms:5});
  changed=reduce(changed,{t:'CHARGEN_ROLL',index:1});
  assert.equal(new Set(changed.crew.map(family)).size,5);
  assert.deepEqual(changed.crew.map(family),updated.crew.map(family));
  for(const p of changed.crew)assert.equal(p.portrait>8,p.age>=34);
 }
 const client=createLocal('visual-save',{portraitEdition:2});
 client.send({t:'CHARGEN_DONE'});
 const save=client.exportSave();assert.equal(save.config.portraitEdition,2);
 assert.deepEqual(replay(save.seed,save.config,save.actions),client.getState());
});
test('save validation rejects unknown payloads and replay rejects a valid action in an illegal phase',()=>{assert.equal(validateSave({version:1,seed:'x',config:{},actions:[{t:'NOT_A_REAL_ACTION'}]}),false);assert.throws(()=>createLocal('x',{},[{t:'PAY'}]),/INVALID_SAVE/);assert.throws(()=>createLocal('x',{},[{t:'CHARGEN_DONE'},{t:'CHARGEN_DONE'}]),/INVALID_SAVE/);});
test('solo transport exports normalized options and the exact accepted action transcript',()=>{const client=createLocal('save-check',{difficulty:'hard',daily:true});assert.equal(client.send({t:'CHARGEN_DONE'}).error,undefined);client.send({t:'END_WEEK',routines:true});const save=client.exportSave();assert.equal(save.config.difficulty,'normal');assert.equal(save.version,1);assert.equal(save.actions.length,2);assert.deepEqual(replay(save.seed,save.config,save.actions),client.getState());const count=save.actions.length;assert.ok(client.send({t:'BUY',goodId:'unknown',tons:1}).error);assert.equal(client.getActions().length,count);});
