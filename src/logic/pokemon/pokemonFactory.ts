import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { NATURES, toNatureId } from '@/data/battle/natures';

import { GAME_RATIOS, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { DEFAULT_FALLBACK_BASE_STAT, DEFAULT_FRIENDSHIP_VALUE } from '@/logic/constants/gameplay';
import { getMovesAtLevel, initializePokemonVigor } from '@/logic/pokemon/pokemonUtils';
import { getActivePinia } from 'pinia';
import { getSpeciesBoosts, getGlobalMultipliers, type Event as GameEvent } from '@/logic/events/eventEngine.ts';
import type { ObtainedMethod, Pokemon, Move, PokemonIVs, PokemonGender } from '@/types/pokemon/pokemon';
import { isFossilPokemonSpeciesId, isLegendaryPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getExpNeededPure, calcStatsPure } from './statsMath.ts';
import { generateIvPure } from './generationMath.ts';
import { createDefaultEvs } from './evMath.ts';
import { getItemById, type ItemId } from '@/data/inventory/items';
import { Dex, toID } from '@pkmn/sim';
import { requireAbilityId, type AbilityId } from '@/data/battle/abilities';
import { assignGender, ensurePokemonGender, isGenderlessSpeciesId } from './pokemonGender.ts';
import { canLearnMove } from './pokemonLearnset.ts';
import { getWildHeldItem } from './pokemonWildHeldItems.ts';
import { getServerInstant } from '@/logic/utils/timeUtils';

export { assignGender, ensurePokemonGender, isGenderlessSpeciesId } from './pokemonGender.ts';
export { canLearnMove, getLegalSpeciesMoves, getRandomLegalMoves, getMaxAllowedMoves } from './pokemonLearnset.ts';
export { getWildHeldItem, WILD_HELD_ITEMS } from './pokemonWildHeldItems.ts';

export function getExpNeeded(level: number): number {
  return getExpNeededPure(level);
}

export function recalcPokemonStats(p: Pokemon, bypassWhitelist = false): void {
  if (!p) return;
  
  const base = pokemonDataProvider.getPokemonData(p.id, bypassWhitelist);
  if (!base) return;
  
  const natureDef = p.nature ? pokemonDataProvider.getNatureData(p.nature) : null;
  const natureData = natureDef ? { up: natureDef.up, down: natureDef.down } : { up: null, down: null };
  const isDittoMetalPowder = p.heldItem === 'metalpowder' && p.id === 'ditto';
  const isDittoQuickPowder = p.heldItem === 'quickpowder' && p.id === 'ditto';

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
      hp: base.hp || DEFAULT_FALLBACK_BASE_STAT,
      atk: base.atk || DEFAULT_FALLBACK_BASE_STAT,
      def: base.def || DEFAULT_FALLBACK_BASE_STAT,
      spa: base.spa,
      spd: base.spd,
      spe: base.spe
    },
    natureData,
    isDittoMetalPowder,
    p.evs,
    isDittoQuickPowder
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
      Reflect.set(p, s, DEFAULT_FALLBACK_BASE_STAT);
    }
  });

  if (p.hp !== undefined && p.hp !== null) {
    p.hp = Math.min(p.hp, p.maxHp);
  }

  validatePokemon(p, bypassWhitelist);
}

/**
 * Validates Pokémon data to ensure all mandatory fields are present and legal.
 * Throws explicit descriptive errors on any data corruption instead of patching.
 */
