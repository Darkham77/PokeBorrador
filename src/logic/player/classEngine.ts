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

/**
 * Returns the processed modifier for a specific type and context.
 */
export function getClassModifier(playerClass: string, type: string, context: ModifierContext = {}): number {
  // PvP Balance: No advantages allowed during PvP
  if (context.isPvP) {
    if (type === 'shopDiscount') return 0;
    return 1.0;
  }

  const cls = (PLAYER_CLASSES as Record<string, { modifiers: Record<string, number> }>)[playerClass]; // open-record: Generic key-value data dictionary container
  if (!cls) return type === 'shopDiscount' ? 0 : 1.0;

  const m = cls.modifiers;

  switch (type) {
    case 'expMult':
      if (playerClass === 'cazabichos' && context.isTrainer) return m.expMultTrainer || 1.0;
      return m.expMult || 1.0;
    case 'bcMult':
      if (playerClass === 'entrenador' && context.isGym) return m.bcGymMult || 1.0;
      return m.bcMult || 1.0;
    case 'healCostMult':
      return m.healCostMult || 1.0;
    case 'daycareCostMult':
      return m.daycareCostMult || 1.0;
    case 'catchMult':
      return m.catchMult || 1.0;
    case 'shopDiscount':
      return m.shopDiscount || 0;
    default:
      return 1.0;
  }
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
