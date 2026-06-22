/**
 * src/data/battle/moves.ts
 * 
 * Wrapper to export MOVE_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './moves.json' with { type: 'json' };

export const MOVE_TRANSLATIONS_ES = dbJson as Record<string, { name: string; desc: string }>;
