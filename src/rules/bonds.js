import { derive } from '../core/rng.js';
import { roll } from '../core/dice.js';

export const BOND_TYPES=['comrades','comrades','rivals','debt','ex-lovers','shared-secret'];
export function generateBonds(seed,crew) {
  const result=[];
  for(let i=1;i<crew.length;i++) for(let j=0;j<i;j++) {
    const a=crew[j],b=crew[i];
    for(const term of b.terms) {
      if(!a.terms.some(t=>t.career===term.career||t.age===term.age)) continue;
      const rng=derive(seed,'bonds',a.id,b.id,term.index);
      if(roll(rng)<8) continue;
      const type=rng.pick(BOND_TYPES);
      result.push({id:`bond-${j+1}-${i+1}-${term.index}`,a:a.id,b:b.id,type,amount:type==='debt'?roll(rng)*1000:0,visible:type!=='shared-secret',revealed:false,term:term.index,settled:false});
      // One bond per pair avoids repeated copies of the same relationship.
      break;
    }
  }
  return result;
}
export function bondModifier(bonds,actorId,otherId,kind='cooperate') {
  return bonds.filter(b=>[b.a,b.b].includes(actorId)&&[b.a,b.b].includes(otherId)).reduce((dm,b)=>dm+(b.type==='comrades'?1:b.type==='rivals'?(kind==='leadership'?-1:kind==='competition'?1:0):b.type==='shared-secret'&&kind==='cover'?2:0),0);
}
