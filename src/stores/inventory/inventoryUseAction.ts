import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { gameBus } from '@/logic/events/gameBus';
import { useModalStore } from '@/stores/modals.ts';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '@/logic/providers/itemProvider.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { consumeItem } from '@/stores/inventory/inventoryHelpers.ts';
import type { Pokemon, Move, PokemonStorageLocation } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import { useAudioStore } from '@/stores/audio.ts';
import type { GameState } from '@/types/system/game';
import { requireItemId, ITEMS_BY_ID, type ItemId } from '@/data/inventory/items';
import { useErrorStore } from '@/stores/errorStore.ts';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

const HEAL_ITEM_IDS = [
  'potion', 'superpotion', 'hyperpotion', 'maxpotion',
  'revive', 'revivemax', 'antidote', 'burnheal',
  'paralyzeheal', 'awakening', 'iceheal', 'fullheal', 'sodapop', 'lemonade'
] as const satisfies readonly ItemId[];
type HealItemId = (typeof HEAL_ITEM_IDS)[number];

const HEAL_ITEM_IDS_SET: ReadonlySet<string> = new Set<string>(HEAL_ITEM_IDS); // runtime-set: Fast O(1) membership lookup set

function isHealItemId(value: ItemId): value is HealItemId {
  return HEAL_ITEM_IDS_SET.has(value);
}

interface PostEffectParams {
  result: ItemEffectResult;
  pokemon: Pokemon;
  itemId: ItemId;
  context: PokemonStorageLocation | null;
  index: number | null;
  uiStore: ReturnType<typeof useUIStore>;
  gameStore: ReturnType<typeof useGameStore>;
}

const POST_EFFECT_HANDLERS: Record<string, (p: PostEffectParams) => boolean> = {
  relearner: ({ pokemon, uiStore }) => {
    uiStore.activePokemonForRelearner = pokemon;
    useModalStore().open('MoveRelearner');
    return false; // Handled by MoveRelearnerModal
  },
  evolution: ({ result, pokemon, itemId, uiStore }) => {
    if (!result.targetId) throw new Error(`[executeUseItem] Evolution item ${itemId} did not provide a target species id.`);
    uiStore.startEvolution(pokemon, requirePokemonSpeciesId(result.targetId), itemId);
    return true;
  },
  levelup: ({ pokemon, gameStore }) => {
    gameStore.checkLevelUp(pokemon);
    return true;
  },
  learn_move: ({ result, pokemon, itemId, uiStore, gameStore }) => {
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
      return true;
    } else {
      uiStore.addToLearnQueue({ 
        pokemon, 
        move: moveObj as Move,
        onComplete: () => {
          consumeItem(gameStore, itemId);
          gameStore.save(false);
        }
      });
      return false;
    }
  },
  nature_patch: ({ context, index, uiStore }) => {
    uiStore.activePokemonForNature = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
    useModalStore().open('NaturePatch');
    return false; // Handled by NaturePatchModal on confirm
  },
  pp_up: ({ context, index, itemId, uiStore }) => {
    uiStore.activePokemonForPPUp = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
    uiStore.activeItemForPPUp = itemId;
    useModalStore().open('PPUp');
    return false; // Handled by PPUpModal on confirm
  },
  ppmax: ({ context, index, itemId, uiStore }) => {
    uiStore.activePokemonForPPUp = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
    uiStore.activeItemForPPUp = itemId;
    useModalStore().open('PPUp');
    return false; // Handled by PPUpModal on confirm
  },
  ability_pill: ({ context, index, uiStore }) => {
    uiStore.activePokemonForAbility = context !== null && index !== null ? { context: context as PokemonStorageLocation, index } : null;
    useModalStore().open('AbilityPill');
    return false; // Handled by AbilityPillModal on confirm
  }
};

