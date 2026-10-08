import { GAME_RATIOS } from '@/data/system/constants';
import { getActivePinia } from 'pinia';
import { getSpeciesBoosts, getGlobalMultipliers, type Event as GameEvent } from '@/logic/events/eventEngine.ts';
import type { ObtainedMethod, PokemonIVs, PokemonGender } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { generateIvPure } from './generationMath.ts';
import type { ItemId } from '@/data/inventory/items';
import type { MapRouteId } from '@/data/world/map-assets';
import type { NatureId } from '@/data/battle/natures';
import type { AbilityId } from '@/data/battle/abilities';

export interface PokemonCreationOptions {
  isShiny?: boolean;
  nature?: NatureId;
  ability?: AbilityId;
  abilitySlot?: number;
  gender?: PokemonGender;
  heldItem?: ItemId | null;
  heldItemRates?: { commonRate: number; rareRate: number; forceHeldChance?: number };
  ivFloor?: number;
  mapId?: MapRouteId;
  shinyMultiplier?: number;
  forceGender?: PokemonGender;
  isGuardian?: boolean;
  obtainedMethod?: ObtainedMethod;
  isNpcEgg?: boolean;
  bypassWhitelist?: boolean;
}

export function computeCreationIVs(
  options: PokemonCreationOptions,
  piniaActive: ReturnType<typeof getActivePinia>
): PokemonIVs {
  let ivFloor = options.ivFloor || 0;
  if (piniaActive?.state?.value?.playerClass) {
    const classState = piniaActive.state.value.playerClass as { playerClass?: string; classData?: { captureStreak?: number } };
    if (classState.playerClass === 'cazabichos') {
      ivFloor = Math.max(ivFloor, classState.classData?.captureStreak || 0);
    }
  }

  const isGuardian = Boolean(options.mapId && (piniaActive?.state?.value?.war as { activeFactions?: unknown } | undefined)?.activeFactions);
  const rand = () => generateIvPure(Math.random, ivFloor, false, isGuardian);

  return {
    hp: rand(),
    atk: rand(),
    def: rand(),
    spa: rand(),
    spd: rand(),
    spe: rand(),
  };
}

export function computeCreationShiny(
  id: PokemonSpeciesId,
  options: PokemonCreationOptions,
  piniaActive: ReturnType<typeof getActivePinia>
): boolean {
  if (options.isShiny !== undefined) return options.isShiny;

  const debugObj = typeof window !== 'undefined' ? (window.__VITE_DEBUG__ as { forceShiny100?: boolean; shinyRateOverride?: number | null } | undefined) : undefined;
  if (debugObj?.forceShiny100 || debugObj?.shinyRateOverride === 1) {
    return true;
  }

  const baseShinyRate = (debugObj?.shinyRateOverride && debugObj.shinyRateOverride > 1)
    ? debugObj.shinyRateOverride
    : GAME_RATIOS.shinyRate;

  const activeEvents = (piniaActive?.state?.value?.events as { activeEvents?: GameEvent[] } | undefined)?.activeEvents || [];
  const speciesBonuses = getSpeciesBoosts(activeEvents, id);
  const totalBonusMult = speciesBonuses?.shiny ? (speciesBonuses.shiny - 1) : 0;

  const globalMults = getGlobalMultipliers(activeEvents);
  const finalMult = Math.max(1, 1 + totalBonusMult);
  const finalShinyRate = Math.max(1, Math.floor(baseShinyRate / (finalMult * (globalMults.shiny || 1))));

  return Math.random() < (1 / finalShinyRate);
}
