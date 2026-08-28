/**
 * src/logic/pokemon/pokemonFieldAbilities.ts
 *
 * SSoT Domain Engine for resolving Pokémon Out-of-Battle (Field) Abilities.
 * Implements canonical rules, generation scaling (ACTIVE_GENERATION), non-stacking egg hatch multipliers,
 * level-bracketed Pickup loot tables, and post-battle team recoveries.
 */

import { ACTIVE_GENERATION } from '@/data/system/constants';
import type { AbilityId } from '@/data/battle/abilities';
import type { Pokemon, PokemonGender } from '@/types/pokemon/pokemon';
import type { NatureId } from '@/data/battle/natures';
import { isGenderlessSpeciesId } from '@/logic/pokemon/pokemonGender';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonType } from '@/data/battle/types';
import type { ItemId } from '@/data/inventory/items';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import { Dex } from '@pkmn/sim';

// --- CONSTANTS ---
export const SYNCHRONIZE_CHANCE_GEN8_PLUS = 1.0;
export const SYNCHRONIZE_CHANCE_LEGACY = 0.5;
export const CUTE_CHARM_OPPOSITE_GENDER_CHANCE = 2 / 3;

export const HELD_ITEM_NORMAL_RATES = { commonRate: 0.50, rareRate: 0.05 } as const;
export const HELD_ITEM_BOOSTED_RATES = { commonRate: 0.60, rareRate: 0.20 } as const;
export const FRISK_FORCE_HELD_ITEM_CHANCE = 0.50;

export const EGG_HATCH_SPEED_NORMAL = 1;
export const EGG_HATCH_SPEED_BOOSTED = 2;

export const PICKUP_TRIGGER_CHANCE = 0.10;
export const HONEY_GATHER_BASE_CHANCE = 0.05;
export const HONEY_GATHER_MAX_CHANCE = 0.50;
export const HONEY_GATHER_LEVEL_SCALE_STEP = 10;
export const HONEY_GATHER_LEVEL_SCALE_RATE = 0.05;

export const ELEMENTAL_ATTRACTION_CHANCE = 0.50;
export const INTIMIDATE_AVOID_LEVEL_DELTA = 5;
export const LEVEL_FILTER_CHANCE = 0.50;

export const SPAWN_RATE_MULTIPLIER_NORMAL = 1.0;
export const SPAWN_RATE_MULTIPLIER_HIGH = 2.0;
export const SPAWN_RATE_MULTIPLIER_LOW = 0.5;
export const WEATHER_SPAWN_REDUCTION_MULTIPLIER = 0.5;

export const FISHING_BITE_MULTIPLIER_NORMAL = 1.0;
export const FISHING_BITE_MULTIPLIER_BOOSTED = 2.0;

const SNOW_WEATHERS: readonly WeatherId[] = ['snow', 'blizzard', 'cold', 'hail', 'coldwave'];

// --- PICKUP LEVEL-BRACKET LOOT TABLES ---
export const PICKUP_LOOT_TABLES: {
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly pool: readonly ItemId[];
}[] = [
  {
    minLevel: 1,
    maxLevel: 20,
    pool: ['potion', 'antidote', 'paralyzeheal', 'awakening', 'burnheal', 'greatball', 'repel', 'pokeball']
  },
  {
    minLevel: 21,
    maxLevel: 40,
    pool: ['superpotion', 'greatball', 'repel', 'fullheal', 'revive', 'nugget']
  },
  {
    minLevel: 41,
    maxLevel: 60,
    pool: ['hyperpotion', 'ultraball', 'fullheal', 'revive', 'maxrepel', 'nugget']
  },
  {
    minLevel: 61,
    maxLevel: 80,
    pool: ['maxpotion', 'ultraball', 'revivemax', 'nugget', 'rarecandy']
  },
  {
    minLevel: 81,
    maxLevel: 100,
    pool: ['fullrestore', 'revivemax', 'nugget', 'rarecandy', 'leftovers', 'destinyknot']
  }
];

