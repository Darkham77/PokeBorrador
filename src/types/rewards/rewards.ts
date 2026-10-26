import type { AssetUri, DisplayText } from '@francogp/auditor';

import type { ItemId } from '@/data/inventory/items';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { EventRewardType } from '@/types/system/stores';

export const UNIFIED_REWARD_SOURCES = [
  'event',
  'ranked_milestone',
  'class_mission',
  'gts_claim'
] as const;

export type UnifiedRewardSource = (typeof UNIFIED_REWARD_SOURCES)[number];

export interface DomainPrizeData {
  type?: EventRewardType;
  amount?: number;
  qty?: number;
  money?: number;
  battleCoins?: number;
  item?: ItemId;
  items?: Partial<Record<ItemId, number>>;
  species?: PokemonSpeciesId;
  shiny?: boolean;
  level?: number;
  [key: DisplayText]: unknown;
}

export interface UnifiedRewardCategoryBadge {
  readonly icon: AssetUri;
  readonly name: DisplayText;
}

export const UNIFIED_REWARD_PILL_COLOR_CLASSES = [
  'money',
  'bc',
  'item',
  'pokemon',
  'special'
] as const;

export type UnifiedRewardPillColorClass = (typeof UNIFIED_REWARD_PILL_COLOR_CLASSES)[number];

export interface UnifiedRewardPill {
  readonly id: DisplayText;
  readonly label: DisplayText;
  readonly qtyText?: DisplayText;
  readonly icon?: AssetUri;
  readonly spriteUrl?: AssetUri;
  readonly description?: DisplayText;
  readonly colorClass?: UnifiedRewardPillColorClass;
}

export interface UnifiedRewardItem {
  readonly id: DisplayText;
  readonly source: UnifiedRewardSource;
  readonly title: DisplayText;
  readonly subtitle?: DisplayText;
  readonly categoryBadge?: UnifiedRewardCategoryBadge | null;
  readonly isLegacy?: boolean;
  readonly isClaimable: boolean;
  readonly prize: DomainPrizeData;
  readonly pills: readonly UnifiedRewardPill[];
  readonly rawData?: unknown;
}

export interface UnifiedRewardsSummary {
  readonly totalClaimable: number;
  readonly totalActionableMissions: number;
  readonly totalHomeNotifications: number;
}
