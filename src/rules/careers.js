import { CAREERS, CAREER_NAMES, DEFAULT_CAREERS } from '../data/careers.js';
import { characteristicDM, clampCharacteristic } from './characteristics.js';
import { skillName, raiseSkill } from './skills.js';
import { d6 } from '../core/dice.js';

export { CAREERS, CAREER_NAMES, DEFAULT_CAREERS };
export function careerCheck(rng, check, characteristics, penalty = 0) {
  if(!check) return null;
  const dice=[d6(rng),d6(rng)], dm=characteristicDM(characteristics[check.characteristic]);
  const total=dice[0]+dice[1]+dm+penalty;
  return {dice,roll:dice[0]+dice[1],dm,penalty,total,target:check.target,characteristic:check.characteristic,success:total>=check.target};
}
export function applyTraining(crew,entry) {
  const attribute=/^\+1 (Str|Dex|End|Int|Edu|Soc)$/i.exec(entry);
  if(attribute) {
    const key=attribute[1].toUpperCase();
    crew.characteristics[key]=clampCharacteristic(crew.characteristics[key]+1);
    return key;
  }
  raiseSkill(crew,entry);
  return skillName(entry);
}
export function basicTraining(crew,career,first=true,rng) {
  for(const entry of first ? career.tables.service : [rng.pick(career.tables.service)]) {
    const name=skillName(entry);
    if(crew.skills[name]===undefined) crew.skills[name]=0;
  }
}
export function rankBenefit(crew,career,rank) {
  const skill=career.ranks[rank]?.skill;
  if(skill) crew.skills[skillName(skill)]=Math.max(crew.skills[skillName(skill)]??0,career.ranks[rank].level);
}
