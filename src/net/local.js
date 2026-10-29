import { createInitialState } from '../core/state.js';
import { reduce } from '../core/reducer.js';
import { validateAction } from '../core/actions.js';
export const SAVE_KEY='jump1.save.v1';
export function readSave(){try{const data=JSON.parse(localStorage.getItem(SAVE_KEY));return validateSave(data)?data:null;}catch{return null;}}
export function validateSave(data){try{return !!data && data.version===1 && typeof data.seed==='string' && data.seed.length<=120 && data.config && typeof data.config==='object' && !Array.isArray(data.config) && Array.isArray(data.actions) && data.actions.length<=20000 && data.actions.every(a=>validateAction(a)===null);}catch{return false;}}
export function createLocal(seed,config={},actions=[]){let state=createInitialState(seed,config);for(const action of actions){state=reduce(state,action);if(state?.lastError)throw new Error(`INVALID_SAVE:${state.lastError}`);}seed=state.meta.seed;config=state.meta.config;let acts=structuredClone(actions);const callbacks=new Set();let historyWritten=false;
 function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(exportSave()));if(state.ending&&!historyWritten){const history=JSON.parse(localStorage.getItem('jump1.history.v1')||'[]');history.unshift({seed,config,ending:state.ending,shipName:state.ship.name,date:new Date().toISOString()});localStorage.setItem('jump1.history.v1',JSON.stringify(history.slice(0,10)));historyWritten=true;}return true;}catch{return false;}}
 function exportSave(){return {version:1,seed,config,actions:acts};}
 return {send(action){const next=reduce(state,action);if(next?.lastError)return {state,error:next.lastError};if(!next)return {state,error:'INVALID_STATE'};state=next;acts.push(structuredClone(action));const saved=save();callbacks.forEach(cb=>cb(state,[action]));return {state,saved};},getState:()=>state,getActions:()=>[...acts],exportSave,onActs(cb){callbacks.add(cb);return()=>callbacks.delete(cb);},save,close(){callbacks.clear();},getStation:()=>0};
}
