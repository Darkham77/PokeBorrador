/**
 * src/logic/pokemon/friendshipLogic.ts
 *
 * Pure domain logic for Pokemon friendship, seals, damage formulas, combat perks,
 * and evolution eligibility checks.
 */

import {
  FRIENDSHIP_BOUNDS,
  FRIENDSHIP_SEAL_MAP,
  type FriendshipSealMetadata,
  type FriendshipSealTier,
} from '@/types/pokemon/friendship.ts';

export interface FriendshipCombatPerks {
  readonly isActive: boolean;
  readonly endureThreshold: boolean;
  readonly statusCleanseChance: number;
  readonly criticalStageBoost: number;
  readonly expMultiplier: number;
}

export interface FriendshipTooltipDetails {
  readonly seal: FriendshipSealMetadata;
  readonly currentValue: number;
  readonly maxValue: number;
  readonly evaluatorQuote: string;
  readonly isEvolutionReady: boolean;
  readonly evolutionMessage: string;
  readonly returnPower: number;
  readonly frustrationPower: number;
  readonly combatPerks: FriendshipCombatPerks;
  readonly combatPerksSummary: string;
}

/**
 * Clamps friendship values safely into the canonical [0, 255] boundary.
 */
export function clampFriendship(value: number | undefined | null): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return FRIENDSHIP_BOUNDS.DEFAULT_BASE;
  }
  return Math.max(FRIENDSHIP_BOUNDS.MIN, Math.min(FRIENDSHIP_BOUNDS.MAX, Math.floor(value)));
}

/**
 * Resolves the 5-tier Friendship Seal metadata for a given friendship value.
 */
export function resolveFriendshipSeal(friendship: number | undefined | null): FriendshipSealMetadata {
  const clamped = clampFriendship(friendship);
  if (clamped >= FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD) {
    return FRIENDSHIP_SEAL_MAP.best_friends;
  }
  if (clamped >= FRIENDSHIP_BOUNDS.GEN_8_EVO_THRESHOLD) {
    return FRIENDSHIP_SEAL_MAP.radiant_prism;
  }
  if (clamped >= FRIENDSHIP_BOUNDS.COMRADE_MIN) {
    return FRIENDSHIP_SEAL_MAP.comrade;
  }
  if (clamped >= FRIENDSHIP_BOUNDS.SPROUT_MIN) {
    return FRIENDSHIP_SEAL_MAP.sprout;
  }
  return FRIENDSHIP_SEAL_MAP.distrust;
}

/**
 * Resolves the tier ID directly for quick filtering or comparisons.
 */
export function resolveFriendshipSealTier(friendship: number | undefined | null): FriendshipSealTier {
  return resolveFriendshipSeal(friendship).id;
}

/**
 * Calculates base power of Return: floor(Friendship / 2.5), max 102.
 */
export function calculateReturnPower(friendship: number | undefined | null): number {
  const clamped = clampFriendship(friendship);
  return Math.max(1, Math.floor(clamped / 2.5));
}

/**
 * Calculates base power of Frustration: floor((255 - Friendship) / 2.5), max 102.
 */
export function calculateFrustrationPower(friendship: number | undefined | null): number {
  const clamped = clampFriendship(friendship);
  return Math.max(1, Math.floor((FRIENDSHIP_BOUNDS.MAX - clamped) / 2.5));
}

/**
 * Resolves single-player combat perks unlocked by deep friendship (threshold >= 220).
 */
export function getFriendshipCombatPerks(friendship: number | undefined | null): FriendshipCombatPerks {
  const clamped = clampFriendship(friendship);
  const isActive = clamped >= FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD;

  return {
    isActive,
    endureThreshold: isActive,
    statusCleanseChance: isActive ? 0.2 : 0,
    criticalStageBoost: isActive ? 1 : 0,
    expMultiplier: isActive ? 1.2 : 1.0,
  };
}

/**
 * Checks whether a Pokemon meets the minimum friendship threshold to evolve upon level-up.
 */
export function isReadyForFriendshipEvolution(
  pokemon: { friendship?: number | null } | null | undefined,
  activeGen = 9
): boolean {
  if (!pokemon) return false;
  const clamped = clampFriendship(pokemon.friendship);
  const threshold =
    activeGen >= 8
      ? FRIENDSHIP_BOUNDS.GEN_8_EVO_THRESHOLD
      : FRIENDSHIP_BOUNDS.LEGACY_EVO_THRESHOLD;
  return clamped >= threshold;
}

/**
 * Builds rich, self-documenting tooltip details for display in UI cards and modals.
 */
export function getFriendshipTooltipDetails(
  pokemon: { friendship?: number | null } | null | undefined,
  activeGen = 9
): FriendshipTooltipDetails {
  const val = clampFriendship(pokemon?.friendship);
  const seal = resolveFriendshipSeal(val);
  const isEvoReady = isReadyForFriendshipEvolution(pokemon, activeGen);
  const returnPower = calculateReturnPower(val);
  const frustrationPower = calculateFrustrationPower(val);
  const perks = getFriendshipCombatPerks(val);

  const evoThreshold =
    activeGen >= 8
      ? FRIENDSHIP_BOUNDS.GEN_8_EVO_THRESHOLD
      : FRIENDSHIP_BOUNDS.LEGACY_EVO_THRESHOLD;

  const evolutionMessage = isEvoReady
    ? `¡Listo para evolucionar por amistad al subir de nivel! (Umbral alcanzado: ${val}/${evoThreshold})`
    : `Aún no alcanza el umbral de evolución (${val}/${evoThreshold}).`;

  const combatPerksSummary = perks.isActive
    ? 'Ventajas milagrosas activas: Aguante a 1 PS, 20% cura de estados, +1 crítico y +20% EXP.'
    : `Ventajas milagrosas inactivas (requiere ${FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD}+ de amistad).`;

  return {
    seal,
    currentValue: val,
    maxValue: FRIENDSHIP_BOUNDS.MAX,
    evaluatorQuote: seal.evaluatorQuote,
    isEvolutionReady: isEvoReady,
    evolutionMessage,
    returnPower,
    frustrationPower,
    combatPerks: perks,
    combatPerksSummary,
  };
}

