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

type SecondaryPredicate = (p: Pokemon & Record<string, unknown>, vc: Partial<Record<string, number>>) => boolean;

const SECONDARY_EFFECT_PREDICATES: Record<string, SecondaryPredicate> = {
  confusion: (p, vc) => (Number(p.confused) || 0) > 0 || (vc.confusion || 0) > 0,
  taunt: (p, vc) => (Number(p.tauntTurns) || 0) > 0 || (vc.taunt || 0) > 0 || (vc.tauntTurns || 0) > 0,
  substitute: (p, vc) => (Number(p.substitute) || 0) > 0 || (vc.substitute || 0) > 0,
  disable: (p, vc) => (Number(p.disabledTurns) || 0) > 0 || (vc.disable || 0) > 0 || (vc.disabledTurns || 0) > 0,
  encore: (p, vc) => (Number(p.encoreTurns) || 0) > 0 || (vc.encore || 0) > 0 || (vc.encoreTurns || 0) > 0,
  perishsong: (p, vc) => (Number(p.perishSongCount) || 0) > 0 || (vc.perishsong || 0) > 0,
  bound: (p, vc) => (Number(p.bound) || 0) > 0 || (vc.bound || 0) > 0 || (vc.partiallytrapped || 0) > 0,
  attract: (p, vc) => Boolean(p.attracted) || (vc.attract || 0) > 0,
  curse: (p, vc) => Boolean(p.cursed) || (vc.curse || 0) > 0,
  leechseed: (p, vc) => Boolean(p.seeded) || (vc.leechseed || 0) > 0,
  trapped: (p, vc) => Boolean(p.trapped) || (vc.trapped || 0) > 0,
  ingrain: (p, vc) => Boolean(p.ingrain) || (vc.ingrain || 0) > 0,
  protect: (p, vc) => Boolean(p.protect) || Boolean(p.detect) || (vc.protect || 0) > 0,
  endure: (p, vc) => Boolean(p.endure) || (vc.endure || 0) > 0,
  focusenergy: (p, vc) => Boolean(p.focusEnergy) || (vc.focusenergy || 0) > 0,
  lockon: (p, vc) => Boolean(p.lockOn) || (vc.lockon || 0) > 0
};

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
