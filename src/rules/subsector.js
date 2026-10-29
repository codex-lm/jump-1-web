import { derive } from '../core/rng.js';
import { generateWorld, finalizeWorld } from './worldgen.js';
import { generateName } from '../data/names.js';

// Standard zero-based odd-q offset: columns with q odd sit half a hex lower.
export function coordinates(value) {
  if (typeof value==='object' && value && Number.isInteger(value.q) && Number.isInteger(value.r)) return {q:value.q,r:value.r};
  if (typeof value==='object' && value) value=value.hex;
  if (!/^\d{4}$/.test(value??'')) return null;
  return {q:Number(value.slice(0,2))-1,r:Number(value.slice(2,4))-1};
}
export const toHex = ({q,r}) => `${String(q+1).padStart(2,'0')}${String(r+1).padStart(2,'0')}`;
function cube(value) {
  const p=coordinates(value);
  if (!p) return null;
  const x=p.q,z=p.r-(p.q-(p.q&1))/2;
  return {x,y:-x-z,z};
}
export function distance(a,b) {
  const aa=cube(a),bb=cube(b);
  return aa&&bb ? Math.max(Math.abs(aa.x-bb.x),Math.abs(aa.y-bb.y),Math.abs(aa.z-bb.z)) : Infinity;
}
export function neighbors(value) {
  const c=cube(value);
  if (!c) return [];
  return [[1,-1,0],[1,0,-1],[0,1,-1],[-1,1,0],[-1,0,1],[0,-1,1]].map(([x,y,z])=>({q:c.x+x,r:c.z+z+((c.x+x)-((c.x+x)&1))/2})).filter(p=>p.q>=0&&p.q<8&&p.r>=0&&p.r<10).map(toHex);
}
export function connectedWorlds(worlds,startHex) {
  const present=new Set(worlds.map(w=>w.hex)), seen=new Set([startHex]), queue=[startHex];
  while(queue.length) for(const next of neighbors(queue.shift())) if(present.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
  return [...seen];
}

export function generateSubsector(seed) {
  const rng=derive(seed,'subsector'), worlds=[];
  for(let q=0;q<8;q++) for(let r=0;r<10;r++) if(rng.int(1,6)>=4) worlds.push(generateWorld(rng,q,r));
  let start=worlds.find(w=>w.q<3&&['A','B'].includes(w.starport)&&w.population>=6&&w.zone!=='Amber');
  if(!start) {
    // Playability guarantee: preserve the rest of this generated world's rolls.
    start=worlds.find(w=>w.q<3&&w.population>=4)??worlds[0];
    if(!start){start=generateWorld(rng,1,4);worlds.push(start);}
    Object.assign(start,{starport:'B',population:6,government:4,law:4,atmosphere:6,hydrographics:5,size:Math.max(5,start.size),tech:Math.max(9,start.tech),naval:false});
    finalizeWorld(start);
  }
  let component=connectedWorlds(worlds,start.hex);
  while(component.length<14) {
    const occupied=new Set(worlds.map(w=>w.hex));
    const frontier=[...new Set(component.flatMap(neighbors))].filter(hex=>!occupied.has(hex)).sort();
    if(!frontier.length) break;
    const next=rng.pick(frontier),pos=coordinates(next);
    worlds.push(generateWorld(rng,pos.q,pos.r));
    component=connectedWorlds(worlds,start.hex);
  }
  worlds.sort((a,b)=>a.hex.localeCompare(b.hex,'en'));
  const bank=worlds.filter(w=>['A','B'].includes(w.starport)&&w.hex!==start.hex).sort((a,b)=>distance(start,b)-distance(start,a)||a.hex.localeCompare(b.hex,'en'))[0]??worlds.filter(w=>w.hex!==start.hex).sort((a,b)=>distance(start,b)-distance(start,a))[0];
  if(bank&&!['A','B'].includes(bank.starport)){bank.starport='B';bank.tech=Math.max(9,bank.tech);finalizeWorld(bank);}
  return {name:generateName(derive(seed,'subsector','name')),worlds,startHex:start.hex,bankHex:bank?.hex??start.hex};
}
