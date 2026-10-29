import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import {GOODS} from '../src/data/goods.js';
import {createInitialState} from '../src/core/state.js';
import {sceneOptions} from '../src/core/reducer.js';
import {createScene} from '../src/rules/scenes/index.js';
import {renderPort} from '../src/ui/port.js';
import {renderMarket} from '../src/ui/cargo.js';
import {renderMap} from '../src/ui/map.js';
import {chargenScreen} from '../src/ui/chargen.js';
import {endScreen,chronicleEntries} from '../src/ui/end.js';
const root=fileURLToPath(new URL('../',import.meta.url));
function files(dir){return readdirSync(dir,{withFileTypes:true}).filter(x=>!['.git','.local'].includes(x.name)).flatMap(x=>x.isDirectory()?files(join(dir,x.name)):[join(dir,x.name)]);}
test('English and French dictionaries have complete matching keys and parameters',()=>{assert.deepEqual(Object.keys(en).sort(),Object.keys(fr).sort());for(const key of Object.keys(en)){assert.ok(en[key]&&fr[key],key);const vars=s=>[...String(s).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();assert.deepEqual(vars(en[key]),vars(fr[key]),key);}for(const g of GOODS)assert.ok(en[g.nameKey]&&fr[g.nameKey]);});
test('every scene and legal choice is translated in both languages',()=>{const state=createInitialState('localization');for(const type of ['pirate','repo','patrol','customs','breakdown','drift','derelict','trader','patron','travel','mission-courier','mission-smuggle','mission-escort']){assert.ok(en[`scene.${type}`],type);assert.ok(en[`scene.${type}.text`],`${type} description`);const scene=createScene(type,state);for(let station=1;station<=5;station++)for(const o of sceneOptions(scene,state,station))assert.ok(en[`choice.${o.id}`],o.id);}});
test('static browser package has only local ES modules and no forbidden runtime primitives',()=>{for(const file of files(join(root,'src')).filter(x=>x.endsWith('.js'))){const text=readFileSync(file,'utf8');assert.doesNotMatch(text,/\bimport\s*\(/,relative(root,file));assert.doesNotMatch(text,/new\s+(?:Worker|SharedWorker|WebSocket|RTCPeerConnection)\b|WebAssembly\./,relative(root,file));assert.doesNotMatch(text,/(?:fetch|importScripts)\s*\(\s*['"]https?:/i,relative(root,file));for(const m of text.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){assert.ok(m[1].startsWith('.'),m[1]);assert.ok(existsSync(join(file,'..',m[1])),`${file} -> ${m[1]}`);}}assert.ok(!existsSync(join(root,'package.json')));assert.equal(JSON.parse(readFileSync(join(root,'LOB7-GAME.json'),'utf8')).entrypoint,'index.html');});
test('UI screens render from a real deterministic state without undefined text',()=>{const s=createInitialState('screen-tests');for(const html of [chargenScreen(s),renderPort(s),renderMap(s,s.ship.hex),...['goods','freight','passengers','contracts'].map(v=>renderMarket(s,v))]){assert.ok(html.length>100);assert.doesNotMatch(html,/>undefined</);}s.ending={type:'victory',score:123456};assert.match(endScreen(s),/run-card/);});
// LOB7 ownership proofs are publication metadata, outside the game package budget.
test('published file count and byte budget fit the specified static limits',()=>{const all=files(root).filter(file=>relative(root,file).split(/[\\/]/)[0]!=='.lob7');assert.ok(all.length<200,`${all.length} files`);const size=all.reduce((s,f)=>s+statSync(f).size,0);assert.ok(size<30*1024*1024,`${size} bytes`);for(const f of all)assert.ok(statSync(f).size<64*1024*1024);});
test('a long voyage chronicle retains the first jump and major trade as well as later highlights',()=>{const first={week:1,key:'log.jump',params:{hex:'0202'}},trade={week:2,key:'log.sell',params:{profit:50000}};const milestones=[{week:1,key:'log.runStarted',params:{}},first,trade,...Array.from({length:55},(_,i)=>({week:i+2,key:'log.scene',params:{type:'patrol'}}))];const selected=chronicleEntries({milestones,log:[]});assert.equal(selected.length,18);assert.ok(selected.includes(first));assert.ok(selected.includes(trade));assert.deepEqual([...selected].sort((a,b)=>a.week-b.week),selected);});
