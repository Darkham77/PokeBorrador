/**
 * src/logic/pokemon/physicalDimensionsMath.ts
 *
 * Pure mathematical module for generating deterministic Gaussian physical dimensions
 * (height and weight) for Pokémon instances, size tier classification (XXS to XXL),
 * and sorting helpers.
 *
 * Fully compliant with Node.js 26+ native standards (zero DOM / Vue / Supabase dependencies).
 * 
 * @module physicalDimensionsMath
 */

import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import type { Pokemon } from '../../types/pokemon/pokemon.ts';

/** FNV-1a 32-bit offset basis. */
const FNV1A_OFFSET_BASIS = 2166136261;
/** FNV-1a 32-bit prime. */
const FNV1A_PRIME_MULTIPLIER = 16777619;
/** Mulberry32 state adder constant (golden ratio fraction). */
const MULBERRY_INCREMENT_STEP = 0x6d2b79f5;
/** Mulberry32 initial bitshift for mix step. */
const MULBERRY_BITSHIFT_INITIAL = 15;
/** Mulberry32 secondary bitshift for mix step. */
const MULBERRY_BITSHIFT_SECONDARY = 7;
/** Mulberry32 final bitshift for output normalization. */
const MULBERRY_BITSHIFT_OUTPUT = 14;
/** Mulberry32 linear congruential multiplier constant. */
const MULBERRY_MIX_MULTIPLIER = 61;
/** Mulberry32 normalization factor (2^32 divisor). */
const MULBERRY_NORMALIZATION_DIVISOR = 4294967296;

/** Default variation factor (+/- 15% from base). */
export const DEFAULT_SPECIES_RANGE_VARIATION_FACTOR = 0.15;

/** Number of uniform random rolls summed for the Irwin-Hall distribution (n = 4). */
const IRWIN_HALL_SAMPLE_COUNT = 4;

/** Tier ID finite domain tuple. */
// fallow-ignore-next-line unused-export
export const PHYSICAL_DIMENSION_TIERS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type PhysicalDimensionTierId = (typeof PHYSICAL_DIMENSION_TIERS)[number];

export interface PhysicalDimensionTier {
  id: PhysicalDimensionTierId;
  label: string;
  name: string;
  cssClass: string;
  minDeviation: number;
  maxDeviation: number;
}

const TIER_CONFIGS: Record<PhysicalDimensionTierId, PhysicalDimensionTier> = {
  XXS: {
    id: 'XXS',
    label: 'XXS',
    name: 'Miniatura',
    cssClass: 'tier-xxs',
    minDeviation: -Infinity,
    maxDeviation: -0.125
  },
  XS: {
    id: 'XS',
    label: 'XS',
    name: 'Pequeño',
    cssClass: 'tier-xs',
    minDeviation: -0.125,
    maxDeviation: -0.09
  },
  S: {
    id: 'S',
    label: 'S',
    name: 'Bajo',
    cssClass: 'tier-s',
    minDeviation: -0.09,
    maxDeviation: -0.06
  },
  M: {
    id: 'M',
    label: 'M',
    name: 'Normal',
    cssClass: 'tier-m',
    minDeviation: -0.06,
    maxDeviation: 0.06
  },
  L: {
    id: 'L',
    label: 'L',
    name: 'Alto',
    cssClass: 'tier-l',
    minDeviation: 0.06,
    maxDeviation: 0.09
  },
  XL: {
    id: 'XL',
    label: 'XL',
    name: 'Grande',
    cssClass: 'tier-xl',
    minDeviation: 0.09,
    maxDeviation: 0.125
  },
  XXL: {
    id: 'XXL',
    label: 'XXL',
    name: 'Titán',
    cssClass: 'tier-xxl',
    minDeviation: 0.125,
    maxDeviation: Infinity
  }
};

/**
 * Hashes an arbitrary string seed into a 32-bit unsigned integer using FNV-1a.
 * Deterministic and uniform.
 */
export function hashStringTo32Bit(seed: string): number {
  let h = FNV1A_OFFSET_BASIS >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, FNV1A_PRIME_MULTIPLIER) >>> 0;
  }
  return h;
}

