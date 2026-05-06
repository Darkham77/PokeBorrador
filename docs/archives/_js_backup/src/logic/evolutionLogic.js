import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData';
import { recalcPokemonStats } from '@/logic/pokemonFactory';

/**
 * Realiza la evolución de los datos de un Pokémon.
 * @returns {Object} { pendingMoves, fromId, toId }
 */
export function evolvePokemonData(pokemon, toId) {
  const toData = pokemonDataProvider.getPokemonData(toId);
  if (!toData) return null;
  
  const fromId = pokemon.id;
  const oldMaxHp = pokemon.maxHp;

  // Actualizar especie
  pokemon.id = toId;
  pokemon.name = toData.name;
  pokemon.emoji = toData.emoji;
  pokemon.type = toData.type;
  
  // Actualizar habilidad si no es compatible
  const abilityList = pokemonDataProvider.getSpeciesAbilities(toId);
  if (!abilityList.includes(pokemon.ability)) {
    pokemon.ability = abilityList[Math.floor(Math.random() * abilityList.length)];
  }
  
  // Recalcular stats
  recalcPokemonStats(pokemon);
  // Sanar proporcionalmente
  pokemon.hp = Math.min(pokemon.hp + (pokemon.maxHp - oldMaxHp), pokemon.maxHp);
  
  // Movimientos pendientes del nuevo learnset para el nivel actual
  const pendingMoves = [];
  if (toData.learnset) {
    toData.learnset.filter(m => m.lv === pokemon.level).forEach(m => {
      if (!pokemon.moves.find(em => em.name === m.name)) {
        pendingMoves.push({ name: m.name, pp: m.pp, maxPP: m.pp });
      }
    });
  }
  
  return { pendingMoves, fromId, toId };
}

/**
 * Comprueba si un Pokémon puede evolucionar por nivel.
 */
export function checkLevelUpEvolution(pokemon) {
  // Tyrogue special case
  if (pokemon.id === 'tyrogue' && pokemon.level >= 20) {
    const toId = pokemon.atk > pokemon.def ? 'hitmonlee' : 
                 (pokemon.def > pokemon.atk ? 'hitmonchan' : 
                 (Math.random() < 0.5 ? 'hitmonlee' : 'hitmonchan'));
    return toId;
  }

  const evo = EVOLUTION_TABLE[pokemon.id];
  if (!evo || pokemon.level < evo.level) return null;
  if (evo.to === pokemon.id) return null;
  
  if (!pokemonDataProvider.getPokemonData(evo.to)) return null;
  return evo.to;
}

/**
 * Comprueba si un Pokémon puede evolucionar por intercambio.
 */
export function checkTradeEvolution(pokemon) {
  const toId = TRADE_EVOLUTIONS[pokemon.id];
  if (!toId || !pokemonDataProvider.getPokemonData(toId)) return null;
  return toId;
}

/**
 * Obtiene la forma evolucionada ideal para un nivel dado (backtracking hasta base).
 */
export function getEvolvedForm(id, level) {
  // 1. Build reverse map to find base form
  const PRE_EVO = {};
  for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
    PRE_EVO[data.to] = from;
  }
  for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
    if (!PRE_EVO[data.to]) PRE_EVO[data.to] = from;
  }
  for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
     if (!PRE_EVO[to]) PRE_EVO[to] = from;
  }

  // 2. Backtrack to the very first base form
  let current = id;
  while (PRE_EVO[current]) {
    current = PRE_EVO[current];
  }

  // 3. Evolve forward as much as level permits
  let evolved = current;
  let canEvolve = true;
  while (canEvolve) {
    let changed = false;

    // Level Evolution
    const levelEvo = EVOLUTION_TABLE[evolved];
    if (levelEvo && level >= levelEvo.level) {
      evolved = levelEvo.to;
      changed = true;
    } 
    
    // Stone Evolution (50% chance if level >= 30)
    if (!changed && level >= 30 && Math.random() < 0.5) {
      if (evolved === 'eevee') {
        const options = ['vaporeon', 'jolteon', 'flareon'];
        evolved = options[Math.floor(Math.random() * options.length)];
        changed = true;
      } else {
        const stoneEvo = STONE_EVOLUTIONS[evolved];
        if (stoneEvo) {
          evolved = stoneEvo.to;
          changed = true;
        }
      }
    }

    // Trade Evolution (50% chance if level >= 32)
    if (!changed && level >= 32 && Math.random() < 0.5) {
      const tradeEvo = TRADE_EVOLUTIONS[evolved];
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
 */
export function checkStoneEvolution(pokemon, stoneName) {
  const evo = STONE_EVOLUTIONS[pokemon.id];
  if (!evo) {
    // Eevee special handling in evolutionData keys?
    // eevee_water, eevee_thunder, eevee_fire
    if (pokemon.id === 'eevee') {
      if (stoneName === 'Piedra Agua') return 'vaporeon';
      if (stoneName === 'Piedra Trueno') return 'jolteon';
      if (stoneName === 'Piedra Fuego') return 'flareon';
    }
    return null;
  }

  return (evo.stone === stoneName) ? evo.to : null;
}
