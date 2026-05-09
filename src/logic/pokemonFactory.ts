
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { NATURES } from '@/data/natures';
import { GAME_RATIOS } from '@/data/constants';
import { getMovesAtLevel } from '@/logic/pokemonUtils';
import { useEventStore } from '@/stores/events';
import { usePlayerClassStore } from '@/stores/playerClass';
import { useWarStore } from '@/stores/war';
import type { Pokemon, PokemonMove, PokemonIVs } from '@/types/pokemon';
import { getExpNeededPure, calcStatsPure } from './pokemon/statsMath.ts';
import { logger } from './utils/logger.ts';


/**
 * Probabilidades de items equipados en estado salvaje
 */
const WILD_HELD_ITEMS: Record<string, { common?: string; rare?: string }> = {
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
  const isDittoMetalPowder = p.heldItem === 'Polvo Metálico' && p.id === 'ditto';

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

  // 1. Validar Habilidad
  const validAbilities = pokemonDataProvider.getSpeciesAbilities(p.id);
  if (!p.ability || !validAbilities.includes(p.ability)) {
    logger.warn('Self-Healing', `Reparando habilidad inválida (${p.ability}) para ${p.id}`);
    p.ability = validAbilities[0] || 'Presión';
  }

  // 2. Validar Movimientos
  if (!p.moves || !Array.isArray(p.moves)) p.moves = [];
  
  // Eliminar entradas null/undefined
  p.moves = p.moves.filter(m => m !== null && m !== undefined);

  p.moves.forEach((m, idx) => {
    if (!m) return;
    // Si el nombre es inválido, intentar recuperar de DB o asignar Placaje
    if (!m.name || m.name === 'null' || m.name === 'undefined' || m.name === '???') {
      logger.warn('Self-Healing', `Movimiento ${idx} corrupto detectado en ${p.id}`);
      m.name = 'Placaje';
    }

    const moveData = pokemonDataProvider.getMoveData(m.name);
    if (!moveData) {
      logger.warn('Self-Healing', `Movimiento ${m.name} no existe en DB, reasignando a Placaje`);
      m.name = 'Placaje';
      const fallback = pokemonDataProvider.getMoveData('Placaje');
      if (fallback) {
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
      m.power = moveData.power || 0;
      m.type = moveData.type || 'normal';
      m.acc = moveData.acc || 100;
      m.cat = moveData.cat || 'physical';
      m.effect = moveData.effect;
      m.maxPP = moveData.pp || 35;
      if (m.pp === undefined) m.pp = m.maxPP;
      if (m.pp > m.maxPP) m.pp = m.maxPP;
    }
  });

  // Si no tiene movimientos, darle al menos uno
  if (p.moves.length === 0) {
    logger.warn('Self-Healing', `${p.id} no tiene movimientos, asignando Placaje`);
    const fallback = pokemonDataProvider.getMoveData('Placaje');
    if (fallback) {
      p.moves.push({
        name: 'Placaje',
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
}

/**
 * Crea un objeto Pokemon completo.
 */
export function makePokemon(id: string, level: number, options: PokemonCreationOptions = {}): Pokemon | null {
  if (!id) return null;
  id = id.toLowerCase();
  
  if (level > 100) level = 100;
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

  const _randIv = (forceReRoll = false, isGuardian = false) => {
    let val = Math.floor(Math.random() * 32);
    if (isGuardian || forceReRoll) {
      val = Math.max(val, Math.floor(Math.random() * 32));
      if (isGuardian) val = Math.max(12, val);
    }
    return Math.max(_ivFloor, val);
  };
  
  const warStore = useWarStore();
  const currentMapId = options.mapId;
  const isGuardianPotential = (currentMapId && warStore.checkGuardian && warStore.checkGuardian(currentMapId, []) !== null);
  const appliedIvBonus = false; // Simplified for now as hasDominanceIvBonus is not in warStore

  const ivs: PokemonIVs = { 
    hp: _randIv(!!appliedIvBonus, !!isGuardianPotential), 
    atk: _randIv(!!appliedIvBonus, !!isGuardianPotential), 
    def: _randIv(!!appliedIvBonus, !!isGuardianPotential), 
    spa: _randIv(!!appliedIvBonus, !!isGuardianPotential), 
    spd: _randIv(!!appliedIvBonus, !!isGuardianPotential), 
    spe: _randIv(!!appliedIvBonus, !!isGuardianPotential) 
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
  
  const vigor = Math.floor(Math.random() * 4) + 3; // 3 a 6
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
    id, name: base.name, emoji: base.emoji, type: base.type,
    catchRate: base.catchRate,
    level, exp: 0, expNeeded: getExpNeeded(level),
    ivs, nature, ability, gender, isShiny,
    moves: getMovesAtLevel(id, level) as PokemonMove[],
    status: null, sleepTurns: 0, friendship: 70, vigor,
    heldItem,
    nickname: null,
    obtainedAt: Temporal.Now.instant().epochMilliseconds,
    hp: 0, maxHp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
  };

  recalcPokemonStats(p);
  p.hp = p.maxHp;
  sanitizePokemon(p);
  return p;
}

export function levelUpPokemon(p: Pokemon): PokemonMove[] | null {
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
