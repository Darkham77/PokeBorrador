/**
 * src/data/battle/abilities.ts
 *
 * Wrapper to export ABILITY_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './abilities.json' with { type: 'json' };

export const ABILITY_TRANSLATIONS_ES = dbJson;
export type AbilityId = keyof typeof ABILITY_TRANSLATIONS_ES;

import type { LocalizedText } from '@francogp/auditor';

export function isAbilityId(value: string): value is AbilityId {
  return value in ABILITY_TRANSLATIONS_ES;
}

export function requireAbilityId(value: string): AbilityId {
  if (isAbilityId(value)) return value;
  throw new Error(`[abilities] Invalid ability id: ${value}`);
}

export const ABILITIES_BY_SPANISH_NAME: Readonly<Record<LocalizedText, AbilityId>> = Object.freeze(
  // open-record: Generic key-value data dictionary container
  Object.fromEntries(
    Object.entries(ABILITY_TRANSLATIONS_ES).map(([id, trans]) => [
      trans.name.toLowerCase(),
      requireAbilityId(id)
    ])
  )
);

const SAND_FORCE_BOOSTED_TYPES = ['ground', 'rock', 'steel'] as const;
export type SandForceBoostedType = (typeof SAND_FORCE_BOOSTED_TYPES)[number];
const SAND_FORCE_TYPE_SET: ReadonlySet<string> = new Set<string>(SAND_FORCE_BOOSTED_TYPES);

export function isSandForceBoostedType(type: string): type is SandForceBoostedType {
  return SAND_FORCE_TYPE_SET.has(type);
}
