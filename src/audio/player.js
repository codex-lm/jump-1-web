/**
 * File playback only: every audible sample comes from the local Suno manifest.
 * WebAudio is used for decoding, mixing and fades. No sound is synthesized.
 * This module never reads from or writes to the deterministic game state.
 */

export const AUDIO_KEYS=Object.freeze([
  'music.title','music.port','music.travel','music.threat',
  'stinger.victory','stinger.defeat',
  'sfx.click','sfx.dice','sfx.trade','sfx.jump','sfx.arrival',
  'sfx.laser','sfx.impact','sfx.alarm','sfx.repair','sfx.refuel','sfx.message',
]);

const CONTEXTS=new Set(['title','port','travel','threat','victory','defeat']);
const SETTINGS_KEY='jump1.audio.v1';
const FADE_SECONDS=.9;
const MAX_SFX_VOICES=4;
const MAX_CACHED_FILES=6;
const COOLDOWNS={
  'sfx.click':130,'sfx.dice':280,'sfx.trade':200,'sfx.jump':800,
  'sfx.arrival':700,'sfx.laser':140,'sfx.impact':160,'sfx.alarm':1200,
  'sfx.repair':400,'sfx.refuel':400,'sfx.message':650,
  'stinger.victory':1500,'stinger.defeat':1500,
};

const clamp=value=>Math.max(0,Math.min(1,value));
const clock=()=>globalThis.performance?.now?.()??Date.now();

function readSettings(){
  try{
    const saved=JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY)||'null');
    return {
      enabled:typeof saved?.enabled==='boolean'?saved.enabled:true,
      music:Number.isFinite(saved?.music)?clamp(saved.music):.45,
      sfx:Number.isFinite(saved?.sfx)?clamp(saved.sfx):.55,
    };
  }catch{return {enabled:true,music:.45,sfx:.55};}
}

