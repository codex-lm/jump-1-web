import test from 'node:test';
import assert from 'node:assert/strict';
import { encode,decode,byteLength,stateHash,snapshotMessages,assembleSnapshot,resolveRoomIdentity,senderId,authorizeCommand,roundContext } from '../src/net/protocol.js';
import { createRoomClient } from '../src/net/room.js';
import { createInitialState } from '../src/core/state.js';
import { replay } from '../src/core/reducer.js';

const run='host:1:start';
const samples=[
  {t:'hello',name:'Oyelaran',lang:'fr',wants:2},
  {t:'roster',stations:{1:'host',2:'guest',3:null,4:null,5:null}},
  {t:'start',seed:'lantern',config:{difficulty:'normal'},run},
  {t:'cmd',turn:1,round:0,context:'chargen:1',run,action:{t:'CHARGEN_PICK',by:2,index:1,career:'Technician'}},
  {t:'acts',n:1,turn:1,round:0,run,actions:[{t:'CHARGEN_DONE',by:1}],hash:'aabbccdd'},
  {t:'tick',turn:1,round:1,context:'scene:1:pirate:1:4',deadline:1800000000000,run},
  {t:'snap',id:'snap-1',i:0,k:1,part:'{}',run},
  {t:'need',reason:'hash-mismatch',run},
  {t:'chat',text:'Le courrier est arrivé.'},
].map(message=>({v:1,...message}));

test('every protocol message round-trips below the 8192-byte SDK bound',()=>{
  for(const message of samples){const wire=encode(message);assert.ok(byteLength(wire)<=8192);assert.deepEqual(decode(wire),message);}
  assert.throws(()=>decode('not json'));
  assert.throws(()=>encode({v:1,t:'chat',text:'x'.repeat(201)}));
  assert.throws(()=>encode({v:1,t:'roster',stations:{1:'x',2:'x',3:null,4:null,5:null}}));
  assert.throws(()=>decode({...samples[3],turn:NaN}));
  assert.throws(()=>decode({...samples[0],wants:6}));
});

test('snapshot chunks budget UTF8 after JSON escaping and preserve complete Unicode',()=>{
  const snapshot={v:1,text:'« Échéance » \\ " 🪐\n'.repeat(10000),actions:[]};
  const messages=snapshotMessages(snapshot,{id:'unicode-snapshot',run});
  assert.ok(messages.length>10);
  for(const message of messages)assert.ok(byteLength(encode(message))<=8192);
  assert.deepEqual(assembleSnapshot([...messages].reverse()),snapshot);
  assert.throws(()=>assembleSnapshot(messages.slice(1)));
  assert.throws(()=>assembleSnapshot([...messages,messages[0]]));
  assert.throws(()=>snapshotMessages({text:'x'.repeat(2100000)},{id:'too-large',run}));
});

test('identities are service envelopes only and unknown or contradictory shapes fail closed',()=>{
  assert.deepEqual(resolveRoomIdentity({participantId:'self',hostParticipantId:'host'}),{selfId:'self',hostId:'host',isHost:false});
  assert.equal(senderId({participantId:'real',data:{from:'host'}}),'real');
  assert.equal(senderId({data:{from:'host'}}),null);
  assert.equal(senderId({participantId:'a',senderParticipantId:'b'}),null);
  assert.throws(()=>resolveRoomIdentity({userId:'self',ownerId:'host'}));
  assert.throws(()=>resolveRoomIdentity({participantId:'self',hostParticipantId:'host',role:'host'}));
});

test('authorization rejects claimed roles and prevents guest control of another station',()=>{
  const state=createInitialState('authorization');
  const base={stations:{1:'host',2:'guest',3:null,4:null,5:null},sender:'guest',hostId:'host',state};
  assert.equal(authorizeCommand({...base,action:{t:'CHARGEN_PICK',by:'captain',index:0}}),false);
  assert.equal(authorizeCommand({...base,action:{t:'CHARGEN_PICK',by:'captain',index:1}}),true);
  assert.equal(authorizeCommand({...base,action:{t:'DEPART',by:'captain',hex:'0101'}}),false);
  assert.equal(authorizeCommand({...base,sender:'host',action:{t:'PORT_ACTION',station:3,choice:'guard'}}),true);
  assert.equal(authorizeCommand({...base,sender:'host',action:{t:'PORT_ACTION',station:2,choice:'maintenance'}}),false);
});

function fakeClock() {
  let now=1800000000000,id=0;const timers=new Map(),intervals=new Map();
  return {now:()=>now,setTimeout(fn,ms){const key=++id;timers.set(key,{fn,when:now+ms});return key;},clearTimeout(key){timers.delete(key);},setInterval(fn,ms){const key=++id;intervals.set(key,{fn,ms});return key;},clearInterval(key){intervals.delete(key);},advance(ms){now+=ms;for(const [key,timer] of [...timers])if(timer.when<=now){timers.delete(key);timer.fn();}},get pending(){return timers.size+intervals.size;}};
}
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));};

