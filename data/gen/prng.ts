// Seeded random numbers, so every run writes the same files.

export type Rng = () => number;

/** mulberry32: small, fast, good enough for test data. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole number from min to max, both included. */
export function int(r: Rng, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

export function pick<T>(r: Rng, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

export function shuffle<T>(r: Rng, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Split total into n whole numbers that add up to total. */
export function split(r: Rng, total: number, n: number): number[] {
  const weights = Array.from({ length: n }, () => 0.5 + r());
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  let rest = total - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % n, rest--) parts[i]++;
  return parts;
}

export function hex(r: Rng, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) s += Math.floor(r() * 16).toString(16);
  return s;
}
