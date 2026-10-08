import type { ItemEffectResult } from '@/types/inventory/items';
import { healHp, clearStatus, curaTotal, restorePP, handleStone } from './itemEffectHandlers.ts';
import { getDynamicItemEffect } from './helpers/itemEffectsHelpers.ts';
import { isValidTarget } from './helpers/itemTargetValidator.ts';
import { GLOBAL_BUFF_EFFECTS } from './helpers/itemGlobalBuffs.ts';
import { ITEM_HEALING_EFFECTS } from './helpers/itemHealingEffects.ts';
import { ITEM_EVOLUTION_EFFECTS } from './helpers/itemEvolutionEffects.ts';
import { ITEM_SPECIAL_BUFF_EFFECTS } from './helpers/itemSpecialBuffEffects.ts';
import { ITEM_EV_EFFECTS } from './helpers/itemEvEffects.ts';

export { isValidTarget, healHp, clearStatus, curaTotal, restorePP, handleStone, getDynamicItemEffect };

export const itemEffects: Record<string, (p: unknown) => ItemEffectResult> = {
  ...ITEM_HEALING_EFFECTS,
  ...ITEM_EVOLUTION_EFFECTS,
  ...ITEM_SPECIAL_BUFF_EFFECTS,
  ...ITEM_EV_EFFECTS,
  ...GLOBAL_BUFF_EFFECTS
};
