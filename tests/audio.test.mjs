import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudioPlayer} from '../src/audio/player.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));

function installAudioMock(manifest,{blocked=false,storageThrows=false,missingFiles=[]}={}){
  const keys=['AudioContext','webkitAudioContext','fetch','localStorage'];
  const descriptors=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const events=[],requests=[],contexts=[],stored=new Map();
  class Parameter{
    constructor(){this.value=1;this.events=[];}
    cancelScheduledValues(time){this.events.push(['cancel',time]);}
    setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);}
    linearRampToValueAtTime(value,time){this.value=value;this.events.push(['ramp',value,time]);}
  }
  class Gain{
    constructor(){this.gain=new Parameter();this.connections=[];}
    connect(node){this.connections.push(node);return node;}
    disconnect(){this.disconnected=true;}
  }
  class Source{
    constructor(context){this.context=context;this.active=false;this.loop=false;this.started=[];this.stopped=[];}
    connect(node){this.output=node;return node;}
    disconnect(){this.disconnected=true;}
    start(...args){this.started.push(args);this.active=true;}
    stop(time){
      this.stopped.push(time);
      if(time==null||time<=this.context.currentTime){this.active=false;this.onended?.();}
    }
  }
  class MockContext{
    constructor(){events.push('construct');this.state='suspended';this.currentTime=0;this.destination={};this.sources=[];this.gains=[];contexts.push(this);}
    createGain(){const gain=new Gain();this.gains.push(gain);return gain;}
    createBufferSource(){const source=new Source(this);this.sources.push(source);return source;}
    async resume(){events.push('resume');if(blocked)throw new Error('autoplay blocked');this.state='running';this.onstatechange?.();}
    decodeAudioData(data,success){const buffer={duration:120,src:data.src};success?.(buffer);return Promise.resolve(buffer);}
    async close(){this.state='closed';this.onstatechange?.();}
    tick(seconds){this.currentTime+=seconds;for(const source of this.sources)if(source.active&&source.stopped.some(time=>time!=null&&time<=this.currentTime)){source.active=false;source.onended?.();}}
  }
  Object.defineProperty(globalThis,'AudioContext',{value:MockContext,configurable:true,writable:true});
  Object.defineProperty(globalThis,'webkitAudioContext',{value:undefined,configurable:true,writable:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async url=>{
    requests.push(String(url));events.push(`fetch:${url}`);
    if(String(url).endsWith('manifest.json'))return {ok:true,json:async()=>manifest};
    return {ok:!missingFiles.includes(String(url)),arrayBuffer:async()=>({src:String(url)})};
  }});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem(key){if(storageThrows)throw new Error('storage denied');return stored.get(key)||null;},
    setItem(key,value){if(storageThrows)throw new Error('storage denied');stored.set(key,value);},
  }});
  return {events,requests,contexts,stored,restore(){for(const key of keys){const descriptor=descriptors.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}

test('audio is locked before a gesture; empty manifests and unavailable storage remain silent',async()=>{
  const mock=installAudioMock({schemaVersion:1,clips:{}},{storageThrows:true});
  const statuses=[];
  try{
    const player=createAudioPlayer({onStatus:status=>statuses.push(status)});
    player.setContext('port');player.onAction(null,null,{t:'UI_CLICK'});
    assert.equal(mock.contexts.length,0);assert.equal(mock.requests.length,0);
    assert.equal(await player.unlock(),true);
    assert.deepEqual(mock.events.slice(0,3),['construct','resume','fetch:./assets/audio/manifest.json']);
    assert.equal(mock.contexts[0].sources.length,0);assert.equal(statuses.at(-1).available,false);
    await player.unlock();assert.equal(mock.requests.length,1);
    assert.doesNotThrow(()=>player.setVolumes({music:.4,sfx:.2}));
    player.setEnabled(false);assert.equal(player.isEnabled(),false);player.close();player.close();
  }finally{mock.restore();}
});

test('local manifest aliases retain music; native loops and crossfades have bounded voices',async()=>{
  const mock=installAudioMock({clips:{
    'music.title':{src:'assets/audio/title.mp3',start:2,end:30,volume:.8},
    'music.port':'music.title',
    'music.travel':{src:'assets/audio/travel.mp3'},
    'music.threat':{src:'assets/audio/threat.mp3'},
  }});
  try{
    const player=createAudioPlayer();await player.unlock();
    const context=mock.contexts[0],title=context.sources[0];
    assert.equal(title.loop,true);assert.equal(title.loopStart,2);assert.equal(title.loopEnd,30);
    assert.deepEqual(title.started[0],[0,2]);
    player.setContext('port');await flush();assert.equal(context.sources.length,1);
    player.setContext('travel');await flush();assert.equal(context.sources.length,2);
    assert.ok(title.stopped.some(time=>time>.9&&time<1));
    player.setContext('threat');await flush();
    assert.ok(context.sources.filter(source=>source.active&&source.loop).length<=2);
    assert.equal(mock.requests.filter(url=>url==='./assets/audio/title.mp3').length,1);
    player.close();assert.equal(context.state,'closed');assert.ok(context.sources.every(source=>!source.active));
  }finally{mock.restore();}
});

test('long music buffers are released after a fade and a third decode waits for the retiring voice',async()=>{
  const mock=installAudioMock({clips:{
    'music.title':{src:'assets/audio/title.mp3'},
    'music.travel':{src:'assets/audio/travel.mp3'},
    'music.threat':{src:'assets/audio/threat.mp3'},
  }});
  try{
    const player=createAudioPlayer();await player.unlock();
    const context=mock.contexts[0],title=context.sources[0];
    player.setContext('travel');await flush();await flush();
    const travel=context.sources[1];assert.ok(title.active&&travel.active);
    player.setContext('threat');await flush();
    // Existing voices finish their requested fade; the third file is not decoded yet.
    assert.equal(context.sources.length,2);
    assert.equal(mock.requests.includes('./assets/audio/threat.mp3'),false);
    assert.ok(title.active&&travel.active);
    context.tick(1);await flush();await flush();
    assert.equal(title.buffer,null);assert.equal(context.sources.length,3);
    assert.ok(context.sources.filter(source=>source.buffer).length<=2);
    context.tick(1);await flush();
    assert.equal(travel.buffer,null);
    assert.equal(context.sources.filter(source=>source.buffer).length,1);
    player.setContext('title');await flush();await flush();
    // The old title PCM was evicted, so returning to it decodes the local file anew.
    assert.equal(mock.requests.filter(url=>url==='./assets/audio/title.mp3').length,2);
    assert.ok(context.sources.filter(source=>source.buffer).length<=2);
    player.close();assert.ok(context.sources.every(source=>source.buffer===null));
  }finally{mock.restore();}
});

test('effects respect clip offsets and the four-voice limit without mutating game data',async()=>{
  const clips=Object.fromEntries(['click','refuel','repair','trade','dice'].map(key=>[`sfx.${key}`,{src:`assets/audio/${key}.mp3`,start:2,end:2.5}]));
  const mock=installAudioMock({clips});
  try{
    const player=createAudioPlayer();await player.unlock();
    const before=Object.freeze({phase:'port',log:Object.freeze([]),cargo:Object.freeze([]),economy:Object.freeze({credits:100}),stats:Object.freeze({jumps:0})});
    const after=Object.freeze({...before,cargo:Object.freeze([Object.freeze({tons:1})]),economy:Object.freeze({credits:99})});
    player.onAction(null,null,{t:'UI_CLICK'});
    player.onAction(before,after,{t:'REFUEL'});
    player.onAction(before,after,{t:'REPAIR'});
    player.onAction(before,after,{t:'BUY'});
    player.onAction(before,after,{t:'CHARGEN_PICK'});
    await flush();await flush();
    const context=mock.contexts[0];assert.equal(context.sources.length,5);
    assert.equal(context.sources.filter(source=>source.active).length,4);
    for(const source of context.sources)assert.deepEqual(source.started[0],[0,2,.5]);
    assert.equal(before.economy.credits,100);assert.equal(after.economy.credits,99);
    player.setEnabled(false);assert.ok(context.sources.every(source=>!source.active));player.close();
  }finally{mock.restore();}
});

test('autoplay refusal, missing clips and hostile manifest paths are isolated',async()=>{
  let mock=installAudioMock({'music.title':{src:'assets/audio/title.mp3'}},{blocked:true});
  try{
    const statuses=[],player=createAudioPlayer({onStatus:status=>statuses.push(status)});
    assert.equal(await player.unlock(),false);assert.equal(mock.requests.length,0);
    assert.equal(statuses.at(-1).error,'AUDIO_BLOCKED');player.close();
  }finally{mock.restore();}
  mock=installAudioMock({clips:{
    'music.title':{src:'https://example.invalid/music.mp3'},
    'music.travel':{src:'assets/audio/%2e%2e/private.mp3'},
    'sfx.click':{src:'assets/audio/missing.mp3'},
  }},{missingFiles:['./assets/audio/missing.mp3']});
  try{
    const player=createAudioPlayer();await player.unlock();
    player.setContext('travel');player.onAction(null,null,{t:'UI_CLICK'});await flush();
    assert.ok(mock.requests.every(url=>url.startsWith('./assets/audio/')));
    assert.equal(mock.contexts[0].sources.length,0);player.close();
  }finally{mock.restore();}
});

test('crew dice are debounced and ending stingers play only once per ending context',async()=>{
  const mock=installAudioMock({clips:{
    'sfx.dice':{src:'assets/audio/dice.mp3'},
    'stinger.victory':{src:'assets/audio/victory.mp3',start:1,end:4},
  }});
  try{
    const player=createAudioPlayer();await player.unlock();
    const before={phase:'chargen',log:[],stats:{jumps:0}},next={...before};
    for(let i=0;i<5;i++)player.onAction(before,next,{t:'CHARGEN_PICK'});
    await flush();
    assert.equal(mock.contexts[0].sources.length,1);
    player.setContext('victory');await flush();player.setContext('victory');await flush();
    assert.equal(mock.contexts[0].sources.filter(source=>source.buffer.src.endsWith('victory.mp3')).length,1);
    player.close();
  }finally{mock.restore();}
});
