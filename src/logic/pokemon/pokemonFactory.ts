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
import { ABILITY_DATA } from '@/data/battle/abilities';
import { getItemById, getItemByName } from '@/data/inventory/items';


/**
 * Probabilidades de items equipados en estado salvaje
 */
const WILD_HELD_ITEMS: Record<string, { common?: string; rare?: string }> = {
  butterfree: { rare: 'silver_powder' },
  beedrill: { rare: 'poison_barb' },
  pikachu: { common: 'berry_bronze', rare: 'light_ball' },
  meowth: { rare: 'amulet_coin' },
  abra: { rare: 'twisted_spoon' },
  kadabra: { rare: 'twisted_spoon' },
  machoke: { rare: 'focus_sash' },
  magneton: { rare: 'magnet' },
  farfetchd: { rare: 'stick' },
  shellder: { common: 'big_pearl', rare: 'pearl' },
  cloyster: { common: 'big_pearl', rare: 'pearl' },
  haunter: { rare: 'spell_tag' },
  gengar: { rare: 'spell_tag' },
  cubone: { rare: 'thick_club' },
  marowak: { rare: 'thick_club' },
  chansey: { rare: 'lucky_egg' },
  staryu: { common: 'star_piece', rare: 'stardust' },
  starmie: { common: 'star_piece', rare: 'stardust' },
  ditto: { rare: 'metal_powder' },
  snorlax: { rare: 'leftovers' },
  dragonair: { rare: 'dragon_scale' },
  dragonite: { rare: 'dragon_scale' }
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

export function recalcPokemonStats(p: Pokemon): void {
  if (!p) return;
  
  const base = pokemonDataProvider.getPokemonData(p.id);
  if (!base) return;
  
  const natureData = pokemonDataProvider.getNatureData(p.nature) || { up: null, down: null };
  const isDittoMetalPowder = p.heldItem === 'metal_powder' && p.id === 'ditto';

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
    isDittoMetalPowder
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

  sanitizePokemon(p);
}

/**
 * Sanitizes Pokémon data to ensure all mandatory battle fields are present.
 */
export function sanitizePokemon(p: Pokemon): void {
  if (!p) return;

  // 0. Sincronizar Datos Base (Tipos y Levitación) desde DB para paridad Wiki
  const base = pokemonDataProvider.getPokemonData(p.id);
  if (base) {
    // Si es Castform y tiene una forma activa diferente de normal, no sobreescribir su tipo con el base de la base de datos (que es siempre normal)
    const isCastformForm = p.id === 'castform' && p.form && p.form !== 'normal';
    if (!isCastformForm) {
      p.type = base.type;
      p.type2 = base.type2;
    }
    p.isFloating = base.isFloating;
    p.emoji = base.emoji || p.emoji;
  }

  // 1. Validar Habilidad
  if (p.ability) {
    const normalizeText = (text: string) => {
      return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_-]+/g, '')
        .trim();
    };

    const normAbility = normalizeText(p.ability);
    const match = Object.keys(ABILITY_DATA).find(k => normalizeText(k) === normAbility);
    if (match) {
      p.ability = match;
    }
  }

  const validAbilities = pokemonDataProvider.getSpeciesAbilities(p.id);
  const normalizedValid = validAbilities.map(a => a.toLowerCase().trim());
  if (p.ability) {
    const currentLower = p.ability.toLowerCase().trim();
    const index = normalizedValid.indexOf(currentLower);
    if (index !== -1) {
      p.ability = validAbilities[index];
    }
  }

  if (!p.ability || !validAbilities.includes(p.ability)) {
    logger.warn('Self-Healing', `Reparando habilidad inválida (${p.ability}) para ${p.id}`);
    p.ability = validAbilities[0] || 'Presión';
  }

  // 1b. Validar Objeto Equipado (heldItem)
  if (p.heldItem) {
    const itemData = getItemById(p.heldItem) || getItemByName(p.heldItem);
    if (itemData) {
      p.heldItem = itemData.id;
    } else {
      logger.warn('Self-Healing', `Removiendo objeto equipado inválido (${p.heldItem}) para ${p.id}`);
      p.heldItem = null;
    }
  }

  // 2. Validar Movimientos
  if (!p.moves || !Array.isArray(p.moves)) p.moves = [];
  
  // Eliminar entradas null/undefined
  p.moves = p.moves.filter(m => m !== null && m !== undefined);

  p.moves.forEach((m, idx) => {
    if (!m) return;
    
    // Resolve ID if missing
    if (!m.id && m.name) {
      m.id = pokemonDataProvider.resolveMoveId(m.name);
    }

    // Si el ID es inválido, intentar recuperar o asignar 'tackle'
    if (!m.id || m.id === 'null' || m.id === 'undefined' || m.id === '???') {
      logger.warn('Self-Healing', `Movimiento ${idx} corrupto detectado en ${p.id}`);
      m.id = 'tackle';
    }

    const moveData = pokemonDataProvider.getMoveData(m.id);
    if (!moveData) {
      logger.warn('Self-Healing', `Movimiento ${m.id} no existe en DB, reasignando a tackle`);
      m.id = 'tackle';
      const fallback = pokemonDataProvider.getMoveData('tackle');
      if (fallback) {
        m.name = fallback.name;
        Object.assign(m, {
          power: fallback.power,
          type: fallback.type,
          acc: fallback.acc,
          cat: fallback.cat,
          pp: m.pp || fallback.pp,
          maxPP: m.maxPP || fallback.pp
        });
      }
    } else {
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

  // Si no tiene movimientos, darle al menos uno
  if (p.moves.length === 0) {
    logger.warn('Self-Healing', `${p.id} no tiene movimientos, asignando tackle`);
    const fallback = pokemonDataProvider.getMoveData('tackle');
    if (fallback) {
      p.moves.push({
        id: 'tackle',
        name: fallback.name,
        power: fallback.power,
        type: fallback.type,
        acc: fallback.acc,
        cat: fallback.cat as 'physical' | 'special' | 'status',
        pp: fallback.pp,
        maxPP: fallback.pp
      });
    }
  }

  // 3. Validar consistencia básica
  if (!p.gender && !GENDERLESS.includes(p.id)) p.gender = assignGender(p.id);
  if (p.hp === undefined || isNaN(p.hp)) p.hp = p.maxHp;
  if (p.hp > p.maxHp) p.hp = p.maxHp;

  // 4. Validar Nivel y Experiencia límite (Auto-healing de corrupción)
  if (p.level > MAX_POKEMON_LEVEL) {
    logger.warn('Self-Healing', `Pokémon ${p.id} con nivel superior al máximo (${p.level}), ajustando a ${MAX_POKEMON_LEVEL}`);
    p.level = MAX_POKEMON_LEVEL;
  }
  
  if (p.level === MAX_POKEMON_LEVEL) {
    if (p.exp !== 0 || (p.expNeeded !== Infinity && p.expNeeded !== null && p.expNeeded !== undefined && p.expNeeded !== 0)) {
      logger.warn('Self-Healing', `Ajustando experiencia de nivel máximo para ${p.id}`);
    }
    p.exp = 0;
    p.expNeeded = Infinity;
  } else {
    const maxExpAllowed = p.expNeeded - 1;
    if (p.exp > maxExpAllowed) {
      logger.warn('Self-Healing', `Experiencia de ${p.id} supera el límite del nivel (${p.exp}/${p.expNeeded}), ajustando a ${maxExpAllowed}`);
      p.exp = maxExpAllowed;
    }
  }

  // 5. Validar Vigor
  const isLegendary = LEGENDARY_POKEMON.includes(p.id.toLowerCase());
  const isFossil = FOSSIL_POKEMON.includes(p.id.toLowerCase());
  if (isLegendary || isFossil) {
    p.maxVigor = 0;
    p.vigor = 0;
  } else {
    if (p.maxVigor === undefined || p.maxVigor === null || isNaN(p.maxVigor)) {
      p.maxVigor = Math.floor(Math.random() * 4) + 3;
    }
    if (p.vigor === undefined || p.vigor === null || isNaN(p.vigor)) {
      p.vigor = p.maxVigor;
    }
    if (p.vigor > p.maxVigor) {
      p.vigor = p.maxVigor;
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
}

/**
 * Crea un objeto Pokemon completo.
 */
export function makePokemon(idVal: string | number, level: number, options: PokemonCreationOptions = {}): Pokemon | null {
  if (idVal === undefined || idVal === null || idVal === '') return null;
  let id = String(idVal).toLowerCase().trim();
  
  if (level > MAX_POKEMON_LEVEL) level = MAX_POKEMON_LEVEL;
  let base = pokemonDataProvider.getPokemonData(id);
  if (!base) {
    logger.error('Factory', `Missing Pokémon in DB: ${id}`);
    base = pokemonDataProvider.getPokemonData('pidgey');
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
  
  const nature = options.nature || NATURES[Math.floor(Math.random() * NATURES.length)] || 'Fuerte';
  const abilityList = pokemonDataProvider.getSpeciesAbilities(id);
  const ability = options.ability || abilityList[Math.floor(Math.random() * abilityList.length)] || 'Presión';
  const gender = options.gender !== undefined ? options.gender : assignGender(id);

  // Shiny Calculation
  const eventStore = useEventStore();
  let isShiny = options.isShiny;
  if (isShiny === undefined) {
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
  
  const isLegendary = LEGENDARY_POKEMON.includes(id.toLowerCase());
  const isFossil = FOSSIL_POKEMON.includes(id.toLowerCase());
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
    id, name: base.name, emoji: base.emoji, type: base.type, type2: base.type2,
    isFloating: base.isFloating,
    catchRate: base.catchRate,
    level, exp: 0, expNeeded: getExpNeeded(level),
    ivs, nature, ability, gender, isShiny,
    moves: getMovesAtLevel(id, level) as PokemonMove[],
    status: null, sleepTurns: 0, friendship: 70, vigor, maxVigor,
    heldItem,
    nickname: null,
    tags: ['ball:pokeball'],
    obtainedAt: Temporal.Now.instant().epochMilliseconds,
    obtainedMethod: options.obtainedMethod || 'wild',
    hp: 0, maxHp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
  };

  recalcPokemonStats(p);
  p.hp = p.maxHp;
  sanitizePokemon(p);
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
      // Check if already knows the move
      if (!p.moves.find(em => em && em.name === m.name)) {
        const moveData = pokemonDataProvider.getMoveData(m.name);
        const moveObj: PokemonMove = { name: m.name, pp: m.pp || moveData?.pp || 35, maxPP: m.pp || moveData?.pp || 35 };
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