export const FIELD_ABILITY_BADGES: Partial<Record<AbilityId, { label: string; desc: string; icon: string }>> = {
  synchronize: { label: 'Sincronía', desc: 'Sincroniza Naturaleza de salvajes', icon: '🔮' },
  cutecharm: { label: 'Gran Encanto', desc: 'Atrae género opuesto', icon: '💖' },
  compoundeyes: { label: 'Ojo Compuesto', desc: '+Probabilidad de objetos salvajes', icon: '👁️' },
  superluck: { label: 'Afortunado', desc: '+Probabilidad de objetos salvajes', icon: '🍀' },
  frisk: { label: 'Cacheo', desc: 'Detecta y potencia objetos equipados', icon: '🔍' },
  flamebody: { label: 'Cuerpo Llama', desc: 'x2 Velocidad de eclosión de Huevos', icon: '🔥' },
  magmaarmor: { label: 'Escudo Magma', desc: 'x2 Velocidad de eclosión de Huevos', icon: '🌋' },
  steamengine: { label: 'Combustible', desc: 'x2 Velocidad de eclosión de Huevos', icon: '🚂' },
  pickup: { label: 'Recogida', desc: '10% de recoger objetos tras combatir', icon: '🎒' },
  honeygather: { label: 'Recogemiel', desc: 'Recolecta Miel dulce tras combatir', icon: '🍯' },
  naturalcure: { label: 'Cura Natural', desc: 'Cura estados alterados post-batalla', icon: '🌿' },
  magnetpull: { label: 'Imán', desc: '50% de atraer tipo Acero', icon: '🧲' },
  static: { label: 'Elec. Estática', desc: '50% de atraer tipo Eléctrico', icon: '⚡' },
  lightningrod: { label: 'Pararrayos', desc: '50% de atraer tipo Eléctrico', icon: '⚡' },
  flashfire: { label: 'Absorbe Fuego', desc: '50% de atraer tipo Fuego', icon: '🔥' },
  stormdrain: { label: 'Colector', desc: '50% de atraer tipo Agua', icon: '💧' },
  harvest: { label: 'Cosecha', desc: '50% de atraer tipo Planta', icon: '🌾' },
  suctioncups: { label: 'Ventosas', desc: 'x2 Tasa de mordida al pescar', icon: '🐙' },
  stickyhold: { label: 'Viscosidad', desc: 'x2 Tasa de mordida al pescar', icon: '🧪' },
  intimidate: { label: 'Intimidación', desc: 'Evita salvajes de bajo nivel', icon: '🦁' },
  keeneye: { label: 'Vista Lince', desc: 'Evita salvajes de bajo nivel', icon: '🦅' },
  pressure: { label: 'Presión', desc: '50% de forzar nivel máximo de ruta', icon: '👑' },
  vitalspirit: { label: 'Espíritu Vital', desc: '50% de forzar nivel máximo de ruta', icon: '✨' },
  hustle: { label: 'Entusiasmo', desc: '50% de forzar nivel máximo de ruta', icon: '💪' },
  arenatrap: { label: 'Trampa Arena', desc: 'x2 Frecuencia de encuentros salvajes', icon: '⏳' },
  illuminate: { label: 'Iluminación', desc: 'x2 Frecuencia de encuentros salvajes', icon: '💡' },
  noguard: { label: 'Indefenso', desc: 'x2 Frecuencia de encuentros salvajes', icon: '⚔️' },
  stench: { label: 'Hedor', desc: 'x0.5 Frecuencia de encuentros salvajes', icon: '🦨' },
  whitesmoke: { label: 'Humo Blanco', desc: 'x0.5 Frecuencia de encuentros salvajes', icon: '💨' },
  quickfeet: { label: 'Pies Rápidos', desc: 'x0.5 Frecuencia de encuentros salvajes', icon: '👟' },
  infiltrator: { label: 'Allanamiento', desc: 'x0.5 Frecuencia de encuentros salvajes', icon: '🦇' },
  sandveil: { label: 'Velo Arena', desc: '-50% Encuentros en Tormenta de Arena', icon: '🌪️' },
  snowcloak: { label: 'Manto Níveo', desc: '-50% Encuentros en Nieve/Granizo', icon: '❄️' }
};

// --- CORE RESOLUTION FUNCTIONS ---

/**
 * Returns the effective field ability of the party leader respecting generation-specific alive requirements.
 */
export function getEffectiveLeaderAbility(
  team: readonly (Pokemon | null)[] | null | undefined,
  generation: number = ACTIVE_GENERATION
): AbilityId | null {
  if (!team || team.length === 0) return null;
  const leader = team[0];
  if (!leader || !leader.ability) return null;

  // Gen 8+ strictly requires the leader to be alive (hp > 0).
  // Gen 3-7 allowed fainted leaders to apply field abilities.
  if (generation >= 8 && leader.hp <= 0) {
    return null;
  }

  return leader.ability;
}

/**
 * Checks if any member in the party has an active field ability (requires hp > 0).
 */
export function hasPartyFieldAbility(
  team: readonly (Pokemon | null)[] | null | undefined,
  abilityId: AbilityId
): boolean {
  if (!team) return false;
  return team.some(pkmn => pkmn != null && pkmn.hp > 0 && pkmn.ability === abilityId);
}