import type { Pokemon } from '@/types/pokemon/pokemon';

/**
 * Calculates friendship gain on level up based on current friendship and Soothe Bell.
 */
export function calculateFriendshipLevelUpDelta(currentFriendship: number, hasSootheBell = false): number {
  let baseGain = 2;
  if (currentFriendship < FRIENDSHIP_BOUNDS.COMRADE_MIN) {
    baseGain = 5;
  } else if (currentFriendship < FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD) {
    baseGain = 3;
  }
  return hasSootheBell ? Math.floor(baseGain * 1.5) : baseGain;
}

export interface FriendshipTransitionLog {
  readonly message: string; // domain-ok
  readonly type: 'log-player' | 'log-info' | 'log-error';
  readonly direction: 'up' | 'down';
  readonly oldTier: FriendshipSealTier;
  readonly newTier: FriendshipSealTier;
}

/**
 * Checks if a change in friendship crosses a significant tier boundary,
 * and generates the appropriate combat log announcement.
 */
export function getFriendshipTransitionLog(
  oldFriendship: number | undefined | null,
  newFriendship: number | undefined | null,
  pokemonName: string
): FriendshipTransitionLog | null {
  const oldClamped = clampFriendship(oldFriendship);
  const newClamped = clampFriendship(newFriendship);
  const oldTier = resolveFriendshipSealTier(oldClamped);
  const newTier = resolveFriendshipSealTier(newClamped);

  if (oldTier === newTier) {
    return null;
  }

  if (newClamped > oldClamped) {
    // Ascending tier transition
    switch (newTier) {
      case 'sprout':
        return {
          message: `🌱 ¡El vínculo de ${pokemonName} empieza a florecer con su entrenador!`,
          type: 'log-info',
          direction: 'up',
          oldTier,
          newTier,
        };
      case 'comrade':
        return {
          message: `🤝 ¡${pokemonName} confía plenamente en ti como un verdadero camarada!`,
          type: 'log-info',
          direction: 'up',
          oldTier,
          newTier,
        };
      case 'radiant_prism':
        return {
          message: `💎 ¡El lazo de ${pokemonName} brilla intensamente! ¡Está listo para evolucionar por afecto!`,
          type: 'log-player',
          direction: 'up',
          oldTier,
          newTier,
        };
      case 'best_friends':
        return {
          message: `🎀 ¡${pokemonName} y su entrenador han alcanzado el Vínculo Máximo de Mejores Amigos!`,
          type: 'log-player',
          direction: 'up',
          oldTier,
          newTier,
        };
      default:
        return null;
    }
  } else {
    // Descending tier transition
    switch (newTier) {
      case 'radiant_prism':
        return {
          message: `⚠️ ¡El vínculo de ${pokemonName} ha descendido del nivel de Mejores Amigos!`,
          type: 'log-error',
          direction: 'down',
          oldTier,
          newTier,
        };
      case 'comrade':
        return {
          message: `⚠️ ¡El vínculo de ${pokemonName} ha disminuido y ya no está listo para evolucionar por afecto!`,
          type: 'log-error',
          direction: 'down',
          oldTier,
          newTier,
        };
      case 'sprout':
        return {
          message: `⚠️ ¡${pokemonName} parece dudar de su vínculo con su entrenador!`,
          type: 'log-error',
          direction: 'down',
          oldTier,
          newTier,
        };
      case 'distrust':
        return {
          message: `⛓️ ¡${pokemonName} ha caído en un estado de profunda desconfianza hacia su entrenador!`,
          type: 'log-error',
          direction: 'down',
          oldTier,
          newTier,
        };
      default:
        return null;
    }
  }
}

import type { BattleSource } from '@/types/battle/battle';

export type FriendshipLogFn = (
  msg: string,
  type: string,
  source?: BattleSource | null
) => void;

/**
 * Applies a friendship change to a Pokémon, clamps it, and optionally emits a battle log if a tier boundary is crossed.
 */
export function applyFriendshipDelta(
  pokemon: Pokemon,
  delta: number,
  addLogFn?: FriendshipLogFn
): { oldFriendship: number; newFriendship: number; transition: FriendshipTransitionLog | null } {
  const oldFriendship = pokemon.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE;
  const newFriendship = clampFriendship(oldFriendship + delta);
  pokemon.friendship = newFriendship;

  const transition = getFriendshipTransitionLog(oldFriendship, newFriendship, pokemon.nickname || pokemon.name);
  if (transition && addLogFn) {
    addLogFn(transition.message, transition.type, pokemon);
  }

  return { oldFriendship, newFriendship, transition };
}
