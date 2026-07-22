/**
 * Helper to parse and validate a battle seed input into a typed 4-number tuple.
 * This guarantees exact state RNG parity between the fuzzer generator and replayers.
 */
function parseShowdownSeed(seed: unknown): [number, number, number, number] | undefined {
  if (!seed) return undefined;
  
  if (Array.isArray(seed)) {
    const nums = seed.map(Number).filter(n => !isNaN(n));
    if (nums.length === 4) {
      return nums as [number, number, number, number];
    }
  }
  
  if (typeof seed === 'string') {
    const nums = seed.split(',').map(Number).filter(n => !isNaN(n));
    if (nums.length === 4) {
      return nums as [number, number, number, number];
    }
  }
  
  return undefined;
}

/**
 * Parses the seed and casts it to the template literal string expected by @pkmn/sim types,
 * while preserving the underlying array/tuple structure at runtime.
 */
export function parseShowdownSeedForBattle(seed: unknown): `${number},${string}` | undefined {
  const parsed = parseShowdownSeed(seed);
  return parsed as unknown as `${number},${string}` | undefined;
}
