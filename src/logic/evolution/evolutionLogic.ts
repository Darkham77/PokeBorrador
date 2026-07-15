import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/pokemon/evolutionData';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon, PokemonMove } from '@/types/pokemon/pokemon';
import type { PokemonData, LearnsetMove } from '@/types/system/database';

/**
 * Realiza la evolución de los datos de un Pokémon.
 * @returns {Object} { pendingMoves, fromId, toId }
 */
export function evolvePokemonData(pokemon: Pokemon, toId: string) {
  const toData: PokemonData | null = pokemonDataProvider.getPokemonData(toId);
  if (!toData) return null;
  
  const fromId = pokemon.id;
  const oldMaxHp = pokemon.maxHp;

  // Actualizar especie
  pokemon.id = toId;
  pokemon.name = toData.name;
  pokemon.type = toData.type;
  pokemon.type2 = toData.type2;
  pokemon.isFloating = toData.isFloating;
  
  // Actualizar habilidad si no es compatible
  const abilityList = pokemonDataProvider.getSpeciesAbilities(toId);
  if (!pokemon.ability || !abilityList.includes(pokemon.ability)) {
    pokemon.ability = abilityList[Math.floor(Math.random() * abilityList.length)];
  }
  
  // Recalcular stats
  recalcPokemonStats(pokemon);
  // Sanar proporcionalmente
  pokemon.hp = Math.min(pokemon.hp + (pokemon.maxHp - oldMaxHp), pokemon.maxHp);
  
  // Movimientos pendientes del nuevo learnset para el nivel actual
  const pendingMoves: PokemonMove[] = [];
  if (toData.learnset) {
    (toData.learnset as LearnsetMove[]).filter(m => m.lv === pokemon.level).forEach(m => {
      if (!pokemon.moves.find(em => em && em.name === m.name)) {
        pendingMoves.push({ name: m.name, pp: m.pp, maxPP: m.pp });
      }
    });
  }
  
  return { pendingMoves, fromId, toId };
}

/**
 * Comprueba si un Pokémon puede evolucionar por nivel.
 */
export function checkLevelUpEvolution(pokemon: Pokemon): string | null {
  // Tyrogue special case
  if (pokemon.id === 'tyrogue' && pokemon.level >= 20) {
    const toId = pokemon.atk > pokemon.def ? 'hitmonlee' : 
                 (pokemon.def > pokemon.atk ? 'hitmonchan' : 'hitmontop');
    return toId;
  }

  const evo = (EVOLUTION_TABLE as Record<string, { level: number; to: string }>)[pokemon.id];
  if (!evo || pokemon.level < evo.level) return null;
  if (evo.to === pokemon.id) return null;
  
  if (!pokemonDataProvider.getPokemonData(evo.to)) return null;
  return evo.to;
}

/**
 * Comprueba si un Pokémon puede evolucionar por intercambio.
 */
export function checkTradeEvolution(pokemon: Pokemon): string | null {
  const toId = (TRADE_EVOLUTIONS as Record<string, string>)[pokemon.id];
  if (!toId || !pokemonDataProvider.getPokemonData(toId)) return null;
  return toId;
}

/**
 * Obtiene la forma evolucionada ideal para un nivel dado (backtracking hasta base).
 */
export function getEvolvedForm(id: string, level: number): string {
  // 1. Build reverse map to find base form
  const PRE_EVO: Record<string, string> = {};
  for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
    PRE_EVO[data.to] = from;
  }
  for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
    const to = (data as { to: string }).to;
    const baseFrom = from.startsWith('eevee_') ? 'eevee' : (from.split('_')[0] || from);
    if (!PRE_EVO[to]) PRE_EVO[to] = baseFrom;
  }
  for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
     if (!PRE_EVO[to as string]) PRE_EVO[to as string] = from;
  }

  // 2. Backtrack to the very first base form
  let current = id;
  while (PRE_EVO[current]) {
    current = PRE_EVO[current] || current;
  }

  // 3. Evolve forward as much as level permits
  let evolved = current;
  let canEvolve = true;
  while (canEvolve) {
    let changed = false;

    // Level Evolution
    const levelEvo = (EVOLUTION_TABLE as Record<string, { level: number; to: string }>)[evolved];
    if (levelEvo && level >= levelEvo.level) {
      evolved = levelEvo.to;
      changed = true;
    } 
    
    // Stone Evolution (50% chance if level >= 30)
    if (!changed && level >= 30 && Math.random() < 0.5) {
      if (evolved === 'eevee') {
        const options = ['vaporeon', 'jolteon', 'flareon'];
        evolved = options[Math.floor(Math.random() * options.length)] || evolved;
        changed = true;
      } else {
        const stoneEvo = (STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>)[evolved];
        if (stoneEvo) {
          evolved = stoneEvo.to;
          changed = true;
        }
      }
    }

    // Trade Evolution (50% chance if level >= 32)
    if (!changed && level >= 32 && Math.random() < 0.5) {
      const tradeEvo = (TRADE_EVOLUTIONS as Record<string, string>)[evolved];
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
export function checkStoneEvolution(pokemon: Pokemon, stoneId: string): string | null {
  if (pokemon.id === 'eevee') {
    if (stoneId === 'waterstone') return 'vaporeon';
    if (stoneId === 'thunderstone') return 'jolteon';
    if (stoneId === 'firestone') return 'flareon';
    return null;
  }

  const evo = (STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>)[pokemon.id];
  if (!evo) return null;

  return (evo.stone === stoneId) ? evo.to : null;
}
