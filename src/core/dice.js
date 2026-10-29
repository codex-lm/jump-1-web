import { characteristicDM } from '../rules/characteristics.js';

export const d6 = rng => 1 + Math.floor(rng() * 6);
export function roll(rng, count = 2, sides = 6) {
  return Array.from({length: count}, () => 1 + Math.floor(rng() * sides)).reduce((sum, n) => sum + n, 0);
}
export const d66 = rng => 10 * d6(rng) + d6(rng);

/** OGC: SRD book1/skills, task resolution. No automatic 2/12 outcomes. */
export function task({rng, skill, characteristic = 7, situation = 0, difficulty = 0, joat = 0}) {
  const dice = [d6(rng), d6(rng)];
  const skillDM = Number.isFinite(skill) ? skill : Math.min(0, -3 + Math.max(0, joat));
  const dm = characteristicDM(characteristic);
  const total = dice[0] + dice[1] + skillDM + dm + situation + difficulty;
  return {dice, roll: dice[0] + dice[1], skill: skillDM, dm, situation, difficulty, total, effect: total - 8, success: total >= 8};
}

export function opposed(attacker, defender) { return attacker.effect > defender.effect; }
