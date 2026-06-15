import { useGameStore } from './game.ts';
import { useUIStore } from './ui.ts';
import { useBattleStore } from './battle.ts';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '../logic/providers/itemProvider.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { consumeItem } from './inventoryHelpers.ts';
import type { Pokemon, Move } from '@/types/pokemon';
import type { ItemEffectResult } from '@/types/items';
import { useAudioStore } from './audio.ts';
import type { GameState } from '@/types/game';
import { SHOP_ITEMS } from '@/data/items';
import { useErrorStore } from './errorStore.ts';

export function executeUseItem(
  itemName: string,
  context: 'team' | 'box' | null = null,
  index: number | null = null
): ItemEffectResult {
  try {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const battleStore = useBattleStore();

    const itemId = itemName.toLowerCase();
    
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
      const effectFn = (ITEM_EFFECTS as Record<string, (p: GameState) => ItemEffectResult>)[itemId];
      if (!effectFn) return { success: false, message: 'Efecto global no implementado.' };
      
      const result = effectFn(gameStore.state);
      if (result.success) {
        consumeItem(gameStore, itemId);
        gameStore.save(false);
      }
      return result;
    }

    if (!pokemon) return { success: false, message: 'Seleccioná un Pokémon.' };

    const effectFn = (ITEM_EFFECTS as Record<string, (p: Pokemon) => ItemEffectResult>)[itemId];
    let result: ItemEffectResult | null;

    if (effectFn) {
      result = effectFn(pokemon);
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
      uiStore.startEvolution(pokemon, result.targetId || '', itemId);
    } else if (result.resultType === 'levelup') {
      gameStore.checkLevelUp(pokemon);
    } else if (result.resultType === 'learn_move') {
      const moveName = result.moveName || '';
      const moveData = pokemonDataProvider.getMoveData(moveName);
      const moveObj = { 
        name: moveName, 
        pp: moveData?.pp || 35, 
        maxPP: moveData?.pp || 35 
      };

      if (pokemon.moves.length < 4) {
        pokemon.moves.push(moveObj as Move);
        uiStore.notify(`¡${pokemon.name} aprendió ${moveName}!`, '📖');
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
      uiStore.activePokemonForNature = pokemon;
      uiStore.isNaturePatchOpen = true;
    } else if (result.resultType === 'pp_up' || result.resultType === 'pp_max') {
      uiStore.activePokemonForPPUp = pokemon;
      uiStore.activeItemForPPUp = itemId;
      uiStore.isPPUpOpen = true;
    } else if (result.resultType === 'ability_pill') {
      uiStore.activePokemonForAbility = pokemon;
      uiStore.isAbilityPillOpen = true;
    }

    if (shouldConsumeImmediately) {
      consumeItem(gameStore, itemId);
      gameStore.save(false);
    }

    const audioStore = useAudioStore();
    const healItems = [
      'potion', 'super_potion', 'hyper_potion', 'max_potion',
      'revive', 'revive_max', 'antidote', 'burn_heal',
      'paralyze_heal', 'awakening', 'ice_heal', 'full_heal', 'soda_pop', 'lemonade'
    ];
    if (healItems.includes(itemId)) {
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
