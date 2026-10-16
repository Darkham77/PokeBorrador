/**
 * src/logic/utils/itemTierResolver.ts
 *
 * Centralizes item tier label and color logic across the game
 * to avoid code duplication and maintain visual consistency.
 */

import type { ItemTier } from '@/types/inventory/items';

export const ITEM_TIER_LABELS: Record<ItemTier, string> = {
  common: 'COMÚN',
  rare: 'RARO',
  epic: 'ÉPICO',
  legend: 'LEGENDARIO'
};

export const ITEM_TIER_COLORS: Record<ItemTier, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legend: 'var(--yellow)'
};

export function getItemTierLabel(tier?: string | null): string {
  const t = tier || 'common';
  return (
    (ITEM_TIER_LABELS as Record<string, string>)[t] || // open-record: Tier dictionary
    ITEM_TIER_LABELS['common']!
  );
}

export function getItemTierColor(tier?: string | null): string {
  const t = tier || 'common';
  return (
    (ITEM_TIER_COLORS as Record<string, string>)[t] || // open-record: Tier dictionary
    ITEM_TIER_COLORS['common']!
  );
}
