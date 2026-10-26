import { gsap } from 'gsap';

import { TRAINER_RANKS, MARKET_UNLOCKS } from '@/data/player/trainer';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { OBEY_LEVEL_BY_BADGES, MAX_TRAINER_RANK_LEVEL } from '@/logic/constants/gameplay';
import { getEventExpMultiplier } from '@/logic/events/eventMultipliers.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import { levelUpPokemon } from '@/logic/pokemon/pokemonFactory';
import { useUIStore, type LearnItem } from '@/stores/ui';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';

const MARKET_UNLOCK_NOTIFICATION_DELAY_SEC = 1.5;
const DEFAULT_OBEY_LEVEL = 20;

export interface UseTrainerActionsReturn {
  getTrainerRank: () => (typeof TRAINER_RANKS)[number] | undefined;
  addTrainerExp: (amount: number) => void;
  checkLevelUp: (pokemon: Pokemon) => void;
  getMaxObeyLevel: () => number;
}

export function useTrainerActions(
  state: GameState,
  scheduleSave: (delayMs?: number, forceRemote?: boolean) => void
): UseTrainerActionsReturn {
  function getTrainerRank(): (typeof TRAINER_RANKS)[number] | undefined {
    const idx = Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1);
    return TRAINER_RANKS[idx];
  }

  function addTrainerExp(amount: number): void {
    const uiStore = useUIStore();
    const totalMult = getEventExpMultiplier() || 1;
    if (totalMult > 1) amount = Math.round(amount * totalMult);

    state.trainerExp += amount;

    // Add XP to active class via bus as well
    gameBus.emit('TRAINER_EXP_GAINED', { amount });

    let currentRank = getTrainerRank();
    if (!currentRank) return;

    while (
      state.trainerExp >= (currentRank?.expNeeded || 0) &&
      state.trainerLevel < MAX_TRAINER_RANK_LEVEL
    ) {
      state.trainerExp -= currentRank?.expNeeded || 0;
      state.trainerLevel++;

      currentRank = getTrainerRank();
      if (currentRank) {
        uiStore.notify(`¡Subiste al rango ${currentRank.title}! Nivel ${state.trainerLevel}`, '⭐');
      }

      const unlocks = (MARKET_UNLOCKS as Record<number, readonly string[]>)[state.trainerLevel];
      if (unlocks) {
        gsap.delayedCall(MARKET_UNLOCK_NOTIFICATION_DELAY_SEC, () =>
          uiStore.notify(`¡Nuevos items en el Poké Market!`, '🛒')
        );
      }
    }

    if (currentRank) {
      state.trainerExpNeeded = currentRank.expNeeded;
    }

    scheduleSave();
  }

  function checkLevelUp(pokemon: Pokemon): void {
    const uiStore = useUIStore();
    const learnQueue: LearnItem[] = [];

    if (pokemon.level >= MAX_POKEMON_LEVEL) {
      pokemon.exp = 0;
      pokemon.expNeeded = 0;
      scheduleSave();
      return;
    }

    while (
      pokemon.level < MAX_POKEMON_LEVEL &&
      pokemon.expNeeded > 0 &&
      pokemon.exp >= pokemon.expNeeded
    ) {
      pokemon.exp -= pokemon.expNeeded;
      const surplusExp = pokemon.exp;

      // Temporarily set exp to 0 so validatePokemon in recalcPokemonStats doesn't trip on surplus from future levels
      pokemon.exp = 0;
      const pendingMoves = levelUpPokemon(pokemon);
      pokemon.exp = surplusExp;

      if (pendingMoves === null) {
        // Blocked by Everstone
        break;
      }

      uiStore.notify(`¡${pokemon.name} subió al nivel ${pokemon.level}!`, '📈');

      if (pendingMoves.length > 0) {
        pendingMoves.forEach((m) => learnQueue.push({ pokemon, move: m }));
      }
    }

    if (pokemon.level >= MAX_POKEMON_LEVEL) {
      pokemon.exp = 0;
      pokemon.expNeeded = 0;
    }

    if (learnQueue.length > 0) {
      uiStore.addToLearnQueue(learnQueue);
    }

    scheduleSave();
  }

  function getMaxObeyLevel(): number {
    const badgeCount = Math.min(8, Math.max(0, state.defeatedGyms?.length || 0));
    return OBEY_LEVEL_BY_BADGES[badgeCount] ?? OBEY_LEVEL_BY_BADGES[0] ?? DEFAULT_OBEY_LEVEL;
  }

  return { getTrainerRank, addTrainerExp, checkLevelUp, getMaxObeyLevel };
}