/**
 * Creates a deterministic 32-bit pseudo-random number generator (Mulberry32).
 * Returns a floating point number in [0, 1).
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + MULBERRY_INCREMENT_STEP) >>> 0;
    let t = Math.imul(s ^ (s >>> MULBERRY_BITSHIFT_INITIAL), 1 | s);
    t = (t + Math.imul(t ^ (t >>> MULBERRY_BITSHIFT_SECONDARY), MULBERRY_MIX_MULTIPLIER | t)) ^ t;
    return ((t ^ (t >>> MULBERRY_BITSHIFT_OUTPUT)) >>> 0) / MULBERRY_NORMALIZATION_DIVISOR;
  };
}

/**
 * Generates a normalized Gaussian random value in [0, 1) using the Irwin-Hall distribution (n=4).
 * Mean = 0.5, Standard Deviation ~ 0.144.
 * Extreme values near 0 and 1 occur with very low probability (< 0.5%).
 */
export function generateGaussianNormalized(prng: () => number): number {
  let sum = 0;
  for (let i = 0; i < IRWIN_HALL_SAMPLE_COUNT; i++) {
    sum += prng();
  }
  return sum / IRWIN_HALL_SAMPLE_COUNT;
}

/**
 * Calculates a single physical dimension value (in meters or kg) using Gaussian bell curve.
 * 
 * @param seed String seed (e.g. `uid + 'h'` or `uid + 'w'`)
 * @param baseValueOrRange Canonical base number or explicit `[min, max]` range
 * @param factor Variance factor (defaults to 0.15, meaning +/- 15%)
 * @returns Raw numeric value with full precision
 */
export function generateGaussianPhysicalDimensionPure(
  seed: string,
  baseValueOrRange: number | [number, number] | null | undefined,
  factor: number = DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
): number {
  if (baseValueOrRange === null || baseValueOrRange === undefined) {
    return 0;
  }

  let min: number;
  let max: number;

  if (Array.isArray(baseValueOrRange)) {
    min = baseValueOrRange[0];
    max = baseValueOrRange[1];
  } else {
    min = baseValueOrRange * (1 - factor);
    max = baseValueOrRange * (1 + factor);
  }

  if (min === max) return min;

  const hash = hashStringTo32Bit(seed);
  const prng = createMulberry32(hash);
  const normalizedGaussian = generateGaussianNormalized(prng);

  return min + normalizedGaussian * (max - min);
}

/**
 * Classifies a physical dimension into its corresponding Size Tier (XXS to XXL).
 * 
 * @param value Actual instance value (e.g., 1.8)
 * @param baseValue Species canonical base value (e.g., 1.5)
 */
export function getPhysicalDimensionTier(
  value: number,
  baseValue: number | null | undefined
): PhysicalDimensionTier {
  if (!baseValue || baseValue <= 0 || value <= 0) {
    return TIER_CONFIGS.M;
  }

  const deviation = (value - baseValue) / baseValue;

  if (deviation < TIER_CONFIGS.XXS.maxDeviation) return TIER_CONFIGS.XXS;
  if (deviation < TIER_CONFIGS.XS.maxDeviation) return TIER_CONFIGS.XS;
  if (deviation < TIER_CONFIGS.S.maxDeviation) return TIER_CONFIGS.S;
  if (deviation <= TIER_CONFIGS.M.maxDeviation) return TIER_CONFIGS.M;
  if (deviation <= TIER_CONFIGS.L.maxDeviation) return TIER_CONFIGS.L;
  if (deviation <= TIER_CONFIGS.XL.maxDeviation) return TIER_CONFIGS.XL;
  return TIER_CONFIGS.XXL;
}

export interface InstancePhysicalData {
  height: string;
  weight: string;
  heightNum: number;
  weightNum: number;
  heightTier: PhysicalDimensionTier;
  weightTier: PhysicalDimensionTier;
  heightTooltip: string;
  weightTooltip: string;
}

/**
 * Builds tooltip description for a physical dimension with multi-line structured bulletpoints and limits.
 */
