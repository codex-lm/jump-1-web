import { hash } from '../core/rng.js';
import { validateAction } from '../core/actions.js';

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 8192;
export const MESSAGE_TYPES = Object.freeze(['hello','roster','start','cmd','acts','tick','snap','need','chat']);
const encoder = new TextEncoder();
const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const station = n => Number.isInteger(n) && n >= 1 && n <= 5;
const text = (value,max=120) => typeof value === 'string' && value.length > 0 && value.length <= max;
const record = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
export const byteLength = value => encoder.encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength;
export const stateHash = state => hash(JSON.stringify(state)).toString(16).padStart(8,'0');

function invalid(code='ROOM_PROTOCOL_INVALID') { const error=new Error(code); error.code=code; return error; }
function validJSON(value) {
  const pending=[{value,depth:0}],seen=new Set();let nodes=0;
  while(pending.length) {
    const item=pending.pop(),v=item.value;
    if(++nodes>8192||item.depth>64) return false;
    if(v===null||typeof v==='boolean'||typeof v==='string') continue;
    if(typeof v==='number') {if(!Number.isFinite(v)) return false;continue;}
    if(typeof v!=='object'||seen.has(v)) return false;
    if(!Array.isArray(v)&&!record(v)) return false;
    seen.add(v);
    const keys=Object.keys(v);
    if(Array.isArray(v)&&keys.length!==v.length) return false;
    if(keys.some(k=>['__proto__','constructor','prototype'].includes(k))) return false;
    for(const key of keys) pending.push({value:v[key],depth:item.depth+1});
  }
  return true;
}

export function validateMessage(message) {
  if(!record(message)||!validJSON(message)||message.v!==PROTOCOL_VERSION||!MESSAGE_TYPES.includes(message.t)) return 'ROOM_PROTOCOL_INVALID';
  let valid=false;
  switch(message.t) {
    case 'hello': valid=text(message.name,48)&&['en','fr'].includes(message.lang)&&(message.wants===null||station(message.wants));break;
    case 'roster': {
      if(!record(message.stations)) break;
      const assigned=[];
      valid=Object.keys(message.stations).length===5&&[1,2,3,4,5].every(id=>own(message.stations,String(id))&&(message.stations[id]===null||text(message.stations[id],200)));
      if(valid) for(const value of Object.values(message.stations)) if(value!==null) assigned.push(value);
      valid=valid&&new Set(assigned).size===assigned.length;
      break;
    }
    case 'start': valid=text(message.seed,120)&&record(message.config)&&text(message.run,200);break;
    case 'cmd': valid=integer(message.turn)&&integer(message.round)&&record(message.action)&&!validateAction(message.action)&&text(message.run,200)&&text(message.context,200);break;
    case 'acts': valid=integer(message.n)&&message.n>0&&integer(message.turn)&&integer(message.round)&&text(message.run,200)&&Array.isArray(message.actions)&&message.actions.length>0&&message.actions.length<=20&&message.actions.every(action=>record(action)&&!validateAction(action))&&/^[a-f0-9]{8}$/.test(message.hash);break;
    case 'tick': valid=integer(message.turn)&&integer(message.round)&&Number.isFinite(message.deadline)&&message.deadline>0&&text(message.context,200)&&text(message.run,200);break;
    case 'snap': valid=text(message.id,200)&&integer(message.i)&&integer(message.k)&&message.k>0&&message.k<=1000&&message.i<message.k&&typeof message.part==='string'&&byteLength(message.part)<=7000&&text(message.run,200);break;
    case 'need': valid=text(message.reason,200)&&text(message.run,200);break;
    case 'chat': valid=text(message.text,200);break;
  }
  if(!valid) return 'ROOM_PROTOCOL_INVALID';
  return byteLength(message)>MAX_MESSAGE_BYTES?'ROOM_MESSAGE_TOO_LARGE':null;
}

export function encode(message) {
  const error=validateMessage(message);
  if(error) throw invalid(error);
  return JSON.stringify(message);
}
export function decode(value) {
  if(typeof value==='string'&&byteLength(value)>MAX_MESSAGE_BYTES) throw invalid('ROOM_MESSAGE_TOO_LARGE');
  let message;
  try { message=typeof value==='string'?JSON.parse(value):value; }
  catch { throw invalid(); }
  const error=validateMessage(message);
  if(error) throw invalid(error);
  return message;
}

/** IDs are read only from the trusted SDK room object or service message
 * envelope, never from a game's data.from field. Ambiguous aliases fail closed.
 * These supported shapes are adapter contracts, not a claim of live validation.
 */
