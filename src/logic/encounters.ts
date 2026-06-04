import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { GAME_RATIOS } from '@/data/constants';
import { makePokemon } from '@/logic/pokemonFactory';
import { getDayCycle } from '@/logic/timeUtils';
import { getWeatherMultiplier } from '@/logic/weatherUtils';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine';
import { applyEncounterBonuses } from '@/logic/war/bonusEngine';
import { useEventStore } from '@/stores/events';
import type { Pokemon } from '@/types/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/encounters';
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine';

/**
 * Gets the valid pool of Pokémon for a location and time cycle.
 * Incorporates active events.
 */
export function getEncounterPool(loc: MapLocation, cycle: string, weather: string = 'clear', activeEvents: GameEvent[] = []) {
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
function checkSpecialEncounters(
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
function handleRepellentEncounter(
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
 * Handles special fishing encounter tables and weather visitors.
 */
function generateFishingEncounter(
  loc: MapLocation,
  weather: string,
  state: EncounterState,
  options: EncounterOptions
): Encounter | null {
  if (!loc.fishing) return null;
  const pool = [...loc.fishing.pool];
  const rates = [...loc.fishing.rates];

  while (rates.length < pool.length) rates.push(10);

  const fishingType = state.fishingRodType || 'standard';
  if ((fishingType === 'good' || fishingType === 'super') && pool.length > 0) {
    let budget = fishingType === 'super' ? 1000 : 500;
    const indexedPool = pool.map((id, index) => ({ id, index, rate: rates[index] || 10 }))
      .sort((a, b) => a.rate - b.rate);

    for (let i = 0; i < indexedPool.length; i++) {
      const item = indexedPool[i]!;
      if (i === indexedPool.length - 1) {
        rates[item.index] = (rates[item.index] || 10) + budget;
        budget = 0;
      } else {
        const portion = Math.round(budget / 2);
        rates[item.index] = (rates[item.index] || 10) + portion;
        budget -= portion;
      }
    }
  }

  const wConfig = loc.weather?.[weather];
  if (weather && weather !== 'clear' && wConfig) {
    if (wConfig.fishingExclusive) {
      const exclusives = Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive);
      exclusives.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id);
          const weight = Array.isArray(wConfig.fishingExclusive) ? 5 : ((wConfig.fishingExclusive as Record<string, number>)[id] || 5);
          rates.push(weight || 5);
        }
      });
    }
    if (wConfig.fishingVisitors) {
      const visitors = Array.isArray(wConfig.fishingVisitors) ? wConfig.fishingVisitors : Object.keys(wConfig.fishingVisitors);
      visitors.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id);
          const weight = Array.isArray(wConfig.fishingVisitors) ? -10 : -((wConfig.fishingVisitors as Record<string, number>)[id] || 10);
          rates.push(weight || -10);
        }
      });
    }
  }

  if (weather && weather !== 'clear') {
    const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1);
    const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1);
    const exclusives = wConfig?.fishingExclusive ? (Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive)) : [];

    nativeIndices.forEach(idx => {
      const spId = pool[idx];
      if (spId) {
        const isExclusive = exclusives.includes(spId);
        if (!isExclusive) {
          rates[idx] = (rates[idx] || 0) * getWeatherMultiplier(spId, weather);
        }
      }
    });

    if (visitorIndices.length > 0) {
      const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (rates[idx] || 0), 0);
      const visitorQuota = totalNativeWeight / 9;
      const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx] || 0), 0);
      visitorIndices.forEach(idx => {
        const relativeWeight = Math.abs(rates[idx] || 0) / (sumRelativeWeights || 1);
        rates[idx] = visitorQuota * relativeWeight;
      });
    }
  }

  const selectedId = selectFromPool(pool, rates);
  const minLv = loc.fishing.lv[0] || 10;
  const maxLv = loc.fishing.lv[1] || 20;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  const totalRate = rates.reduce((a, b) => a + b, 0);
  const rateIdx = pool.indexOf(selectedId);
  const rateVal = rates[rateIdx];
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * 100;

  const shinyMult = (options.shinyMultiplier || 1) * (fishingType === 'super' ? 1.5 : 1.0);
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: shinyMult }) as Pokemon;
  if (pokemon) {
    const weatherCfg = loc.weather?.[weather];
    const isVisitor = !!(weatherCfg?.visitors && (
      (!Array.isArray(weatherCfg.visitors) && (weatherCfg.visitors as Record<string, number>)[selectedId]) || 
      (Array.isArray(weatherCfg.visitors) && weatherCfg.visitors.includes(selectedId))
    ));
    const isExclusive = !!(weatherCfg?.exclusive && (
      (!Array.isArray(weatherCfg.exclusive) && (weatherCfg.exclusive as Record<string, number>)[selectedId]) || 
      (Array.isArray(weatherCfg.exclusive) && weatherCfg.exclusive.includes(selectedId))
    ));
    const multiplier = getWeatherMultiplier(selectedId, weather);
    const isBuffed = !isVisitor && !isExclusive && multiplier > 1.0;
    const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0;
    
    if (isVisitor || isExclusive || isBuffed || isDebuffed) {
      pokemon.isAtmospheric = true;
      pokemon.weatherOrigin = weather;
      if (isDebuffed) pokemon.isWeatherStruggling = true;
    }
  }
  
  return { 
    type: 'fishing', 
    pokemon,
    rarity 
  };
}

/**
 * Handles archaeology node drops and details.
 */