/**
 * Resolves Synchronize nature transfer based on generation probabilities.
 */
export function resolveSynchronizeNature(
  leader: Pokemon | null | undefined,
  generation: number = ACTIVE_GENERATION,
  randomFn: () => number = Math.random
): NatureId | null {
  if (!leader || !leader.nature || leader.ability !== 'synchronize') return null;
  if (generation >= 8 && leader.hp <= 0) return null;

  const threshold = generation >= 8 ? SYNCHRONIZE_CHANCE_GEN8_PLUS : SYNCHRONIZE_CHANCE_LEGACY;
  return randomFn() < threshold ? leader.nature : null;
}

/**
 * Resolves Cute Charm gender bias (66.7% opposite gender).
 */
export function resolveCuteCharmGender(
  leader: Pokemon | null | undefined,
  targetSpeciesId: PokemonSpeciesId,
  generation: number = ACTIVE_GENERATION,
  randomFn: () => number = Math.random
): PokemonGender | null {
  if (!leader || leader.ability !== 'cutecharm' || !leader.gender) return null;
  if (leader.gender !== 'm' && leader.gender !== 'f') return null;
  if (generation >= 8 && leader.hp <= 0) return null;

  if (isGenderlessSpeciesId(targetSpeciesId)) return null;
  const spec = Dex.species.get(targetSpeciesId);
  if (spec.gender === 'N' || spec.gender === 'M' || spec.gender === 'F') return null;

  if (randomFn() < CUTE_CHARM_OPPOSITE_GENDER_CHANCE) {
    return leader.gender === 'm' ? 'f' : 'm';
  }
  return null;
}

/**
 * Returns the modified wild held item probabilities based on leader's ability.
 */
export function getWildHeldItemRates(
  leaderAbility: AbilityId | null | undefined
): { commonRate: number; rareRate: number; forceHeldChance?: number } {
  if (leaderAbility === 'compoundeyes' || leaderAbility === 'superluck') {
    return HELD_ITEM_BOOSTED_RATES;
  }
  if (leaderAbility === 'frisk') {
    return { ...HELD_ITEM_NORMAL_RATES, forceHeldChance: FRISK_FORCE_HELD_ITEM_CHANCE };
  }
  return HELD_ITEM_NORMAL_RATES;
}

/**
 * Resolves elemental attraction ability to a target PokemonType.
 */
export function resolveElementalAttractionType(
  leaderAbility: AbilityId | null | undefined,
  generation: number = ACTIVE_GENERATION,
  randomFn: () => number = Math.random
): PokemonType | null {
  if (!leaderAbility) return null;

  let targetType: PokemonType | null = null;

  if (leaderAbility === 'magnetpull') {
    targetType = 'steel';
  } else if (leaderAbility === 'static') {
    targetType = 'electric';
  } else if (leaderAbility === 'lightningrod' && generation >= 8) {
    targetType = 'electric';
  } else if (leaderAbility === 'flashfire' && generation >= 8) {
    targetType = 'fire';
  } else if (leaderAbility === 'stormdrain' && generation >= 8) {
    targetType = 'water';
  } else if (leaderAbility === 'harvest' && generation >= 8) {
    targetType = 'grass';
  }

  if (targetType && randomFn() < ELEMENTAL_ATTRACTION_CHANCE) {
    return targetType;
  }
  return null;
}

/**
 * Checks whether Intimidate or Keen Eye prevents an encounter with a weak wild Pokemon.
 */
export function shouldAvoidLowLevelWild(
  leader: Pokemon | null | undefined,
  wildLevel: number,
  generation: number = ACTIVE_GENERATION,
  randomFn: () => number = Math.random
): boolean {
  if (!leader || !leader.level) return false;
  if (generation >= 8 && leader.hp <= 0) return false;
  if (leader.ability !== 'intimidate' && leader.ability !== 'keeneye') return false;

  const levelDelta = leader.level - wildLevel;
  if (levelDelta >= INTIMIDATE_AVOID_LEVEL_DELTA) {
    return randomFn() < LEVEL_FILTER_CHANCE;
  }
  return false;
}

/**
 * Checks whether Pressure, Vital Spirit, or Hustle forces the maximum route level.
 */
export function shouldForceMaxRouteLevel(
  leaderAbility: AbilityId | null | undefined,
  randomFn: () => number = Math.random
): boolean {
  if (!leaderAbility) return false;
  if (leaderAbility === 'pressure' || leaderAbility === 'vitalspirit' || leaderAbility === 'hustle') {
    return randomFn() < LEVEL_FILTER_CHANCE;
  }
  return false;
}

