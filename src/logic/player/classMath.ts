// fallow-ignore-file security-sink
/**
 * classMath.ts
 * Módulo con funciones y fórmulas puras para las mecánicas de las clases de jugador
 * sin efectos colaterales de base de datos o almacenamiento de estado.
 */

import { MINIMUM_POKEMON_LEVEL, DECIMAL_PLACES_PRECISION_TWO, CLASS_XP_THRESHOLD_RANKS } from '../constants/gameplay.ts';

/** Team Rocket quick steal base chance (15%). */
export const ROCKET_QUICK_STEAL_BASE_CHANCE = 0.15;

/** Team Rocket quick steal chance increase per level (1%). */
export const ROCKET_QUICK_STEAL_PER_LEVEL = 0.01;

/** Team Rocket quick steal maximum cap (30%). */
export const ROCKET_QUICK_STEAL_MAX_CAP = 0.30;

/** Bug Catcher catch rate synergy base multiplier. */
export const BUG_SYNERGY_BASE_BONUS = 1.0;

/** Bug Catcher maximum active Bug Pokémon count for synergy. */
export const BUG_SYNERGY_MAX_COUNT = 6;

/** Bug Catcher bonus catch multiplier per Bug Pokémon (+5%). */
export const BUG_SYNERGY_BONUS_PER_BUG = 0.05;

/** Trainer class high-IV threshold for catch rate calculation. */
export const TRAINER_HIGH_IV_THRESHOLD = 120;

/** Trainer class catch rate penalty multiplier for high-IV targets (90%). */
export const TRAINER_CATCH_PENALTY_MULTIPLIER = 0.9;

/** Maximum player class level limit. */
export const MAX_PLAYER_CLASS_LEVEL = 30;

/** Level requirement for unlocking class-specific cosmetics (Level 25). */
export const COSMETIC_UNLOCK_CLASS_LEVEL = 25;

/** Cost in Battle Coins to change player class (10,000). */
export const CLASS_CHANGE_COST_BATTLE_COINS = 10_000;

/** Maximum criminality level cap for Team Rocket. */
export const MAX_CRIMINALITY_LEVEL = 100;

/** XP cap requirement return for max-level player classes. */
export const MAX_LEVEL_XP_CAP = 99999999;

/** Quadratic coefficient factor for NPC robbery limit (8 * L^2). */
export const NPC_ROBBERY_LIMIT_QUADRATIC_COEFF = 8;

/** Fallback XP multiplier per level if threshold rank is missing. */
export const CLASS_LEVEL_FALLBACK_XP_MULTIPLIER = 1000;

/** Quadratic exponent factor (2). */
export const QUADRATIC_EXPONENT = 2;

/**
 * Team Rocket:
 * Calcula la probabilidad de éxito de "Robo Rápido" al inicio del combate basado en el nivel de clase.
 * Nivel 1: 15%, Nivel 2: 16%, ... max 30%.
 */
export function calculateQuickStealChance(classLevel: number): number {
  const level = Math.max(MINIMUM_POKEMON_LEVEL, classLevel);
  const rawChance = ROCKET_QUICK_STEAL_BASE_CHANCE + (level - MINIMUM_POKEMON_LEVEL) * ROCKET_QUICK_STEAL_PER_LEVEL;
  const chance = Math.min(ROCKET_QUICK_STEAL_MAX_CAP, rawChance);
  return Number(chance.toFixed(DECIMAL_PLACES_PRECISION_TWO));
}

/**
 * Cazabichos:
 * Retorna el multiplicador de Catch Rate de "Sinergia Bicho" según el número de Pokémon tipo Bicho en el equipo.
 * Por cada Pokémon de tipo 'bug' o 'bicho' en el equipo activo, incrementa la tasa de captura un 5% (acumulativo lineal, max +30%).
 */
export function calculateBugSymmetryBonus(activeTeam: { type1: string; type2?: string | null }[]): number {
  const bugCount = activeTeam.filter(p => {
    const t1 = String(p.type1 || '').toLowerCase();
    const t2 = String(p.type2 || '').toLowerCase();
    return t1 === 'bug' || t1 === 'bicho' || t2 === 'bug' || t2 === 'bicho';
  }).length;
  return BUG_SYNERGY_BASE_BONUS + Math.min(BUG_SYNERGY_MAX_COUNT, bugCount) * BUG_SYNERGY_BONUS_PER_BUG;
}

/**
 * Entrenador:
 * Aplica una penalización del 10% a la tasa de captura base si el Pokémon salvaje tiene IVs excepcionales (IV Total > 120).
 */
export function calculateTrainerCatchRateModifier(baseCatchRate: number, ivTotal: number): number {
  if (ivTotal > TRAINER_HIGH_IV_THRESHOLD) {
    return Math.max(MINIMUM_POKEMON_LEVEL, Math.floor(baseCatchRate * TRAINER_CATCH_PENALTY_MULTIPLIER));
  }
  return baseCatchRate;
}

/**
 * Entrenador:
 * Retorna true si el jugador tiene la posibilidad de doble combate de rival debido a vencer todos los gimnasios en Difícil.
 */
export function hasDoubleRivalChance(
  defeatedGyms: string[],
  gymProgress: Record<string, { easy?: boolean; normal?: boolean; hard?: boolean } | undefined>
): boolean {
  if (!defeatedGyms || defeatedGyms.length === 0) return false;
  // Debe haber vencido todos los gimnasios derrotados en dificultad "hard"
  return defeatedGyms.every(gymId => {
    const progress = gymProgress[gymId];
    return !!(progress && progress.hard);
  });
}

export { CLASS_XP_THRESHOLD_RANKS };

/**
 * Retorna la experiencia necesaria para subir al siguiente nivel de clase.
 */
export function getXPNeededForClassLevel(level: number): number {
  if (level >= MAX_PLAYER_CLASS_LEVEL) return MAX_LEVEL_XP_CAP;
  return CLASS_XP_THRESHOLD_RANKS[level - MINIMUM_POKEMON_LEVEL] || (level * CLASS_LEVEL_FALLBACK_XP_MULTIPLIER);
}

/**
 * Team Rocket ENEMIGO:
 * Retorna el límite máximo de dinero/valor de recursos que puede robar un NPC basándose en su nivel medio.
 * Escalado: V_max(L) = 8 * L^2
 */
export function calculateMaxNpcRobberyLimit(avgLevel: number): number {
  const level = Math.max(MINIMUM_POKEMON_LEVEL, avgLevel);
  return NPC_ROBBERY_LIMIT_QUADRATIC_COEFF * Math.pow(level, QUADRATIC_EXPONENT);
}
