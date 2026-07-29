/**
 * src/data/battle/abilities.ts
 * 
 * Wrapper to export ABILITY_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './abilities.json' with { type: 'json' };

export const ABILITY_TRANSLATIONS_ES = dbJson;
export type AbilityId = keyof typeof ABILITY_TRANSLATIONS_ES;

export function isAbilityId(value: string): value is AbilityId {
  return Object.keys(ABILITY_TRANSLATIONS_ES).some(id => id === value);
}

export function requireAbilityId(value: string): AbilityId {
  if (isAbilityId(value)) return value;
  throw new Error(`[abilities] Invalid ability id: ${value}`);
}
