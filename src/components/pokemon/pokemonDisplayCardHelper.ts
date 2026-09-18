import type { Pokemon } from '@/types/pokemon/pokemon';
import type { AbilityId } from '@/data/battle/abilities';

const HP_HIGH_THRESHOLD_RATIO = 0.5 as const;
const HP_MID_THRESHOLD_RATIO = 0.25 as const;
const HP_PERCENT_MULTIPLIER = 100 as const;
const MIN_PERCENT_RATIO = 0 as const;
const MAX_PERCENT_RATIO = 1 as const;
const MIN_SAFE_HP_DIVISOR = 1 as const;

export type HpClass = 'hp-high' | 'hp-mid' | 'hp-low';

export function getHpClass(pct: number): HpClass {
  if (pct > HP_HIGH_THRESHOLD_RATIO) return 'hp-high';
  if (pct > HP_MID_THRESHOLD_RATIO) return 'hp-mid';
  return 'hp-low';
}

export interface HpData {
  pct: number;
  pctWidth: string;
  hpClass: HpClass;
  text: string;
}

export function calculateHpData(hp: number, maxHp: number): HpData {
  const safeMax = Math.max(MIN_SAFE_HP_DIVISOR, maxHp);
  const rawPct = hp / safeMax;
  const pct = Math.max(MIN_PERCENT_RATIO, Math.min(MAX_PERCENT_RATIO, rawPct));
  return {
    pct,
    pctWidth: `${pct * HP_PERCENT_MULTIPLIER}%`,
    hpClass: getHpClass(pct),
    text: `${hp} / ${maxHp} HP`
  };
}

export interface FieldPassiveDescriptor {
  id: AbilityId;
  label: string;
  desc: string;
  icon: string;
}

const _CARD_STATUS_KEYS = ['fieldPassive', 'mission', 'event', 'daycare', 'defense'] as const;
export type CardStatusKey = (typeof _CARD_STATUS_KEYS)[number];

export interface CardStatusIndicator {
  key: CardStatusKey;
  title: string;
  description: string;
  icon: string;
  cssClass: string;
}

export function resolveCardStatusIndicators(
  pokemon: Pick<Pokemon, 'onMission' | 'onEvent' | 'inDaycare' | 'onDefense'>,
  fieldPassive?: FieldPassiveDescriptor | null
): CardStatusIndicator[] {
  const indicators: CardStatusIndicator[] = [];

  if (fieldPassive) {
    indicators.push({
      key: 'fieldPassive',
      title: `HABILIDAD: ${fieldPassive.label.toUpperCase()}`,
      description: fieldPassive.desc,
      icon: fieldPassive.icon,
      cssClass: 'field-passive'
    });
  }
  if (pokemon.onMission) {
    indicators.push({
      key: 'mission',
      title: 'Misión',
      description: 'Este Pokémon está en una misión activa.',
      icon: '🧭',
      cssClass: 'mission'
    });
  }
  if (pokemon.onEvent) {
    indicators.push({
      key: 'event',
      title: 'Evento',
      description: 'Este Pokémon está participando en un evento o concurso activo.',
      icon: '🏆',
      cssClass: 'event'
    });
  }
  if (pokemon.inDaycare) {
    indicators.push({
      key: 'daycare',
      title: 'Guardería',
      description: 'Este Pokémon está en la guardería.',
      icon: '🥚',
      cssClass: 'daycare'
    });
  }
  if (pokemon.onDefense) {
    indicators.push({
      key: 'defense',
      title: 'Defensa',
      description: 'Este Pokémon está asignado a la defensa.',
      icon: '🛡️',
      cssClass: 'defense'
    });
  }

  return indicators;
}

export interface VisibleCardActions {
  readonly item: boolean;
  readonly details: boolean;
  readonly box: boolean;
  readonly replace: boolean;
}

export function resolveVisibleCardActions(
  actions: readonly string[],
  isPvp: boolean
): VisibleCardActions {
  const actionSet = new Set(actions);
  return {
    item: actionSet.has('item'),
    details: actionSet.has('details'),
    box: actionSet.has('box') && !isPvp,
    replace: isPvp
  };
}

export interface CardClassOptions {
  hasBadges: boolean;
  hasManyBadges: boolean;
  isSimplifiedModals: boolean;
  isPerformanceActive: boolean;
  isPremiumTier: boolean;
  isRuleViolated: boolean;
}

export function resolvePokemonCardClasses(
  pokemon: Pick<Pokemon, 'onMission' | 'onEvent' | 'aura' | 'isShiny' | 'isGuardian'>,
  options: CardClassOptions
): string[] {
  const classes = ['pokemon-display-card'];
  if (pokemon.onMission) classes.push('on-mission');
  if (pokemon.onEvent) classes.push('on-event');
  if (options.hasBadges) classes.push('with-badges');
  if (options.hasManyBadges) classes.push('many-badges');

  if (options.isSimplifiedModals) {
    classes.push('is-fast-mode', 'is-performance-mode');
    return classes;
  }

  if (options.isPerformanceActive) {
    classes.push('is-fast-mode', 'is-performance-mode');
  }

  if (pokemon.aura) classes.push(`aura-${pokemon.aura}-mini`);
  if (pokemon.isShiny) classes.push('is-shiny');
  if (pokemon.isGuardian) classes.push('is-guardian');
  if (options.isPremiumTier) classes.push('is-premium-tier');
  if (options.isRuleViolated) classes.push('is-rule-violated');

  return classes;
}
