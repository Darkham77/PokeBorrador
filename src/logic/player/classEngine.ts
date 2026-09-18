/**
 * src/logic/player/classEngine.ts
 * Core engine for calculating class modifiers and mission validation.
 */
import { PLAYER_CLASSES, type PlayerClassId, type MissionId } from '@/data/player/playerClasses';

export interface ModifierContext {
  isPvP?: boolean;
  isTrainer?: boolean;
  isGym?: boolean;
}

const DEFAULT_NEUTRAL_MODIFIER = 1.0 as const;
const DEFAULT_DISCOUNT_MODIFIER = 0 as const;

function resolveExpMultiplier(
  modifiers: Record<string, number>,
  playerClass: string,
  isTrainer?: boolean
): number {
  if (playerClass === 'cazabichos' && isTrainer) {
    return modifiers.expMultTrainer ?? DEFAULT_NEUTRAL_MODIFIER;
  }
  return modifiers.expMult ?? DEFAULT_NEUTRAL_MODIFIER;
}

function resolveBcMultiplier(
  modifiers: Record<string, number>,
  playerClass: string,
  isGym?: boolean
): number {
  if (playerClass === 'entrenador' && isGym) {
    return modifiers.bcGymMult ?? DEFAULT_NEUTRAL_MODIFIER;
  }
  return modifiers.bcMult ?? DEFAULT_NEUTRAL_MODIFIER;
}

/**
 * Returns the processed modifier for a specific type and context.
 */
export function getClassModifier(playerClass: string, type: string, context: ModifierContext = {}): number {
  const fallback = type === 'shopDiscount' ? DEFAULT_DISCOUNT_MODIFIER : DEFAULT_NEUTRAL_MODIFIER;
  if (context.isPvP) return fallback;

  const cls = (PLAYER_CLASSES as Record<string, { modifiers: Record<string, number> }>)[playerClass]; // open-record: Generic key-value data dictionary container
  if (!cls) return fallback;

  const m = cls.modifiers;
  if (type === 'expMult') return resolveExpMultiplier(m, playerClass, context.isTrainer);
  if (type === 'bcMult') return resolveBcMultiplier(m, playerClass, context.isGym);
  if (type === 'shopDiscount') return m.shopDiscount ?? DEFAULT_DISCOUNT_MODIFIER;

  return m[type] ?? DEFAULT_NEUTRAL_MODIFIER;
}

const CAZABICHOS_MISSION_DATA: Record<string, Record<string, unknown>> = {
  mission_6h: { cost: 5000, ivFloor: 5, shinyDiv: 2 },
  mission_12h: { cost: 10000, ivFloor: 10, shinyDiv: 4 },
  mission_24h: { cost: 20000, ivFloor: 15, shinyDiv: 8 }
};

const ROCKET_MISSION_DATA: Record<string, Record<string, unknown>> = {
  mission_6h: { pokReq: 1, mult: 1.0 },
  mission_12h: { pokReq: 2, mult: 1.3 },
  mission_24h: { pokReq: 3, mult: 1.8 }
};

const ENTRENADOR_MISSION_DATA: Record<string, Record<string, unknown>> = {
  mission_6h: { cost: 5000, blocks: 1, bonusLevel: false },
  mission_12h: { cost: 10000, blocks: 2, bonusLevel: false },
  mission_24h: { cost: 20000, blocks: 4, bonusLevel: true }
};

const CRIADOR_VIGOR_SAVE_CHANCE_24H = 0.10;
const CRIADOR_MISSION_DATA: Record<string, Record<string, unknown>> = {
  mission_6h: { cost: 300, blocks: 1, vigorSaveChance: 0 },
  mission_12h: { cost: 600, blocks: 2, vigorSaveChance: 0 },
  mission_24h: { cost: 1000, blocks: 4, vigorSaveChance: CRIADOR_VIGOR_SAVE_CHANCE_24H }
};

/**
 * Calculates the rewards and costs for a passive mission.
 */
export function getMissionCostInfo(missionId: MissionId, playerClass: PlayerClassId): Record<string, unknown> | null {
  const cls = (PLAYER_CLASSES as Record<string, { id: string }>)[playerClass]; // open-record: Generic key-value data dictionary container
  if (!cls) return null;

  if (playerClass === 'cazabichos') {
    return { type: 'money', ...CAZABICHOS_MISSION_DATA[missionId] };
  }
  
  if (playerClass === 'rocket') {
    return { type: 'pokemon_sacrifice', ...ROCKET_MISSION_DATA[missionId] };
  }

  if (playerClass === 'entrenador') {
    return { type: 'money_pokemon', ...ENTRENADOR_MISSION_DATA[missionId] };
  }

  if (playerClass === 'criador') {
    return { type: 'bc_pokemon', ...CRIADOR_MISSION_DATA[missionId] };
  }

  return null;
}
