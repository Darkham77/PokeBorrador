import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import {
  POTION_HEAL_HP,
  SUPER_POTION_HEAL_HP,
  HYPER_POTION_HEAL_HP,
  FRESHWATER_HEAL_HP,
  SODAPOP_HEAL_HP,
  LEMONADE_HEAL_HP,
  REVIVE_HALF_DIVISOR,
  ETHER_PP_RESTORE,
  MAX_PP_RESTORE_CAP
} from '@/logic/constants/items';
import { healHp, revive, clearStatus, curaTotal, restorePP } from '../itemEffectHandlers.ts';

const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);

export const ITEM_HEALING_EFFECTS: Record<string, (p: unknown) => ItemEffectResult> = {
  'potion': pokeEffect((p) => healHp(p, POTION_HEAL_HP)),
  'superpotion': pokeEffect((p) => healHp(p, SUPER_POTION_HEAL_HP)),
  'hyperpotion': pokeEffect((p) => healHp(p, HYPER_POTION_HEAL_HP)),
  'maxpotion': pokeEffect((p) => healHp(p, p.maxHp)),
  'revive': pokeEffect((p) => revive(p, Math.floor(p.maxHp / REVIVE_HALF_DIVISOR))),
  'revivemax': pokeEffect((p) => revive(p, p.maxHp)),
  'antidote': pokeEffect((p) => clearStatus(p, 'poison')),
  'burnheal': pokeEffect((p) => clearStatus(p, 'brn')),
  'paralyzeheal': pokeEffect((p) => clearStatus(p, 'par')),
  'awakening': pokeEffect((p) => clearStatus(p, 'slp')),
  'iceheal': pokeEffect((p) => clearStatus(p, 'frz')),
  'fullheal': pokeEffect((p) => curaTotal(p)),
  'sodapop': pokeEffect((p) => healHp(p, SODAPOP_HEAL_HP)),
  'freshwater': pokeEffect((p) => healHp(p, FRESHWATER_HEAL_HP)),
  'lemonade': pokeEffect((p) => healHp(p, LEMONADE_HEAL_HP)),
  'ether': pokeEffect((p) => restorePP(p, ETHER_PP_RESTORE)),
  'elixir': pokeEffect((p) => restorePP(p, ETHER_PP_RESTORE)), // spanish-ok: UI Spanish text localization label
  'elixirmax': pokeEffect((p) => restorePP(p, MAX_PP_RESTORE_CAP)),
  'fullrestore': pokeEffect((p) => {
    const hpRes = healHp(p, p.maxHp);
    const statusRes = curaTotal(p);
    if (!hpRes.success && !statusRes.success) {
      return { success: false, message: 'No tendrá ningún efecto.' };
    }
    return { success: true, message: 'recuperó todo su HP y se curó de sus problemas de estado.' };
  })
};
