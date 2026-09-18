/**
 * src/components/shared/rewardPillsNormalizers.ts
 * 
 * Pure normalizer helpers for RewardPillsGroup component.
 * Decouples raw prize payloads, item lookups, and direct pills into unified NormalizedReward items.
 */

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getItemById, getItemName } from '@/data/inventory/items';
import type { EventRewardType } from '@/types/system/stores';
import type { UnifiedRewardPill } from '@/types/rewards/rewards';

export interface RawPrizeData {
  type?: EventRewardType;
  amount?: number;
  qty?: number;
  money?: number;
  battleCoins?: number;
  item?: string;
  items?: Record<string, number>;
  species?: string;
  shiny?: boolean;
  level?: number;
}

export interface NormalizedReward {
  id: string;
  type: EventRewardType;
  title: string;
  label: string;
  qtyText?: string;
  spriteUrl?: string;
  icon?: string;
  description: string;
  colorClass: string;
}

const RAW_PRIZE_RESERVED_KEYS = [
  'type',
  'amount',
  'qty',
  'money',
  'battleCoins',
  'item',
  'items',
  'species',
  'shiny',
  'level'
] as const;

const RAW_PRIZE_RESERVED_KEY_SET = new Set<string>(RAW_PRIZE_RESERVED_KEYS); // runtime-set: Fast O(1) membership lookup set

function getItemDesc(itemIdOrName: string): string {
  const item = getItemById(itemIdOrName);
  return item?.desc || 'Objeto especial de recompensa.';
}

function getItemSpriteUrl(itemIdOrName: string): string {
  const item = getItemById(itemIdOrName);
  const slug = item?.sprite || item?.id || itemIdOrName;
  return getAssetUrl(ASSET_TYPES.ITEM, slug);
}

function normalizeDirectPills(pills: readonly UnifiedRewardPill[]): NormalizedReward[] {
  return pills.map((pill, idx) => {
    let rewardType: EventRewardType = 'item';
    if (pill.colorClass === 'money') {
      rewardType = 'money';
    } else if (pill.colorClass === 'bc') {
      rewardType = 'bc';
    } else if (pill.colorClass === 'pokemon') {
      rewardType = 'pokemon';
    }

    return {
      id: pill.id || `pill-${idx}`,
      type: rewardType,
      title: (pill.label || 'Recompensa').toUpperCase(), // domain-ok: Open dynamic text or non-domain string payload
      label: pill.label,
      qtyText: pill.qtyText,
      spriteUrl: pill.spriteUrl,
      icon: pill.icon,
      description: pill.description || 'Recompensa obtenida.',
      colorClass: pill.colorClass || 'special'
    };
  });
}

function normalizeRewardsMap(rewards: Record<string, number>): NormalizedReward[] {
  const list: NormalizedReward[] = [];
  for (const [key, qty] of Object.entries(rewards)) {
    if (typeof qty === 'number' && qty > 0) {
      const name = getItemName(key);
      list.push({
        id: `item-${key}`,
        type: 'item',
        title: name.toUpperCase(), // domain-ok: Open dynamic text or non-domain string payload
        label: name,
        qtyText: `x${qty}`,
        spriteUrl: getItemSpriteUrl(key),
        description: getItemDesc(key),
        colorClass: 'item'
      });
    }
  }
  return list;
}

function normalizeMoneyReward(p: RawPrizeData): NormalizedReward | null {
  let money = 0;
  if (typeof p.money === 'number') {
    money = p.money;
  } else if (p.type === 'money' && typeof p.amount === 'number') {
    money = p.amount;
  }

  if (money <= 0) return null;

  return {
    id: 'reward-money',
    type: 'money',
    title: 'POKÉDÓLARES',
    label: `₽${money.toLocaleString()}`,
    icon: '₽',
    description: 'Moneda principal del juego para adquirir objetos, consumibles y mejoras.',
    colorClass: 'money'
  };
}

function normalizeBcReward(p: RawPrizeData): NormalizedReward | null {
  let bc = 0;
  if (typeof p.battleCoins === 'number') {
    bc = p.battleCoins;
  } else if (p.type === 'bc' && typeof p.amount === 'number') {
    bc = p.amount;
  }

  if (bc <= 0) return null;

  return {
    id: 'reward-bc',
    type: 'bc',
    title: 'BATTLE COINS',
    label: `${bc.toLocaleString()} BC`,
    icon: '🪙',
    description: 'Monedas de honor obtenidas en combates competitivos, torneos y eventos.',
    colorClass: 'bc'
  };
}

