import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '@/logic/providers/itemProvider.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { consumeItem } from '@/stores/inventory/inventoryHelpers.ts';
import type { Pokemon, Move, PokemonStorageLocation } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import { useAudioStore } from '@/stores/audio.ts';
import type { GameState } from '@/types/system/game';
import { requireItemId, SHOP_ITEMS } from '@/data/inventory/items';
import { useErrorStore } from '@/stores/errorStore.ts';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

import type { ItemId } from '@/data/inventory/items';

const HEAL_ITEM_IDS = [
  'potion', 'superpotion', 'hyperpotion', 'maxpotion',
  'revive', 'revivemax', 'antidote', 'burnheal',
  'paralyzeheal', 'awakening', 'iceheal', 'fullheal', 'sodapop', 'lemonade'
] as const satisfies readonly ItemId[];
type HealItemId = (typeof HEAL_ITEM_IDS)[number];

function isHealItemId(value: ItemId): value is HealItemId {
  return (HEAL_ITEM_IDS as readonly ItemId[]).includes(value); // domain-ok
}

export function executeUseItem(
  itemName: ItemId | (string & {}),
  context: PokemonStorageLocation | null = null,
  index: number | null = null
): ItemEffectResult {
  try {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const battleStore = useBattleStore();

    const itemId = requireItemId(itemName);
    
    // Verify item exists in SHOP_ITEMS catalog or is a TM
    const isTM = itemId.startsWith('tm') || itemId.startsWith('mt');
    const dbItem = SHOP_ITEMS.find(i => i.id === itemId);
    const itemExists = isTM || !!dbItem;
    if (!itemExists) {
      throw new Error(`[InventoryStore] Intento de usar un objeto inexistente: ${itemName}`);
    }

    const list = context === 'team' ? gameStore.state.team : gameStore.state.box;
    const pokemon = index !== null ? (list as Pokemon[])[index] : null;

    if (battleStore.isBattleActive && dbItem?.nonCombat) {
      return { success: false, message: 'Este objeto no se puede usar en combate.' };
    }

    // Combat check
    if (battleStore.isBattleActive && !battleStore.isProcessing) {
      battleStore.useItemInBattle(itemId, context === 'team' ? index : null);
      return { success: true, message: 'Usando objeto en combate...' };
    }

    // Global items
    if (isGlobalItem(itemId)) {
      const validItemId = requireItemId(itemId);
      const effectFn = ITEM_EFFECTS[validItemId];
      if (!effectFn) return { success: false, message: 'Efecto global no implementado.' };
      
      const result = (effectFn as (p: GameState) => ItemEffectResult)(gameStore.state);
      if (result.success) {
        consumeItem(gameStore, itemId);
        gameStore.save(false);
      }
      return result;
    }

    if (!pokemon) return { success: false, message: 'Seleccioná un Pokémon.' };

    const validItemId = requireItemId(itemId);
    const effectFn = ITEM_EFFECTS[validItemId];
    let result: ItemEffectResult | null;

    if (effectFn) {
      result = (effectFn as (p: Pokemon) => ItemEffectResult)(pokemon);
    } else {
      result = getDynamicItemEffect(itemId, pokemon);
    }

    if (!result || !result.success) {
      return result || { success: false, message: 'Este objeto no tiene efecto.' };
    }

    // Post effects
    let shouldConsumeImmediately = true;

    if (result.resultType === 'relearner') {
      uiStore.activePokemonForRelearner = pokemon;
      uiStore.isMoveRelearnerOpen = true;
      shouldConsumeImmediately = false; // Handled by MoveRelearnerModal
    } else if (result.resultType === 'evolution') {
      if (!result.targetId) throw new Error(`[executeUseItem] Evolution item ${itemId} did not provide a target species id.`);
      uiStore.startEvolution(pokemon, requirePokemonSpeciesId(result.targetId), itemId);
    } else if (result.resultType === 'levelup') {
      gameStore.checkLevelUp(pokemon);
    } else if (result.resultType === 'learn_move') {
      if (!result.moveName) throw new Error(`[executeUseItem] Learn-move item ${itemId} did not provide a canonical move id.`);
      const moveId = result.moveName;
      const moveData = pokemonDataProvider.getMoveData(moveId);
      if (!moveData) throw new Error(`[executeUseItem] No se encontró información en la base de datos para el movimiento: ${moveId}`);
      const moveObj = { 
        id: moveId,
        name: moveData.name, 
        pp: moveData.pp, 
        maxPP: moveData.pp 
      };

      if (pokemon.moves.length < 4) {
        pokemon.moves.push(moveObj as Move);
        uiStore.notify(`¡${pokemon.name} aprendió ${moveData.name}!`, '📖');
      } else {
        shouldConsumeImmediately = false;
        uiStore.addToLearnQueue({ 
          pokemon, 
          move: moveObj as Move,
          onComplete: () => {
            consumeItem(gameStore, itemId);
            gameStore.save(false);
          }
        });
      }
    } else if (result.resultType === 'nature_patch') {
      uiStore.activePokemonForNature = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
      uiStore.isNaturePatchOpen = true;
      shouldConsumeImmediately = false; // Handled by NaturePatchModal on confirm
    } else if (result.resultType === 'pp_up' || result.resultType === 'ppmax') {
      uiStore.activePokemonForPPUp = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
      uiStore.activeItemForPPUp = itemId;
      uiStore.isPPUpOpen = true;
      shouldConsumeImmediately = false; // Handled by PPUpModal on confirm
    } else if (result.resultType === 'ability_pill') {
      uiStore.activePokemonForAbility = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
      uiStore.isAbilityPillOpen = true;
      shouldConsumeImmediately = false; // Handled by AbilityPillModal on confirm
    }

    if (shouldConsumeImmediately) {
      consumeItem(gameStore, itemId);
      gameStore.save(false);
    }

    const audioStore = useAudioStore();
    if (isHealItemId(itemId)) {
      audioStore.play('heal');
    } else {
      audioStore.play('item');
    }

    return result;
  } catch (error) {
    const errorStore = useErrorStore();
    errorStore.setError(error as Error, { type: 'Item Usage Error', source: `executeUseItem(${itemName})` });
    return { success: false, message: '¡Ocurrió un error al usar el objeto!' };
  }
}
