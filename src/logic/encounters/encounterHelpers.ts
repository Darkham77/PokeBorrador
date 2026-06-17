import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters';
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine';

/**
 * Gets the valid pool of Pokémon for a location and time cycle.
 * Incorporates active events.
 */
export function getEncounterPool(loc: MapLocation, cycle: string, weather: string = 'clear', activeEvents: GameEvent[]) {
  if (!loc || !loc.wild) return { pool: [] as string[], rates: [] as number[] };
  
  const pool = [...(loc.wild[cycle] || loc.wild.day || [])];
  const rates = [...((loc.rates && (loc.rates[cycle] || loc.rates.day)) ? (loc.rates[cycle] || loc.rates.day) : []) as number[]];
  
  // Ensure rates match pool length before transformations
  while (rates.length < pool.length) rates.push(10);
 
  // 1. Inyección por Clima (Visitantes y Exclusivos)
  const wConfig = loc.weather?.[weather];
  if (weather && weather !== 'clear' && wConfig) {
    // Especies Exclusivas (Pesos dinámicos o base 5)
    if (wConfig.exclusive) {
      const exclusives = Array.isArray(wConfig.exclusive) ? wConfig.exclusive : Object.keys(wConfig.exclusive);
      exclusives.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id);
          const weight = Array.isArray(wConfig.exclusive) ? 5 : ((wConfig.exclusive as Record<string, number>)[id] || 5);
          rates.push(weight || 5); 
        }
      });
    }

    // Visitantes (Marcados con peso negativo para normalización proporcional)
    if (wConfig.visitors) {
      const visitors = Array.isArray(wConfig.visitors) ? wConfig.visitors : Object.keys(wConfig.visitors);
      visitors.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id);
          const weight = Array.isArray(wConfig.visitors) ? -10 : -((wConfig.visitors as Record<string, number>)[id] || 10);
          rates.push(weight || -10); 
        }
      });
    }
  }

  // 2. Apply Event Injections
  activeEvents.forEach(ev => {
    const cfg = (typeof ev.config === 'string' ? JSON.parse(ev.config) : ev.config) as EventConfig | undefined;
    if (ev.active && cfg?.ignoreTimeRestrictions && cfg.species) {
      const eventSpecies = cfg.species.split(',').map((s: string) => s.trim().toLowerCase());
      eventSpecies.forEach((spId: string) => {
        if (!pool.includes(spId)) {
          // Check if species exists in other cycles for this map
          const wild = loc.wild || {};
          for (const c in wild) {
            const cyclePool = wild[c];
            if (!cyclePool) continue;
            const idx = cyclePool.indexOf(spId);
            if (idx !== -1) {
              pool.push(spId);
              const originalRates = loc.rates?.[c] || [];
              rates.push(originalRates[idx] || 10);
              break;
            }
          }
        }
      });
    }
  });
  
  return { pool, rates };
}

/**
 * Selects a random Pokémon ID from a pool using weights.
 */
export function selectFromPool(pool: string[], rates: number[]): string {
  if (!pool.length) return '';
  const totalRate = rates.reduce((a, b) => a + b, 0);
  const rand = Math.random() * totalRate;
  let cumulative = 0;
  
  for (let i = 0; i < pool.length; i++) {
    cumulative += rates[i] || 0;
    if (rand <= cumulative) return pool[i] || '';
  }
  return pool[0] || '';
}

/**
 * Checks for special, non-wild override encounters (debug overrides, rival, defender battles, guardians).
 */
