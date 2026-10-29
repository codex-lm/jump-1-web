/** FNV-1a and Mulberry32. Every random stream belongs to a semantic label. */
export function hash(value) {
  let result = 0x811c9dc5;
  const bytes = new TextEncoder().encode(String(value));
  for (const byte of bytes) result = Math.imul(result ^ byte, 0x01000193) >>> 0;
  return result >>> 0;
}

export function derive(seed, ...labels) {
  let state = hash(JSON.stringify([String(seed), ...labels]));
  const rng = () => {
    let value = state = (state + 0x6d2b79f5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (min, max) => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new RangeError('Invalid random integer range');
    return min + Math.floor(rng() * (max - min + 1));
  };
  rng.pick = (values) => values.length ? values[rng.int(0, values.length - 1)] : undefined;
  rng.dice = (count = 2, sides = 6) => Array.from({length: count}, () => rng.int(1, sides)).reduce((sum, n) => sum + n, 0);
  return rng;
}

export const fnv1a = hash;
