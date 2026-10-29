import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,relative,resolve} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const audioDir=join(root,'assets','audio');
const expectedKeys=[
  'music.title','music.port','music.travel','music.threat',
  'stinger.victory','stinger.defeat',
  'sfx.click','sfx.dice','sfx.trade','sfx.jump','sfx.arrival',
  'sfx.laser','sfx.impact','sfx.alarm','sfx.repair','sfx.refuel','sfx.message',
];
const recordingKeys=expectedKeys.filter(key=>key!=='music.port');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));

function files(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=join(dir,entry.name);
    return entry.isDirectory()?files(path):[path];
  });
}

function frameHeader(bytes,offset){
  if(offset+4>bytes.length)return null;
  const header=bytes.readUInt32BE(offset);
  if((header>>>21)!==0x7ff)return null;
  const version=(header>>>19)&3,layer=(header>>>17)&3;
  const rateIndex=(header>>>12)&15,sampleIndex=(header>>>10)&3,padding=(header>>>9)&1;
  if(version===1||layer!==1||rateIndex===0||rateIndex===15||sampleIndex===3)return null;
  const mpeg1=version===3;
  const rates=mpeg1?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0];
  const sampleRate=[44100,48000,32000][sampleIndex]/(version===3?1:version===2?2:4);
  const frameBytes=Math.floor((mpeg1?144000:72000)*rates[rateIndex]/sampleRate)+padding;
  return {version,sampleRate,channels:((header>>>6)&3)===3?1:2,frameBytes,samples:mpeg1?1152:576};
}

function inspectMp3(bytes,label){
  assert.ok(bytes.length>100,label+' is too small to contain complete MP3 frames');
  let offset=0;
  if(bytes.toString('ascii',0,3)==='ID3'){
    assert.ok(bytes.length>=10,label+' has a truncated ID3 header');
    assert.ok([bytes[6],bytes[7],bytes[8],bytes[9]].every(value=>value<128),label+' has invalid ID3 size');
    offset=10+(bytes[6]<<21)+(bytes[7]<<14)+(bytes[8]<<7)+bytes[9];
    assert.ok(offset<bytes.length,label+' contains metadata but no audio');
  }
  const searchEnd=Math.min(bytes.length-4,offset+65536);
  let first=null;
  for(;offset<=searchEnd;offset++){
    const candidate=frameHeader(bytes,offset);
    if(!candidate)continue;
    const next=frameHeader(bytes,offset+candidate.frameBytes);
    if(next&&next.sampleRate===candidate.sampleRate&&next.version===candidate.version){
      first=candidate;break;
    }
  }
  assert.ok(first,label+' has no pair of consecutive MPEG Layer III frames');
  let frames=0,samples=0;
  while(offset+4<=bytes.length){
    const header=frameHeader(bytes,offset);
    if(!header)break;
    assert.equal(header.sampleRate,first.sampleRate,label+' changes sample rate mid-stream');
    assert.equal(header.version,first.version,label+' changes MPEG version mid-stream');
    assert.ok(offset+header.frameBytes<=bytes.length,label+' has a truncated final MP3 frame');
    samples+=header.samples;frames++;offset+=header.frameBytes;
  }
  assert.ok(frames>=2,label+' lacks complete audio frames');
  const tail=bytes.subarray(offset);
  assert.ok(tail.length===0||(tail.length===128&&tail.toString('ascii',0,3)==='TAG')||tail.every(value=>value===0),label+' has unexpected data after its audio frames');
  return {sampleRate:first.sampleRate,channels:first.channels,duration:samples/first.sampleRate,frames};
}

function finalAudio(){
  const manifest=json(join(audioDir,'manifest.json'));
  assert.equal(manifest.schemaVersion,1);
  assert.notEqual(manifest.partial,true,'the audio manifest is still a partial preview');
  assert.notEqual(manifest.complete,false,'the audio manifest declares an incomplete delivery');
  assert.ok(manifest.clips&&typeof manifest.clips==='object'&&!Array.isArray(manifest.clips));
  return {manifest,clips:manifest.clips};
}

function localFile(src){
  assert.equal(typeof src,'string');
  assert.match(src,/^assets\/audio\/[a-z0-9][a-z0-9/-]*\.mp3$/);
  assert.ok(!src.split('/').some(part=>part==='.'||part==='..'),'audio path traversal');
  const absolute=resolve(root,src),within=relative(audioDir,absolute);
  assert.ok(within&&!within.startsWith('..')&&!within.includes(':'),'audio must remain in assets/audio');
  return absolute;
}

