import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS, getLevelEvolution, getStoneEvolution, getTradeEvolution } from '@/data/pokemon/evolutionData';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { PokemonData, LearnsetMove } from '@/types/system/database';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { requireAbilityId } from '@/data/battle/abilities';

/**
 * Realiza la evolución de los datos de un Pokémon.
 * @returns {Object} { pendingMoves, fromId, toId }
 */
export function evolvePokemonData(pokemon: Pokemon, toId: string) {
  const targetSpeciesId = requirePokemonSpeciesId(toId);
  const toData: PokemonData | null = pokemonDataProvider.getPokemonData(targetSpeciesId);
  if (!toData) return null;
  
  const fromId = pokemon.id;
  const oldMaxHp = pokemon.maxHp;

  // Actualizar especie
  pokemon.id = targetSpeciesId;
  pokemon.name = toData.name;
  pokemon.type = toData.type;
  pokemon.type2 = toData.type2;
  pokemon.isFloating = toData.isFloating;
  
  // Actualizar habilidad si no es compatible
  const abilityList = pokemonDataProvider.getSpeciesAbilities(targetSpeciesId);
  if (!pokemon.ability || !abilityList.includes(pokemon.ability)) {
    const ability = abilityList[Math.floor(Math.random() * abilityList.length)];
    if (!ability) {
      throw new Error(`[evolutionLogic] Missing abilities for evolved species: ${targetSpeciesId}`);
    }
    pokemon.ability = requireAbilityId(ability);
  }
  
  // Recalcular stats
  recalcPokemonStats(pokemon);
  // Sanar proporcionalmente
  pokemon.hp = Math.min(pokemon.hp + (pokemon.maxHp - oldMaxHp), pokemon.maxHp);
  
  // Movimientos pendientes del nuevo learnset para el nivel actual
  const pendingMoves: Move[] = [];
  if (toData.learnset) {
    (toData.learnset as LearnsetMove[]).filter(m => m.lv === pokemon.level).forEach(m => {
      if (!pokemon.moves.find(em => em && em.name === m.name)) {
        pendingMoves.push({ name: m.name, pp: m.pp, maxPP: m.pp });
      }
    });
  }
  
  return { pendingMoves, fromId, toId: targetSpeciesId };
}

const TYROGUE_EVO_MIN_LEVEL = 20;
const WILD_STONE_EVO_MIN_LEVEL = 30;
const WILD_TRADE_EVO_MIN_LEVEL = 32;

/**
 * Comprueba si un Pokémon puede evolucionar por nivel.
 */
export function checkLevelUpEvolution(pokemon: Pokemon): PokemonSpeciesId | null {
  // Tyrogue special case
  if (pokemon.id === 'tyrogue' && pokemon.level >= TYROGUE_EVO_MIN_LEVEL) {
    const toId = pokemon.atk > pokemon.def ? 'hitmonlee' : 
                 (pokemon.def > pokemon.atk ? 'hitmonchan' : 'hitmontop');
    return requirePokemonSpeciesId(toId);
  }

  const evo = getLevelEvolution(pokemon.id);
  if (!evo || pokemon.level < evo.level) return null;
  if (evo.to === pokemon.id) return null;
  
  if (!pokemonDataProvider.getPokemonData(evo.to)) return null;
  return evo.to;
}

/**
 * Comprueba si un Pokémon puede evolucionar por intercambio.
 */
export function checkTradeEvolution(pokemon: Pokemon): PokemonSpeciesId | null {
  const toId = getTradeEvolution(pokemon.id);
  if (!toId || !pokemonDataProvider.getPokemonData(toId)) return null;
  return toId;
}

/**
 * Obtiene la forma evolucionada ideal para un nivel dado (backtracking hasta base).
 */
export function getEvolvedForm(id: string, level: number): PokemonSpeciesId {
  // 1. Build reverse map to find base form
  const PRE_EVO: Partial<Record<PokemonSpeciesId, PokemonSpeciesId>> = {};
  for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
    if (!data) continue;
    const targets = Array.isArray(data) ? data : [data];
    for (const target of targets) {
      if (target && target.to) {
        PRE_EVO[requirePokemonSpeciesId(target.to)] = requirePokemonSpeciesId(from);
      }
    }
  }
  for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
    const to = requirePokemonSpeciesId(data.to);
    const baseFrom = from.startsWith('eevee_') ? 'eevee' : (from.split('_')[0] || from);
    if (!PRE_EVO[to]) PRE_EVO[to] = requirePokemonSpeciesId(baseFrom);
  }
  for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
     const targetSpeciesId = requirePokemonSpeciesId(to);
     if (!PRE_EVO[targetSpeciesId]) PRE_EVO[targetSpeciesId] = requirePokemonSpeciesId(from);
  }

  // 2. Backtrack to the very first base form
  let current = requirePokemonSpeciesId(id);
  while (PRE_EVO[current]) {
    current = PRE_EVO[current] || current;
  }

  // 3. Evolve forward as much as level permits
  let evolved: PokemonSpeciesId = current;
  let canEvolve = true;
  while (canEvolve) {
    let changed = false;

    // Level Evolution
    const levelEvo = getLevelEvolution(evolved);
    if (levelEvo && level >= levelEvo.level) {
      evolved = levelEvo.to;
      changed = true;
    } 
    
    // Stone Evolution (50% chance if level >= 30)
    if (!changed && level >= WILD_STONE_EVO_MIN_LEVEL && Math.random() < 0.5) {
      if (evolved === 'eevee') {
        const options = ['vaporeon', 'jolteon', 'flareon'] as const satisfies readonly PokemonSpeciesId[];
        evolved = options[Math.floor(Math.random() * options.length)] || evolved;
        changed = true;
      } else {
        const stoneEvo = getStoneEvolution(evolved);
        if (stoneEvo) {
          evolved = stoneEvo.to;
          changed = true;
        }
      }
    }

    // Trade Evolution (50% chance if level >= 32)
    if (!changed && level >= WILD_TRADE_EVO_MIN_LEVEL && Math.random() < 0.5) {
      const tradeEvo = getTradeEvolution(evolved);
      if (tradeEvo) {
        evolved = tradeEvo;
        changed = true;
      }
    }

    if (!changed) canEvolve = false;
  }
  return evolved;
}

/**
 * Comprueba si un Pokémon puede evolucionar con una piedra específica.
 * @param stoneId - Official Showdown item ID (e.g. 'waterstone', 'thunderstone')
 */
export function checkStoneEvolution(pokemon: Pokemon, stoneId: string): PokemonSpeciesId | null {
  if (pokemon.id === 'eevee') {
    if (stoneId === 'waterstone') return requirePokemonSpeciesId('vaporeon');
    if (stoneId === 'thunderstone') return requirePokemonSpeciesId('jolteon');
    if (stoneId === 'firestone') return requirePokemonSpeciesId('flareon');
    return null;
  }

  const evo = getStoneEvolution(pokemon.id);
  if (!evo) return null;

  return (evo.stone === stoneId) ? evo.to : null;
}
