import {
  createSpeciesDimensionTooltip,
  DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
} from '@/logic/pokemon/physicalDimensionsMath';

export interface PhysicalData {
  height: string | number;
  weight: string | number;
  heightTooltip: string;
  weightTooltip: string;
  heightTier: { label: string; cssClass: string };
  weightTier: { label: string; cssClass: string };
}

export function formatRange(
  val: number | [number, number] | null | undefined,
  unit: string,
  factor: number = DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
): string {
  if (!val) return '—';
  if (Array.isArray(val)) return `${val[0]}${unit} - ${val[1]}${unit}`;
  const min = (val * (1 - factor)).toFixed(1);
  const max = (val * (1 + factor)).toFixed(1);
  return `${min}${unit} - ${max}${unit}`;
}

export function getCategoryDescription(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes('nueva especie')) {
    return 'Pokémon extremadamente raro que contiene el ADN de todos los demás Pokémon. Se creía puramente mitológico.';
  }
  if (c.includes('genético')) {
    return 'Pokémon creado artificialmente mediante manipulación avanzada de ADN y experimentos científicos.';
  }
  if (c.includes('legendario')) {
    return 'Pokémon de gran poder que aparece en los mitos y leyendas. Suele ser único en su especie.';
  }
  if (c.includes('mítico')) {
    return 'Pokémon tan singular que su existencia es cuestionada por muchos científicos y exploradores.';
  }
  if (c.includes('inicial')) {
    return 'Pokémon que suele entregarse a los entrenadores que comienzan su aventura regional.';
  }
  if (c.includes('fósil')) {
    return 'Pokémon prehistórico resucitado a partir de material genético preservado en fósiles.';
  }
  return `Clasificación: ${cat}. Define los rasgos biológicos principales y el comportamiento predominante de esta especie.`;
}

export interface TrophyDisplayData {
  medal: string;
  rankLabel: string;
  rankClass: string;
}

export function resolveTrophyDisplayData(rank?: string): TrophyDisplayData {
  if (rank === 'first') {
    return { medal: '🥇', rankLabel: '1º LUGAR', rankClass: 'rank-gold' };
  }
  if (rank === 'second') {
    return { medal: '🥈', rankLabel: '2º LUGAR', rankClass: 'rank-silver' };
  }
  if (rank === 'third') {
    return { medal: '🥉', rankLabel: '3º LUGAR', rankClass: 'rank-bronze' };
  }
  return { medal: '🏆', rankLabel: 'GANADOR', rankClass: 'rank-default' };
}

const _SUMMARY_DIMENSIONS = ['ALTURA', 'PESO'] as const;
export type SummaryDimension = (typeof _SUMMARY_DIMENSIONS)[number];

const _SUMMARY_DIMENSION_UNITS = ['m', 'kg'] as const;
export type SummaryDimensionUnit = (typeof _SUMMARY_DIMENSION_UNITS)[number];

export function resolveDimensionTooltipTitle(
  dimension: SummaryDimension,
  isInstance: boolean,
  instancePhysicalData: PhysicalData | null,
  unit: SummaryDimensionUnit
): string {
  if (isInstance && instancePhysicalData) {
    const val = dimension === 'ALTURA' ? instancePhysicalData.height : instancePhysicalData.weight;
    const tier = dimension === 'ALTURA' ? instancePhysicalData.heightTier.label : instancePhysicalData.weightTier.label;
    return `${dimension}: ${val}${unit} (${tier})`;
  }
  return `${dimension} (ESPECIE)`;
}

export function resolveDimensionTooltipDesc(
  dimension: SummaryDimension,
  isInstance: boolean,
  instancePhysicalData: PhysicalData | null,
  speciesDimension: number | [number, number] | null | undefined,
  unit: SummaryDimensionUnit
): string {
  if (isInstance && instancePhysicalData) {
    return dimension === 'ALTURA' ? instancePhysicalData.heightTooltip : instancePhysicalData.weightTooltip;
  }
  const raw = Array.isArray(speciesDimension) ? speciesDimension[0] : (speciesDimension || null);
  return createSpeciesDimensionTooltip(dimension, unit, raw);
}

export function resolveDimensionDisplayValue(
  dimension: SummaryDimension,
  isInstance: boolean,
  instancePhysicalData: PhysicalData | null,
  speciesDimension: number | [number, number] | null | undefined,
  unit: SummaryDimensionUnit
): string {
  if (isInstance && instancePhysicalData) {
    const val = dimension === 'ALTURA' ? instancePhysicalData.height : instancePhysicalData.weight;
    return `${val}${unit}`;
  }
  return formatRange(speciesDimension, unit);
}
