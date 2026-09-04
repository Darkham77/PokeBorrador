/**
 * src/logic/rules/fieldRulesCoordinator.ts
 *
 * Unified Coordinator for all Out-of-Battle (Field) Rules, Buffs, Passives, and Environment Modifiers.
 * Centralizes the aggregation of:
 * 1. Pokémon Team Passives (pokemonFieldAbilities.ts)
 * 2. Item Buffs & Tools (Repels, Incenses, Power Items, Everstone, Charms, Fishing Rods, Pickaxes)
 * 3. Environment, Weather & Time Cycles (Rain, Sandstorm, Snow, Day/Night)
 * 4. Player Class & Faction Dominance (Cazabichos streak, Criador IV bonuses, War Dominance)
 * 5. Active Dynamic Events (Shiny multipliers, rate boosts)
 */

import { ACTIVE_GENERATION } from '@/data/system/constants';
import type { AbilityId } from '@/data/battle/abilities';
import type { Pokemon, PokemonGender, PokemonIVs } from '@/types/pokemon/pokemon';
import type { NatureId } from '@/data/battle/natures';
import { isPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonType } from '@/data/battle/types';
import type { ItemId } from '@/data/inventory/items';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { MapLocation, EncounterOptions } from '@/types/pokemon/encounters';
import type { Event as GameEvent } from '@/logic/events/eventEngine';
import type { DominanceInfo } from '@/types/system/stores';
import {
  getEffectiveLeaderAbility,
  resolveSynchronizeNature,
  resolveCuteCharmGender,
  getWildHeldItemRates,
  resolveElementalAttractionType,
  shouldAvoidLowLevelWild,
  shouldForceMaxRouteLevel,
  getEncounterRateMultiplier,
  getFishingWeightMultiplier,
  getHatchSpeedMultiplier,
  resolvePickupLoot,
  resolveHoneyGather,
  curePartyNaturalCure
} from '@/logic/pokemon/pokemonFieldAbilities';
import { getGlobalMultipliers } from '@/logic/events/eventEngine';

import type { MapRouteId } from '@/data/world/map-assets';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { FactionId } from '@/types/system/game';

// --- ENCOUNTER CONTEXT & MODIFIERS ---

export interface FieldEncounterContext {
  team: readonly (Pokemon | null)[] | null | undefined;
  mapId: MapRouteId;
  loc: MapLocation;
  weather: WeatherId;
  dayPhase?: DayPhase;
  repelSecs?: number;
  incenseSecs?: number;
  incenseType?: ItemId | null;
  fishingRodSecs?: number;
  pickaxeSecs?: number;
  brushSecs?: number;
  playerClass?: PlayerClassId | null;
  classData?: { captureStreak?: number; criminality?: number };
  faction?: FactionId | null;
  dominanceData?: Partial<Record<MapRouteId, DominanceInfo>> | Record<MapRouteId, DominanceInfo> | null;
  activeEvents?: GameEvent[];
  options?: EncounterOptions;
  generation?: number;
  randomFn?: () => number;
}

export interface ResolvedEncounterModifiers {
  leaderAbility: AbilityId | null;
  natureOverride: NatureId | null;
  genderOverride: PokemonGender | null;
  heldItemRates: { commonRate: number; rareRate: number; forceHeldChance?: number };
  attractionType: PokemonType | null;
  encounterRateMultiplier: number;
  fishingWeightMultiplier: number;
  archaeologyWeightMultiplier: number;
  shouldAvoidLowLevel: (wildLevel: number) => boolean;
  forceMaxLevel: boolean;
  ivFloor: number;
  shinyMultiplier: number;
}

/**
 * Resolves all field encounter modifiers in one coordinated pass.
 */
