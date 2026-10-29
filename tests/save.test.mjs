import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,validateSave} from '../src/net/local.js';
import {replay} from '../src/core/reducer.js';
test('save validation rejects unknown payloads and replay rejects a valid action in an illegal phase',()=>{assert.equal(validateSave({version:1,seed:'x',config:{},actions:[{t:'NOT_A_REAL_ACTION'}]}),false);assert.throws(()=>createLocal('x',{},[{t:'PAY'}]),/INVALID_SAVE/);assert.throws(()=>createLocal('x',{},[{t:'CHARGEN_DONE'},{t:'CHARGEN_DONE'}]),/INVALID_SAVE/);});
test('solo transport exports normalized options and the exact accepted action transcript',()=>{const client=createLocal('save-check',{difficulty:'hard',daily:true});assert.equal(client.send({t:'CHARGEN_DONE'}).error,undefined);client.send({t:'END_WEEK',routines:true});const save=client.exportSave();assert.equal(save.config.difficulty,'normal');assert.equal(save.version,1);assert.equal(save.actions.length,2);assert.deepEqual(replay(save.seed,save.config,save.actions),client.getState());const count=save.actions.length;assert.ok(client.send({t:'BUY',goodId:'unknown',tons:1}).error);assert.equal(client.getActions().length,count);});
