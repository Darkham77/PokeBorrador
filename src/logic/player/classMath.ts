/**
 * classMath.ts
 * Módulo con funciones y fórmulas puras para las mecánicas de las clases de jugador
 * sin efectos colaterales de base de datos o almacenamiento de estado.
 */

/**
 * Team Rocket:
 * Calcula la probabilidad de éxito de "Robo Rápido" al inicio del combate basado en el nivel de clase.
 * Nivel 1: 5%, Nivel 2: 10%, Nivel 3: 15% (Límite cap).
 */
export function calculateQuickStealChance(classLevel: number): number {
  const level = Math.max(1, classLevel);
  const chance = 0.15 + (level - 1) * 0.01;
  return parseFloat(Math.min(0.30, chance).toFixed(2));
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
  // Aumenta linealmente 5% por cada bicho en el equipo, máximo 30% (+0.30)
  return 1.0 + Math.min(6, bugCount) * 0.05;
}

/**
 * Entrenador:
 * Aplica una penalización del 10% a la tasa de captura base si el Pokémon salvaje tiene IVs excepcionales (IV Total > 120).
 */
export function calculateTrainerCatchRateModifier(baseCatchRate: number, ivTotal: number): number {
  if (ivTotal > 120) {
    return Math.max(1, Math.floor(baseCatchRate * 0.9));
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
  if (level >= 30) return 99999999;
  const ranks = [
    100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000, 8500,
    11500, 15000, 19000, 23500, 28500, 34000, 40000, 46500, 53500, 61000,
    69000, 77500, 86500, 96000, 106000, 116500, 127500, 139000, 151500
  ];
  return ranks[level - 1] || (level * 1000);
}

/**
 * Team Rocket ENEMIGO:
 * Retorna el límite máximo de dinero/valor de recursos que puede robar un NPC basándose en su nivel medio.
 * Escalado: V_max(L) = 8 * L^2
 */
export function calculateMaxNpcRobberyLimit(avgLevel: number): number {
  const level = Math.max(1, avgLevel);
  return 8 * Math.pow(level, 2);
}


