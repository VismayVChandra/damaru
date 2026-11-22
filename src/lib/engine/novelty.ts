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

/**
 * Storage key for a fork's `problems.fingerprint` column - deliberately NOT
 * the seed for its prose. A fork pins its source's exact DNA, so
 * `fingerprint(dna)` would collide with the source's own row and be rejected
 * by the unique index. Mixing the forking profile in keeps the row insertable
 * while `compose()` keeps running on the unmodified DNA, so a fork reads
 * identically to its source - which is the whole point of pinning it.
 */
export function forkFingerprint(dna: ProblemDNA, forkingProfileId: string): string {
  const key = [
    dna.domainId,
    dna.actor,
    dna.friction,
    dna.mechanicId,
    dna.artifactId,
    dna.twistId,
    "fork",
    forkingProfileId,
  ].join("|");
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

/** Like `pick`, but some items come up more often than others. Used so a
 * stated interest can tilt a draw without locking everything else out. */
export function pickWeighted<T>(rng: () => number, items: readonly { item: T; weight: number }[]): T {
  const total = items.reduce((sum, i) => sum + Math.max(0, i.weight), 0);
  if (total <= 0) return pick(rng, items.map((i) => i.item));
  let r = rng() * total;
  for (const entry of items) {
    r -= Math.max(0, entry.weight);
    if (r <= 0) return entry.item;
  }
  // Float drift only; the last item is as correct as any.
  return items[items.length - 1].item;
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
