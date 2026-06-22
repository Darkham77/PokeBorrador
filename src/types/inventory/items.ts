
export type ItemCategory = 'pokeballs' | 'pociones' | 'stones' | 'combat' | 'etc' | string;

export interface Item {
  id: string;
  name: string;
  desc?: string;
  description?: string;
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
  tier?: string;
  icon?: string;
  sprite?: string;
  effect?: string;
  heal?: number;
  boost?: string;
  catchRate?: number;
  type?: string;
  stoneType?: string;
  heldEffect?: string;
  isGlobal?: boolean;
  globalItem?: boolean;
  nonCombat?: boolean;
  craftingTier?: number;
}

export type ShopItem = Item; // Alias for now as they share same structure in data/items.ts

export interface ItemEffectResult {
  success: boolean;
  message: string;
  resultType?: string;
  deferred?: boolean;
  moveName?: string;
  targetId?: string;
}

export type Inventory = Record<string, number>;
