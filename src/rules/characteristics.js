export const CHARACTERISTICS = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];
export const clampCharacteristic = n => Math.max(1, Math.min(15, Math.floor(n)));
// The SRD uses -2 for 0. Jump-1 explicitly makes a zero characteristic -3.
export function characteristicDM(value) { return value <= 0 ? -3 : Math.max(-2, Math.min(3, Math.floor(value / 3) - 2)); }
export const dm = characteristicDM;
export const upp = characteristics => CHARACTERISTICS.map(key => Math.max(0, Math.min(15, characteristics[key] ?? 7)).toString(16).toUpperCase()).join('');
export const profile = upp;
