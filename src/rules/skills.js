export const SKILLS = {
  Pilot: 'DEX', Navigation: 'INT', Engineering: 'INT', Mechanics: 'INT', Gunnery: 'DEX', Medicine: 'EDU', Steward: 'SOC', Broker: 'INT', Admin: 'EDU', Streetwise: 'INT', Carousing: 'SOC', Leadership: 'SOC', Tactics: 'INT', 'Gun Combat': 'DEX', Melee: 'STR', Comms: 'EDU', Computer: 'INT', Sensors: 'INT', 'Vacc Suit': 'DEX', 'Zero-G': 'DEX', Survival: 'END', 'Jack-of-all-Trades': null,
};
export const SKILL_NAMES = Object.keys(SKILLS);
// Explicit Jump-1 adaptations to the closed skill list: adjacent technical,
// social, and movement specialties are consolidated rather than adding skills.
export const SKILL_ADAPTATIONS = {
  'Melee Combat': 'Melee', Piloting: 'Pilot', "Jack o' Trades": 'Jack-of-all-Trades',
  Electronics: 'Sensors', Gravitics: 'Engineering', Sciences: 'Computer',
  Vehicle: 'Pilot', 'Battle Dress': 'Vacc Suit', Demolitions: 'Mechanics',
  Recon: 'Sensors', Bribery: 'Streetwise', Gambling: 'Carousing',
  Advocate: 'Admin', Linguistics: 'Comms', Liaison: 'Comms',
  Animals: 'Survival', Athletics: 'Survival',
};
export function skillName(name) { return SKILL_ADAPTATIONS[name] ?? name; }
export function raiseSkill(crew, name) {
  const key = skillName(name);
  if (!(key in SKILLS)) return;
  crew.skills[key] = Math.min(4, (crew.skills[key] ?? 0) + 1);
}
export function skillCheckData(crew, name) {
  return {skill: crew?.skills?.[name], characteristic: crew?.characteristics?.[SKILLS[name]] ?? 7, joat: crew?.skills?.['Jack-of-all-Trades'] ?? 0};
}
