/**
 * src/logic/player/classEngine.js
 * Core engine for calculating class modifiers and mission validation.
 */
import { PLAYER_CLASSES } from '@/data/player/classConstants';

/**
 * Returns the processed modifier for a specific type and context.
 */
export function getClassModifier(playerClass, type, context = {}) {
  // PvP Balance: No advantages allowed during PvP
  if (context.isPvP) {
    if (type === 'shopDiscount') return 0;
    return 1.0;
  }

  const cls = PLAYER_CLASSES[playerClass];
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
export function getMissionCostInfo(missionId, playerClass) {
  const cls = PLAYER_CLASSES[playerClass];
  if (!cls) return null;

  if (playerClass === 'cazabichos') {
    const data = {
      mission_6h: { cost: 5000, ivFloor: 5, shinyDiv: 2 },
      mission_12h: { cost: 10000, ivFloor: 10, shinyDiv: 4 },
      mission_24h: { cost: 20000, ivFloor: 15, shinyDiv: 8 }
    };
    return { type: 'money', ...data[missionId] };
  }
  
  if (playerClass === 'rocket') {
    const data = {
      mission_6h: { pokReq: 1, mult: 1.0 },
      mission_12h: { pokReq: 2, mult: 1.3 },
      mission_24h: { pokReq: 3, mult: 1.8 }
    };
    return { type: 'pokemon_sacrifice', ...data[missionId] };
  }

  if (playerClass === 'entrenador') {
    const data = {
      mission_6h: { cost: 5000, blocks: 1, bonusLevel: false },
      mission_12h: { cost: 10000, blocks: 2, bonusLevel: false },
      mission_24h: { cost: 20000, blocks: 4, bonusLevel: true }
    };
    return { type: 'money_pokemon', ...data[missionId] };
  }

  if (playerClass === 'criador') {
    const data = {
      mission_6h: { cost: 300, blocks: 1, vigorSaveChance: 0 },
      mission_12h: { cost: 600, blocks: 2, vigorSaveChance: 0 },
      mission_24h: { cost: 1000, blocks: 4, vigorSaveChance: 0.10 }
    };
    return { type: 'bc_pokemon', ...data[missionId] };
  }

  return null;
}