function oneIdentity(values) {
  const ids=[...new Set(values.filter(v=>text(v,200)))];
  return ids.length===1?ids[0]:null;
}
export function resolveRoomIdentity(room) {
  if(!record(room)) throw invalid('ROOM_IDENTITY_UNSUPPORTED');
  const selfId=oneIdentity([room.selfParticipantId,room.localParticipantId,room.participantId,room.self?.participantId,room.self?.id,room.participant?.id]);
  const hostId=oneIdentity([room.hostParticipantId,room.host?.participantId,room.host?.id,room.hostParticipant?.id]);
  if(!selfId||!hostId) throw invalid('ROOM_IDENTITY_UNSUPPORTED');
  if(room.role==='host'&&selfId!==hostId) throw invalid('ROOM_IDENTITY_UNSUPPORTED');
  return {selfId,hostId,isHost:selfId===hostId};
}
export function senderId(message) {
  if(!record(message)) return null;
  return oneIdentity([message.senderParticipantId,message.participantId,message.sender?.participantId,message.sender?.id,message.participant?.id,message.senderParticipant?.id]);
}

/** Budget counts the escaped JSON string, not just its unescaped characters.
 * This remains safe for quotes, backslashes, French accents, and astral Unicode.
 */
export function snapshotMessages(snapshot,{id,run}) {
  if(!text(id,200)||!text(run,200)) throw invalid();
  const serialized=JSON.stringify(snapshot);
  if(typeof serialized!=='string'||byteLength(serialized)>2000000) throw invalid('ROOM_SNAPSHOT_TOO_LARGE');
  const chunks=[];let part='',bytes=0;
  for(const point of serialized) {
    const escapedBytes=byteLength(JSON.stringify(point))-2;
    if(bytes+escapedBytes>7000&&part){chunks.push(part);part='';bytes=0;}
    part+=point;bytes+=escapedBytes;
  }
  if(part||!chunks.length) chunks.push(part);
  if(chunks.length>1000) throw invalid('ROOM_SNAPSHOT_TOO_LARGE');
  return chunks.map((part,i)=>{
    const message={v:1,t:'snap',id,run,i,k:chunks.length,part};encode(message);return message;
  });
}
export function assembleSnapshot(messages) {
  if(!Array.isArray(messages)||!messages.length) throw invalid();
  const first=decode(messages[0]),parts=new Map();
  if(first.t!=='snap') throw invalid();
  for(const value of messages){const message=decode(value);if(message.t!=='snap'||message.id!==first.id||message.run!==first.run||message.k!==first.k||parts.has(message.i))throw invalid();parts.set(message.i,message.part);}
  if(parts.size!==first.k) throw invalid('ROOM_SNAPSHOT_INCOMPLETE');
  const serialized=Array.from({length:first.k},(_,i)=>parts.get(i)).join('');
  if(byteLength(serialized)>2000000) throw invalid('ROOM_SNAPSHOT_TOO_LARGE');
  try{return JSON.parse(serialized);}catch{throw invalid();}
}

export function roundContext(state) {
  if(!state) return 'lobby';
  if(state.phase==='scene') {
    // A scene's opening log ordinal distinguishes successive scenes of the
    // same type in one week, without relying on delivery order or wall time.
    const logs=state.log??[];
    let opening=-1;
    for(let i=logs.length-1;i>=0;i--) if(logs[i].key==='log.scene'){opening=i;break;}
    return `scene:${state.clock.week}:${state.scene.type}:${state.scene.round}:${opening}`;
  }
  return `${state.phase}:${state.clock.week}`;
}

export function commandStation(stations,id) {
  return Number(Object.keys(stations??{}).find(key=>stations[key]===id))||null;
}
export function authorizeCommand({stations,auto={},sender,hostId,state,action}) {
  if(!sender||!state||validateAction(action)) return false;
  const held=commandStation(stations,sender),host=sender===hostId,captain=held===state.captainStation;
  if(!held) return false;
  const controls=id=>held===id||host&&(stations[id]===null||auto[id]===true);
  switch(action.t) {
    case 'NEW_RUN':return false;
    case 'CHARGEN_EXPRESS':case 'CHARGEN_DONE':return captain;
    case 'CHARGEN_PICK':case 'CHARGEN_ROLL':return controls(action.index+1);
    case 'PORT_ACTION':case 'SCENE_CHOICE':return controls(Number(action.station));
    case 'BUY':case 'SELL':case 'BOOK_FREIGHT':case 'BOOK_PASSENGER':case 'ACCEPT_CONTRACT':return controls(5);
    case 'REFUEL':case 'REPAIR':return controls(2);
    case 'OBJECT':return held!==state.captainStation&&Number(action.station??held)===held;
    case 'MUTINY_VOTE':return true;
    case 'DEPART':case 'QUICK_STOP':case 'STAY':case 'END_WEEK':case 'PAY':case 'SKIP_PAY':case 'SETTLE_LOAN':case 'RECRUIT':case 'ABANDON':return captain;
    default:return false;
  }
}
