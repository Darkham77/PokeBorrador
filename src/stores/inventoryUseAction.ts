import { useGameStore } from './game.ts';
import { useUIStore } from './ui.ts';
import { useBattleStore } from './battle.ts';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '../logic/providers/itemProvider.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { resolveNormalizedName, consumeItem } from './inventoryHelpers.ts';
import type { Pokemon, Move } from '@/types/pokemon';
import type { ItemEffectResult } from '@/types/items';
import { useAudioStore } from './audio.ts';
import type { GameState } from '@/types/game';

export function executeUseItem(
  itemName: string,
  context: 'team' | 'box' | null = null,
  index: number | null = null
): ItemEffectResult {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const battleStore = useBattleStore();

  const list = context === 'team' ? gameStore.state.team : gameStore.state.box;
  const pokemon = index !== null ? (list as Pokemon[])[index] : null;
  const officialName = resolveNormalizedName(itemName);

  // Combat check
  if (battleStore.isBattleActive && !battleStore.isProcessing) {
    battleStore.useItemInBattle(officialName, context === 'team' ? index : null);
    return { success: true, message: 'Usando objeto en combate...' };
  }


  // Global items
  if (isGlobalItem(officialName)) {
    const effectFn = (ITEM_EFFECTS as Record<string, (p: GameState) => ItemEffectResult>)[officialName];
    if (!effectFn) return { success: false, message: 'Efecto global no implementado.' };
    
    const result = effectFn(gameStore.state);
    if (result.success) {
      consumeItem(gameStore, officialName);
      gameStore.save(false);
    }
    return result;
  }

  if (!pokemon) return { success: false, message: 'Seleccioná un Pokémon.' };

  const effectFn = (ITEM_EFFECTS as Record<string, (p: Pokemon) => ItemEffectResult>)[officialName];
  let result: ItemEffectResult | null;

  if (effectFn) {
    result = effectFn(pokemon);
  } else {
    result = getDynamicItemEffect(officialName, pokemon);
  }

  if (!result || !result.success) {
    return result || { success: false, message: 'Este objeto no tiene efecto.' };
  }

  // Post effects
  if (result.resultType === 'relearner') {
    uiStore.activePokemonForRelearner = pokemon;
    uiStore.isMoveRelearnerOpen = true;
  } else if (result.resultType === 'evolution') {
    uiStore.startEvolution(pokemon, result.targetId || '', officialName);
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
      uiStore.addToLearnQueue({ pokemon, move: moveObj as Move });
    }
  } else if (result.resultType === 'nature_patch') {
    uiStore.activePokemonForNature = pokemon;
    uiStore.isNaturePatchOpen = true;
  } else if (result.resultType === 'pp_up') {
    uiStore.activePokemonForPPUp = pokemon;
    uiStore.isPPUpOpen = true;
  } else if (result.resultType === 'ability_pill') {
    uiStore.activePokemonForAbility = pokemon;
    uiStore.isAbilityPillOpen = true;
  }

  consumeItem(gameStore, officialName);
  gameStore.save(false);

  const audioStore = useAudioStore();
  const healItems = [
    'Poción', 'Súper Poción', 'Hiper Poción', 'Poción Máxima',
    'Revivir', 'Revivir Máximo', 'Antídoto', 'Cura Quemadura',
    'Despertar', 'Cura Total', 'Refresco', 'Limonada'
  ];
  if (healItems.includes(officialName)) {
    audioStore.play('heal');
  } else {
    audioStore.play('item');
  }

  return result;
}
