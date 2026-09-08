// src/composables/rewards/rewardsPillExtractor.ts
import { getItemById, getItemName } from '@/data/inventory/items';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { toID } from '@/logic/utils/strings';
import type { UnifiedRewardPill } from '@/types/rewards/rewards';

export const parsePrize = (rawPrize: unknown): Record<string, unknown> => {
  if (!rawPrize) return {};
  if (typeof rawPrize === 'string') {
    try {
      return JSON.parse(rawPrize) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    } catch {
      return {};
    }
  }
  return typeof rawPrize === 'object' ? (rawPrize as Record<string, unknown>) : {}; // open-record: Generic key-value data dictionary container
};

export const buildRewardPills = (prize: Record<string, unknown>, prefix = 'pill'): readonly UnifiedRewardPill[] => {
  const pills: UnifiedRewardPill[] = [];
  if (!prize || typeof prize !== 'object') return pills;

  // 1. Money (₽)
  let money = 0;
  if (typeof prize.money === 'number') {
    money = prize.money;
  } else if (prize.type === 'money' && typeof prize.amount === 'number') {
    money = prize.amount;
  } else if (prize.type === 'money' && typeof prize.data === 'number') {
    money = prize.data;
  }
  if (money > 0) {
    pills.push({
      id: `${prefix}-money`,
      label: `₽${money.toLocaleString()}`,
      icon: '₽',
      description: 'Pokédólares para adquirir objetos, consumibles y mejoras.',
      colorClass: 'money'
    });
  }

  // 2. Battle Coins (BC)
  let bc = 0;
  if (typeof prize.battleCoins === 'number') {
    bc = prize.battleCoins;
  } else if (prize.type === 'bc' && typeof prize.amount === 'number') {
    bc = prize.amount;
  }
  if (bc > 0) {
    pills.push({
      id: `${prefix}-bc`,
      label: `${bc.toLocaleString()} BC`,
      icon: '🪙',
      description: 'Battle Coins obtenidos por mérito competitivo en arena o torneos.',
      colorClass: 'bc'
    });
  }

  // 3. Single Item
  if (prize.item && typeof prize.item === 'string') {
    const itId = prize.item;
    const qty = typeof prize.qty === 'number' ? prize.qty : (typeof prize.amount === 'number' ? prize.amount : 1);
    const itDef = getItemById(itId);
    const name = itDef?.name || getItemName(itId);
    pills.push({
      id: `${prefix}-item-${itId}`,
      label: name,
      qtyText: `x${qty}`,
      spriteUrl: getAssetUrl(ASSET_TYPES.ITEM, itDef?.sprite || itId),
      description: itDef?.desc || 'Objeto especial de recompensa.',
      colorClass: 'item'
    });
  }

  // 4. Nested Items map (e.g. { items: { naturepatch: 2 } })
  if (prize.items && typeof prize.items === 'object') {
    for (const [itId, itQty] of Object.entries(prize.items as Record<string, number>)) { // open-record: Generic key-value data dictionary container
      if (typeof itQty === 'number' && itQty > 0) {
        const itDef = getItemById(itId);
        const name = itDef?.name || getItemName(itId);
        pills.push({
          id: `${prefix}-items-${itId}`,
          label: name,
          qtyText: `x${itQty}`,
          spriteUrl: getAssetUrl(ASSET_TYPES.ITEM, itDef?.sprite || itId),
          description: itDef?.desc || 'Objeto de recompensa.',
          colorClass: 'item'
        });
      }
    }
  }

  // 5. Direct item key-value pairs (e.g. Ranked Milestones: { naturepatch: 2, vigorcandy: 1 })
  for (const [key, val] of Object.entries(prize)) {
    if (['type', 'amount', 'qty', 'money', 'battleCoins', 'item', 'items', 'species', 'shiny', 'level', 'pokemon', 'tier', 'season', 'rank', 'elo', 'data', 'sold_item', 'sold_pokemon'].includes(key)) {
      continue;
    }
    if (typeof val === 'number' && val > 0) {
      const itDef = getItemById(key);
      if (itDef) {
        const name = itDef.name || getItemName(key);
        pills.push({
          id: `${prefix}-direct-${key}`,
          label: name,
          qtyText: `x${val}`,
          spriteUrl: getAssetUrl(ASSET_TYPES.ITEM, itDef.sprite || key),
          description: itDef.desc || 'Objeto de recompensa.',
          colorClass: 'item'
        });
      }
    }
  }

  // 6. Sold item metadata from GTS sales
  if (prize.sold_item && typeof prize.sold_item === 'object') {
    const sItem = prize.sold_item as { name?: string; qty?: number };
    if (sItem.name) {
      const itDef = getItemById(sItem.name);
      const name = itDef?.name || getItemName(sItem.name);
      const qty = sItem.qty || 1;
      pills.push({
        id: `${prefix}-sold-item-${sItem.name}`,
        label: name,
        qtyText: `x${qty}`,
        spriteUrl: getAssetUrl(ASSET_TYPES.ITEM, itDef?.sprite || sItem.name),
        description: `Artículo vendido: ${name}.`,
        colorClass: 'item'
      });
    }
  }

  // 7. Sold pokemon metadata from GTS sales
  if (prize.sold_pokemon && typeof prize.sold_pokemon === 'object') {
    const sPoke = prize.sold_pokemon as { name?: string; level?: number; isShiny?: boolean };
    if (sPoke.name) {
      const isShiny = Boolean(sPoke.isShiny);
      pills.push({
        id: `${prefix}-sold-poke-${sPoke.name}`,
        label: `${sPoke.name.toUpperCase()}`, // text-ok: UI text display localization string
        qtyText: sPoke.level ? `Nv. ${sPoke.level}` : (isShiny ? '✨' : undefined),
        spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, toID(sPoke.name), { isShiny }),
        description: `Ejemplar Pokémon vendido: ${sPoke.name}.`,
        colorClass: 'pokemon'
      });
    }
  }

  // 8. Pokemon reward
  if (prize.type === 'pokemon' || prize.species || prize.pokemon) {
    const rawPoke = prize.pokemon && typeof prize.pokemon === 'object' ? (prize.pokemon as Record<string, unknown>) : null; // open-record: Generic key-value data dictionary container
    let sp = '';
    if (typeof prize.species === 'string') {
      sp = prize.species;
    } else if (rawPoke && typeof rawPoke.species === 'string') {
      sp = rawPoke.species;
    } else if (typeof prize.pokemon === 'string') {
      sp = prize.pokemon;
    }
    if (sp) {
      const shiny = Boolean(rawPoke?.shiny || rawPoke?.isShiny || prize.shiny);
      const lv = rawPoke?.level || prize.level;
      pills.push({
        id: `${prefix}-poke-${sp}`,
        label: `${sp.toUpperCase()}`, // text-ok: UI text display localization string
        qtyText: lv ? `Nv. ${lv}` : (shiny ? '✨' : undefined),
        spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, toID(sp), { isShiny: shiny }),
        description: `Ejemplar Pokémon especial ${shiny ? 'Variocolor (Shiny)' : ''} listo para sumarse a tu equipo.`,
        colorClass: 'pokemon'
      });
    }
  }

  // 9. Ranked Medal / Season Award
  if (prize.type === 'ranked_medal' || prize.tier) {
    const tier = String(prize.tier || 'Clasificatorio');
    const season = prize.season ? ` (${prize.season})` : '';
    pills.push({
      id: `${prefix}-medal-${tier}`,
      label: `Medalla ${tier.toUpperCase()}${season}`,
      icon: '🎖️',
      description: `Galardón de fin de temporada por alcanzar el rango ${tier}.`,
      colorClass: 'special'
    });
  }

  return pills;
};
