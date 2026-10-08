import type { Pokemon, VolatileStatusKey } from '@/types/pokemon/pokemon';
import { requireBattleConditionKey } from '@/types/battle/battle';

export interface DebugEffectActiveContext {
  poke?: Pokemon | null;
  stages?: Record<string, number> | null;
  fieldConditions?: Record<string, unknown> | null;
  sideConditions?: Record<string, unknown> | null;
  weatherType?: string | null;
  terrain?: string | null;
}

export function isStatusEffectActive(poke: Pokemon | null | undefined, type: string): boolean {
  return poke?.status === type;
}

import { SECONDARY_EFFECT_PREDICATES } from './debugAudioSecondaryPredicates.ts';

export function isSecondaryEffectActive(poke: Pokemon | null | undefined, type: string): boolean {
  if (!poke) return false;
  const p = poke as (Pokemon & Record<string, unknown>); // open-record: Generic key-value data dictionary container
  const vc = (p.volatileCounters || {}) as (Partial<Record<VolatileStatusKey, number>> & Record<string, number | undefined>); // open-record: Generic key-value data dictionary container

  if ((vc[type as VolatileStatusKey] || 0) > 0 || Boolean(p[type])) return true;

  const predicate = SECONDARY_EFFECT_PREDICATES[type];
  return predicate ? predicate(p, vc) : false;
}

export function isFieldEffectActive(
  type: string,
  fieldConditions?: Record<string, unknown> | null,
  sideConditions?: Record<string, unknown> | null,
  stages?: Record<string, number> | null,
  terrain?: string | null
): boolean {
  const key = requireBattleConditionKey(type);
  const cond = fieldConditions?.[key];
  const sideCond = sideConditions?.[key];
  const stageKey = key === 'lightscreen' ? 'lightScreen' : key;
  const stageVal = stages?.[stageKey]; // open-record: Generic key-value data dictionary container
  const isTerrainActive = terrain === key;
  return !!cond || !!sideCond || (stageVal !== undefined && stageVal > 0) || isTerrainActive;
}

export function isWeatherEffectActive(weatherType: string | null | undefined, type: string): boolean {
  return weatherType === type;
}

export function isDebugEffectActive(
  category: string,
  type: string,
  ctx: DebugEffectActiveContext
): boolean {
  if (category === 'status') return isStatusEffectActive(ctx.poke, type);
  if (category === 'secondary') return isSecondaryEffectActive(ctx.poke, type);
  if (category === 'field') return isFieldEffectActive(type, ctx.fieldConditions, ctx.sideConditions, ctx.stages, ctx.terrain);
  if (category === 'weather') return isWeatherEffectActive(ctx.weatherType, type);
  return false;
}
