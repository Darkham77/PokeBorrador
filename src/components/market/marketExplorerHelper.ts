import type { ItemTier } from '@/types/inventory/items';
import { getItemById } from '@/data/inventory/items';

const TIER_LABELS: Record<ItemTier, string> = {
  common: 'COMÚN',
  rare: 'RARO',
  epic: 'ÉPICO',
  legend: 'LEGENDARIO'
} as const;

const TIER_COLORS: Record<ItemTier, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legend: 'var(--yellow)'
} as const;

export function resolveItemTier(name?: string): ItemTier {
  return getItemById(name || '')?.tier || 'common';
}

export function resolveItemDisplayName(name?: string): string {
  return getItemById(name || '')?.name || name || 'Objeto';
}

export function resolveTierLabel(tier?: string): string {
  return (TIER_LABELS as Record<string, string>)[tier || 'common'] || 'COMÚN'; // open-record: Item tier labels dictionary
}

export function resolveTierColor(tier?: string): string {
  return (TIER_COLORS as Record<string, string>)[tier || 'common'] || '#94a3b8'; // open-record: Item tier colors dictionary
}

export interface BuyButtonState {
  disabled: boolean;
  label: string;
}

export function resolveBuyButtonState(
  price: number,
  sellerId: string,
  currentUserUid?: string,
  userMoney = 0
): BuyButtonState {
  const isOwner = sellerId === currentUserUid;
  if (isOwner) {
    return { disabled: true, label: 'TU OFERTA' };
  }
  const canAfford = userMoney >= price;
  if (!canAfford) {
    return { disabled: true, label: 'SIN SALDO' };
  }
  return { disabled: false, label: 'COMPRAR' };
}
