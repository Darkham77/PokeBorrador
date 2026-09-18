import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ComponentPillSize } from '@/types/system/game';
import { getPokemonTier } from '@/logic/pokemon/pokemonUtils';

const DEFAULT_MAX_HP = 100 as const;
const MIN_RATIO = 0 as const;
const MAX_RATIO = 1 as const;
const HP_HIGH_THRESHOLD = 0.5 as const;
const HP_MID_THRESHOLD = 0.2 as const;
const DEFAULT_RGB = '30, 41, 59' as const;
const DEFAULT_BG = 'rgba(255, 255, 255, 0.05)' as const;

export interface BoxCardClassOptions {
  isSelected: boolean;
  selectionType?: string | null;
  numBadges: number;
  isFastActive?: boolean;
  isPerformanceActive?: boolean;
  isPremium: boolean;
  pokemon?: Pokemon;
}

export function resolveBoxCardClasses(options: BoxCardClassOptions): Record<string, boolean> {
  const p = options.pokemon;
  const isBusy = !!(p?.onMission || p?.onEvent || p?.inDaycare || p?.onDefense);
  const isFast = options.isFastActive ?? options.isPerformanceActive ?? false;

  const classes: Record<string, boolean> = {
    'box-pokemon-card': true,
    selected: options.isSelected,
    'with-badges': options.numBadges > 0,
    'many-badges': options.numBadges > 3,
    'fast-mode': isFast,
    'performance-mode': isFast,
    'is-premium-tier': options.isPremium,
    'is-on-mission': !!p?.onMission,
    'is-on-event': !!p?.onEvent,
    'is-busy': isBusy
  };

  if (options.selectionType) {
    classes[`mode-${options.selectionType}`] = true;
  }

  return classes;
}

export function resolveHpRatio(hp?: number, maxHp?: number): number {
  const safeMax = maxHp !== undefined ? maxHp : DEFAULT_MAX_HP;
  if (safeMax <= 0) return MIN_RATIO;
  const safeCurrent = hp !== undefined ? hp : safeMax;
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, safeCurrent / safeMax));
}

export function resolveStatColor(ratio: number): string {
  if (ratio > HP_HIGH_THRESHOLD) return 'var(--green)';
  if (ratio > HP_MID_THRESHOLD) return 'var(--yellow)';
  return 'var(--red)';
}

export interface BoxTierInfo {
  tier: string;
  color: string;
  rgb: string;
  bg: string;
  isPremium: boolean;
}

export function resolveBoxTierInfo(pokemon?: Pokemon): BoxTierInfo {
  if (!pokemon) {
    return {
      tier: '?',
      color: 'var(--gray)',
      rgb: DEFAULT_RGB,
      bg: DEFAULT_BG,
      isPremium: false
    };
  }
  const info = getPokemonTier(pokemon);
  const isPremium = info.tier === 'S' || info.tier === 'S+';
  return {
    tier: info.tier,
    color: info.color,
    rgb: info.rgb || DEFAULT_RGB,
    bg: info.bg,
    isPremium
  };
}

export function resolveComputedTypePillSize(
  pokemon: Pokemon | undefined,
  defaultSize: ComponentPillSize
): ComponentPillSize {
  if (pokemon?.type && pokemon?.type2) {
    return 'ssm';
  }
  return defaultSize;
}

export function resolveCardAuraClass(aura: string | undefined, isPerformanceActive: boolean): string {
  if (aura && !isPerformanceActive) {
    return `aura-${aura}-mini`;
  }
  return '';
}
