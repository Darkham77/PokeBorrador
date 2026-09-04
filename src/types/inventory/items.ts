import type { PokemonMoveId } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ItemId } from '@/data/inventory/items';
export const ITEM_CATEGORIES = ['pokeballs', 'potions', 'stones', 'combat_held', 'breeding_held', 'raw_material', 'refined_material', 'component', 'machinery', 'tools', 'tms', 'otros'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const BAG_MAIN_TABS = ['productos', 'materiales'] as const;
export type BagMainTab = (typeof BAG_MAIN_TABS)[number];

export const ITEM_MENU_ACTIONS = ['use', 'sell', 'release'] as const;
export type ItemMenuAction = (typeof ITEM_MENU_ACTIONS)[number];

export const ITEM_DISCARD_ACTIONS = ['sell', 'release'] as const;
export type ItemDiscardAction = (typeof ITEM_DISCARD_ACTIONS)[number];

export const ITEM_TIERS = ['common', 'rare', 'epic', 'legend'] as const;
export type ItemTier = (typeof ITEM_TIERS)[number];

export const ITEM_KINDS = ['held', 'usable', 'stone', 'booster'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const EVOLUTION_STONE_KINDS = ['fire', 'water', 'thunder', 'leaf', 'moon', 'sun', 'oval'] as const;
export type EvolutionStoneKind = (typeof EVOLUTION_STONE_KINDS)[number];

export const ITEM_EFFECT_RESULT_TYPES = ['heal', 'status_cure', 'stat_boost', 'revive', 'evolution', 'generic', 'relearner', 'levelup', 'learn_move', 'pp_up', 'ppmax', 'nature_patch', 'ability_pill'] as const;
export type ItemEffectResultType = (typeof ITEM_EFFECT_RESULT_TYPES)[number];

export interface Item {
  id: ItemId;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  desc?: string; // domain-ok: Open dynamic text or non-domain string payload
  description?: string; // domain-ok: Open dynamic text or non-domain string payload
  price: number;
  cat: ItemCategory;
  market?: boolean;
  trainerShop?: boolean;
  bcPrice?: number;
  warPrice?: number;
  showInNormalShop?: boolean;
  showInBCShop?: boolean;
  showInWarShop?: boolean;
  unlockLv?: number;
  tier?: ItemTier;
  icon?: string; // domain-ok: Open dynamic text or non-domain string payload
  sprite?: string; // domain-ok: Open dynamic text or non-domain string payload
  effect?: string; // domain-ok: Open dynamic text or non-domain string payload
  heal?: number;
  boost?: string; // domain-ok: Open dynamic text or non-domain string payload
  catchRate?: number;
  kind?: ItemKind;
  stoneType?: EvolutionStoneKind;
  heldEffect?: string; // domain-ok: Open dynamic text or non-domain string payload
  isGlobal?: boolean;
  globalItem?: boolean;
  nonCombat?: boolean;
  craftingTier?: number;
  isCanon?: boolean;
}

export interface ItemEffectResult {
  success: boolean;
  message: string; // domain-ok: Open dynamic text or non-domain string payload
  type?: ItemEffectResultType;
  resultType?: ItemEffectResultType;
  deferred?: boolean;
  moveName?: PokemonMoveId;
  targetId?: PokemonMoveId | PokemonSpeciesId;
  reason?: string; // domain-ok: Open dynamic text or non-domain string payload
}

export type Inventory = Partial<Record<ItemId, number>>;
