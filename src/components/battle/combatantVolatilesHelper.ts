import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';

export interface CombatantVolatilesProps {
  isConfused: boolean;
  isTaunted: boolean;
  isSubstitute: boolean;
  isFlinched: boolean;
  isDisabled: boolean;
  isEncored: boolean;
  isCursed: boolean;
  isSeeded: boolean;
  isTrapped: boolean;
  isIngrained: boolean;
  isPerishSong: boolean;
  attracted: boolean;
  isFocusEnergy: boolean;
  isProtected: boolean;
  isEnduring: boolean;
  isLockOn: boolean;
  hasReflect: boolean;
  hasLightScreen: boolean;
  hasSafeguard: boolean;
  hasMist: boolean;
}

export function computeCombatantVolatiles(
  pokemon: Pokemon | null | undefined,
  stages: Partial<BattleStages> | undefined
): CombatantVolatilesProps {
  if (!pokemon) {
    return {
      isConfused: false,
      isTaunted: false,
      isSubstitute: false,
      isFlinched: false,
      isDisabled: false,
      isEncored: false,
      isCursed: false,
      isSeeded: false,
      isTrapped: false,
      isIngrained: false,
      isPerishSong: false,
      attracted: false,
      isFocusEnergy: false,
      isProtected: false,
      isEnduring: false,
      isLockOn: false,
      hasReflect: false,
      hasLightScreen: false,
      hasSafeguard: false,
      hasMist: false
    };
  }

  const vol = pokemon.volatileCounters;
  const isVolActive = (key: string): boolean => Boolean(vol && typeof vol[key] === 'number' && (vol[key] as number) > 0);

  const isTaunted = (pokemon.tauntTurns || 0) > 0 || isVolActive('taunt') || isVolActive('tauntTurns');
  const isDisabled = (pokemon.disabledTurns || 0) > 0 || isVolActive('disable') || isVolActive('disabledTurns');
  const isEncored = (pokemon.encoreTurns || 0) > 0 || isVolActive('encore') || isVolActive('encoreTurns');
  const isTrapped = Boolean(pokemon.trapped || (pokemon.bound && pokemon.bound > 0) || isVolActive('trapped') || isVolActive('bound') || isVolActive('partiallytrapped'));
  const isProtected = Boolean(pokemon.protect || pokemon.detect || isVolActive('protect'));

  return {
    isConfused: Boolean(pokemon.confused || isVolActive('confusion')),
    isTaunted,
    isSubstitute: Boolean(pokemon.substitute || isVolActive('substitute')),
    isFlinched: isVolActive('flinch'),
    isDisabled,
    isEncored,
    isCursed: Boolean(pokemon.cursed || isVolActive('curse')),
    isSeeded: Boolean(pokemon.seeded || isVolActive('leechseed')),
    isTrapped,
    isIngrained: Boolean(pokemon.ingrain || isVolActive('ingrain')),
    isPerishSong: (pokemon.perishSongCount || 0) > 0 || isVolActive('perishsong'),
    attracted: Boolean(pokemon.attracted || isVolActive('attract')),
    isFocusEnergy: Boolean(pokemon.focusEnergy || isVolActive('focusenergy')),
    isProtected,
    isEnduring: Boolean(pokemon.endure || isVolActive('endure')),
    isLockOn: Boolean(pokemon.lockOn || isVolActive('lockon')),
    hasReflect: (stages?.reflect || 0) > 0,
    hasLightScreen: (stages?.lightScreen || 0) > 0,
    hasSafeguard: (stages?.safeguard || 0) > 0,
    hasMist: (stages?.mist || 0) > 0
  };
}