export function validatePokemon(p: Pokemon, bypassWhitelist = false): void {
  if (!p) throw new Error('[pokemonFactory] Intento de validar un Pokémon nulo o indefinido.');
  if (!p.volatileCounters) p.volatileCounters = {};

  const bypass = bypassWhitelist || Boolean(p.isIllegal) || (typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__?.isDeterministicSimulation || window.__VITE_DEBUG__?.isScriptedReplayMode));

  // 0. Sincronizar Datos Base (Tipos y Levitación) desde DB para paridad Wiki (Datos volátiles en memoria)
  const base = pokemonDataProvider.getPokemonData(p.id, true);
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
    const normAbility = requireAbilityId(toID(p.ability));
    const abilityData = Dex.abilities.get(normAbility);
    if (bypass && abilityData.exists) {
      p.ability = normAbility;
    } else {
      const speciesData = Dex.species.get(p.id);
      const validAbilities: AbilityId[] = speciesData.exists 
        ? Object.values(speciesData.abilities).map(a => requireAbilityId(toID(a))) 
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

    if (!m.id) {
      throw new Error(`[pokemonFactory] Movimiento corrupto o ID inválido ("${m.id}") detectado en la posición ${idx} de ${p.id} (UID: ${p.uid}).`);
    }

    const moveData = pokemonDataProvider.getMoveData(m.id);
    if (!moveData) {
      throw new Error(`[pokemonFactory] Movimiento "${m.id}" no encontrado o no existe en la base de datos para ${p.id} (UID: ${p.uid}).`);
    } else {
      // Validar legalidad del movimiento para la especie usando el Dex de Showdown
      if (!bypass && !canLearnMove(p.id, m.id, p.level)) {
        throw new Error(`[pokemonFactory] Movimiento ilegal "${m.id}" (${moveData.name}) para especie ${p.id} al nivel ${p.level} (UID: ${p.uid}).`);
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
  ensurePokemonGender(p);
  const spec = Dex.species.get(toID(p.id));
  const isGenderless = spec?.gender === 'N' || isGenderlessSpeciesId(p.id);
  if (!p.gender && !isGenderless) {
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
      p.nature = toNatureId(normNature);
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
    if (p.exp < 0) {
      throw new Error(`[pokemonFactory] Experiencia negativa no permitida para nivel máximo en ${p.id} (UID: ${p.uid}).`);
    }
  } else {
    const maxExpAllowed = p.expNeeded - 1;
    if (p.exp > maxExpAllowed) {
      throw new Error(`[pokemonFactory] La experiencia de ${p.id} (UID: ${p.uid}) supera el límite de su nivel (${p.exp}/${p.expNeeded}).`);
    }
  }

  const cleanIdForCheck = p.id;
  const isLegendary = isLegendaryPokemonSpeciesId(cleanIdForCheck);
  const isFossil = isFossilPokemonSpeciesId(cleanIdForCheck);
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
  gender?: PokemonGender;
  heldItem?: ItemId | null;
  heldItemRates?: { commonRate: number; rareRate: number; forceHeldChance?: number };
  ivFloor?: number;
  mapId?: string;
  shinyMultiplier?: number;
  forceGender?: PokemonGender;
  isGuardian?: boolean;
  obtainedMethod?: ObtainedMethod;
  isNpcEgg?: boolean;
  bypassWhitelist?: boolean;
}

/**
 * Crea un objeto Pokemon completo.
 */
export function makePokemon(idVal: string | number, level: number, options: PokemonCreationOptions = {}): Pokemon | null {
  if (idVal === undefined || idVal === null || idVal === '') return null;
  const id = requirePokemonSpeciesId(toID(String(idVal)));
  
  if (level > MAX_POKEMON_LEVEL) level = MAX_POKEMON_LEVEL;
  const bypass = options.bypassWhitelist || false;
  const base = pokemonDataProvider.getPokemonData(id, bypass);
  if (!base) {
    throw new Error(`[pokemonFactory] Missing Pokémon in DB: ${id}`);
  }

  // 1. IV Floor from Class (Cazabichos)
  const piniaActive = getActivePinia();
  let _ivFloor = options.ivFloor || 0;
  if (piniaActive?.state?.value?.playerClass) {
    const classState = piniaActive.state.value.playerClass as { playerClass?: string; classData?: { captureStreak?: number } };
    if (classState.playerClass === 'cazabichos') {
      _ivFloor = Math.max(_ivFloor, classState.classData?.captureStreak || 0);
    }
  }

  function _randIv(floor: number = 0, forceReRoll: boolean = false, isGuardian: boolean = false): number {
    return generateIvPure(Math.random, floor, forceReRoll, isGuardian);
  }
  
  const isGuardianPotential = Boolean(options.mapId && (piniaActive?.state?.value?.war as { activeFactions?: unknown } | undefined)?.activeFactions);

  const ivs: PokemonIVs = { 
    hp: _randIv(_ivFloor, false, !!isGuardianPotential), 
    atk: _randIv(_ivFloor, false, !!isGuardianPotential), 
    def: _randIv(_ivFloor, false, !!isGuardianPotential), 
    spa: _randIv(_ivFloor, false, !!isGuardianPotential), 
    spd: _randIv(_ivFloor, false, !!isGuardianPotential), 
    spe: _randIv(_ivFloor, false, !!isGuardianPotential) 
  };
  
  const nature = options.nature ? toNatureId(toID(options.nature)) : NATURES[Math.floor(Math.random() * NATURES.length)] || 'serious';
  const abilityList = pokemonDataProvider.getSpeciesAbilities(id);
  const selectedAbility = options.ability ? toID(options.ability) : abilityList[Math.floor(Math.random() * abilityList.length)];
  if (!selectedAbility) throw new Error(`[pokemonFactory] No ability available for species ${id}`);
  const ability = requireAbilityId(selectedAbility);
  const gender = options.gender !== undefined ? options.gender : assignGender(id);

  // Shiny Calculation
  let isShiny = options.isShiny;
  if (isShiny === undefined) {
    const debugObj = typeof window !== 'undefined' ? (window.__VITE_DEBUG__ as { forceShiny100?: boolean; shinyRateOverride?: number | null } | undefined) : undefined;
    const isDebugShiny = debugObj?.forceShiny100 || debugObj?.shinyRateOverride === 1;
    
    if (isDebugShiny) {
      isShiny = true;
    } else {
      const baseShinyRate = (debugObj?.shinyRateOverride && debugObj.shinyRateOverride > 1) 
        ? debugObj.shinyRateOverride 
        : GAME_RATIOS.shinyRate;
      let totalBonusMult = 0;
      
      // Event Bonus
      const activeEvents = (piniaActive?.state?.value?.events as { activeEvents?: GameEvent[] } | undefined)?.activeEvents || [];
      const speciesBonuses = getSpeciesBoosts(activeEvents, id);
      if (speciesBonuses && speciesBonuses.shiny) {
        totalBonusMult += (speciesBonuses.shiny - 1);
      }
      
      // Global Multipliers
      const globalMults = getGlobalMultipliers(activeEvents);
      const finalMult = Math.max(1, 1 + totalBonusMult);
      const finalShinyRate = Math.max(1, Math.floor(baseShinyRate / (finalMult * (globalMults.shiny || 1))));
      
      isShiny = Math.random() < (1 / finalShinyRate);
    }
  }

  const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2,9) + Temporal.Now.instant().epochMilliseconds.toString(36);

  let heldItem: ItemId | null = options.heldItem || null;
  if (!heldItem) {
    heldItem = getWildHeldItem(id, options.heldItemRates);
  }

  const p: Pokemon = {
    uid: getUidStr(),
    id, species: id, name: base.name, type: base.type, type2: base.type2,
    isFloating: base.isFloating,
    catchRate: base.catchRate,
    level, exp: 0, expNeeded: getExpNeeded(level),
    ivs, nature, ability, gender, isShiny,
    moves: getMovesAtLevel(id, level, bypass) as Move[],
    status: '', sleepTurns: 0, friendship: DEFAULT_FRIENDSHIP_VALUE,
    vigor: 0, maxVigor: 0,
    heldItem,
    nickname: null,
    tags: ['ball:pokeball'],
    obtainedAt: getServerInstant().epochMilliseconds,
    obtainedMethod: options.obtainedMethod ?? 'wild',
    evs: createDefaultEvs(),
    hp: 0, maxHp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
  };

  initializePokemonVigor(p, options.obtainedMethod, options.isNpcEgg);
  recalcPokemonStats(p, bypass);
  p.hp = p.maxHp;
  validatePokemon(p, bypass);
  return p;
}

export function levelUpPokemon(p: Pokemon): Move[] | null {
  if (p.level >= MAX_POKEMON_LEVEL) return [];
  // Everstone block
  if (p.heldItem === 'everstone') return null;

  p.level++;
  if (p.level >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = 0;
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
  const pendingMoves: Move[] = [];
  if (base && base.learnset) {
    (base.learnset).filter(m => m.lv === p.level).forEach(m => {
      if (!m.id) throw new Error(`[levelUpPokemon] El movimiento en el learnset no tiene un ID válido.`);
      // Check if already knows the move by ID
      if (!p.moves.find(em => em && em.id === m.id)) {
        const moveData = pokemonDataProvider.getMoveData(m.id);
        if (!moveData) throw new Error(`[levelUpPokemon] No se encontró información para el movimiento: ${m.id}`);
        const moveObj: Move = { 
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
