/**
 * Módulo unificado para la gestión de semillas de RNG en el motor de combate de Pokémon Showdown.
 * Proporciona tipos fuertes y métodos deterministas para la creación, formateo e inyección de semillas.
 */

export type NumericSeed = [number, number, number, number];
export type ShowdownSeed = `${number},${string}`;

/**
 * Genera una nueva semilla numérica aleatoria de 4 enteros de 16 bits.
 */
export function generateRandomSeed(): NumericSeed {
  return [
    Math.floor(Math.random() * 0x10000),
    Math.floor(Math.random() * 0x10000),
    Math.floor(Math.random() * 0x10000),
    Math.floor(Math.random() * 0x10000)
  ];
}

/**
 * Formatea una semilla numérica de 4 elementos en la cadena de texto literal esperada por Pokémon Showdown (ej: "18588,21544,54523,34263").
 */
export function formatToShowdownSeed(seed: NumericSeed): ShowdownSeed {
  if (!Array.isArray(seed) || seed.length !== 4) {
    throw new Error(`[BattleSeedManager] Semilla inválida para formatear: ${JSON.stringify(seed)}`);
  }
  return `${seed[0]},${seed[1]},${seed[2]},${seed[3]}` as ShowdownSeed;
}

/**
 * Parsea y normaliza cualquier semilla cruda (un array de números, un string separado por comas o undefined)
 * a una semilla numérica válida de 4 elementos.
 */
export function parseToNumericSeed(raw: unknown): NumericSeed {
  if (typeof raw === 'string') {
    const parts = raw.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      return parts as unknown as NumericSeed;
    }
  }
  
  if (raw && typeof raw === 'object') {
    try {
      const arr = Array.from(raw as ArrayLike<unknown>).map(Number);
      if (arr.length === 4 && arr.every(n => !isNaN(n))) {
        return arr as unknown as NumericSeed;
      }
    } catch (_e) {
      // Fallback
    }
  }
  
  return generateRandomSeed();
}

/**
 * Obtiene la semilla de depuración inyectada en el entorno global de forma segura.
 */
export function getDebugSeed(): NumericSeed | null {
  if (typeof window !== 'undefined') {
    const debugSeed = (window as { __VITE_DEBUG__?: { battleSeed?: unknown } }).__VITE_DEBUG__?.battleSeed;
    console.warn(`[E2E-DEBUG-SEED] Reading debugSeed from window: ${JSON.stringify(debugSeed)}`);
    if (debugSeed) {
      return parseToNumericSeed(debugSeed);
    }
  }
  return null;
}

/**
 * Inyecta una semilla en el entorno de depuración global de forma segura.
 */
export function injectDebugSeed(seed: NumericSeed): void {
  if (typeof window !== 'undefined') {
    const debugObj = (window as { __VITE_DEBUG__?: Record<string, unknown> }).__VITE_DEBUG__ || {};
    (window as { __VITE_DEBUG__?: Record<string, unknown> }).__VITE_DEBUG__ = debugObj;
    debugObj.battleSeed = seed;
  }
}