function normalizeSingleItemReward(p: RawPrizeData): NormalizedReward | null {
  if (!p.item) return null;

  const itId = String(p.item);
  const qty = typeof p.qty === 'number' ? p.qty : (typeof p.amount === 'number' ? p.amount : 1);
  const name = getItemName(itId);

  return {
    id: `reward-item-${itId}`,
    type: 'item',
    title: name.toUpperCase(), // domain-ok: Open dynamic text or non-domain string payload
    label: name,
    qtyText: `x${qty}`,
    spriteUrl: getItemSpriteUrl(itId),
    description: getItemDesc(itId),
    colorClass: 'item'
  };
}

function normalizeItemsMapReward(p: RawPrizeData): NormalizedReward[] {
  if (!p.items || typeof p.items !== 'object') return [];

  const list: NormalizedReward[] = [];
  for (const [itId, itQty] of Object.entries(p.items)) {
    if (typeof itQty === 'number' && itQty > 0) {
      const name = getItemName(itId);
      list.push({
        id: `reward-item-map-${itId}`,
        type: 'item',
        title: name.toUpperCase(), // domain-ok: Open dynamic text or non-domain string payload
        label: name,
        qtyText: `x${itQty}`,
        spriteUrl: getItemSpriteUrl(itId),
        description: getItemDesc(itId),
        colorClass: 'item'
      });
    }
  }
  return list;
}

function normalizeDirectItemsReward(p: RawPrizeData | Record<string, unknown>): NormalizedReward[] {
  const list: NormalizedReward[] = [];
  for (const [key, val] of Object.entries(p)) {
    if (RAW_PRIZE_RESERVED_KEY_SET.has(key)) continue;

    if (typeof val === 'number' && val > 0) {
      const itDef = getItemById(key);
      if (itDef) {
        const name = getItemName(key);
        list.push({
          id: `reward-item-direct-${key}`,
          type: 'item',
          title: name.toUpperCase(), // domain-ok: Open dynamic text or non-domain string payload
          label: name,
          qtyText: `x${val}`,
          spriteUrl: getItemSpriteUrl(key),
          description: getItemDesc(key),
          colorClass: 'item'
        });
      }
    }
  }
  return list;
}

function normalizePokemonReward(p: RawPrizeData): NormalizedReward | null {
  if (p.type !== 'pokemon' && !p.species) return null;

  const sp = String(p.species || '');
  const shiny = Boolean(p.shiny);
  const lv = p.level ? `Nv. ${p.level}` : '';

  return {
    id: `reward-poke-${sp}`,
    type: 'pokemon',
    title: `${sp.toUpperCase()}${shiny ? ' ✨ SHINY' : ''}`, // domain-ok: Open dynamic text or non-domain string payload
    label: `${sp.toUpperCase()}`, // domain-ok: Open dynamic text or non-domain string payload
    qtyText: lv || (shiny ? '✨' : undefined),
    spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, sp, { isShiny: shiny }),
    description: `Ejemplar Pokémon especial ${shiny ? 'Variocolor (Shiny)' : ''} listo para sumarse a tu equipo.`,
    colorClass: 'pokemon'
  };
}

export function normalizeAllRewards(
  pills: readonly UnifiedRewardPill[] | null | undefined,
  rewards: Record<string, number> | null | undefined,
  prize: RawPrizeData | Record<string, unknown> | null | undefined
): NormalizedReward[] {
  if (pills && pills.length > 0) {
    return normalizeDirectPills(pills);
  }

  if (rewards && typeof rewards === 'object') {
    return normalizeRewardsMap(rewards);
  }

  if (!prize) return [];

  const rawPrize = prize as RawPrizeData;
  const list: NormalizedReward[] = [];

  const money = normalizeMoneyReward(rawPrize);
  if (money) list.push(money);

  const bc = normalizeBcReward(rawPrize);
  if (bc) list.push(bc);

  const singleItem = normalizeSingleItemReward(rawPrize);
  if (singleItem) list.push(singleItem);

  list.push(...normalizeItemsMapReward(rawPrize));
  list.push(...normalizeDirectItemsReward(prize));

  const pokemon = normalizePokemonReward(rawPrize);
  if (pokemon) list.push(pokemon);

  return list;
}
