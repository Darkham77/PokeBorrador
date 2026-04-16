import { POKEMON_DB } from '@/data/pokemonDB';
import { POKEMON_ABILITIES } from '@/data/abilities';
import { NATURES, NATURE_DATA } from '@/data/natures';
import { GAME_RATIOS } from '@/data/constants';
import { getMovesAtLevel } from '@/logic/pokemonUtils';
import { MOVE_DATA } from '@/data/moves';

/**
 * Probabilidades de items equipados en estado salvaje
 */
const WILD_HELD_ITEMS = {
  butterfree: { rare: 'Polvo Plata' },
  beedrill: { rare: 'Flecha Venenosa' },
  pikachu: { common: 'Baya Aranja', rare: 'Bola Luminosa' },
  meowth: { rare: 'Moneda Amuleto' },
  abra: { rare: 'Cuchara Torcida' },
  kadabra: { rare: 'Cuchara Torcida' },
  machoke: { rare: 'Banda Focus' },
  magneton: { rare: 'Imán' },
  farfetchd: { rare: 'Palo' },
  shellder: { common: 'Perla Grande', rare: 'Perla' },
  cloyster: { common: 'Perla Grande', rare: 'Perla' },
  haunter: { rare: 'Hechizo' },
  gengar: { rare: 'Hechizo' },
  cubone: { rare: 'Hueso Grueso' },
  marowak: { rare: 'Hueso Grueso' },
  chansey: { rare: 'Huevo Suerte' },
  staryu: { common: 'Trozo Estrella', rare: 'Polvo Estelar' },
  starmie: { common: 'Trozo Estrella', rare: 'Polvo Estelar' },
  ditto: { rare: 'Polvo Metálico' },
  snorlax: { rare: 'Restos' },
  dragonair: { rare: 'Escama Dragón' },
  dragonite: { rare: 'Escama Dragón' }
};

const GENDERLESS = ['articuno', 'ditto', 'electrode', 'magnemite', 'magneton', 'mew', 'mewtwo', 'moltres', 'porygon', 'starmie', 'staryu', 'voltorb', 'zapdos'];

export function assignGender(id) {
  if (GENDERLESS.includes(id)) return null;
  if (id.endsWith('_m')) return 'M';
  if (id.endsWith('_f')) return 'F';
  return Math.random() < 0.5 ? 'M' : 'F';
}

export function ensurePokemonGender(p) {
  if (!p) return false;
  if (!p.gender) { p.gender = assignGender(p.id); return true; }
  return false;
}

export function getExpNeeded(level) {
  if (level >= 100) return Infinity;
  // Medium Fast curve scaled for web game: (Lv+1)^3 - Lv^3
  return Math.floor(Math.pow(level + 1, 3) - Math.pow(level, 3));
}

export function recalcPokemonStats(p) {
  if (!p) return;
  
  const base = POKEMON_DB[p.id];
  if (!base) return;
  const natureData = NATURE_DATA[p.nature] || { up: null, down: null };

  const getStat = (baseVal, iv, level, statName) => {
    let val = Math.floor((baseVal * 2 + iv) * level / 100 + 5);
    if (natureData.up === statName) val = Math.floor(val * 1.1);
    if (natureData.down === statName) val = Math.floor(val * 0.9);
    return val;
  };

  p.maxHp = Math.floor((base.hp * 2 + p.ivs.hp) * p.level / 100 + p.level + 10);
  p.atk = getStat(base.atk, p.ivs.atk, p.level, 'Ataque');
  p.def = getStat(base.def, p.ivs.def, p.level, 'Defensa');
  if (p.heldItem === 'Polvo Metálico' && p.id === 'ditto') p.def = Math.floor(p.def * 1.5);
  p.spa = getStat(base.spa || base.atk, p.ivs.spa, p.level, 'At. Esp');
  p.spd = getStat(base.spd || base.def, p.ivs.spd, p.level, 'Def. Esp');
  p.spe = getStat(base.spe || 45, p.ivs.spe, p.level, 'Velocidad');
}

/**
 * Crea un objeto Pokemon completo.
 * @param {string} id - ID de la especie
 * @param {number} level - Nivel inicial
 * @param {Object} options - Opciones de generación (ivs, shiny, etc)
 */
