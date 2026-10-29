import { createInitialState, assertState } from '../core/state.js';
import { reduce, replay, sceneOptions } from '../core/reducer.js';
import { DEFAULT_ROUTINES } from '../core/actions.js';
import { decode, encode, stateHash, snapshotMessages, assembleSnapshot, resolveRoomIdentity, senderId, roundContext, commandStation, authorizeCommand } from './protocol.js';

const fatalCodes=new Set(['ROOM_EXPIRED','ROOM_NOT_FOUND','RELEASE_NOT_FOUND','ACCOUNT_SUSPENDED','GAME_NOT_ALLOWED','SCOPE_REQUIRED','AUTH_INVALID','AUTH_REQUIRED','ROOM_CONNECTION_CLOSED']);
const recoverableCodes=new Set(['ROOM_TIMEOUT','ROOM_BUSY','ROOM_RATE_LIMITED']);
const clone=value=>JSON.parse(JSON.stringify(value));
const makeError=code=>Object.assign(new Error(code),{code});
const notify=(callback,...values)=>{try{callback?.(...values);}catch{/* Observers cannot break transport cleanup. */}};

/** LOB7 integration is intentionally isolated here. No direct socket or remote
 * fetch is used: all communication goes through the locally bundled SDK.
 * Metadata adapter contracts need validation in an actual selected LOB7 room.
 */
export async function connectRoom(options={}) {
  const sdk=options.sdk??globalThis.LOB7Rooms;
  if(!sdk?.connect) throw makeError('ROOM_BRIDGE_UNAVAILABLE');
  notify(options.onStatus,{code:'connecting'});
  const lobby=await sdk.connect();
  console.info('Jump-1 LOB7 room metadata',lobby.room);
  return createRoomClient(lobby,options);
}