test('final Suno audio manifest contains all 17 keys, 16 local recordings and a bounded payload',()=>{
  const {clips}=finalAudio();
  assert.deepEqual(Object.keys(clips).sort(),[...expectedKeys].sort(),'the delivered audio manifest must be complete');
  assert.equal(clips['music.port'],'music.title','port reuses the title recording explicitly');
  const paths=new Set();
  for(const key of recordingKeys){
    const entry=clips[key];
    assert.ok(entry&&typeof entry==='object'&&!Array.isArray(entry),key);
    const path=localFile(entry.src);
    assert.ok(statSync(path).isFile(),key);
    assert.ok(!paths.has(path),key+' must have its own native Suno recording');
    paths.add(path);
    assert.ok(Number.isFinite(entry.volume)&&entry.volume>0&&entry.volume<=1,key+' gain');
    assert.equal(entry.loop,key.startsWith('music.'),key+' loop flag');
    const start=entry.start??0,end=entry.end;
    assert.ok(Number.isFinite(start)&&start>=0,key+' start');
    if(end!=null)assert.ok(Number.isFinite(end)&&end>start,key+' end');
    assert.equal(entry.provenanceId,key+':A',key+' selected source');
  }
  const actualFiles=files(audioDir);
  assert.equal(actualFiles.filter(path=>/\.(mp3|m4a|wav|ogg|aac|flac|webm)$/i.test(path)).length,16,'no missing or orphan audio/B takes in the published audio');
  assert.equal(paths.size,16);
  const bytes=actualFiles.reduce((sum,path)=>sum+statSync(path).size,0);
  assert.ok(bytes<12*1024*1024,'audio payload including metadata exceeds 12 MiB: '+bytes);
});

test('each published MP3 has complete frames and matches its Suno A provenance hash, size and profile',()=>{
  const {clips}=finalAudio(),provenance=json(join(audioDir,'AUDIO-PROVENANCE.json'));
  assert.equal(provenance.schemaVersion,1);
  assert.equal(provenance.source,'Suno');
  assert.notEqual(provenance.partial,true,'the provenance is still a partial preview');
  assert.notEqual(provenance.complete,false,'the provenance declares an incomplete delivery');
  if(provenance.missingCues!=null)assert.deepEqual(provenance.missingCues,[],'published provenance must not declare missing cues');
  assert.ok(Array.isArray(provenance.clips));
  assert.equal(provenance.clips.length,16);
  assert.deepEqual(provenance.clips.map(clip=>clip.key).sort(),[...recordingKeys].sort());
  const registered=new Map((provenance.registeredTakes||[]).map(take=>[take.id,take]));
  for(const key of recordingKeys){
    const entry=clips[key],record=provenance.clips.find(clip=>clip.key===key);
    assert.equal(record.provenanceId,entry.provenanceId,key);
    assert.equal(record.source.source,'Suno',key);
    assert.equal(record.source.surface,key.startsWith('music.')?'Songs':'Sounds',key+' native Suno surface');
    assert.equal(record.source.downloaded,true,key+' source download');
    assert.equal(record.source.remoteOnly,false,key+' source must not be a remote placeholder');
    assert.ok(typeof record.source.sourceId==='string'&&record.source.sourceId.length>8,key+' Suno generation ID');
    assert.match(record.source.originalSha256,/^[a-f0-9]{64}$/,key+' original hash');
    assert.ok(Number.isInteger(record.source.originalBytes)&&record.source.originalBytes>0,key+' original bytes');
    const take=registered.get(entry.provenanceId);
    assert.ok(take,key+' registered A source');
    assert.equal(take.originalSha256,record.source.originalSha256,key+' original evidence');
    assert.equal(take.sourceId,record.source.sourceId,key+' generation evidence');
    assert.equal(take.downloaded,true,key+' registered download');
    assert.equal(take.remoteOnly,false,key+' registered source must be local evidence');
    assert.equal(take.originalBytes,record.source.originalBytes,key+' original size evidence');
    assert.equal(record.output.src,entry.src,key);
    const bytes=readFileSync(localFile(entry.src));
    assert.equal(bytes.length,record.output.bytes,key+' encoded size');
    assert.match(record.output.sha256,/^[a-f0-9]{64}$/,key+' encoded hash');
    assert.equal(sha256(bytes),record.output.sha256,key+' encoded bytes must match provenance');
    const actual=inspectMp3(bytes,key),probe=record.output.probe;
    assert.equal(probe.codec,'mp3',key);
    assert.equal(actual.sampleRate,probe.sampleRate,key+' sample rate');
    assert.equal(actual.channels,probe.channels,key+' channel count');
    assert.ok(Number.isFinite(probe.durationSeconds)&&probe.durationSeconds>0,key+' recorded duration');
    // MPEG frames include encoder delay/padding; provenance uses the decoded/gapless duration.
    assert.ok(Math.abs(actual.duration-probe.durationSeconds)<.2,key+' frame duration does not match provenance');
    const start=entry.start??0,end=entry.end??probe.durationSeconds;
    assert.ok(start<probe.durationSeconds&&end<=probe.durationSeconds+.02,key+' clip lies outside the recording');
    const peak=record.output.measurement?.input_tp,ceiling=record.normalization?.maximumEncodedTruePeakDbTP;
    if(Number.isFinite(peak)&&Number.isFinite(ceiling))assert.ok(peak<=ceiling+.1,key+' measured encoded peak exceeds its declared ceiling');
  }
});