function applyPostItemEffect(params: PostEffectParams): boolean {
  const handler = params.result.resultType ? POST_EFFECT_HANDLERS[params.result.resultType] : undefined;
  if (handler) {
    return handler(params);
  }
  return true;
}

function validateItemExists(itemName: string): ItemId {
  const itemId = requireItemId(itemName);
  const isTM = itemId.startsWith('tm') || itemId.startsWith('mt');
  const dbItem = ITEMS_BY_ID[itemId];
  const itemExists = isTM || !!dbItem;
  if (!itemExists) {
    throw new Error(`[InventoryStore] Intento de usar un objeto inexistente: ${itemName}`);
  }
  return itemId;
}

function handleBattleItemUsage(
  itemId: ItemId,
  context: PokemonStorageLocation | null,
  index: number | null,
  isBattleActive: boolean,
  nonCombat?: boolean
): ItemEffectResult | null {
  if (!isBattleActive) return null;

  if (nonCombat) {
    return { success: false, message: 'Este objeto no se puede usar en combate.' };
  }

  gameBus.emit('BATTLE_USE_ITEM', { itemId, targetIndex: context === 'team' ? index : null });
  return { success: true, message: 'Usando objeto en combate...' };
}

function handleGlobalItemUsage(
  itemId: ItemId,
  gameStore: ReturnType<typeof useGameStore>
): ItemEffectResult | null {
  if (!isGlobalItem(itemId)) return null;

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

function applyPokemonItemUsage(params: {
  itemId: ItemId;
  pokemon: Pokemon;
  context: PokemonStorageLocation | null;
  index: number | null;
  uiStore: ReturnType<typeof useUIStore>;
  gameStore: ReturnType<typeof useGameStore>;
}): ItemEffectResult {
  const { itemId, pokemon, context, index, uiStore, gameStore } = params;
  const validItemId = requireItemId(itemId);
  const effectFn = ITEM_EFFECTS[validItemId];
  const result: ItemEffectResult | null = effectFn
    ? (effectFn as (p: Pokemon) => ItemEffectResult)(pokemon)
    : getDynamicItemEffect(itemId, pokemon);

  if (!result || !result.success) {
    return result || { success: false, message: 'Este objeto no tiene efecto.' };
  }

  const shouldConsumeImmediately = applyPostItemEffect({
    result,
    pokemon,
    itemId,
    context,
    index,
    uiStore,
    gameStore
  });

  if (shouldConsumeImmediately) {
    consumeItem(gameStore, itemId);
    gameStore.save(false);
  }

  return result;
}

function playItemAudio(itemId: ItemId): void {
  const audioStore = useAudioStore();
  if (isHealItemId(itemId)) {
    audioStore.play('heal');
  } else {
    audioStore.play('item');
  }
}

export function executeUseItem(
  itemName: string,
  context: PokemonStorageLocation | null = null,
  index: number | null = null
): ItemEffectResult {
  try {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const itemId = validateItemExists(itemName);
    const dbItem = ITEMS_BY_ID[itemId];

    const battleResult = handleBattleItemUsage(itemId, context, index, uiStore.isBattleActive, dbItem?.nonCombat);
    if (battleResult) return battleResult;

    const globalResult = handleGlobalItemUsage(itemId, gameStore);
    if (globalResult) return globalResult;

    const list = context === 'team' ? gameStore.state.team : gameStore.state.box;
    const pokemon = index !== null ? (list as Pokemon[])[index] : null;
    if (!pokemon) return { success: false, message: 'Seleccioná un Pokémon.' };

    const result = applyPokemonItemUsage({ itemId, pokemon, context, index, uiStore, gameStore });
    if (result.success) {
      playItemAudio(itemId);
    }
    return result;
  } catch (error) {
    const errorStore = useErrorStore();
    errorStore.setError(error as Error, { type: 'Item Usage Error', source: `executeUseItem(${itemName})` });
    return { success: false, message: '¡Ocurrió un error al usar el objeto!' };
  }
}
