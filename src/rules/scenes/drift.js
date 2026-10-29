import { createScene,sceneOptions,resolveScene } from './index.js';
export const start=(state,rng)=>createScene('drift',state);
export const options=(scene,state,stationId)=>sceneOptions(scene,state,stationId);
export function resolve(scene,state,choices,rng){const next=JSON.parse(JSON.stringify(state));next.scene={...scene,choices};const result=resolveScene(next);return {state:next,scene:next.scene,log:next.log.slice(state.log.length),...result};}