export function resolveFieldEncounterModifiers(ctx: FieldEncounterContext): ResolvedEncounterModifiers {
  const gen = ctx.generation ?? ACTIVE_GENERATION;
  const rand = ctx.randomFn ?? Math.random;
  const leader = ctx.team && ctx.team.length > 0 ? ctx.team[0] : null;
  const leaderAbility = getEffectiveLeaderAbility(ctx.team, gen);

  // 1. Nature and Gender resolution
  const natureOverride = resolveSynchronizeNature(leader, gen, rand);
  const targetSpeciesForGender = (ctx.loc.wild?.day?.[0] && isPokemonSpeciesId(ctx.loc.wild.day[0]))
    ? ctx.loc.wild.day[0]
    : requirePokemonSpeciesId('pidgey');
  const genderOverride = resolveCuteCharmGender(leader, targetSpeciesForGender, gen, rand);

  // 2. Wild Held Item rates
  const heldItemRates = getWildHeldItemRates(leaderAbility);

  // 3. Elemental Attraction (Abilities + Incenses)
  const attractionType = resolveElementalAttractionType(leaderAbility, gen, rand);

  // 4. Rate Multipliers (Abilities + Cleanse Tag + Repels)
  const baseEncounterRate = getEncounterRateMultiplier(leaderAbility, ctx.weather);
  const encounterRateMultiplier = baseEncounterRate;

  // 5. Fishing & Archaeology Multipliers (Abilities + Tools)
  const abilityFishingMult = getFishingWeightMultiplier(leaderAbility);
  const fishingWeightMultiplier = abilityFishingMult;
  const archaeologyWeightMultiplier = ((ctx.pickaxeSecs || 0) > 0 || (ctx.brushSecs || 0) > 0) ? 1.5 : 1.0;

  // 6. Level Filtering (Intimidate / Keen Eye vs Pressure / Vital Spirit / Hustle)
  const forceMaxLevel = shouldForceMaxRouteLevel(leaderAbility, rand);
  const shouldAvoidLowLevel = (wildLv: number) => shouldAvoidLowLevelWild(leader, wildLv, gen, rand);

  // 7. IV Floor (Cazabichos class + Dominance)
  let ivFloor = 0;
  if (ctx.playerClass === 'cazabichos') {
    ivFloor = Math.max(ivFloor, ctx.classData?.captureStreak || 0);
  }
  const isDominant = ctx.faction && ctx.dominanceData && ctx.dominanceData[ctx.mapId]?.winner === ctx.faction;
  if (isDominant) {
    ivFloor = Math.max(ivFloor, 15);
  }

  // 8. Shiny Multiplier (Events + Dominance + Options)
  let totalShinyBonus = ctx.options?.shinyMultiplier ?? 1;
  const activeEvents = ctx.activeEvents || [];
  const globalMults = getGlobalMultipliers(activeEvents);
  totalShinyBonus *= (globalMults.shiny || 1);
  if (isDominant) {
    totalShinyBonus *= 1.3;
  }

  return {
    leaderAbility,
    natureOverride,
    genderOverride,
    heldItemRates,
    attractionType,
    encounterRateMultiplier,
    fishingWeightMultiplier,
    archaeologyWeightMultiplier,
    shouldAvoidLowLevel,
    forceMaxLevel,
    ivFloor,
    shinyMultiplier: totalShinyBonus
  };
}

// --- BREEDING CONTEXT & MODIFIERS ---

export interface FieldBreedingContext {
  team: readonly (Pokemon | null)[] | null | undefined;
  parentA: Pokemon;
  parentB: Pokemon;
  playerClass?: string;
  activeEvents?: GameEvent[];
}

export interface ResolvedBreedingModifiers {
  hatchSpeedMultiplier: number;
  inheritedIvsCount: number;
  forcedStatFromItem: keyof PokemonIVs | null;
  natureFromItem: NatureId | null;
  shinyMultiplier: number;
}

/**
 * Resolves all breeding and egg hatching modifiers.
 */