export function checkSpecialEncounters(
  locId: string,
  state: EncounterState,
  options: EncounterOptions,
  allMapIds: string[]
): Encounter | null {
  // 0. Debug: 50% trainer override
  const win = (typeof window !== 'undefined' ? window : null) as unknown as Record<string, unknown>;
  const debug = win?.__VITE_DEBUG__ as Record<string, unknown> | undefined;
  if (!options.forceEncounter && debug?.trainerChance50) {
    if (Math.random() < 0.50) {
      return { type: 'trainer' };
    }
  }

  // 0. Especial: Rival Azul
  if (!options.forceEncounter) {
    let rivalChance = GAME_RATIOS.encounters.rival;
    const eventRivalBonus = options.eventRivalBonus || 1;
    rivalChance *= eventRivalBonus;

    if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= 20) {
      const gymIds = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'];
      const allGymsHard = gymIds.every(id => state.gymProgress?.[id]?.hard === true);
      if (allGymsHard) {
        rivalChance *= 2;
      }
    }

    if (Math.random() < rivalChance) {
      return { type: 'rival' };
    }
  }
  
  // 1. Especial: Fase de Dominancia (Finde) - Batallas de Defensores
  if (!isDisputePhase() && !options.forceEncounter) {
    if (Math.random() < 0.20 && state.faction) {
      const dominance = (options.dominanceData || {})[locId];
      const winner = dominance?.winner || null;
      if (winner && winner !== state.faction) {
        return { type: 'defender', faction: winner };
      }
    }
  }

  // 2. Especial: Guardianes (Pokémon Alfa)
  const guardian = getGuardianData(locId, allMapIds);
  if (guardian && !options.forceEncounter) {
    const capturedToday = (state.dailyGuardianCaptures || []).includes(locId);
    if (!capturedToday && Math.random() < GUARDIAN_CHANCE) {
      return { 
        type: 'guardian', 
        pokemon: makePokemon(guardian.id, guardian.lv, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
        pts: guardian.pts
      };
    }
  }

  return null;
}

/**
 * Handles repel filters and normalizes repellent encounter rules.
 */
export function handleRepellentEncounter(
  loc: MapLocation,
  cycle: string,
  state: EncounterState,
  options: EncounterOptions,
  activeEvents: GameEvent[]
): Encounter | null {
  if (Math.random() < GAME_RATIOS.encounters.trainerRepel) {
    return { type: 'trainer' };
  }
  
  const weather = options.weather || 'clear';
  const { pool, rates: rawRates } = getEncounterPool(loc, cycle, weather, activeEvents);
  const rates = rawRates.map(r => r === -1 ? 5 : r); 

  const firstPokemon = state.team?.[0];

  for (let attempt = 0; attempt < 10; attempt++) {
    const selectedId = selectFromPool(pool, rates);
    const minLv = loc.lv[0] || 2;
    const maxLv = loc.lv[1] || 5;
    const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;

    if (!firstPokemon || level >= firstPokemon.level) {
      return { 
        type: 'wild', 
        pokemon: makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon 
      };
    }
  }
  return { type: 'trainer' };
}

/**
 * Handles archaeology node drops and details.
 */
export function generateArchaeologyEncounter(
  loc: MapLocation,
  options: EncounterOptions
): Encounter | null {
  if (!loc.archaeology) return null;
  const archPool = loc.archaeology.pool;
  const archRates = loc.archaeology.rates;
  const selectedId = selectFromPool(archPool, archRates);
  const minLv = loc.archaeology.lv[0] || 15;
  const maxLv = loc.archaeology.lv[1] || 25;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  const totalRate = archRates.reduce((a: number, b: number) => a + b, 0);
  const rateIdx = archPool.indexOf(selectedId);
  const rateVal = archRates[rateIdx];
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * 100;
  
  return {
    type: 'archaeology',
    pokemon: makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
    rarity
  };
}

/**
 * Calculates weights for ground, fishing, and archaeology encounter methods.
 */
export function calculateEncounterTypeWeights(
  loc: MapLocation,
  weather: string,
  state: EncounterState,
  options: EncounterOptions
): { groundWeight: number; fishingWeight: number; archWeight: number; totalWeight: number } {
  const isRainy = ['rain', 'heavy_rain', 'storm', 'thunderstorm'].includes(weather.toLowerCase());
  const climateFishingMultiplier = isRainy ? 1.20 : 1.0;
  const fishingBonus = (options.eventFishingBonus || 1) * climateFishingMultiplier;

  const groundWeight = 100;

  let fishingWeight = 0;
  if (loc.fishing) {
    fishingWeight = GAME_RATIOS.encounters.fishing * 100 * fishingBonus;
    if ((state.fishingRodSecs || 0) > 0) {
      fishingWeight += 600;
    }
  }

  let archWeight = 0;
  if (loc.archaeology) {
    const isCave = !!loc.isCave;
    const isMountain = !!loc.isMountain;
    archWeight = isCave ? 10 : (isMountain ? 5 : 0);
    if ((state.pickaxeSecs || 0) > 0 || (state.brushSecs || 0) > 0) {
      archWeight += 600;
    }
  }

  return {
    groundWeight,
    fishingWeight,
    archWeight,
    totalWeight: groundWeight + fishingWeight + archWeight
  };
}
