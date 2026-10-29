import { roll, d6 } from '../core/dice.js';
import { generateWorldName } from '../data/names.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const hexDigit = value => value.toString(16).toUpperCase();
export const worldProfile = w => `${w.starport}${[w.size,w.atmosphere,w.hydrographics,w.population,w.government,w.law].map(hexDigit).join('')}-${hexDigit(w.tech)}`;

/** Open Game Content, SRD book3/worlds.md, UWP Values for Trade Codes. */
export function tradeCodes(w) {
  const {size:s, atmosphere:a, hydrographics:h, population:p, government:g, law:l, tech:t} = w;
  const flags = {
    Ag:a>=4&&a<=9&&h>=4&&h<=8&&p>=5&&p<=7,
    As:s===0&&a===0&&h===0, Ba:p===0&&g===0&&l===0,
    De:a>=2&&h===0, Fl:a>=10&&h>=1, Ga:[5,6,8].includes(a)&&h>=4&&h<=9&&p>=4&&p<=8,
    Hi:p>=9, Ht:t>=12, Ic:a<=1&&h>=1, In:[0,1,2,4,7,9].includes(a)&&p>=9,
    Lo:p>=1&&p<=3, Lt:t<=5, Na:a<=3&&h<=3&&p>=6, Ni:p>=4&&p<=6,
    Po:a>=2&&a<=5&&h<=3, Ri:[6,8].includes(a)&&p>=6&&p<=8, Va:a===0, Wa:h===10,
  };
  return Object.keys(flags).filter(code => flags[code]);
}

export function worldArchetype(w) {
  if (w.codes.includes('As')) return 'asteroids';
  if (w.hydrographics>=8 && w.atmosphere<=3) return 'frozen-ocean';
  if (w.codes.includes('Ic')) return 'ice';
  if (w.codes.includes('Fl') || w.atmosphere>=13) return 'exotic';
  if (w.atmosphere>=10 && w.hydrographics<=2) return 'volcanic';
  if (w.codes.includes('Hi')) return 'city';
  if (w.atmosphere===0) return 'vacuum';
  if (w.codes.includes('Wa')) return 'ocean';
  if (w.codes.some(c=>['Ga','Ag','Ri'].includes(c))) return 'garden';
  if (w.atmosphere>=7 && w.atmosphere<=9 && w.hydrographics>=5 && w.hydrographics<=8) return 'jungle';
  if (w.hydrographics<=1 || w.codes.includes('Po')) return 'desert';
  return 'rocky';
}

export function finalizeWorld(w) {
  w.codes = tradeCodes(w);
  w.zone = w.law>=9 || [0,7,10].includes(w.government) || w.atmosphere>=10 ? 'Amber' : 'Green';
  w.archetype = worldArchetype(w);
  w.uwp = worldProfile(w);
  return w;
}

/** SRD-verified world generation. The brief's approximations for hydrographics,
 * population, starport and tech DMs differ from the source: use the source here.
 * Jump-1 caps codes at F and uses its explicit Amber rule (Law 0 not automatic).
 */
export function generateWorld(rng, q = 0, r = 0) {
  const size = roll(rng)-2;
  const atmosphere = size===0 ? 0 : clamp(roll(rng)-7+size,0,15);
  const hydroDM = [0,1,10,11,12].includes(atmosphere) ? -4 : atmosphere===14 ? -2 : 0;
  const hydrographics = size<=1 ? 0 : clamp(roll(rng)-7+size+hydroDM,0,10);
  const popDM = (size<=2?-1:0)+(atmosphere>=10?-2:0)+(atmosphere===6?3:[5,8].includes(atmosphere)?1:0)+(hydrographics===0&&atmosphere<3?-2:0);
  const population = clamp(roll(rng)-2+popDM,0,10);
  const government = population===0 ? 0 : clamp(roll(rng)-7+population,0,15);
  const law = population===0 || government===0 ? 0 : clamp(roll(rng)-7+government,0,15);
  const portResult = roll(rng)-7+population;
  const starport = portResult>=11?'A':portResult>=9?'B':portResult>=7?'C':portResult>=5?'D':portResult>=3?'E':'X';
  const techDM = ({A:6,B:4,C:2,X:-4}[starport]??0)+(size<=1?2:size<=4?1:0)+(atmosphere<=3||atmosphere>=10?1:0)+(hydrographics===0||hydrographics===9?1:hydrographics===10?2:0)+(population>=1&&population<=5?1:population===9?1:population===10?2:0)+([0,5].includes(government)?1:government===7?2:[13,14].includes(government)?-2:0);
  let tech = population===0 ? 0 : clamp(d6(rng)+techDM,0,15);
  if (population>0) {
    if ([0,10].includes(hydrographics)&&population>=6) tech=Math.max(tech,4);
    if ([4,7,9].includes(atmosphere)) tech=Math.max(tech,5);
    if (atmosphere<=3 || atmosphere>=10&&atmosphere<=12 || [13,14].includes(atmosphere)&&hydrographics===10) tech=Math.max(tech,7);
  }
  const naval = ['A','B'].includes(starport) && roll(rng)>=8;
  const scoutTarget = {A:10,B:9,C:8,D:7}[starport];
  const scout = Boolean(scoutTarget && roll(rng)>=scoutTarget);
  const pirate = !naval && ['C','D','E','X'].includes(starport) && roll(rng)===12;
  return finalizeWorld({hex:`${String(q+1).padStart(2,'0')}${String(r+1).padStart(2,'0')}`,q,r,name:generateWorldName(rng),starport,size,atmosphere,hydrographics,population,government,law,tech,naval,scout,pirate,gasGiant:roll(rng)<=9});
}
