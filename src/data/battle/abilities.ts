/**
 * src/data/battle/abilities.ts
 * 
 * Wrapper to export ABILITY_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './abilities.json' with { type: 'json' };

export const ABILITY_TRANSLATIONS_ES = dbJson;
export type AbilityId = keyof typeof ABILITY_TRANSLATIONS_ES;

export function isAbilityId(value: string): value is AbilityId {
  return value in ABILITY_TRANSLATIONS_ES;
}

export function requireAbilityId(value: string): AbilityId {
  if (isAbilityId(value)) return value;
  throw new Error(`[abilities] Invalid ability id: ${value}`);
}

export const ABILITIES_BY_SPANISH_NAME: Readonly<Record<string, AbilityId>> = Object.freeze( // open-record: Generic key-value data dictionary container
  Object.fromEntries(
    Object.entries(ABILITY_TRANSLATIONS_ES).map(([id, trans]) => [trans.name.toLowerCase(), requireAbilityId(id)])
  )
);