export async function createRoomClient(lobby,options={}) {
  const identity=resolveRoomIdentity(lobby.room),{selfId,hostId,isHost}=identity;
  const clock=options.clock??{now:()=>Date.now(),setTimeout:(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimeout:id=>globalThis.clearTimeout(id),setInterval:(fn,ms)=>globalThis.setInterval(fn,ms),clearInterval:id=>globalThis.clearInterval(id)};
  const roundMilliseconds=options.roundMilliseconds??60000;
  let state=null,actions=[],seed=null,config=null,run=null,n=0,lastSequence=0,commandSerial=0;
  let closed=false,catchingUp=true,desynced=false,stopSubscription=null,roundTimer=null,helloTimer=null;
  let activeRound=null,deadline=0,sendQueue=Promise.resolve(),commandQueue=Promise.resolve(),needPending=false;
  let roster={stations:{1:hostId,2:null,3:null,4:null,5:null},auto:{},names:{}};
  let profile={name:String(options.name??'Crew').slice(0,48)||'Crew',lang:options.lang==='fr'?'fr':'en',wants:isHost?1:(options.wants??null)};
  const seenSequences=new Set(),listeners=new Set(),participants=new Map(),pendingChoices=new Map(),timeouts=new Map(),snapshots=new Map(),mutinyVotes=new Map();
  const report=(code,details={})=>notify(options.onStatus,{code,...details});
  const rosterChanged=()=>notify(options.onRoster,clone(roster));
  const stateChanged=(applied=[])=>{if(!catchingUp){notify(options.onState,state);for(const listener of listeners)notify(listener,state,applied);}};
  const context=()=>roundContext(state);
  const currentRound=()=>state?.scene?.round??0;
  const clearRound=()=>{if(roundTimer!==null)clock.clearTimeout(roundTimer);roundTimer=null;pendingChoices.clear();activeRound=null;deadline=0;};
  const enqueue=operation=>{const next=commandQueue.then(operation,operation);commandQueue=next.catch(()=>{});return next;};

  function handleError(error) {
    const code=error?.code??'ROOM_REQUEST_FAILED';
    if(fatalCodes.has(code)){report('closed',{error:code,canContinueSolo:!!state});close(false);}
    else report('error',{error:code});
  }
  async function sendRaw(data,key) {
    encode(data);
    if(closed) throw makeError('ROOM_CONNECTION_CLOSED');
    const operation=async()=>{
      for(let attempt=0;attempt<3;attempt++) {
        try{return await lobby.send(data,{idempotencyKey:key});}
        catch(error){if(!recoverableCodes.has(error.code)||attempt===2){handleError(error);throw error;}
          const wait=Math.min(10000,Math.max(300*2**attempt,(error.retryAfterSeconds??0)*1000));
          await new Promise(resolve=>clock.setTimeout(resolve,wait));
          if(closed)throw makeError('ROOM_CONNECTION_CLOSED');
        }
      }
    };
    const promise=sendQueue.then(operation,operation);sendQueue=promise.catch(()=>{});return promise;
  }
  async function broadcast(data,key) {
    const message=await sendRaw(data,key);
    // A returned service envelope has the same authority as a subscription
    // envelope. Apply it immediately; sequence deduplication handles its echo.
    if(!message||!Number.isSafeInteger(message.sequence)||!senderId(message))throw makeError('ROOM_IDENTITY_UNSUPPORTED');
    await receive(message);
    return message;
  }
  const outgoing=(type,payload)=>({v:1,t:type,...payload});
  async function publishRoster() {
    if(!isHost||closed)return;
    await broadcast(outgoing('roster',clone(roster)),`${selfId}:roster:${lastSequence}:${++commandSerial}`);
  }
  async function hello() {
    if(closed)return;
    await broadcast(outgoing('hello',profile),`${selfId}:hello:${Math.floor(clock.now()/30000)}:${profile.wants??0}:${profile.name}`);
  }
  async function requestSnapshot(reason='hash-mismatch') {
    if(isHost||!run||needPending||closed)return;
    needPending=true;
    try{await broadcast(outgoing('need',{run,reason}),`${selfId}:${run}:need:${n}:${reason}:${++commandSerial}`);}
    catch(error){needPending=false;throw error;}
  }
  async function sendSnapshot() {
    if(!state||!run)return;
    const id=`${run}:${n}:${stateHash(state)}`;
    const snapshot={v:1,run,n,seed,config,actions,state,hash:stateHash(state)};
    for(const message of snapshotMessages(snapshot,{id,run}))await broadcast(message,`${selfId}:snap:${id}:${message.i}`);
  }
  function normalizeAction(action,participant) {
    const result=clone(action),held=commandStation(roster.stations,participant);
    const controlled=result.t==='PORT_ACTION'||result.t==='SCENE_CHOICE'?Number(result.station):result.t==='CHARGEN_PICK'||result.t==='CHARGEN_ROLL'?result.index+1:['BUY','SELL','BOOK_FREIGHT','BOOK_PASSENGER','ACCEPT_CONTRACT'].includes(result.t)?5:['REFUEL','REPAIR'].includes(result.t)?2:held;
    result.by=controlled;
    if(result.t==='OBJECT')result.station=held;
    return result;
  }
  async function publishActions(candidates) {
    if(!isHost||!state||!run)throw makeError('ROOM_HOST_REQUIRED');
    let next=state;const accepted=[];
    for(const candidate of candidates){const updated=reduce(next,candidate);if(updated&&!updated.lastError){next=updated;accepted.push(candidate);}}
    if(!accepted.length)return {state,error:'ACTION_REJECTED'};
    const message=outgoing('acts',{run,n:n+1,turn:state.clock.week,round:currentRound(),actions:accepted,hash:stateHash(next)});
    await broadcast(message,`${selfId}:${run}:acts:${n+1}`);
    return {state,pending:false};
  }
  function defaultChoice(station) {
    if(state.phase==='port')return {t:'PORT_ACTION',by:station,station,choice:state.routines[station]??DEFAULT_ROUTINES[station]};
    const choices=sceneOptions(state.scene,state,station).map(option=>option.id);
    const preferred={1:['comply','scan','lead','evade','leave'],2:['repair','improvise','assist','stabilize'],3:state.scene.enemy?.hostile?['fire','guard','assist']:['guard','aim','assist'],4:['heal','examine'],5:['paperwork','reassure','negotiate']}[station];
    return {t:'SCENE_CHOICE',by:station,station,choice:preferred.find(id=>choices.includes(id))??'hold'};
  }
  function liveStations() {
    return [1,2,3,4,5].filter(id=>state?.crew.some(member=>member.station===id&&member.alive&&member.active!==false&&!member.unconscious));
  }
  function waitingStations() {
    return liveStations().filter(id=>roster.stations[id]&&!roster.auto[id]&&(state.phase!=='port'||!state.portActions[id]));
  }
  async function flushRound(expired=false) {
    if(!state||!activeRound||context()!==activeRound)return;
    const candidates=[];let changed=false;
    for(const station of liveStations()) {
      if(state.phase==='port'&&state.portActions[station])continue;
      const chosen=pendingChoices.get(station);
      if(chosen){timeouts.set(station,0);candidates.push(chosen);}
      else {
        if(expired&&roster.stations[station]&&!roster.auto[station]){const count=(timeouts.get(station)??0)+1;timeouts.set(station,count);if(count>=3){roster.auto[station]=true;changed=true;}}
        candidates.push(defaultChoice(station));
      }
    }
    clearRound();
    if(changed)await publishRoster();
    if(candidates.length)await publishActions(candidates);
  }
  async function ensureRound() {
    if(!isHost||catchingUp||closed||!state||desynced||!['port','scene'].includes(state.phase))return;
    if(state.phase==='port'&&liveStations().every(id=>state.portActions[id])){clearRound();return;}
    const nextContext=context();
    if(activeRound===nextContext)return;
    clearRound();activeRound=nextContext;deadline=clock.now()+roundMilliseconds;
    await broadcast(outgoing('tick',{run,turn:state.clock.week,round:currentRound(),context:activeRound,deadline}),`${selfId}:${run}:tick:${activeRound}`);
    if(closed)return;
    roundTimer=clock.setTimeout(()=>{void enqueue(()=>flushRound(true)).catch(handleError);},Math.max(0,deadline-clock.now()));
    if(waitingStations().length===0)await flushRound(false);
  }
  async function handleCommand(participant,message) {
    if(!state||desynced||message.run!==run||message.turn!==state.clock.week||message.round!==currentRound()||message.context!==context())return {state,error:'STALE_ROUND'};
    const action=message.action;
    if(!authorizeCommand({stations:roster.stations,auto:roster.auto,sender:participant,hostId,state,action}))return {state,error:'WRONG_STATION'};
    const held=commandStation(roster.stations,participant),normalized=normalizeAction(action,participant);
    if(roster.auto[held]){delete roster.auto[held];timeouts.set(held,0);await publishRoster();}
    if(action.t==='MUTINY_VOTE') {
      if(!Number.isInteger(action.candidate)||!liveStations().includes(action.candidate)||state.crew.filter(c=>c.alive&&c.mood<0).length<3)return {state,error:'MUTINY_UNAVAILABLE'};
      mutinyVotes.set(participant,action.candidate);
      const humans=liveStations().filter(id=>roster.stations[id]&&!roster.auto[id]);
      const votes=humans.filter(id=>mutinyVotes.get(roster.stations[id])===action.candidate).length;
      if(votes<=humans.length/2)return {state,pending:true};
      mutinyVotes.clear();return publishActions([{t:'MUTINY_VOTE',by:'system',candidate:action.candidate}]);
    }
    if(['PORT_ACTION','SCENE_CHOICE'].includes(action.t)) {
      if(state.phase!==(action.t==='PORT_ACTION'?'port':'scene'))return {state,error:'INVALID_PHASE'};
      const station=Number(action.station);
      const trial=reduce(state,normalized);
      if(trial.lastError)return {state,error:trial.lastError};
      if(!activeRound)await ensureRound();
      pendingChoices.set(station,normalized);timeouts.set(station,0);
      report('choice',{station,context:activeRound,waiting:waitingStations().filter(id=>!pendingChoices.has(id))});
      if(waitingStations().every(id=>pendingChoices.has(id)))await flushRound(false);
      return {state,pending:pendingChoices.size>0};
    }
    if(['DEPART','QUICK_STOP','STAY','END_WEEK'].includes(action.t)&&pendingChoices.size)return {state,error:'ROUND_PENDING'};
    return publishActions([normalized]);
  }

  async function receive(message) {
    if(closed||!message||!Number.isSafeInteger(message.sequence)||message.sequence<1)return;
    if(seenSequences.has(message.sequence))return;
    const participant=senderId(message);
    if(!participant){report('rejected',{error:'ROOM_IDENTITY_UNSUPPORTED'});return;}
    let data;
    try{data=decode(message.data);}catch(error){report('rejected',{error:error.code});return;}
    seenSequences.add(message.sequence);lastSequence=Math.max(lastSequence,message.sequence);
    const authority=participant===hostId;
    if(['roster','start','acts','tick','snap'].includes(data.t)&&!authority){report('rejected',{error:'ROOM_HOST_REQUIRED'});return;}
    switch(data.t) {
      case 'hello': {
        participants.set(participant,{name:data.name,lang:data.lang,wants:data.wants});
        if(isHost&&!catchingUp){roster.names[participant]=data.name;
          if(!commandStation(roster.stations,participant)){const wanted=data.wants&&roster.stations[data.wants]===null?data.wants:[2,3,4,5].find(id=>roster.stations[id]===null);if(wanted)roster.stations[wanted]=participant;}
          await publishRoster();
        }
        break;
      }
      case 'roster':
        if(data.stations[1]!==hostId)return;
        roster={stations:clone(data.stations),auto:clone(data.auto??{}),names:clone(data.names??{})};rosterChanged();break;
      case 'start':
        clearRound();seed=data.seed;config=data.config;run=data.run;n=0;actions=[];state=createInitialState(seed,config);desynced=false;needPending=false;snapshots.clear();mutinyVotes.clear();timeouts.clear();
        if(helloTimer!==null){clock.clearInterval(helloTimer);helloTimer=null;}
        stateChanged();report('running',{run});break;
      case 'acts': {
        if(!state||data.run!==run||data.n<=n)return;
        if(data.n!==n+1){desynced=true;report('desynced',{error:'ROOM_ACT_SEQUENCE'});if(!catchingUp)await requestSnapshot('act-sequence');return;}
        let next=state;
        for(const action of data.actions){next=reduce(next,action);if(!next||next.lastError){desynced=true;break;}}
        if(desynced||stateHash(next)!==data.hash){desynced=true;report('desynced',{error:'ROOM_HASH_MISMATCH'});if(!catchingUp)await requestSnapshot();return;}
        state=next;n=data.n;actions.push(...clone(data.actions));needPending=false;stateChanged(data.actions);
        if(!catchingUp)await ensureRound();
        break;
      }
      case 'tick':
        if(!state||data.run!==run||data.context!==context())return;
        deadline=data.deadline;report('round',{turn:data.turn,round:data.round,deadline,context:data.context});break;
      case 'cmd':
        if(isHost&&!catchingUp)void enqueue(async()=>{const result=await handleCommand(participant,data);if(result?.error)report('rejected',{error:result.error,participant});}).catch(handleError);
        break;
      case 'need':if(isHost&&!catchingUp&&data.run===run&&commandStation(roster.stations,participant))void enqueue(sendSnapshot).catch(handleError);break;
      case 'snap': {
        if(!state||data.run!==run||isHost)return;
        if(!snapshots.has(data.id)){if(snapshots.size>=2)snapshots.delete(snapshots.keys().next().value);snapshots.set(data.id,new Map());}
        const parts=snapshots.get(data.id);parts.set(data.i,data);
        if(parts.size!==data.k)return;
        try {
          const snapshot=assembleSnapshot([...parts.values()]);snapshots.delete(data.id);
          if(snapshot.v!==1||snapshot.run!==run||snapshot.n<n||snapshot.seed!==seed||!Array.isArray(snapshot.actions)||snapshot.actions.length>20000)throw makeError('ROOM_SNAPSHOT_INVALID');
          assertState(snapshot.state);
          const reconstructed=replay(snapshot.seed,snapshot.config,snapshot.actions);
          if(stateHash(snapshot.state)!==snapshot.hash||stateHash(reconstructed)!==snapshot.hash)throw makeError('ROOM_SNAPSHOT_INVALID');
          state=reconstructed;config=snapshot.config;actions=clone(snapshot.actions);n=snapshot.n;desynced=false;needPending=false;stateChanged();report('resynced');
        }catch(error){report('rejected',{error:error.code??'ROOM_SNAPSHOT_INVALID'});needPending=false;}
        break;
      }
      case 'chat':notify(options.onChat,{participant,name:roster.names[participant]??participants.get(participant)?.name??'Crew',text:data.text,sequence:message.sequence});break;
    }
  }

  async function initialize() {
    let cursor=0;
    for(let pages=0;pages<250;pages++) {
      const batch=await lobby.read({after:cursor,limit:50});
      if(!batch||!Array.isArray(batch.messages)||!Number.isSafeInteger(batch.cursor))throw makeError('ROOM_PROTOCOL_INVALID');
      for(const message of batch.messages)await receive(message);
      if(batch.cursor<=cursor)break;
      cursor=batch.cursor;
      if(pages===249)throw makeError('ROOM_HISTORY_LIMIT');
    }
    catchingUp=false;
    stopSubscription=lobby.subscribe(receive,{after:cursor,onError:handleError});
    if(state){stateChanged();report('running',{run});if(desynced)await requestSnapshot('replay-mismatch');else await ensureRound();}
    else report('lobby',{isHost});
    await hello();
    if(!state)helloTimer=clock.setInterval(()=>{void hello().catch(handleError);},30000);
    rosterChanged();
  }
  function close(announce=true) {
    if(closed)return;
    closed=true;clearRound();if(helloTimer!==null)clock.clearInterval(helloTimer);helloTimer=null;
    stopSubscription?.();stopSubscription=null;listeners.clear();snapshots.clear();
    if(announce)report('closed',{canContinueSolo:!!state});
  }
  try{await initialize();}catch(error){close(false);throw error;}
  return {
    async start(nextSeed,nextConfig={}) {
      if(!isHost)throw makeError('ROOM_HOST_REQUIRED');
      const token=`${selfId}:${lastSequence+1}:start`;
      const humanStations=[1,2,3,4,5].filter(id=>roster.stations[id]&&!roster.auto[id]);
      await broadcast(outgoing('start',{seed:String(nextSeed).slice(0,120),config:{...nextConfig,humanStations},run:token}),token);
      return {state};
    },
    async send(action) {
      if(!state)return {state,error:'ROOM_NOT_STARTED'};
      if(desynced)return {state,error:'ROOM_DESYNCED'};
      const data=outgoing('cmd',{run,turn:state.clock.week,round:currentRound(),context:context(),action:clone(action)});
      if(isHost)return enqueue(()=>handleCommand(selfId,data));
      await broadcast(data,`${selfId}:${run}:${data.turn}:${data.round}:cmd:${++commandSerial}`);
      return {state,pending:true};
    },
    async setName(name,lang=profile.lang,wants=profile.wants){profile={name:String(name).slice(0,48)||'Crew',lang:lang==='fr'?'fr':'en',wants:[1,2,3,4,5].includes(Number(wants))?Number(wants):null};await hello();},
    async chat(text){const value=String(text).trim().slice(0,200);if(!value)return;await broadcast(outgoing('chat',{text:value}),`${selfId}:chat:${++commandSerial}:${lastSequence}`);},
    requestSnapshot,
    getState:()=>state,
    getActions:()=>clone(actions),
    exportSave:()=>state?{version:1,seed,config:clone(config),actions:clone(actions)}:null,
    getSelfId:()=>selfId,
    getHostId:()=>hostId,
    getStation:()=>commandStation(roster.stations,selfId),
    getRoster:()=>clone(roster),
    isHost:()=>isHost,
    onActs(callback){listeners.add(callback);return()=>listeners.delete(callback);},
    close,
  };
}