function localAudioPath(value){
  if(typeof value!=='string')return null;
  const source=value.startsWith('./')?value.slice(2):value;
  try{
    const decoded=decodeURIComponent(source);
    if(!decoded.startsWith('assets/audio/')||/[\\:?#\u0000-\u001f]/.test(decoded))return null;
    if(decoded.split('/').some(part=>part==='.'||part==='..'))return null;
    if(!/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(decoded))return null;
  }catch{return null;}
  return `./${source}`;
}

function normalizeEntry(value,key){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const src=localAudioPath(value.src);
  if(!src)return null;
  const start=value.start==null?0:value.start;
  const end=value.end==null?null:value.end;
  if(!Number.isFinite(start)||start<0||end!==null&&(!Number.isFinite(end)||end<=start))return null;
  return {
    key,src,start,end,
    volume:Number.isFinite(value.volume)?clamp(value.volume):1,
    loop:typeof value.loop==='boolean'?value.loop:key.startsWith('music.'),
  };
}

function entriesFromManifest(document){
  const source=document?.clips??document?.assets??document;
  if(!source||typeof source!=='object'||Array.isArray(source))return new Map();
  const entries=new Map();
  const resolve=(key,visited=new Set())=>{
    if(visited.has(key)||visited.size>AUDIO_KEYS.length)return null;
    visited.add(key);
    const value=source[key];
    if(typeof value==='string'&&AUDIO_KEYS.includes(value))return resolve(value,visited);
    return normalizeEntry(value,key);
  };
  for(const key of AUDIO_KEYS){const entry=resolve(key);if(entry)entries.set(key,{...entry,key});}
  return entries;
}

function appendOnlyLogs(previous,next){
  const before=previous?.log||[],after=next?.log||[];
  if(!before.length)return after;
  if(after.length<400&&after.length>=before.length)return after.slice(before.length);
  // The journal caps at 400. Match its retained suffix rather than comparing lengths.
  const tail=before.slice(-8).map(entry=>JSON.stringify(entry));
  for(let end=after.length-1;end>=0;end--){
    if(JSON.stringify(after[end])!==tail.at(-1))continue;
    const count=Math.min(tail.length,end+1);
    let same=true;
    for(let offset=1;offset<=count;offset++){
      if(JSON.stringify(after[end-offset+1])!==tail[tail.length-offset]){same=false;break;}
    }
    if(same)return after.slice(end+1);
  }
  return after.slice(-16);
}

function stateContext(state){
  if(!state||state.phase==='chargen')return 'title';
  if(state.ending)return state.ending.type==='victory'?'victory':'defeat';
  if(['pirate','repo'].includes(state.scene?.type)||(state.collector?.pressure||0)>=2)return 'threat';
  if(['travel','drift','breakdown'].includes(state.scene?.type))return 'travel';
  return 'port';
}

/**
 * onStatus receives data, never UI text. Only unlock() may create/resume an audio
 * context; call it directly from a user gesture. Missing media is always silent.
 */
export function createAudioPlayer({onStatus}={}){
  const settings=readSettings();
  let enabled=settings.enabled,musicVolume=settings.music,sfxVolume=settings.sfx;
  let audioContext=null,masterBus=null,musicBus=null,sfxBus=null;
  let unlocked=false,closed=false,context='title',loading=false,loaded=false;
  let entries=new Map(),manifestPromise=null,unlockPromise=null;
  let currentMusic=null,musicGeneration=0,sessionGeneration=0;
  let musicDecodeQueue=Promise.resolve();
  let endingPlayed=null,error=null,errorKey=null,lastStatus='';
  const fadingMusic=new Set(),voices=new Set(),cache=new Map(),pendingFiles=new Map();
  const brokenFiles=new Set(),lastPlayed=new Map();
  const musicFiles=new Set();

  function persist(){
    try{globalThis.localStorage?.setItem(SETTINGS_KEY,JSON.stringify({enabled,music:musicVolume,sfx:sfxVolume}));}catch{}
  }

  function notify(){
    const snapshot={
      enabled,unlocked:unlocked&&audioContext?.state==='running'&&!closed,
      available:entries.size>0,loading,context,playing:!!currentMusic,
      music:musicVolume,sfx:sfxVolume,error,errorKey,closed,
    };
    const serialized=JSON.stringify(snapshot);
    if(serialized===lastStatus)return;
    lastStatus=serialized;
    try{onStatus?.(snapshot);}catch{/* An optional UI callback cannot break playback or the game. */}
  }

  function failure(code,key=null){error=code;errorKey=key;notify();}
  function clearFailure(){if(error!==null){error=null;errorKey=null;notify();}}
  function canPlay(){return enabled&&unlocked&&!closed&&audioContext?.state==='running';}

  function musicEntry(){return entries.get(`music.${context}`)||(context==='port'?entries.get('music.title'):null);}

  function pruneMusicCache(incoming=null){
    const retained=new Set([currentMusic?.src,incoming,...[...fadingMusic].map(track=>track.src)].filter(Boolean));
    for(const src of cache.keys())if(musicFiles.has(src)&&!retained.has(src))cache.delete(src);
  }

  function ramp(parameter,value,seconds=.06){
    if(!parameter||!audioContext)return;
    try{
      const now=audioContext.currentTime;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value,now);
      parameter.linearRampToValueAtTime(value,now+seconds);
    }catch{try{parameter.value=value;}catch{}}
  }

  function disconnect(track){
    track.source.onended=null;
    try{track.source.disconnect();}catch{}
    try{track.gain.disconnect();}catch{}
    // A stopped source must not retain its old multi-minute PCM buffer.
    try{track.source.buffer=null;}catch{}
    voices.delete(track);fadingMusic.delete(track);
    if(currentMusic===track){currentMusic=null;notify();}
    pruneMusicCache();
    track.finished?.();track.finished=null;
  }

  function stop(track,fade=0){
    if(!track)return;
    try{
      if(fade>0){ramp(track.gain.gain,0,fade);track.source.stop(audioContext.currentTime+fade+.03);}
      else{track.source.stop();disconnect(track);}
    }catch{disconnect(track);}
  }

  function stopMusic(fade=FADE_SECONDS){
    musicGeneration++;
    for(const track of [...fadingMusic])stop(track);
    if(currentMusic){
      const old=currentMusic;currentMusic=null;
      if(fade>0)fadingMusic.add(old);
      stop(old,fade);
    }
    notify();
  }

  async function loadManifest(){
    if(manifestPromise)return manifestPromise;
    if(loaded)return entries;
    loading=true;notify();
    manifestPromise=(async()=>{
      try{
        const response=await fetch(new URL('../../assets/audio/manifest.json', import.meta.url),{cache:'no-cache'});
        entries=response.ok?entriesFromManifest(await response.json()):new Map();
        for(const [key,entry]of entries)if(key.startsWith('music.'))musicFiles.add(entry.src);
      }catch{entries=new Map();}
      finally{loaded=true;loading=false;manifestPromise=null;notify();}
      return entries;
    })();
    return manifestPromise;
  }

  async function decodedFile(entry,stillWanted=()=>true){
    if(closed||!audioContext||brokenFiles.has(entry.src))return null;
    if(cache.has(entry.src)){
      const buffer=cache.get(entry.src);cache.delete(entry.src);cache.set(entry.src,buffer);return buffer;
    }
    if(pendingFiles.has(entry.src))return pendingFiles.get(entry.src);
    const pending=(async()=>{
      try{
        const response=await fetch(entry.src);
        if(!response.ok)throw new Error('AUDIO_FILE_UNAVAILABLE');
        const data=await response.arrayBuffer();
        if(closed||!stillWanted())return null;
        const buffer=await new Promise((resolve,reject)=>{
          // Callback + promise support covers Safari variants without decoding twice.
          const result=audioContext.decodeAudioData(data,resolve,reject);
          if(result?.then)result.then(resolve,reject);
        });
        if(closed||!stillWanted()||!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0)return null;
        cache.set(entry.src,buffer);
        while(cache.size>MAX_CACHED_FILES)cache.delete(cache.keys().next().value);
        return buffer;
      }catch{
        brokenFiles.add(entry.src);
        if(!closed)failure('AUDIO_FILE_UNAVAILABLE',entry.key);
        return null;
      }finally{pendingFiles.delete(entry.src);}
    })();
    pendingFiles.set(entry.src,pending);
    return pending;
  }

  function decodedMusic(entry,generation){
    const operation=musicDecodeQueue.then(async()=>{
      if(!canPlay()||generation!==musicGeneration)return null;
      // Finish the existing crossfade before decoding another long recording.
      // Native ended events resolve this wait; no polling or JS timer is needed.
      const retiring=[...fadingMusic].map(track=>track.ended).filter(Boolean);
      if(retiring.length)await Promise.all(retiring);
      if(!canPlay()||generation!==musicGeneration)return null;
      pruneMusicCache(entry.src);
      return decodedFile(entry,()=>canPlay()&&musicEntry()?.src===entry.src);
    });
    musicDecodeQueue=operation.then(()=>undefined,()=>undefined);
    return operation;
  }

  function bounds(entry,buffer){
    const start=entry.start,end=Math.min(entry.end??buffer.duration,buffer.duration);
    return start<end?{start,end,duration:end-start}:null;
  }

  async function musicForContext(generation){
    if(!canPlay())return;
    if(context==='victory'||context==='defeat'){
      stopMusic();
      if(endingPlayed!==context){
        const expected=context;
        if(await playCue(`stinger.${expected}`,{expectedContext:expected}))endingPlayed=expected;
      }
      return;
    }
    const key=`music.${context}`;
    const entry=musicEntry();
    if(!entry){stopMusic();return;}
    const identity=JSON.stringify([entry.src,entry.start,entry.end,entry.loop]);
    if(currentMusic?.identity===identity)return;
    const buffer=await decodedMusic(entry,generation);
    if(!buffer||!canPlay()||generation!==musicGeneration)return;
    const clip=bounds(entry,buffer);
    if(!clip){failure('AUDIO_INVALID_CLIP',key);return;}
    let created=null;
    try{
      const source=audioContext.createBufferSource(),gain=audioContext.createGain();
      let finished;
      const ended=new Promise(resolve=>{finished=resolve;});
      const track={source,gain,key,identity,src:entry.src,ended,finished};
      created=track;
      source.buffer=buffer;source.loop=entry.loop;source.loopStart=clip.start;source.loopEnd=clip.end;
      gain.gain.value=0;source.connect(gain);gain.connect(musicBus);
      source.onended=()=>disconnect(track);
      // At most two music voices: current and its retiring crossfade partner.
      for(const old of [...fadingMusic])stop(old);
      const previous=currentMusic;
      if(entry.loop)source.start(audioContext.currentTime,clip.start);
      else source.start(audioContext.currentTime,clip.start,clip.duration);
      currentMusic=track;
      ramp(gain.gain,entry.volume,FADE_SECONDS);
      if(previous){fadingMusic.add(previous);stop(previous,FADE_SECONDS);}
      clearFailure();notify();
    }catch{stop(created);failure('AUDIO_PLAYBACK_FAILED',key);}
  }

  async function synchronize(){
    const generation=++musicGeneration;
    if(!canPlay())return;
    try{await musicForContext(generation);}catch{if(!closed)failure('AUDIO_PLAYBACK_FAILED');}
  }

  async function playCue(key,{expectedContext=null}={}){
    if(!canPlay())return false;
    const entry=entries.get(key);
    if(!entry)return false;
    const requested=clock(),previous=lastPlayed.get(key);
    if(previous!=null&&requested-previous<(COOLDOWNS[key]??180))return false;
    lastPlayed.set(key,requested);
    const generation=sessionGeneration,buffer=await decodedFile(entry);
    if(!buffer||!canPlay()||generation!==sessionGeneration)return false;
    if(expectedContext&&context!==expectedContext)return false;
    if(!key.startsWith('stinger.')&&clock()-requested>4000)return false;
    const clip=bounds(entry,buffer);
    if(!clip){failure('AUDIO_INVALID_CLIP',key);return false;}
    let created=null;
    try{
      while(voices.size>=MAX_SFX_VOICES)stop(voices.values().next().value);
      const source=audioContext.createBufferSource(),gain=audioContext.createGain();
      const voice={source,gain,key};
      created=voice;
      source.buffer=buffer;source.loop=false;gain.gain.value=entry.volume;
      source.connect(gain);gain.connect(sfxBus);source.onended=()=>disconnect(voice);
      voices.add(voice);source.start(audioContext.currentTime,clip.start,clip.duration);
      clearFailure();return true;
    }catch{stop(created);failure('AUDIO_PLAYBACK_FAILED',key);return false;}
  }

  async function unlock(){
    if(closed)return false;
    if(unlockPromise)return unlockPromise;
    const activation=globalThis.navigator?.userActivation;
    if(activation&&!activation.isActive&&!activation.hasBeenActive){failure('AUDIO_BLOCKED');return false;}
    try{
      // Constructor and resume happen synchronously inside the caller's gesture,
      // before manifest fetches or decoding can consume transient user activation.
      if(!audioContext){
        const AudioContextType=globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!AudioContextType){failure('AUDIO_UNSUPPORTED');return false;}
        audioContext=new AudioContextType();
        masterBus=audioContext.createGain();musicBus=audioContext.createGain();sfxBus=audioContext.createGain();
        masterBus.gain.value=enabled?1:0;musicBus.gain.value=musicVolume;sfxBus.gain.value=sfxVolume;
        musicBus.connect(masterBus);sfxBus.connect(masterBus);masterBus.connect(audioContext.destination);
        audioContext.onstatechange=()=>notify();
      }
      const resumed=audioContext.resume();
      unlockPromise=(async()=>{
        try{
          await resumed;
          if(closed)return false;
          unlocked=audioContext.state==='running';
          if(!unlocked){failure('AUDIO_BLOCKED');return false;}
          await loadManifest();
          if(closed)return false;
          await synchronize();notify();return true;
        }catch{if(!closed)failure('AUDIO_BLOCKED');return false;}
        finally{unlockPromise=null;}
      })();
      return unlockPromise;
    }catch{failure('AUDIO_BLOCKED');return false;}
  }

  function setEnabled(value){
    if(closed)return false;
    enabled=!!value;sessionGeneration++;persist();
    ramp(masterBus?.gain,enabled?1:0,.05);
    if(!enabled){stopMusic(.05);for(const voice of [...voices])stop(voice);}
    else void synchronize();
    notify();return enabled;
  }

  function setVolumes(values={}){
    if(!values||typeof values!=='object')values={};
    if(Number.isFinite(values.music))musicVolume=clamp(values.music);
    if(Number.isFinite(values.sfx))sfxVolume=clamp(values.sfx);
    ramp(musicBus?.gain,musicVolume);ramp(sfxBus?.gain,sfxVolume);
    persist();notify();return {music:musicVolume,sfx:sfxVolume};
  }

  function setContext(value){
    if(closed||!CONTEXTS.has(value))return context;
    if(value!==context){context=value;if(value!=='victory'&&value!=='defeat')endingPlayed=null;void synchronize();notify();}
    return context;
  }

  function onAction(previous,next,action){
    if(closed||!action)return;
    if(action.t==='UI_CLICK'){void playCue('sfx.click');return;}
    if(!next||next.lastError||previous===next)return;
    setContext(stateContext(next));
    if(!canPlay())return;
    const logs=appendOnlyLogs(previous,next);
    const cues=[];
    const cue=key=>{if(!cues.includes(key))cues.push(key);};
    const ended=!!next.ending&&!previous?.ending;
    const jumped=(next.stats?.jumps||0)>(previous?.stats?.jumps||0);
    const arrival=logs.some(entry=>entry.key==='log.arrive');
    const impact=(next.ship?.hull??40)+(next.ship?.structure??40)<(previous?.ship?.hull??40)+(previous?.ship?.structure??40);
    const sceneResolved=!!previous?.scene&&(!next.scene||previous.scene.round!==next.scene.round||previous.scene.type!==next.scene.type);
    const gunOrder=previous?.scene?.choices?.[3]??(Number(action.station)===3?action.choice:null);

    if(jumped)cue('sfx.jump');
    else if(arrival)cue('sfx.arrival');
    if(impact)cue('sfx.impact');
    if(sceneResolved&&(gunOrder==='fire'||logs.some(entry=>entry.key==='log.task'&&entry.params?.skill==='Gunnery')))cue('sfx.laser');
    if((next.collector?.pressure||0)>(previous?.collector?.pressure||0)||(!previous?.scene&&['repo','pirate'].includes(next.scene?.type)))cue('sfx.alarm');
    const totalTons=state=>(state?.cargo||[]).reduce((sum,lot)=>sum+lot.tons,0);
    const totalPassengers=state=>(state?.passengers||[]).reduce((sum,group)=>sum+group.count,0);
    const tradeCompleted=(['BUY','BOOK_FREIGHT'].includes(action.t)&&totalTons(next)>totalTons(previous))
      ||(action.t==='SELL'&&totalTons(next)<totalTons(previous))
      ||(action.t==='BOOK_PASSENGER'&&totalPassengers(next)>totalPassengers(previous))
      ||(action.t==='ACCEPT_CONTRACT'&&(next.contracts?.length||0)>(previous?.contracts?.length||0))
      ||(action.t==='PAY'&&(next.economy?.credits||0)<(previous?.economy?.credits||0));
    if(tradeCompleted)cue('sfx.trade');
    if(action.t==='REFUEL')cue('sfx.refuel');
    if(action.t==='REPAIR'||logs.some(entry=>['log.repair','log.portRepair'].includes(entry.key)))cue('sfx.repair');
    if(logs.some(entry=>entry.key.startsWith('log.bank.')||entry.key==='log.secret'))cue('sfx.message');
    if(!ended&&!cues.length&&(logs.some(entry=>entry.roll)||['CHARGEN_ROLL','CHARGEN_PICK','CHARGEN_EXPRESS'].includes(action.t)))cue('sfx.dice');
    if(!ended&&!cues.length)cue('sfx.click');
    // A simultaneous round can contain many rolls. Keep its audible response brief.
    for(const key of cues.slice(0,2))void playCue(key);
  }

  function close(){
    if(closed)return;
    closed=true;unlocked=false;sessionGeneration++;musicGeneration++;
    stopMusic(0);for(const voice of [...voices])stop(voice);
    cache.clear();pendingFiles.clear();brokenFiles.clear();lastPlayed.clear();musicFiles.clear();
    try{masterBus?.disconnect();musicBus?.disconnect();sfxBus?.disconnect();}catch{}
    try{const closing=audioContext?.close();closing?.catch?.(()=>{});}catch{}
    notify();
  }

  notify();
  return {unlock,setEnabled,setVolumes,setContext,onAction,isEnabled:()=>enabled,close};
}