/**
 * Calculates the wild encounter step rate multiplier based on leader ability and active weather.
 */
export function getEncounterRateMultiplier(
  leaderAbility: AbilityId | null | undefined,
  weather: WeatherId = 'clear'
): number {
  if (!leaderAbility) return SPAWN_RATE_MULTIPLIER_NORMAL;

  if (leaderAbility === 'arenatrap' || leaderAbility === 'illuminate' || leaderAbility === 'noguard') {
    return SPAWN_RATE_MULTIPLIER_HIGH;
  }
  if (
    leaderAbility === 'stench' ||
    leaderAbility === 'whitesmoke' ||
    leaderAbility === 'quickfeet' ||
    leaderAbility === 'infiltrator'
  ) {
    return SPAWN_RATE_MULTIPLIER_LOW;
  }
  if (leaderAbility === 'sandveil' && weather === 'sandstorm') {
    return WEATHER_SPAWN_REDUCTION_MULTIPLIER;
  }
  if (leaderAbility === 'snowcloak' && SNOW_WEATHERS.includes(weather)) {
    return WEATHER_SPAWN_REDUCTION_MULTIPLIER;
  }

  return SPAWN_RATE_MULTIPLIER_NORMAL;
}

/**
 * Returns the fishing bite rate multiplier for Suction Cups and Sticky Hold.
 */
export function getFishingWeightMultiplier(leaderAbility: AbilityId | null | undefined): number {
  if (leaderAbility === 'suctioncups' || leaderAbility === 'stickyhold') {
    return FISHING_BITE_MULTIPLIER_BOOSTED;
  }
  return FISHING_BITE_MULTIPLIER_NORMAL;
}

/**
 * Calculates egg hatch speed multiplier from party abilities (non-stacking).
 */
export function getHatchSpeedMultiplier(team: readonly (Pokemon | null)[] | null | undefined): number {
  if (!team) return EGG_HATCH_SPEED_NORMAL;
  const hasHatchBooster = team.some(
    p => p != null && p.hp > 0 && (p.ability === 'flamebody' || p.ability === 'magmaarmor' || p.ability === 'steamengine')
  );
  return hasHatchBooster ? EGG_HATCH_SPEED_BOOSTED : EGG_HATCH_SPEED_NORMAL;
}

/**
 * Resolves Pickup loot for a single Pokemon based on level bracket and chance.
 */
export function resolvePickupLoot(
  pokemon: Pokemon,
  randomFn: () => number = Math.random
): ItemId | null {
  if (pokemon.ability !== 'pickup' || pokemon.hp <= 0) return null;
  if (randomFn() >= PICKUP_TRIGGER_CHANCE) return null;

  const bracket = PICKUP_LOOT_TABLES.find(b => pokemon.level >= b.minLevel && pokemon.level <= b.maxLevel);
  const pool = bracket ? bracket.pool : PICKUP_LOOT_TABLES[0]!.pool;
  const selected = pool[Math.floor(randomFn() * pool.length)];
  return selected || null;
}

/**
 * Resolves Honey Gather collection for a single Pokemon.
 */
export function resolveHoneyGather(
  pokemon: Pokemon,
  randomFn: () => number = Math.random
): boolean {
  if (pokemon.ability !== 'honeygather' || pokemon.hp <= 0) return false;
  const chance = Math.min(
    HONEY_GATHER_MAX_CHANCE,
    HONEY_GATHER_BASE_CHANCE + Math.floor(pokemon.level / HONEY_GATHER_LEVEL_SCALE_STEP) * HONEY_GATHER_LEVEL_SCALE_RATE
  );
  return randomFn() < chance;
}

/**
 * Cures persistent status conditions for party members with Natural Cure.
 * Returns the list of cured Pokemon names.
 */
export function curePartyNaturalCure(team: (Pokemon | null)[] | null | undefined): string[] { // no-domain
  if (!team) return [];
  const curedNames: string[] = []; // no-domain

  team.forEach(p => {
    if (p && p.ability === 'naturalcure' && p.status) {
      p.status = '';
      p.sleepTurns = 0;
      curedNames.push(p.name);
    }
  });

  return curedNames;
}

/**
 * Returns active badge descriptor for UI if the Pokemon provides a field ability.
 */
export function getFieldPassiveBadges(
  pokemon: Pokemon | null | undefined
): { id: AbilityId; label: string; desc: string; icon: string } | null {
  if (!pokemon || !pokemon.ability) return null;
  const badge = FIELD_ABILITY_BADGES[pokemon.ability];
  if (!badge) return null;
  return { id: pokemon.ability, ...badge };
}
