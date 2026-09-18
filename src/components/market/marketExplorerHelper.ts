import type { ItemTier } from '@/types/inventory/items'
import { getItemById } from '@/data/inventory/items'

const TIER_LABELS: Record<string, string> = {
  common: 'COMÚN',
  rare: 'RARO',
  epic: 'ÉPICO',
  legend: 'LEGENDARIO'
} as const;

const TIER_COLORS: Record<string, string> = {
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
  return TIER_LABELS[tier || 'common'] || 'COMÚN';
}

export function resolveTierColor(tier?: string): string {
  return TIER_COLORS[tier || 'common'] || '#94a3b8';
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
