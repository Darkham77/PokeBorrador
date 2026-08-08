
/**
 * src/logic/player/classEngine.ts
 * Core engine for calculating class modifiers and mission validation.
 */
import { PLAYER_CLASSES } from '@/data/player/playerClasses';

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

  const cls = (PLAYER_CLASSES as Record<string, { modifiers: Record<string, number> }>)[playerClass]; // open-record
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

/**
 * Calculates the rewards and costs for a passive mission.
 */
export function getMissionCostInfo(missionId: string, playerClass: string): Record<string, unknown> | null {
  const cls = (PLAYER_CLASSES as Record<string, { id: string }>)[playerClass]; // open-record
  if (!cls) return null;

  if (playerClass === 'cazabichos') {
    const data: Record<string, Record<string, unknown>> = {
      mission_6h: { cost: 5000, ivFloor: 5, shinyDiv: 2 }, // magic-ok
      mission_12h: { cost: 10000, ivFloor: 10, shinyDiv: 4 }, // magic-ok
      mission_24h: { cost: 20000, ivFloor: 15, shinyDiv: 8 } // magic-ok
    };
    return { type: 'money', ...data[missionId] };
  }
  
  if (playerClass === 'rocket') {
    const data: Record<string, Record<string, unknown>> = {
      mission_6h: { pokReq: 1, mult: 1.0 },
      mission_12h: { pokReq: 2, mult: 1.3 }, // magic-ok
      mission_24h: { pokReq: 3, mult: 1.8 } // magic-ok
    };
    return { type: 'pokemon_sacrifice', ...data[missionId] };
  }

  if (playerClass === 'entrenador') {
    const data: Record<string, Record<string, unknown>> = {
      mission_6h: { cost: 5000, blocks: 1, bonusLevel: false }, // magic-ok
      mission_12h: { cost: 10000, blocks: 2, bonusLevel: false }, // magic-ok
      mission_24h: { cost: 20000, blocks: 4, bonusLevel: true } // magic-ok
    };
    return { type: 'money_pokemon', ...data[missionId] };
  }

  if (playerClass === 'criador') {
    const data: Record<string, Record<string, unknown>> = {
      mission_6h: { cost: 300, blocks: 1, vigorSaveChance: 0 }, // magic-ok
      mission_12h: { cost: 600, blocks: 2, vigorSaveChance: 0 }, // magic-ok
      mission_24h: { cost: 1000, blocks: 4, vigorSaveChance: 0.10 } // magic-ok
    };
    return { type: 'bc_pokemon', ...data[missionId] };
  }

  return null;
}