class MockRooms {
  messages=[];connections=[];keys=new Map();sequence=0;
  lobby(id,host='host') {
    const service=this,connection={id,callback:null,after:0};this.connections.push(connection);
    return {room:{participantId:id,hostParticipantId:host,role:id===host?'host':'member'},
      async read({after=0,limit=50}={}){const messages=service.messages.filter(message=>message.sequence>after).slice(0,limit);return {messages,cursor:messages.at(-1)?.sequence??after};},
      async send(data,{idempotencyKey}){const key=`${id}:${idempotencyKey}`;if(service.keys.has(key))return service.keys.get(key);const message={sequence:++service.sequence,participantId:id,data:structuredClone(data)};service.messages.push(message);service.keys.set(key,message);for(const target of service.connections)if(target.callback&&message.sequence>target.after)queueMicrotask(()=>target.callback(message));return message;},
      subscribe(callback,{after=0}={}){connection.callback=callback;connection.after=after;return()=>{connection.callback=null;};},
    };
  }
  deliverTo(id,participantId,data){const connection=this.connections.find(c=>c.id===id);const message={sequence:++this.sequence,participantId,data};return connection.callback?.(message);}
}

test('mock room: host-confirmed acts, simultaneous fixed station order, late join replay, guest forgery rejection',async()=>{
  const service=new MockRooms(),clock=fakeClock(),hostStatuses=[],guestStatuses=[];let host,guest,late;
  try {
    host=await createRoomClient(service.lobby('host'),{clock,name:'Captain',onStatus:s=>hostStatuses.push(s)});
    guest=await createRoomClient(service.lobby('guest'),{clock,name:'Engineer',wants:2,onStatus:s=>guestStatuses.push(s)});
    await settle();assert.equal(guest.getStation(),2);
    await host.start('room-determinism',{shipName:'Vellaris'});await settle();
    await host.send({t:'CHARGEN_DONE'});await settle();
    assert.equal(stateHash(host.getState()),stateHash(guest.getState()));
    const before=stateHash(host.getState());
    await guest.send({t:'DEPART',by:'captain',hex:'0101'});await settle();
    assert.equal(stateHash(host.getState()),before);
    assert.ok(hostStatuses.some(s=>s.code==='rejected'&&s.error==='WRONG_STATION'));
    await host.send({t:'PORT_ACTION',station:1,choice:'flightplan'});
    assert.equal(Object.keys(host.getState().portActions).length,0,'no partial simultaneous round is applied');
    await guest.send({t:'PORT_ACTION',station:2,choice:'maintenance'});await settle();
    assert.equal(Object.keys(host.getState().portActions).length,5);
    assert.equal(stateHash(host.getState()),stateHash(guest.getState()));
    const batches=service.messages.filter(message=>message.data.t==='acts');
    assert.deepEqual(batches.at(-1).data.actions.map(action=>action.station),[1,2,3,4,5]);
    const saved=host.exportSave();assert.equal(stateHash(replay(saved.seed,saved.config,saved.actions)),stateHash(host.getState()));
    late=await createRoomClient(service.lobby('late'),{clock,name:'Medic',wants:4});await settle();
    assert.equal(late.getStation(),4);assert.equal(stateHash(late.getState()),stateHash(host.getState()));
    const stable=stateHash(guest.getState());
    await service.deliverTo('guest','guest',{v:1,t:'acts',run:batches.at(-1).data.run,n:99,turn:1,round:0,actions:[{t:'ABANDON'}],hash:'00000000'});
    assert.equal(stateHash(guest.getState()),stable);
    assert.ok(guestStatuses.some(s=>s.error==='ROOM_HOST_REQUIRED'));
  } finally {host?.close();guest?.close();late?.close();}
  assert.equal(clock.pending,0);
});

test('mock room: three expired rounds mark a silent participant auto; an active command restores control',async()=>{
  const service=new MockRooms(),clock=fakeClock();let host,guest;
  try {
    host=await createRoomClient(service.lobby('host'),{clock});
    guest=await createRoomClient(service.lobby('guest'),{clock,wants:2});await settle();
    await host.start('timeouts');await settle();await host.send({t:'CHARGEN_DONE'});await settle();
    for(let round=0;round<3;round++) {
      clock.advance(60000);await settle();
      if(round<2){await host.send({t:'END_WEEK'});await settle();}
    }
    assert.equal(host.getRoster().auto[2],true);
    assert.equal(guest.getRoster().auto[2],true);
    // A legitimate station action is still permitted after automation. Starting
    // the next week ensures the port action itself has not already been used.
    await host.send({t:'END_WEEK'});await settle();
    if(host.getState().phase==='payment'){await host.send({t:'SKIP_PAY'});await settle();}
    await guest.send({t:'REFUEL',tons:1,type:'refined'});await settle();
    assert.notEqual(host.getRoster().auto[2],true);
  } finally {host?.close();guest?.close();}
  assert.equal(clock.pending,0);
});

test('mock room: a hash mismatch requests an authenticated snapshot and restores replay state',async()=>{
  const service=new MockRooms(),clock=fakeClock(),statuses=[];let host,guest;
  try {
    host=await createRoomClient(service.lobby('host'),{clock});
    guest=await createRoomClient(service.lobby('guest'),{clock,wants:2,onStatus:s=>statuses.push(s)});await settle();
    await host.start('recovery');await settle();await host.send({t:'CHARGEN_DONE'});await settle();
    const latest=service.messages.filter(message=>message.data.t==='acts').at(-1).data;
    await service.deliverTo('guest','host',{v:1,t:'acts',run:latest.run,n:latest.n+1,turn:1,round:0,actions:[{t:'ABANDON'}],hash:'00000000'});await settle();
    assert.ok(service.messages.some(message=>message.data.t==='need'));
    assert.ok(service.messages.some(message=>message.data.t==='snap'));
    assert.ok(statuses.some(status=>status.code==='resynced'));
    assert.equal(stateHash(host.getState()),stateHash(guest.getState()));
    assert.equal(roundContext(host.getState()),roundContext(guest.getState()));
  } finally {host?.close();guest?.close();}
  assert.equal(clock.pending,0);
});
