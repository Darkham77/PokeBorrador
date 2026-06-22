/**
 * src/data/pokemon/evolutionData.ts
 * 
 * Wrapper to export evolution tables loaded from JSON.
 */
import dbJson from './evolutionData.json' with { type: 'json' };

export const EVOLUTION_TABLE = dbJson.EVOLUTION_TABLE as Record<string, { level: number; to: string }>;
export const STONE_EVOLUTIONS = dbJson.STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>;
export const TRADE_EVOLUTIONS = dbJson.TRADE_EVOLUTIONS as Record<string, string>;
