// [PureVue-Ignore-Length]
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { NATURES } from '@/data/battle/natures';
import { GAME_RATIOS, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils';
import { useEventStore } from '@/stores/events';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { useWarStore } from '@/stores/war';
import type { Pokemon, PokemonMove, PokemonIVs } from '@/types/pokemon/pokemon';
import { LEGENDARY_POKEMON, FOSSIL_POKEMON } from '@/data/pokemon/pokedex';
import { getExpNeededPure, calcStatsPure } from './statsMath.ts';
import { generateIvPure } from './generationMath.ts';
import { logger } from '../utils/logger.ts';
import { getItemById } from '@/data/inventory/items';
import { Dex, toID } from '@pkmn/sim';


/**
 * Probabilidades de items equipados en estado salvaje
 */
const WILD_HELD_ITEMS: Record<string, { common?: string; rare?: string }> = {
  butterfree: { rare: 'silverpowder' },
  beedrill: { rare: 'poisonbarb' },
  pikachu: { common: 'berrybronze', rare: 'lightball' },
  meowth: { rare: 'amuletcoin' },
  abra: { rare: 'twistedspoon' },
  kadabra: { rare: 'twistedspoon' },
  machoke: { rare: 'focussash' },
  magneton: { rare: 'magnet' },
  farfetchd: { rare: 'stick' },
  shellder: { common: 'bigpearl', rare: 'pearl' },
  cloyster: { common: 'bigpearl', rare: 'pearl' },
  haunter: { rare: 'spelltag' },
  gengar: { rare: 'spelltag' },
  cubone: { rare: 'thickclub' },
  marowak: { rare: 'thickclub' },
  chansey: { rare: 'luckyegg' },
  staryu: { common: 'starpiece', rare: 'stardust' },
  starmie: { common: 'starpiece', rare: 'stardust' },
  ditto: { rare: 'metalpowder' },
  snorlax: { rare: 'leftovers' },
  dragonair: { rare: 'dragonscale' },
  dragonite: { rare: 'dragonscale' }
};

const GENDERLESS = ['articuno', 'ditto', 'electrode', 'magnemite', 'magneton', 'mew', 'mewtwo', 'moltres', 'porygon', 'starmie', 'staryu', 'voltorb', 'zapdos'];

export function assignGender(id: string): 'M' | 'F' | null {
  if (GENDERLESS.includes(id)) return null;
  if (id.endsWith('_m')) return 'M';
  if (id.endsWith('_f')) return 'F';
  return Math.random() < 0.5 ? 'M' : 'F';
}

export function ensurePokemonGender(p: Pokemon): boolean {
  if (!p) return false;
  if (!p.gender) { p.gender = assignGender(p.id); return true; }
  return false;
}

export function getExpNeeded(level: number): number {
  return getExpNeededPure(level);
}

export function recalcPokemonStats(p: Pokemon, bypassWhitelist = false): void {
  if (!p) return;
  
  const base = pokemonDataProvider.getPokemonData(p.id, bypassWhitelist);
  if (!base) return;
  
  const natureData = pokemonDataProvider.getNatureData(p.nature) || { up: null, down: null };
  const isDittoMetalPowder = p.heldItem === 'metalpowder' && p.id === 'ditto';

  const calculated = calcStatsPure(
    p.level,
    {
      hp: p.ivs.hp,
      atk: p.ivs.atk,
      def: p.ivs.def,
      spa: p.ivs.spa,
      spd: p.ivs.spd,
      spe: p.ivs.spe
    },
    {
      hp: base.hp || 10,
      atk: base.atk || 10,
      def: base.def || 10,
      spa: base.spa,
      spd: base.spd,
      spe: base.spe
    },
    natureData,
    isDittoMetalPowder,
    p.evs
  );

  p.maxHp = calculated.maxHp;
  p.atk = calculated.atk;
  p.def = calculated.def;
  p.spa = calculated.spa;
  p.spd = calculated.spd;
  p.spe = calculated.spe;

  // Asegurar que todos los stats base sean números válidos
  const stats: (keyof Pokemon)[] = ['maxHp', 'atk', 'def', 'spa', 'spd', 'spe'];
  stats.forEach(s => {
    const val = p[s] as number;
    if (isNaN(val) || val === undefined) {
      (p as unknown as Record<string, unknown>)[s as string] = 10;
    }
  });

  validatePokemon(p, bypassWhitelist);
}

export function canLearnMove(speciesId: string, moveId: string): boolean {
  let currId: string | undefined = toID(speciesId);
  const normMoveId = toID(moveId);
  while (currId) {
    const data = Dex.data.Learnsets[currId];
    if (data && data.learnset && data.learnset[normMoveId]) {
      return true;
    }
    const species = Dex.species.get(currId);
    currId = species.prevo ? toID(species.prevo) : undefined;
  }
  return false;
}



/**
 * Validates Pokémon data to ensure all mandatory fields are present and legal.
 * Throws explicit descriptive errors on any data corruption instead of patching.
 */
export function validatePokemon(p: Pokemon, bypassWhitelist = false): void {
  if (!p) throw new Error('[pokemonFactory] Intento de validar un Pokémon nulo o indefinido.');
  if (!p.volatileCounters) p.volatileCounters = {};

  const isDebug = (typeof window !== 'undefined' && !!(window as Window & { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__) || import.meta.env.DEV;
  const bypass = bypassWhitelist || isDebug;

  // 0. Sincronizar Datos Base (Tipos y Levitación) desde DB para paridad Wiki (Datos volátiles en memoria)
  const base = pokemonDataProvider.getPokemonData(p.id, bypass);
  if (base) {
    // Si es Castform y tiene una forma activa diferente de normal, no sobreescribir su tipo con el base de la base de datos (que es siempre normal)
    const isCastformForm = p.id === 'castform' && p.form && p.form !== 'normal';
    if (!isCastformForm) {
      p.type = base.type;
      p.type2 = base.type2;
    }
    p.isFloating = base.isFloating;
  } else {
    throw new Error(`[pokemonFactory] El Pokémon "${p.id}" (UID: ${p.uid}) no existe en la base de datos de especies.`);
  }

  // 1. Validar Habilidad usando pkms Dex
  if (p.ability) {
    const normAbility = toID(p.ability);
    const abilityData = Dex.abilities.get(normAbility);
    if (bypass && abilityData.exists) {
      p.ability = normAbility;
    } else {
      const speciesData = Dex.species.get(p.id);
      const validAbilities: string[] = speciesData.exists 
        ? Object.values(speciesData.abilities).map(a => toID(a)) 
        : ['overgrow'];
      
      if (validAbilities.includes(normAbility)) {
        p.ability = normAbility;
      } else {
        throw new Error(`[pokemonFactory] Habilidad inválida o ilegal (${p.ability}) para especie ${p.id} (UID: ${p.uid}).`);
      }
    }
  } else {
    throw new Error(`[pokemonFactory] El Pokémon ${p.id} (UID: ${p.uid}) no tiene habilidad definida.`);
  }

  // 1b. Validar Objeto Equipado (heldItem)
  if (p.heldItem) {
    const itemData = getItemById(p.heldItem);
    p.heldItem = itemData.id;
  }

  // 2. Validar Movimientos
  if (!p.moves || !Array.isArray(p.moves)) {
    throw new Error(`[pokemonFactory] El Pokémon ${p.id} (UID: ${p.uid}) no tiene una lista de movimientos válida.`);
  }
  
  // Si hay entradas null/undefined en la lista de movimientos, lanzar error
  if (p.moves.some(m => m === null || m === undefined)) {
    throw new Error(`[pokemonFactory] Movimiento nulo detectado en ${p.id} (UID: ${p.uid}).`);
  }

  p.moves.forEach((m, idx) => {
    if (!m) return;

    if (!m.id || m.id === 'null' || m.id === 'undefined' || m.id === '???') {
      throw new Error(`[pokemonFactory] Movimiento corrupto o ID inválido ("${m.id}") detectado en la posición ${idx} de ${p.id} (UID: ${p.uid}).`);
    }

    const moveData = pokemonDataProvider.getMoveData(m.id);
    if (!moveData) {
      throw new Error(`[pokemonFactory] Movimiento "${m.id}" no encontrado o no existe en la base de datos para ${p.id} (UID: ${p.uid}).`);
    } else {
      // Validar legalidad del movimiento para la especie usando el Dex de Showdown
      if (!bypass && !canLearnMove(p.id, m.id)) {
        throw new Error(`[pokemonFactory] Movimiento ilegal "${m.id}" (${moveData.name || m.id}) para especie ${p.id} (UID: ${p.uid}).`);
      }

      // Sincronización Mandatoria
      m.id = moveData.id;
      m.name = moveData.name;
      m.power = moveData.power || 0;
      m.type = moveData.type || 'normal';
      m.acc = moveData.acc || 100;
      m.cat = moveData.cat || 'physical';
      m.effect = moveData.effect;
      // Preserve maxPP if upgraded via pp_up/pp_max — only reset if corrupted (< basePP)
      const basePP = moveData.pp || 35;
      if (!m.maxPP || m.maxPP < basePP) m.maxPP = basePP;
      m.selfKO = moveData.selfKO;
      m.recoil = moveData.recoil;
      m.drain = moveData.drain;
      m.priority = moveData.priority;
      m.hits = moveData.hits;
      m.fixedDmg = moveData.fixedDmg;
      m.ohko = moveData.ohko;
      m.halfHP = moveData.halfHP;
      m.endeavor = moveData.endeavor;
      m.levelDmg = moveData.levelDmg;
      m.counter = moveData.counter;
      m.turns = moveData.turns;
      m.sound = moveData.sound;
      if (m.pp === undefined) m.pp = m.maxPP;
      if (m.pp > m.maxPP) m.pp = m.maxPP;
    }
  });

  // Si no tiene movimientos, lanzar error
  if (p.moves.length === 0) {
    throw new Error(`[pokemonFactory] El Pokémon ${p.id} (UID: ${p.uid}) tiene 0 movimientos configurados.`);
  }

  // 3. Validar consistencia básica
  if (!p.gender && !GENDERLESS.includes(p.id)) {
    throw new Error(`[pokemonFactory] Pokémon ${p.id} (UID: ${p.uid}) no tiene género definido.`);
  }
  if (p.hp === undefined || isNaN(p.hp)) {
    throw new Error(`[pokemonFactory] Pokémon ${p.id} (UID: ${p.uid}) tiene HP inválido o ausente.`);
  }
  if (p.hp > p.maxHp) {
    throw new Error(`[pokemonFactory] El HP de ${p.id} (UID: ${p.uid}) supera su HP máximo (${p.hp}/${p.maxHp}).`);
  }

  // Validar naturaleza usando pkms
  if (p.nature) {
    const normNature = toID(p.nature);
    const natureData = Dex.natures.get(normNature);
    if (natureData && natureData.exists) {
      p.nature = normNature;
    } else {
      throw new Error(`[pokemonFactory] Naturaleza inválida o inexistente "${p.nature}" para ${p.id} (UID: ${p.uid}).`);
    }
  } else {
    throw new Error(`[pokemonFactory] Naturaleza ausente para ${p.id} (UID: ${p.uid}).`);
  }

  // 4. Validar Nivel y Experiencia límite (Evita corrupción)
  if (p.level > MAX_POKEMON_LEVEL) {
    throw new Error(`[pokemonFactory] Pokémon ${p.id} (UID: ${p.uid}) excede el nivel máximo permitido: ${p.level}/${MAX_POKEMON_LEVEL}.`);
  }
  
  if (p.level === MAX_POKEMON_LEVEL) {
    if (p.exp !== 0 || (p.expNeeded !== Infinity && p.expNeeded !== null && p.expNeeded !== undefined && p.expNeeded !== 0)) {
      throw new Error(`[pokemonFactory] Experiencia/Experiencia requerida inconsistente para nivel máximo en ${p.id} (UID: ${p.uid}).`);
    }
  } else {
    const maxExpAllowed = p.expNeeded - 1;
    if (p.exp > maxExpAllowed) {
      throw new Error(`[pokemonFactory] La experiencia de ${p.id} (UID: ${p.uid}) supera el límite de su nivel (${p.exp}/${p.expNeeded}).`);
    }
  }

  const cleanIdForCheck = toID(p.id);
  const isLegendary = LEGENDARY_POKEMON.includes(cleanIdForCheck);
  const isFossil = FOSSIL_POKEMON.includes(cleanIdForCheck);
  if (isLegendary || isFossil) {
    // No lanzar error, se resolverá a 0/0 dinámicamente en UI/lógica
  } else {
    if (p.maxVigor === undefined || p.maxVigor === null || isNaN(p.maxVigor)) {
      throw new Error(`[pokemonFactory] Vigor máximo inválido o ausente en ${p.id} (UID: ${p.uid}).`);
    }
    if (p.vigor === undefined || p.vigor === null || isNaN(p.vigor)) {
      throw new Error(`[pokemonFactory] Vigor actual inválido o ausente en ${p.id} (UID: ${p.uid}).`);
    }
    if (p.vigor > p.maxVigor) {
      throw new Error(`[pokemonFactory] El vigor supera el vigor máximo en ${p.id} (UID: ${p.uid}) (${p.vigor}/${p.maxVigor}).`);
    }
  }
}

export interface PokemonCreationOptions {
  isShiny?: boolean;
  nature?: string;
  ability?: string;
  abilitySlot?: number;
  gender?: 'M' | 'F' | 'N' | null;
  heldItem?: string | null;
  ivFloor?: number;
  mapId?: string;
  shinyMultiplier?: number;
  forceGender?: 'M' | 'F' | 'N' | null;
  isGuardian?: boolean;
  obtainedMethod?: string;
  isNpcEgg?: boolean;
  bypassWhitelist?: boolean;
}

/**
 * Crea un objeto Pokemon completo.
 */
export function makePokemon(idVal: string | number, level: number, options: PokemonCreationOptions = {}): Pokemon | null {
  if (idVal === undefined || idVal === null || idVal === '') return null;
  let id = String(idVal).toLowerCase().trim();
  
  if (level > MAX_POKEMON_LEVEL) level = MAX_POKEMON_LEVEL;
  const bypass = options.bypassWhitelist || false;
  let base = pokemonDataProvider.getPokemonData(id, bypass);
  if (!base) {
    logger.error('Factory', `Missing Pokémon in DB: ${id}`);
    base = pokemonDataProvider.getPokemonData('pidgey', bypass);
    id = 'pidgey';
  }

  if (!base) return null; // Safety for pidgey missing too

  // 1. IV Floor from Class (Cazabichos)
  const classStore = usePlayerClassStore();
  let _ivFloor = options.ivFloor || 0;
  if (classStore.playerClass === 'cazabichos') {
    const classData = classStore.classData as { captureStreak?: number };
    _ivFloor = Math.max(_ivFloor, classData.captureStreak || 0);
  }

  function _randIv(floor: number = 0, forceReRoll: boolean = false, isGuardian: boolean = false): number {
    return generateIvPure(Math.random, floor, forceReRoll, isGuardian);
  }
  
  const warStore = useWarStore();
  const currentMapId = options.mapId;
  const isGuardianPotential = (currentMapId && warStore.checkGuardian && warStore.checkGuardian(currentMapId, []) !== null);

  const ivs: PokemonIVs = { 
    hp: _randIv(_ivFloor, false, !!isGuardianPotential), 
    atk: _randIv(_ivFloor, false, !!isGuardianPotential), 
    def: _randIv(_ivFloor, false, !!isGuardianPotential), 
    spa: _randIv(_ivFloor, false, !!isGuardianPotential), 
    spd: _randIv(_ivFloor, false, !!isGuardianPotential), 
    spe: _randIv(_ivFloor, false, !!isGuardianPotential) 
  };
  
  const nature = options.nature ? toID(options.nature) : NATURES[Math.floor(Math.random() * NATURES.length)] || 'serious';
  const abilityList = pokemonDataProvider.getSpeciesAbilities(id);
  const ability = options.ability ? toID(options.ability) : abilityList[Math.floor(Math.random() * abilityList.length)] || 'pressure';
  const gender = options.gender !== undefined ? options.gender : assignGender(id);

  // Shiny Calculation
  const eventStore = useEventStore();
  let isShiny = options.isShiny;
  if (isShiny === undefined) {
    const isDebugShiny = typeof window !== 'undefined' && 
      (window as unknown as { __VITE_DEBUG__?: { forceShiny100?: boolean } }).__VITE_DEBUG__?.forceShiny100;
    
    if (isDebugShiny) {
      isShiny = true;
    } else {
      const baseShinyRate = GAME_RATIOS.shinyRate;
      let totalBonusMult = 0;
      
      // Event Bonus
      const speciesBonuses = eventStore.getSpeciesBonuses(id);
      if (speciesBonuses && speciesBonuses.shiny) {
        totalBonusMult += (speciesBonuses.shiny - 1);
      }
      
      // Local Options Bonus
      if (options.shinyMultiplier) {
        totalBonusMult += (options.shinyMultiplier - 1);
      }

      const finalMult = Math.max(1, 1 + totalBonusMult);
      const finalShinyRate = Math.max(1, Math.floor(baseShinyRate / (finalMult * (eventStore.globalMultipliers?.shiny || 1))));
      
      isShiny = Math.random() < (1 / finalShinyRate);
    }
  }
  
  const cleanIdForCheck = toID(id);
  const isLegendary = LEGENDARY_POKEMON.includes(cleanIdForCheck);
  const isFossil = FOSSIL_POKEMON.includes(cleanIdForCheck);
  let maxVigor = 0;
  let vigor = 0;
  if (!isLegendary && !isFossil) {
    if (options.obtainedMethod === 'egg' && !options.isNpcEgg) {
      maxVigor = Math.floor(Math.random() * 3) + 1; // 1 a 3
      vigor = Math.max(1, Math.floor(maxVigor / 2));
    } else {
      maxVigor = Math.floor(Math.random() * 4) + 3; // 1d4+2 (3 a 6)
      vigor = maxVigor;
    }
  }
  const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2,9) + Temporal.Now.instant().epochMilliseconds.toString(36);

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

  const p: Pokemon = {
    uid: getUidStr(),
    id, name: base.name, type: base.type, type2: base.type2,
    isFloating: base.isFloating,
    catchRate: base.catchRate,
    level, exp: 0, expNeeded: getExpNeeded(level),
    ivs, nature, ability, gender, isShiny,
    moves: getMovesAtLevel(id, level, bypass) as PokemonMove[],
    status: null, sleepTurns: 0, friendship: 70, vigor, maxVigor,
    heldItem,
    nickname: null,
    tags: ['ball:pokeball'],
    obtainedAt: Temporal.Now.instant().epochMilliseconds,
    obtainedMethod: options.obtainedMethod || 'wild',
    hp: 0, maxHp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
  };

  recalcPokemonStats(p, bypass);
  p.hp = p.maxHp;
  validatePokemon(p, bypass);
  return p;
}

export function levelUpPokemon(p: Pokemon): PokemonMove[] | null {
  if (p.level >= MAX_POKEMON_LEVEL) return [];
  // Everstone block
  if (p.heldItem === 'everstone') return null;

  p.level++;
  if (p.level >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = Infinity;
  } else {
    p.expNeeded = getExpNeeded(p.level);
  }
  const oldMaxHp = p.maxHp;
  recalcPokemonStats(p);
  const hpGain = p.maxHp - oldMaxHp;
  if (hpGain > 0) p.hp += hpGain;
  p.hp = Math.min(p.hp, p.maxHp);

  // Learn moves
  const base = pokemonDataProvider.getPokemonData(p.id);
  const pendingMoves: PokemonMove[] = [];
  if (base && base.learnset) {
    (base.learnset).filter(m => m.lv === p.level).forEach(m => {
      if (!m.id) throw new Error(`[levelUpPokemon] El movimiento en el learnset no tiene un ID válido.`);
      // Check if already knows the move by ID
      if (!p.moves.find(em => em && em.id === m.id)) {
        const moveData = pokemonDataProvider.getMoveData(m.id);
        if (!moveData) throw new Error(`[levelUpPokemon] No se encontró información para el movimiento: ${m.id}`);
        const moveObj: PokemonMove = { 
          id: m.id, 
          name: moveData.name, 
          pp: m.pp || moveData.pp, 
          maxPP: m.pp || moveData.pp 
        };
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
