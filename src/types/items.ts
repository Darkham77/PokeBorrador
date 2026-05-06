
export type ItemCategory = 'pokeballs' | 'pociones' | 'stones' | 'combat' | 'etc' | string;

export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  cat: ItemCategory;
  market?: boolean;
  effect?: string;
  heal?: number;
  boost?: string;
  catchRate?: number;
}

export interface ItemEffectResult {
  success: boolean;
  message: string;
  resultType?: string;
  deferred?: boolean;
  moveName?: string;
  targetId?: string;
}

export type Inventory = Record<string, number>;