export function resolveFieldBreedingModifiers(ctx: FieldBreedingContext): ResolvedBreedingModifiers {
  const hatchSpeedMultiplier = getHatchSpeedMultiplier(ctx.team);

  // Power Items mapping
  const POWER_ITEMS_TO_STAT: Partial<Record<ItemId, keyof PokemonIVs>> = {
    powerweight: 'hp',
    powerbracer: 'atk',
    powerbelt: 'def',
    powerlens: 'spa',
    powerband: 'spd',
    poweranklet: 'spe'
  };

  const itemA = ctx.parentA.heldItem;
  const itemB = ctx.parentB.heldItem;
  const forcedStatFromItem = (itemA && POWER_ITEMS_TO_STAT[itemA]) || (itemB && POWER_ITEMS_TO_STAT[itemB]) || null;

  // Everstone Nature Inheritance
  let natureFromItem: NatureId | null = null;
  if (itemA === 'everstone') {
    natureFromItem = ctx.parentA.nature;
  } else if (itemB === 'everstone') {
    natureFromItem = ctx.parentB.nature;
  }

  // IV count inheritance (Base 3, Breeder class = 4, Destiny Knot = 5)
  let inheritedIvsCount = 3;
  if (ctx.playerClass === 'criador') {
    inheritedIvsCount = 4;
  }
  if (itemA === 'destinyknot' || itemB === 'destinyknot') {
    inheritedIvsCount = 5;
  }

  // Event Shiny Boosts
  const activeEvents = ctx.activeEvents || [];
  const globalMults = getGlobalMultipliers(activeEvents);
  const shinyMultiplier = globalMults.shiny || 1;

  return {
    hatchSpeedMultiplier,
    inheritedIvsCount,
    forcedStatFromItem,
    natureFromItem,
    shinyMultiplier
  };
}

// --- POST-BATTLE REWARD CONTEXT & MODIFIERS ---

export interface FieldBattleRewardContext {
  team: (Pokemon | null)[] | null | undefined;
  isWild: boolean;
  isTrainer: boolean;
  mapId?: MapRouteId;
  faction?: FactionId | null;
  dominanceData?: Record<MapRouteId, DominanceInfo> | null;
  activeEvents?: GameEvent[];
  randomFn?: () => number;
}

export interface ResolvedBattleRewards {
  pickupItems: Array<{ pokemonName: string; item: ItemId }>;
  honeyGathered: Array<{ pokemonName: string; item: ItemId }>;
  curedMembers: string[]; // no-domain: Non-domain utility collection or data structure
  expMultiplier: number;
  moneyMultiplier: number;
}

/**
 * Resolves post-battle field effects: Pickup, Honey Gather, Natural Cure, and reward multipliers.
 */
export function resolveFieldBattleRewards(ctx: FieldBattleRewardContext): ResolvedBattleRewards {
  const rand = ctx.randomFn ?? Math.random;
  const pickupItems: Array<{ pokemonName: string; item: ItemId }> = [];
  const honeyGathered: Array<{ pokemonName: string; item: ItemId }> = [];

  // 1. Pickup (independent roll per member)
  if (ctx.team) {
    ctx.team.forEach(p => {
      if (p && p.ability === 'pickup' && p.hp > 0) {
        const item = resolvePickupLoot(p, rand);
        if (item) {
          pickupItems.push({ pokemonName: p.name, item });
        }
      }
    });
  }

  // 2. Honey Gather (independent roll per member)
  if (ctx.team) {
    ctx.team.forEach(p => {
      if (p && p.ability === 'honeygather' && p.hp > 0) {
        const gathered = resolveHoneyGather(p, rand);
        if (gathered) {
          honeyGathered.push({ pokemonName: p.name, item: 'combeehoney' });
        }
      }
    });
  }

  // 3. Natural Cure (clean status conditions)
  const curedMembers = curePartyNaturalCure(ctx.team);

  // 4. Money & Exp multipliers (Amulet coin, Lucky Egg, Dominance, Events)
  let moneyMult = 1.0;
  let expMult = 1.0;

  const hasAmuletCoin = ctx.team?.some(p => p != null && p.hp > 0 && p.heldItem === 'amuletcoin');
  if (hasAmuletCoin) {
    moneyMult *= 2.0;
  }

  const isDominant = ctx.faction && ctx.dominanceData && ctx.mapId && ctx.dominanceData[ctx.mapId]?.winner === ctx.faction;
  if (isDominant) {
    moneyMult *= 1.2;
    expMult *= 1.2;
  }

  const activeEvents = ctx.activeEvents || [];
  const globalMults = getGlobalMultipliers(activeEvents);
  if (globalMults.exp) expMult *= globalMults.exp;
  if (globalMults.money) moneyMult *= globalMults.money;

  return {
    pickupItems,
    honeyGathered,
    curedMembers,
    expMultiplier: expMult,
    moneyMultiplier: moneyMult
  };
}
