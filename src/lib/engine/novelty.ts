import type { ProblemDNA } from "@/lib/types";

/** FNV-1a, 32-bit. Deterministic across processes, no dependencies. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Stable identity of a problem. Two people can never be handed the same
 * combination, because this is unique-indexed in the database.
 */
export function fingerprint(dna: ProblemDNA): string {
  const key = [
    dna.domainId,
    dna.actor,
    dna.friction,
    dna.mechanicId,
    dna.artifactId,
    dna.twistId,
  ].join("|");
  // Two independent hashes give a 64-bit key, which is plenty for the size of
  // the combination space and keeps collisions out of a club-sized dataset.
  const a = hash32(key).toString(16).padStart(8, "0");
  const b = hash32(`salt::${key}::salt`).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

/** Deterministic PRNG so the same DNA always renders the same prose. */
export function seededRandom(seed: string): () => number {
  let state = hash32(seed) || 1;
  return () => {
    // xorshift32
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/** Pick `n` distinct items, preserving relative order. */
export function pickMany<T>(rng: () => number, items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
  }
  return out;
}