export function makePokemon(id, level, options = {}) {
  if (level > 100) level = 100;
  let base = POKEMON_DB[id];
  if (!base) {
    console.error("Missing Pokémon in DB:", id);
    base = POKEMON_DB['pidgey'];
    id = 'pidgey';
  }

  // Helpers externos (Legacy bridge fallback)
  const getStreakIvFloor = options.getStreakIvFloor || (typeof window !== 'undefined' && window.getStreakIvFloor) || (() => 0);
  const getGuardianForMap = options.getGuardianForMap || (typeof window !== 'undefined' && window.getGuardianForMap);
  const currentEncounterMapId = options.mapId || (typeof window !== 'undefined' && window.currentEncounterMapId);
  const hasDominanceIvBonus = options.hasDominanceIvBonus || (typeof window !== 'undefined' && window.hasDominanceIvBonus);
  const getActiveShinyRate = options.getActiveShinyRate || (typeof window !== 'undefined' && window.getActiveShinyRate);
  
  const _ivFloor = getStreakIvFloor();
  const _randIv = (forceReRoll = false, isGuardian = false) => {
    let val = Math.floor(Math.random() * 32);
    if (isGuardian || forceReRoll) {
      val = Math.max(val, Math.floor(Math.random() * 32));
      if (isGuardian) val = Math.max(12, val);
    }
    return Math.max(_ivFloor, val);
  };
  
  const isGuardianPotential = (getGuardianForMap && currentEncounterMapId && getGuardianForMap(currentEncounterMapId)?.id === id);
  const appliedIvBonus = hasDominanceIvBonus && currentEncounterMapId && hasDominanceIvBonus(currentEncounterMapId) && (Math.random() < 0.30);

  const ivs = { 
    hp: _randIv(appliedIvBonus, isGuardianPotential), 
    atk: _randIv(appliedIvBonus, isGuardianPotential), 
    def: _randIv(appliedIvBonus, isGuardianPotential), 
    spa: _randIv(appliedIvBonus, isGuardianPotential), 
    spd: _randIv(appliedIvBonus, isGuardianPotential), 
    spe: _randIv(appliedIvBonus, isGuardianPotential) 
  };
  
  const nature = options.nature || NATURES[Math.floor(Math.random() * NATURES.length)];
  const abilityList = POKEMON_ABILITIES[id] || ['Espesura'];
  const ability = options.ability || abilityList[Math.floor(Math.random() * abilityList.length)];
  const gender = options.gender !== undefined ? options.gender : assignGender(id);

  // Shiny Calculation
  let isShiny = options.isShiny;
  if (isShiny === undefined) {
    const baseShinyRate = getActiveShinyRate ? getActiveShinyRate() : GAME_RATIOS.shinyRate;
    let finalShinyRate = baseShinyRate;
    if (typeof window !== 'undefined' && typeof window.getEventSpeciesShiny === 'function') {
      const speciesShinyMult = window.getEventSpeciesShiny(id);
      if (speciesShinyMult > 1) finalShinyRate = Math.floor(finalShinyRate / speciesShinyMult);
    }
    if (typeof window !== 'undefined' && typeof window.getDominanceShinyMultiplier === 'function' && currentEncounterMapId) {
      finalShinyRate = Math.floor(finalShinyRate / window.getDominanceShinyMultiplier(currentEncounterMapId));
    }
    finalShinyRate = Math.max(1, finalShinyRate);
    isShiny = Math.random() < (1 / finalShinyRate);
  }
  
  const vigor = Math.floor(Math.random() * 4) + 3; // 3 a 6
  const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + Date.now().toString(36);

  let heldItem = options.heldItem || null;
  if (!heldItem) {
    const itemData = WILD_HELD_ITEMS[id];
    if (itemData) {
      const rand = Math.random();
      const r = GAME_RATIOS.heldItems;
      if (itemData.rare && rand < r.rareRate) heldItem = itemData.rare;
      else if (itemData.common && rand < r.commonRate) heldItem = itemData.common;
    }
  }

  const p = {
    uid: getUidStr(),
    id, name: base.name, emoji: base.emoji, type: base.type,
    level, exp: 0, expNeeded: getExpNeeded(level),
    ivs, nature, ability, gender, isShiny,
    moves: getMovesAtLevel(id, level),
    status: null, sleepTurns: 0, friendship: 70, vigor,
    heldItem
  };

  recalcPokemonStats(p);
  p.hp = p.maxHp;
  return p;
}

export function levelUpPokemon(p) {
  if (p.level >= 100) return [];
  // Everstone block
  if (p.heldItem === 'Piedra Eterna') return null;

  p.level++;
  p.expNeeded = getExpNeeded(p.level);
  const oldMaxHp = p.maxHp;
  recalcPokemonStats(p);
  const hpGain = p.maxHp - oldMaxHp;
  if (hpGain > 0) p.hp += hpGain;
  p.hp = Math.min(p.hp, p.maxHp);

  // Learn moves
  const base = POKEMON_DB[p.id];
  const pendingMoves = [];
  if (base.learnset) {
    base.learnset.filter(m => m.lv === p.level).forEach(m => {
      // Check if already knows the move
      if (!p.moves.find(em => em.name === m.name)) {
        const moveData = MOVE_DATA[m.name] || {};
        const moveObj = { name: m.name, pp: m.pp || moveData.pp || 35, maxPP: m.pp || moveData.pp || 35 };
        if (p.moves.length < 4) {
          p.moves.push(moveObj);
        } else {
          pendingMoves.push(moveObj);
        }
      }
    });
  }
  return pendingMoves;
}