function generateArchaeologyEncounter(
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
 * General walking wild encounter tables, weather visitor quota, incense, and region boosts.
 */
function generateGroundEncounter(
  loc: MapLocation,
  cycle: string,
  weather: string,
  state: EncounterState,
  options: EncounterOptions,
  activeEvents: GameEvent[],
  locId: string
): Encounter | null {
  let { pool, rates } = getEncounterPool(loc, cycle, weather, activeEvents);

  if (weather && weather !== 'clear') {
    const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1);
    const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1);

     const wConfig = loc.weather?.[weather];
     const exclusives = wConfig?.exclusive ? (Array.isArray(wConfig.exclusive) ? wConfig.exclusive : Object.keys(wConfig.exclusive)) : [];

     nativeIndices.forEach(idx => {
       const spId = pool[idx];
       if (spId) {
         const isExclusive = exclusives.includes(spId);
         if (!isExclusive) {
           rates[idx] = (rates[idx] || 0) * getWeatherMultiplier(spId, weather);
         }
       }
     });

    if (visitorIndices.length > 0) {
      const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (rates[idx] || 0), 0);
      const visitorQuota = totalNativeWeight / 9;
      const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx] || 0), 0);
      
      visitorIndices.forEach(idx => {
        const relativeWeight = Math.abs(rates[idx] || 0) / (sumRelativeWeights || 1);
        rates[idx] = visitorQuota * relativeWeight;
      });
    }
  }

  if (state.incenseSecs && state.incenseSecs > 0 && state.incenseType) {
    const typeIndices = pool.map((id, idx) => {
      const pData = pokemonDataProvider.getPokemonData(id);
      return (pData && (pData.type === state.incenseType || pData.type2 === state.incenseType)) ? idx : -1;
    }).filter(idx => idx !== -1);

    if (typeIndices.length > 0) {
      pool = typeIndices.map(idx => pool[idx]).filter((id): id is string => id !== undefined);
      rates = typeIndices.map(idx => rates[idx]).filter((r): r is number => r !== undefined);
    }
  }

  const selectedId = selectFromPool(pool, rates);
  const minLv = loc.lv[0] || 2;
  const maxLv = loc.lv[1] || 5;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon;
  if (!pokemon) return null;

  const weatherCfg = loc.weather?.[weather];
  const isVisitor = !!(weatherCfg?.visitors && (
    (!Array.isArray(weatherCfg.visitors) && (weatherCfg.visitors as Record<string, number>)[selectedId]) || 
    (Array.isArray(weatherCfg.visitors) && weatherCfg.visitors.includes(selectedId))
  ));
  const isExclusive = !!(weatherCfg?.exclusive && (
    (!Array.isArray(weatherCfg.exclusive) && (weatherCfg.exclusive as Record<string, number>)[selectedId]) || 
    (Array.isArray(weatherCfg.exclusive) && weatherCfg.exclusive.includes(selectedId))
  ));

  const multiplier = getWeatherMultiplier(selectedId, weather);
  const isBuffed = !isVisitor && !isExclusive && multiplier > 1.0;
  const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0;
  
  if (isVisitor || isExclusive || isBuffed || isDebuffed) {
    pokemon.isAtmospheric = true;
    pokemon.weatherOrigin = weather;
    if (isDebuffed) pokemon.isWeatherStruggling = true;
  }

  return { 
    type: 'wild', 
    pokemon: applyEncounterBonuses(pokemon, locId, state.faction, options.dominanceData) 
  };
}

/**
 * Calculates weights for ground, fishing, and archaeology encounter methods.
 */
function calculateEncounterTypeWeights(
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

/**
 * Main logic to generate a wild encounter.
 * Decomposes complex logic flows into single-responsibility utilities.
 */
export async function generateEncounter(locId: string, state: EncounterState, options: EncounterOptions = {}): Promise<Encounter | null> {
  const maps = pokemonDataProvider.getMaps() as unknown as MapLocation[];
  const loc = maps.find(l => l.id === locId);
  if (!loc) return null;

  const cycle = getDayCycle();
  const eventStore = useEventStore() as { activeEvents: GameEvent[] };
  const activeEvents = options.activeEvents || (eventStore.activeEvents || []) || [];
  const allMapIds = maps.map(m => m.id);

  // 1. Check special overrides (debug, rival, defender, guardian)
  const specialEncounter = checkSpecialEncounters(locId, state, options, allMapIds);
  if (specialEncounter) return specialEncounter;

  // 2. Repellent logic
  if ((state.repelSecs || 0) > 0 && !options.forceEncounter) {
    return handleRepellentEncounter(loc, cycle, state, options, activeEvents);
  }

  // 3. Base Trainer Chance
  const trainerBonus = options.eventTrainerBonus || 1;
  const tChance = Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus;
  if (!options.forceEncounter && Math.random() * 100 < tChance) {
    return { type: 'trainer' };
  }

  // 4. Weighted Encounter Roll (Walking vs Fishing vs Archaeology)
  const weather = options.weather || 'clear';
  const { fishingWeight, archWeight, totalWeight } = calculateEncounterTypeWeights(loc, weather, state, options);
  const roll = Math.random() * totalWeight;

  if (loc.fishing && roll < fishingWeight) {
    return generateFishingEncounter(loc, weather, state, options);
  } else if (loc.archaeology && roll < fishingWeight + archWeight) {
    return generateArchaeologyEncounter(loc, options);
  }

  // 5. Wild Pokemon Pool Selection (Normal)
  return generateGroundEncounter(loc, cycle, weather, state, options, activeEvents, locId);
}
