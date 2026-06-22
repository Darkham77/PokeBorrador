/**
 * src/data/battle/abilities.ts
 * 
 * Wrapper to export ABILITY_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './abilities.json' with { type: 'json' };

export const ABILITY_TRANSLATIONS_ES = dbJson as Record<string, { name: string; desc: string }>;
