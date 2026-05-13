
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { GAME_RATIOS } from '@/data/constants';
import { makePokemon } from '@/logic/pokemonFactory';
import { getDayCycle } from '@/logic/timeUtils';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine';
import { applyEncounterBonuses } from '@/logic/war/bonusEngine';
import { useEventStore } from '@/stores/events';
import type { Pokemon } from '@/types/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/encounters';
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine';

const WEATHER_BUFF_MULTIPLIER = 1.5;

/**
 * Determina si una especie recibe el buff del clima actual basado en sus tipos.
 */
function isSpeciesBoosted(id: string, weather: string): boolean {
  const pData = pokemonDataProvider.getPokemonData(id);
  if (!pData || !weather || weather === 'clear') return false;
  
  const types = Array.isArray(pData.type) ? pData.type : [pData.type];
  const w = weather.toLowerCase();
  
  const weatherBoosts: Record<string, string[]> = {
    rain: ['water', 'bug', 'electric'],
    storm: ['water', 'electric', 'dragon'],
    sun: ['fire', 'grass', 'ground'],
    heatwave: ['fire', 'ground'],
    cold: ['ice', 'steel', 'water'],
    coldwave: ['ice'],
    snow: ['ice', 'steel'],
    blizzard: ['ice'],
    sandstorm: ['rock', 'ground', 'steel'],
    fog: ['ghost', 'psychic', 'dark'],
    wind: ['flying', 'bug', 'psychic'],
    strong_winds: ['flying', 'dragon', 'psychic']
  };

  const boostedTypes = weatherBoosts[w] || [];
  return types.some((t: string) => boostedTypes.includes(t.toLowerCase()));
}


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
  if (weather && weather !== 'clear' && loc.weather?.[weather]) {
    const wConfig = loc.weather[weather];
    
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
 * Main logic to generate a wild encounter.
 * Handles repellent, incense, fishing, and specialty spawns.
 */
export async function generateEncounter(locId: string, state: EncounterState, options: EncounterOptions = {}): Promise<Encounter | null> {
  const maps = pokemonDataProvider.getMaps() as unknown as MapLocation[];
  const loc = maps.find(l => l.id === locId);
  if (!loc) return null;

  const cycle = getDayCycle();
  const eventStore = useEventStore() as { activeEvents: GameEvent[] };
  const activeEvents = options.activeEvents || (eventStore.activeEvents || []) || [];
  const allMapIds = maps.map(m => m.id);
  
  // 1. Especial: Fase de Dominancia (Finde) - Batallas de Defensores
  if (!isDisputePhase() && !options.forceEncounter) {
    // Chance de encontrar defensor (20% normal)
    if (Math.random() < 0.20 && state.faction) {
      // Determinamos si el mapa está dominado por el enemigo
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
    // Verificar si ya fue capturado hoy
    const capturedToday = (state.dailyGuardianCaptures || []).includes(locId);
    if (!capturedToday && Math.random() < GUARDIAN_CHANCE) {
      return { 
        type: 'guardian', 
        pokemon: makePokemon(guardian.id, guardian.lv, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
        pts: guardian.pts
      };
    }
  }

  // 3. Repellent Logic
  const repellentActive = (state.repelSecs || 0) > 0;
  const firstPokemon = state.team?.[0];
  
  if (repellentActive && !options.forceEncounter) {
    if (Math.random() < GAME_RATIOS.encounters.trainerRepel) {
      return { type: 'trainer' };
    }
    
    const weather = options.weather || 'clear';
    const { pool, rates: rawRates } = getEncounterPool(loc, cycle, weather, activeEvents);
    
    // Normalizar pesos para Repelente
    const rates = rawRates.map(r => r === -1 ? 5 : r); 

    // Find a pokemon with level >= firstPokemon.level
    for (let attempt = 0; attempt < 10; attempt++) {
      const selectedId = selectFromPool(pool, rates);
      const minLv = loc.lv[0] || 2;
      const maxLv = loc.lv[1] || 5;
      const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;

      if (!firstPokemon || level >= firstPokemon.level) {
        return { type: 'wild', pokemon: makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon };
      }
    }
    return { type: 'trainer' }; // Fallback to trainer
  }

  // 2. Base Trainer Chance
  const trainerBonus = options.eventTrainerBonus || 1;
  const tChance = Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus;
  if (!options.forceEncounter && Math.random() * 100 < tChance) {
    return { type: 'trainer' };
  }

  // 3. Fishing Chance (if applicable)
  const fishingBonus = options.eventFishingBonus || 1;
  if (loc.fishing && Math.random() < GAME_RATIOS.encounters.fishing * fishingBonus) {
    const { pool, rates } = loc.fishing;
    const selectedId = selectFromPool(pool, rates);
    const minLv = loc.fishing.lv[0] || 10;
    const maxLv = loc.fishing.lv[1] || 20;
    const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
    const totalRate = rates.reduce((a, b) => a + b, 0);
    const rateIdx = pool.indexOf(selectedId);
    const rateVal = rates[rateIdx];
    const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * 100;
    
    return { 
      type: 'fishing', 
      pokemon: makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
      rarity 
    };
  }

  // 4. Wild Pokemon Pool Selection (Normal)
  const weather = options.weather || 'clear';
  let { pool, rates } = getEncounterPool(loc, cycle, weather, activeEvents);

  // 4.1 Lógica de Clima: Multiplicadores e Invasiones
  if (weather && weather !== 'clear') {
    const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1);
    const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1);

    // Buff x1.5 a nativos que coinciden con el clima
    nativeIndices.forEach(idx => {
      const spId = pool[idx];
      if (spId && isSpeciesBoosted(spId, weather)) {
        rates[idx] = (rates[idx] || 0) * WEATHER_BUFF_MULTIPLIER;
      }
    });

    // Normalización Proporcional de Visitantes (10% del peso total)
    if (visitorIndices.length > 0) {
      const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (rates[idx] || 0), 0);
      const visitorQuota = totalNativeWeight / 9; // 10% del total final
      
      // Calculamos la suma de los pesos relativos (valores absolutos de los pesos negativos)
      const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx] || 0), 0);
      
      visitorIndices.forEach(idx => {
        const relativeWeight = Math.abs(rates[idx] || 0) / (sumRelativeWeights || 1);
        rates[idx] = visitorQuota * relativeWeight;
      });
    }
  }

  // 5. Incense Effect
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

  // 6. Final Select
  const selectedId = selectFromPool(pool, rates);
  const minLv = loc.lv[0] || 2;
  const maxLv = loc.lv[1] || 5;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon;
  if (!pokemon) return null;

  // Marcar si es atmosférico para efectos visuales posteriores
  const weatherCfg = loc.weather?.[weather];
  const isVisitor = !!(weatherCfg?.visitors && (
    (!Array.isArray(weatherCfg.visitors) && (weatherCfg.visitors as Record<string, number>)[selectedId]) || 
    (Array.isArray(weatherCfg.visitors) && weatherCfg.visitors.includes(selectedId))
  ));
  const isExclusive = !!(weatherCfg?.exclusive && (
    (!Array.isArray(weatherCfg.exclusive) && (weatherCfg.exclusive as Record<string, number>)[selectedId]) || 
    (Array.isArray(weatherCfg.exclusive) && weatherCfg.exclusive.includes(selectedId))
  ));

  const isBuffed = !isVisitor && !isExclusive && isSpeciesBoosted(selectedId, weather);
  
  if (isVisitor || isExclusive || isBuffed) {
    pokemon.isAtmospheric = true;
    pokemon.weatherOrigin = weather;
  }


  // 7. Apply War Dominance Bonuses
  return { 
    type: 'wild', 
    pokemon: applyEncounterBonuses(pokemon, locId, state.faction, options.dominanceData) 
  };
}
