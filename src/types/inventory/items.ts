import type { PokemonMoveId } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ItemId } from '@/data/inventory/items';
export type ItemCategory = 'pokeballs' | 'potions' | 'stones' | 'combat_held' | 'breeding_held' | 'raw_material' | 'refined_material' | 'component' | 'machinery' | 'tools' | 'tms' | 'otros';

export type ItemTier = 'common' | 'rare' | 'epic' | 'legend';
export type ItemKind = 'held' | 'usable' | 'stone' | 'booster';
export type EvolutionStoneKind = 'fire' | 'water' | 'thunder' | 'leaf' | 'moon' | 'sun' | 'oval';

export interface Item {
  id: ItemId;
  name: string; // domain-ok
  desc?: string; // domain-ok
  description?: string; // domain-ok
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
  icon?: string; // domain-ok
  sprite?: string; // domain-ok
  effect?: string; // domain-ok
  heal?: number;
  boost?: string; // domain-ok
  catchRate?: number;
  kind?: ItemKind;
  stoneType?: EvolutionStoneKind;
  heldEffect?: string; // domain-ok
  isGlobal?: boolean;
  globalItem?: boolean;
  nonCombat?: boolean;
  craftingTier?: number;
}

export type ShopItem = Item; // Alias for now as they share same structure in data/items.ts

export interface ItemEffectResult {
  success: boolean;
  message: string; // domain-ok
  type?: 'heal' | 'status_cure' | 'stat_boost' | 'revive' | 'evolution' | 'generic' | 'relearner' | 'levelup' | 'learn_move' | 'pp_up' | 'ppmax' | 'nature_patch' | 'ability_pill';
  resultType?: 'heal' | 'status_cure' | 'stat_boost' | 'revive' | 'evolution' | 'generic' | 'relearner' | 'levelup' | 'learn_move' | 'pp_up' | 'ppmax' | 'nature_patch' | 'ability_pill';
  deferred?: boolean;
  moveName?: PokemonMoveId;
  targetId?: PokemonMoveId | PokemonSpeciesId;
  reason?: string; // domain-ok
}

export type Inventory = Partial<Record<ItemId, number>>;
