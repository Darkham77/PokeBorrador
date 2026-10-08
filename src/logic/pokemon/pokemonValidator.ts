import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { isNatureId, toNatureId } from '@/data/battle/natures';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { DEFAULT_MAX_PP_FALLBACK } from '@/logic/constants/gameplay';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import { isFossilPokemonSpeciesId, isLegendaryPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getItemById } from '@/data/inventory/items';
import { toID } from '@/logic/utils/strings.ts';
import { requireAbilityId, type AbilityId } from '@/data/battle/abilities';
import { ensurePokemonGender, isGenderlessSpeciesId } from './pokemonGender.ts';
import { canLearnMove } from './pokemonLearnset.ts';

function validateSpeciesBaseData(p: Pokemon): void {
  const base = pokemonDataProvider.getPokemonData(p.id, true);
  if (base) {
    const isCastformForm = p.id === 'castform' && p.form && p.form !== 'normal';
    if (!isCastformForm) {
      p.type = base.type;
      p.type2 = base.type2;
    }
    p.isFloating = base.isFloating;
  } else {
    throw new Error(`[pokemonFactory] El Pokémon "${p.id}" (UID: ${p.uid}) no existe en la base de datos de especies.`);
  }
}

function validateAbility(p: Pokemon, bypass: boolean): void {
  if (p.ability) {
    const normAbility = requireAbilityId(toID(p.ability));
    if (bypass) {
      p.ability = normAbility;
    } else {
      const validAbilities: AbilityId[] = pokemonDataProvider.getSpeciesAbilities(p.id).map(a => requireAbilityId(toID(a)));
      if (validAbilities.includes(normAbility)) {
        p.ability = normAbility;
      } else {
        throw new Error(`[pokemonFactory] Habilidad inválida o ilegal (${p.ability}) para especie ${p.id} (UID: ${p.uid}).`);
      }
    }
  } else {
    throw new Error(`[pokemonFactory] El Pokémon ${p.id} (UID: ${p.uid}) no tiene habilidad definida.`);
  }
}

function validateHeldItem(p: Pokemon): void {
  if (p.heldItem) {
    const itemData = getItemById(p.heldItem);
    p.heldItem = itemData.id;
  }
}

function syncMoveDetails(m: Move, moveData: NonNullable<ReturnType<typeof pokemonDataProvider.getMoveData>>): void {
  m.id = moveData.id;
  m.name = moveData.name;
  m.power = moveData.power || 0;
  m.type = moveData.type || 'normal';
  m.acc = moveData.acc || 100;
  m.cat = moveData.cat || 'physical';
  m.effect = moveData.effect;
  const basePP = moveData.pp || DEFAULT_MAX_PP_FALLBACK;
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

function validateAndSyncMoves(p: Pokemon, bypass: boolean): void {
  if (!p.moves || !Array.isArray(p.moves)) {
    throw new Error(`[pokemonFactory] El Pokémon ${p.id} (UID: ${p.uid}) no tiene una lista de movimientos válida.`);
  }

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
      if (!bypass && !canLearnMove(p.id, m.id, p.level)) {
        throw new Error(`[pokemonFactory] Movimiento ilegal "${m.id}" (${moveData.name}) para especie ${p.id} al nivel ${p.level} (UID: ${p.uid}).`);
      }
      syncMoveDetails(m, moveData);
    }
  });

  if (p.moves.length === 0) {
    throw new Error(`[pokemonFactory] El Pokémon ${p.id} (UID: ${p.uid}) tiene 0 movimientos configurados.`);
  }
}

function validateHealthAndNature(p: Pokemon): void {
  ensurePokemonGender(p);
  const isGenderless = isGenderlessSpeciesId(p.id);
  if (!p.gender && !isGenderless) {
    throw new Error(`[pokemonFactory] Pokémon ${p.id} (UID: ${p.uid}) no tiene género definido.`);
  }
  if (p.hp === undefined || isNaN(p.hp)) {
    throw new Error(`[pokemonFactory] Pokémon ${p.id} (UID: ${p.uid}) tiene HP inválido o ausente.`);
  }
  if (p.hp > p.maxHp) {
    throw new Error(`[pokemonFactory] El HP de ${p.id} (UID: ${p.uid}) supera su HP máximo (${p.hp}/${p.maxHp}).`);
  }

  if (p.nature) {
    const normNature = toID(p.nature);
    if (isNatureId(normNature)) {
      p.nature = toNatureId(normNature);
    } else {
      throw new Error(`[pokemonFactory] Naturaleza inválida o inexistente "${p.nature}" para ${p.id} (UID: ${p.uid}).`);
    }
  } else {
    throw new Error(`[pokemonFactory] Naturaleza ausente para ${p.id} (UID: ${p.uid}).`);
  }
}

function validateLevelAndExp(p: Pokemon): void {
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
}

function validateVigor(p: Pokemon): void {
  const cleanIdForCheck = p.id;
  const isLegendary = isLegendaryPokemonSpeciesId(cleanIdForCheck);
  const isFossil = isFossilPokemonSpeciesId(cleanIdForCheck);
  if (isLegendary || isFossil) {
    return;
  }
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

/**
 * Validates Pokémon data to ensure all mandatory fields are present and legal.
 * Throws explicit descriptive errors on any data corruption instead of patching.
 */
export function validatePokemon(p: Pokemon, bypassWhitelist = false): void {
  if (!p) throw new Error('[pokemonFactory] Intento de validar un Pokémon nulo o indefinido.');
  if (!p.volatileCounters) p.volatileCounters = {};

  const isDebugEnv = typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'));
  const bypass = bypassWhitelist || Boolean(p.isIllegal) || isDebugEnv;

  validateSpeciesBaseData(p);
  validateAbility(p, bypass);
  validateHeldItem(p);
  validateAndSyncMoves(p, bypass);
  validateHealthAndNature(p);
  validateLevelAndExp(p);
  validateVigor(p);
}
