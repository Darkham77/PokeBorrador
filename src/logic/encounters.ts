
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { GAME_RATIOS } from '@/data/constants';
import { makePokemon } from '@/logic/pokemonFactory';
import { getDayCycle } from '@/logic/timeUtils';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine';
import { applyEncounterBonuses } from '@/logic/war/bonusEngine';
import { useEventStore } from '@/stores/events';
import type { Pokemon } from '@/types/pokemon';
import type { MapLocation, Encounter } from '@/types/encounters';

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
    rain: ['water', 'bug', 'grass'],
    storm: ['electric', 'dragon'],
    sun: ['fire', 'grass'],
    snow: ['ice', 'steel'],
    sandstorm: ['rock', 'ground', 'steel'],
    fog: ['ghost', 'psychic', 'dark'],
    heatwave: ['fire']
  };

  const boostedTypes = weatherBoosts[w] || [];
  return types.some(t => boostedTypes.includes(t.toLowerCase()));
}


/**
 * Gets the valid pool of Pokémon for a location and time cycle.
 * Incorporates active events.
 */
export function getEncounterPool(loc: MapLocation, cycle: string, weather: string = 'clear', activeEvents: any[] = []) {
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
          rates.push(weight); 
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
          rates.push(weight); 
        }
      });
    }

  }

  // 2. Apply Event Injections
  activeEvents.forEach(ev => {
    if (ev.active && ev.config?.ignoreTimeRestrictions && ev.config.species) {
      const eventSpecies = ev.config.species.split(',').map((s: string) => s.trim().toLowerCase());
      eventSpecies.forEach((spId: string) => {
        if (!pool.includes(spId)) {
          // Check if species exists in other cycles for this map
          for (const c in loc.wild) {
            const cyclePool = (loc.wild as any)[c];
            if (!cyclePool) continue;
            const idx = cyclePool.indexOf(spId);
            if (idx !== -1) {
              pool.push(spId);
              const originalRates = (loc.rates as any)?.[c] || [];
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
    if (rand <= cumulative) return pool[i];
  }
  return pool[0];
}

/**
 * Main logic to generate a wild encounter.
 * Handles repellent, incense, fishing, and specialty spawns.
 */
export async function generateEncounter(locId: string, state: any, options: any = {}): Promise<Encounter | null> {
  const maps = pokemonDataProvider.getMaps() as MapLocation[];
  const loc = maps.find(l => l.id === locId);
  if (!loc) return null;

  const cycle = getDayCycle();
  const eventStore = useEventStore() as any;
  const activeEvents = options.activeEvents || (eventStore.activeEvents || []) || [];
  const allMapIds = maps.map(m => m.id);
  
  // 1. Especial: Fase de Dominancia (Finde) - Batallas de Defensores
  if (!isDisputePhase() && !options.forceEncounter) {
    // Chance de encontrar defensor (20% normal)
    if (Math.random() < 0.20 && state.faction) {
      // Determinamos si el mapa está dominado por el enemigo
      const winner = (options.dominanceData || {})[locId];
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
      const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];

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
    const level = Math.floor(Math.random() * (loc.fishing.lv[1] - loc.fishing.lv[0] + 1)) + loc.fishing.lv[0];
    const totalRate = rates.reduce((a, b) => a + b, 0);
    const rarity = (rates[pool.indexOf(selectedId)] / totalRate) * 100;
    
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
      if (isSpeciesBoosted(pool[idx], weather)) {
        rates[idx] *= WEATHER_BUFF_MULTIPLIER;
      }
    });

    // Normalización Proporcional de Visitantes (10% del peso total)
    if (visitorIndices.length > 0) {
      const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + rates[idx], 0);
      const visitorQuota = totalNativeWeight / 9; // 10% del total final
      
      // Calculamos la suma de los pesos relativos (valores absolutos de los pesos negativos)
      const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx]), 0);
      
      visitorIndices.forEach(idx => {
        const relativeWeight = Math.abs(rates[idx]) / sumRelativeWeights;
        rates[idx] = visitorQuota * relativeWeight;
      });
    }
  }

  // 5. Incense Effect
  if (state.incenseSecs > 0 && state.incenseType) {
    const typeIndices = pool.map((id, idx) => {
      const pData = pokemonDataProvider.getPokemonData(id);
      return (pData && pData.type === state.incenseType) ? idx : -1;
    }).filter(idx => idx !== -1);

    if (typeIndices.length > 0) {
      pool = typeIndices.map(idx => pool[idx]);
      rates = typeIndices.map(idx => rates[idx]);
    }
  }

  // 6. Final Select
  const selectedId = selectFromPool(pool, rates);
  const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
  
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon;

  // Marcar si es atmosférico para efectos visuales posteriores
  const weatherCfg = loc.weather?.[weather] as any;
  const isVisitor = !!(weatherCfg?.visitors?.[selectedId] || (Array.isArray(weatherCfg?.visitors) && weatherCfg?.visitors.includes(selectedId)));
  const isExclusive = !!(weatherCfg?.exclusive?.[selectedId] || (Array.isArray(weatherCfg?.exclusive) && weatherCfg?.exclusive.includes(selectedId)));

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