function createDimensionTooltip(
  dimensionName: string,
  unit: string,
  value: number,
  baseValue: number | null | undefined,
  tier: PhysicalDimensionTier,
  factor: number = DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
): string {
  if (!baseValue || baseValue <= 0) {
    return `• ${dimensionName}: ${value.toFixed(1)}${unit}`;
  }

  const minPossible = (baseValue * (1 - factor)).toFixed(1);
  const maxPossible = (baseValue * (1 + factor)).toFixed(1);
  const diffPct = ((value - baseValue) / baseValue) * 100;
  const sign = diffPct >= 0 ? '+' : '';
  const diffStr = `${sign}${diffPct.toFixed(1)}%`;

  const variationBullet = diffPct > 0 ? '▲' : diffPct < 0 ? '▼' : '•';
  const variationLabel = diffPct > 0 ? 'sobre el promedio' : diffPct < 0 ? 'bajo el promedio' : 'promedio exacto';

  return [
    `• Ejemplar: ${value.toFixed(1)}${unit} (${tier.label} - ${tier.name})`,
    `${variationBullet} Desviación: ${diffStr} ${variationLabel}`,
    `---`,
    `• Promedio especie: ${baseValue.toFixed(1)}${unit}`,
    `• Mínimo posible: ${minPossible}${unit} (XXS - Miniatura)`,
    `• Máximo posible: ${maxPossible}${unit} (XXL - Titán)`
  ].join('\n');
}

/**
 * Builds tooltip description for Pokédex species view (when no instance is selected).
 */
export function createSpeciesDimensionTooltip(
  dimensionName: string,
  unit: string,
  baseValue: number | null | undefined,
  factor: number = DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
): string {
  if (!baseValue || baseValue <= 0) {
    return `• ${dimensionName}: Sin datos disponibles`;
  }

  const minPossible = (baseValue * (1 - factor)).toFixed(1);
  const maxPossible = (baseValue * (1 + factor)).toFixed(1);
  const factorPct = Math.round(factor * 100);

  return [
    `• Promedio especie: ${baseValue.toFixed(1)}${unit}`,
    `---`,
    `• Rango posible: ${minPossible}${unit} - ${maxPossible}${unit} (±${factorPct}%)`,
    `• Mínimo posible: ${minPossible}${unit} (XXS - Miniatura)`,
    `• Máximo posible: ${maxPossible}${unit} (XXL - Titán)`
  ].join('\n');
}

/**
 * Calculates complete physical dimensions and tiers for an instance Pokémon.
 */
export function calculateInstancePhysicalData(
  pokemon: (Pokemon & { height?: number; weight?: number }) | null | undefined,
  speciesBaseData: { height?: number | null; weight?: number | null } | null | undefined
): InstancePhysicalData | null {
  if (!pokemon || !speciesBaseData) return null;

  const uid = pokemon.uid || 'def';
  const baseHeight = speciesBaseData.height ?? null;
  const baseWeight = speciesBaseData.weight ?? null;

  const heightNum = pokemon.height ?? generateGaussianPhysicalDimensionPure(uid + 'h', baseHeight);
  const weightNum = pokemon.weight ?? generateGaussianPhysicalDimensionPure(uid + 'w', baseWeight);

  const heightTier = getPhysicalDimensionTier(heightNum, baseHeight);
  const weightTier = getPhysicalDimensionTier(weightNum, baseWeight);

  const heightFormatted = heightNum.toFixed(1);
  const weightFormatted = weightNum.toFixed(1);

  return {
    height: heightFormatted,
    weight: weightFormatted,
    heightNum,
    weightNum,
    heightTier,
    weightTier,
    heightTooltip: createDimensionTooltip('ALTURA', 'm', heightNum, baseHeight, heightTier),
    weightTooltip: createDimensionTooltip('PESO', 'kg', weightNum, baseWeight, weightTier)
  };
}

/**
 * Helper to get numeric weight for sorting.
 */
export function getPokemonPhysicalWeight(pokemon: Pokemon): number {
  if (!pokemon) return 0;
  if (pokemon.weight !== undefined && pokemon.weight !== null) {
    return Number(pokemon.weight);
  }
  const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
  const baseWeight = spec?.weight ?? null;
  const uid = pokemon.uid || 'def';
  return generateGaussianPhysicalDimensionPure(uid + 'w', baseWeight);
}

/**
 * Helper to get numeric height for sorting.
 */
export function getPokemonPhysicalHeight(pokemon: Pokemon): number {
  if (!pokemon) return 0;
  if (pokemon.height !== undefined && pokemon.height !== null) {
    return Number(pokemon.height);
  }
  const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
  const baseHeight = spec?.height ?? null;
  const uid = pokemon.uid || 'def';
  return generateGaussianPhysicalDimensionPure(uid + 'h', baseHeight);
}
