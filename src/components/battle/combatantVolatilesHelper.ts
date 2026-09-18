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
  isAttracted: boolean;
  isFocusEnergy: boolean;
  isProtected: boolean;
  isEnduring: boolean;
  isLockOn: boolean;
  hasReflect: boolean;
  hasLightScreen: boolean;
  hasSafeguard: boolean;
  hasMist: boolean;
  hasSpikes: boolean;
  hasStealthRock: boolean;
  hasToxicSpikes: boolean;
}

const EMPTY_COMBATANT_VOLATILES: Readonly<CombatantVolatilesProps> = Object.freeze({
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
  isAttracted: false,
  isFocusEnergy: false,
  isProtected: false,
  isEnduring: false,
  isLockOn: false,
  hasReflect: false,
  hasLightScreen: false,
  hasSafeguard: false,
  hasMist: false,
  hasSpikes: false,
  hasStealthRock: false,
  hasToxicSpikes: false,
});

function isVolatileCounterActive(vol: Record<string, number | undefined> | undefined, key: string): boolean {
  return Boolean(vol && typeof vol[key] === 'number' && (vol[key] as number) > 0);
}

function computeAfflictionVolatiles(pokemon: Pokemon, isVol: (k: string) => boolean) {
  return {
    isConfused: Boolean(pokemon.confused || isVol('confusion')),
    isTaunted: (pokemon.tauntTurns || 0) > 0 || isVol('taunt') || isVol('tauntTurns'),
    isFlinched: isVol('flinch'),
    isDisabled: (pokemon.disabledTurns || 0) > 0 || isVol('disable') || isVol('disabledTurns'),
    isEncored: (pokemon.encoreTurns || 0) > 0 || isVol('encore') || isVol('encoreTurns'),
    isCursed: Boolean(pokemon.cursed || isVol('curse')),
    isSeeded: Boolean(pokemon.seeded || isVol('leechseed')),
    isTrapped: Boolean(pokemon.trapped || (pokemon.bound && pokemon.bound > 0) || isVol('trapped') || isVol('bound') || isVol('partiallytrapped')),
    isPerishSong: (pokemon.perishSongCount || 0) > 0 || isVol('perishsong'),
    isAttracted: Boolean(pokemon.attracted || isVol('attract')),
    attracted: Boolean(pokemon.attracted || isVol('attract')),
  };
}

function computeDefensiveAndFieldVolatiles(
  pokemon: Pokemon,
  stages: Partial<BattleStages> | undefined,
  isVol: (k: string) => boolean,
) {
  return {
    isSubstitute: Boolean(pokemon.substitute || isVol('substitute')),
    isIngrained: Boolean(pokemon.ingrain || isVol('ingrain')),
    isFocusEnergy: Boolean(pokemon.focusEnergy || isVol('focusenergy')),
    isProtected: Boolean(pokemon.protect || pokemon.detect || isVol('protect')),
    isEnduring: Boolean(pokemon.endure || isVol('endure')),
    isLockOn: Boolean(pokemon.lockOn || isVol('lockon')),
    hasReflect: (stages?.reflect || 0) > 0,
    hasLightScreen: (stages?.lightScreen || 0) > 0,
    hasSafeguard: (stages?.safeguard || 0) > 0,
    hasMist: (stages?.mist || 0) > 0,
    hasSpikes: (stages?.spikes || 0) > 0,
    hasStealthRock: (stages?.stealthrock || 0) > 0,
    hasToxicSpikes: (stages?.toxicspikes || 0) > 0,
  };
}

export function computeCombatantVolatiles(
  pokemon: Pokemon | null | undefined,
  stages: Partial<BattleStages> | undefined,
): CombatantVolatilesProps {
  if (!pokemon) {
    return { ...EMPTY_COMBATANT_VOLATILES };
  }

  const vol = pokemon.volatileCounters;
  const isVol = (key: string): boolean => isVolatileCounterActive(vol, key);

  return {
    ...computeAfflictionVolatiles(pokemon, isVol),
    ...computeDefensiveAndFieldVolatiles(pokemon, stages, isVol),
  };
}
