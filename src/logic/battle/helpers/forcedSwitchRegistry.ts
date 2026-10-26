import type { DisplayText } from '@francogp/auditor';

import type { AbilityId } from '@/data/battle/abilities';
import type { PokemonMoveId } from '@/data/battle/moves';
import type { ItemId } from '@/data/inventory/items';
import { toID } from '@/logic/utils/strings';
import type { BattleEscapeType } from '@/types/battle/battle';

export interface ForcedExitConfig {
  readonly escapeType: BattleEscapeType;
  readonly getExpulsionLog: (pokemonName: string) => string;
}

const DEFAULT_FORCED_EXIT_CONFIG: ForcedExitConfig = {
  escapeType: 'whirlwind',
  getExpulsionLog: (name: string) => `¡${name} fue expulsado del combate!`
};

// open-record: Forced switch triggers registry (moves, items, abilities)
const FORCED_SWITCH_REGISTRY: Record<DisplayText, ForcedExitConfig> = {
  whirlwind: {
    escapeType: 'whirlwind',
    getExpulsionLog: (name: string) => `¡${name} fue expulsado por el remolino!`
  },
  roar: {
    escapeType: 'flee',
    getExpulsionLog: (name: string) => `¡${name} huyó asustado por el rugido!`
  },
  dragontail: {
    escapeType: 'knockback',
    getExpulsionLog: (name: string) => `¡${name} fue arrojado fuera por la cola dragón!`
  },
  circlethrow: {
    escapeType: 'knockback',
    getExpulsionLog: (name: string) => `¡${name} fue lanzado fuera del combate!`
  },
  teleport: {
    escapeType: 'teleport',
    getExpulsionLog: (name: string) => `¡${name} se teletransportó lejos!`
  },
  uturn: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} dio media vuelta y regresó!`
  },
  voltswitch: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} cambió de posición con un chispazo!`
  },
  flipturn: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} viró ágilmente y regresó!`
  },
  partingshot: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} se retira tras su última palabra!`
  },
  chillyreception: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} dejó el campo tras su chiste helado!`
  },
  shedtail: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} mudó su cola y regresó!`
  },
  batonpass: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡${name} pasa el relevo!`
  },
  redcard: {
    escapeType: 'knockback',
    getExpulsionLog: (name: string) => `¡La Tarjeta Roja expulsó a ${name}!`
  },
  ejectbutton: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡El Botón Escape activó la retirada de ${name}!`
  },
  ejectpack: {
    escapeType: 'withdraw',
    getExpulsionLog: (name: string) => `¡La Mochila Escape activó la retirada de ${name}!`
  }
};

/**
 * Resolves the visual exit animation and localized combat log for a forced switch trigger.
 */
export function getForcedExitConfig(
  triggerId?: PokemonMoveId | AbilityId | ItemId | null
): ForcedExitConfig {
  if (!triggerId) return DEFAULT_FORCED_EXIT_CONFIG;
  const cleanId = toID(triggerId);
  return FORCED_SWITCH_REGISTRY[cleanId] || DEFAULT_FORCED_EXIT_CONFIG;
}

const FORCED_SWITCH_MOVE_VALUES = ['whirlwind', 'roar', 'dragontail', 'circlethrow'] as const;
type ForcedSwitchMoveValue = (typeof FORCED_SWITCH_MOVE_VALUES)[number];
const FORCED_SWITCH_MOVES_SET: ReadonlySet<ForcedSwitchMoveValue> = new Set<ForcedSwitchMoveValue>(
  FORCED_SWITCH_MOVE_VALUES
);

export function isForcedSwitchMove(moveId?: PokemonMoveId | null): boolean {
  if (!moveId) return false;
  const cleanId = toID(moveId);
  return FORCED_SWITCH_MOVES_SET.has(cleanId as ForcedSwitchMoveValue);
}
