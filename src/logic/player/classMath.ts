/**
 * classMath.ts
 * Módulo con funciones y fórmulas puras para las mecánicas de las clases de jugador
 * sin efectos colaterales de base de datos o almacenamiento de estado.
 */

import { MINIMUM_POKEMON_LEVEL, DECIMAL_PLACES_PRECISION_TWO, CLASS_XP_THRESHOLD_RANKS, CRIMINALITY_DENOMINATOR_FACTOR } from '../constants/gameplay.ts';
import { MAX_POKEMON_LEVEL } from '../../data/system/constants.ts';

/** Bonus level calculation step for excess criminality (1 level per 10%). */
export const CRIMINALITY_BONUS_LEVEL_STEP_PERCENT = 10;

/** Excess threshold to spawn a full 6-Pokemon SWAT team (200%). */
export const CRIMINALITY_SWAT_TEAM_THRESHOLD_PERCENT = 200;

/** Excess threshold to spawn a heavy 4-5 Pokemon police team (140%). */
export const CRIMINALITY_HEAVY_TEAM_THRESHOLD_PERCENT = 140;

/** Base level offset added to map route base level for police officers (+5). */
export const POLICE_BASE_LEVEL_OFFSET = 5;

/** Base bail calculation factor for police defeats (80). */
export const POLICE_BAIL_BASE_MULTIPLIER = 80;

/** Base steal chance when defeating a police officer (5%). */
export const POLICE_STEAL_CHANCE_PERCENT = 0.05;

/** Team Rocket quick steal base chance (15%). */
const ROCKET_QUICK_STEAL_BASE_CHANCE = 0.15;

/** Team Rocket quick steal chance increase per level (1%). */
const ROCKET_QUICK_STEAL_PER_LEVEL = 0.01;

/** Team Rocket quick steal maximum cap (30%). */
const ROCKET_QUICK_STEAL_MAX_CAP = 0.30;

/** Bug Catcher catch rate synergy base multiplier. */
const BUG_SYNERGY_BASE_BONUS = 1.0;

/** Bug Catcher maximum active Bug Pokémon count for synergy. */
const BUG_SYNERGY_MAX_COUNT = 6;

/** Bug Catcher bonus catch multiplier per Bug Pokémon (+5%). */
const BUG_SYNERGY_BONUS_PER_BUG = 0.05;

/** Trainer class high-IV threshold for catch rate calculation. */
const TRAINER_HIGH_IV_THRESHOLD = 120;

/** Trainer class catch rate penalty multiplier for high-IV targets (90%). */
const TRAINER_CATCH_PENALTY_MULTIPLIER = 0.9;

/** Maximum player class level limit. */
export const MAX_PLAYER_CLASS_LEVEL = 30;

/** Level requirement for unlocking class-specific cosmetics (Level 25). */
export const COSMETIC_UNLOCK_CLASS_LEVEL = 25;

/** Cost in Battle Coins to change player class (10,000). */
export const CLASS_CHANGE_COST_BATTLE_COINS = 10_000;

/** Maximum criminality level cap for Team Rocket. */
export const MAX_CRIMINALITY_LEVEL = 100;

/** XP cap requirement return for max-level player classes. */
const MAX_LEVEL_XP_CAP = 99999999;

/** Quadratic coefficient factor for NPC robbery limit (8 * L^2). */
const NPC_ROBBERY_LIMIT_QUADRATIC_COEFF = 8;

/** Fallback XP multiplier per level if threshold rank is missing. */
const CLASS_LEVEL_FALLBACK_XP_MULTIPLIER = 1000;

/** Quadratic exponent factor (2). */
const QUADRATIC_EXPONENT = 2;

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

/**
 * Team Rocket / Policía:
 * Calcula los niveles extra de dificultad para el Oficial de Policía basado en el exceso de criminalidad sobre 100%.
 * Fórmula: floor(max(0, criminalidad - 100) / 10). (+1 nivel cada 10% de exceso).
 */
export function calculatePoliceBonusLevel(criminality: number): number {
  const excess = Math.max(0, (criminality || 0) - MAX_CRIMINALITY_LEVEL);
  return Math.floor(excess / CRIMINALITY_BONUS_LEVEL_STEP_PERCENT);
}

/**
 * Team Rocket / Policía:
 * Calcula el nivel efectivo de los Pokémon del Oficial de Policía con clampeo estricto entre 1 y MAX_POKEMON_LEVEL (100).
 * Previene excepciones de generación de Pokémon o desbordamientos ilegales en Showdown/persistencia.
 */
export function calculatePoliceEffectiveLevel(baseMapLv: number, criminality: number): number {
  const base = Math.max(MINIMUM_POKEMON_LEVEL, baseMapLv || MINIMUM_POKEMON_LEVEL);
  const bonus = calculatePoliceBonusLevel(criminality);
  const total = base + POLICE_BASE_LEVEL_OFFSET + bonus;
  return Math.max(MINIMUM_POKEMON_LEVEL, Math.min(MAX_POKEMON_LEVEL, total));
}

/**
 * Team Rocket / Policía:
 * Calcula dinámicamente el tamaño del equipo del Oficial de Policía según la criminalidad:
 * - < 140%: 3 a 4 Pokémon (Patrulla local)
 * - 140% a 199%: 4 a 5 Pokémon (Fuerza de choque)
 * - >= 200%: 6 Pokémon completos (Equipo completo táctico SWAT)
 */
export function calculatePoliceTeamSize(criminality: number, randomFn: () => number = Math.random): number {
  const crim = criminality || 0;
  if (crim >= CRIMINALITY_SWAT_TEAM_THRESHOLD_PERCENT) {
    return 6;
  }
  if (crim >= CRIMINALITY_HEAVY_TEAM_THRESHOLD_PERCENT) {
    return Math.floor(randomFn() * 2) + 4;
  }
  return Math.floor(randomFn() * 2) + 3;
}

/**
 * Team Rocket / Policía:
 * Calcula el monto de la fianza que debe pagar un miembro de Team Rocket al ser derrotado por la policía.
 * Fórmula: floor(classLevel^2 * 80 * (criminalidad / 100)).
 */
export function calculatePoliceBail(classLevel: number, criminality: number): number {
  const level = Math.max(MINIMUM_POKEMON_LEVEL, classLevel || MINIMUM_POKEMON_LEVEL);
  const crim = Math.max(0, criminality || 0);
  return Math.floor(Math.pow(level, QUADRATIC_EXPONENT) * POLICE_BAIL_BASE_MULTIPLIER * (crim / MAX_CRIMINALITY_LEVEL));
}

/**
 * Team Rocket / Policía:
 * Calcula la probabilidad de encuentro con un Oficial de Policía cuando el jugador es Team Rocket y la criminalidad >= 100%.
 * Fórmula: (criminalidad / 10) * trainerBonus.
 */
export function calculatePoliceEncounterChance(criminality: number, trainerBonus = 1): number {
  const crim = Math.max(0, criminality || 0);
  return (crim / CRIMINALITY_DENOMINATOR_FACTOR) * trainerBonus;
}

