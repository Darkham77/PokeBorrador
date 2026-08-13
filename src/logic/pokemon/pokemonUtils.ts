
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getSpeciesHistory } from '@/logic/pokemon/evolutionEngine';
export { getPokemonTier } from '@/logic/pokemon/tierEngine';
import type { Pokemon, PokemonMove, PokemonIVs } from '@/types/pokemon/pokemon';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { MOVE_TRANSLATIONS_ES, type MoveCategory } from '@/data/battle/moves';
import {
  MAX_LEARNED_MOVES_SLOTS,
  ROCKET_SELL_LEVEL_MULTIPLIER,
  MAX_TOTAL_IVS_STAT_SUM,
  ROCKET_SELL_IV_BONUS_CAP,
  ROCKET_SELL_CUT_MULTIPLIER,
  TYPE_EFFECTIVENESS_THRESHOLDS,
  DEFAULT_ACCURACY_BASE_STAT
} from '@/logic/constants/gameplay';
import { isLegendaryPokemonSpeciesId, isFossilPokemonSpeciesId } from '@/data/pokemon/pokedex';

/** Default maximum vigor value for standard non-legendary Pokémon. */
export const DEFAULT_MAX_VIGOR = 10;

/** Maximum IV roll bound exclusive (0 to 31 inclusive). */
export const MAX_IV_VALUE_EXCLUSIVE = 32;

function isLegendaryOrFossil(pokemonId: string): boolean {
  if (!pokemonId) return false;
  const cleanId = toID(pokemonId);
  return isLegendaryPokemonSpeciesId(cleanId) || isFossilPokemonSpeciesId(cleanId);
}

export function getVigor(p: Pokemon | null | undefined): number {
  if (!p) return 0;
  if (isLegendaryOrFossil(p.id)) return 0;
  return p.vigor !== undefined ? p.vigor : DEFAULT_MAX_VIGOR;
}

export function getMaxVigor(p: Pokemon | null | undefined): number {
  if (!p) return 0;
  if (isLegendaryOrFossil(p.id)) return 0;
  return p.maxVigor !== undefined ? p.maxVigor : DEFAULT_MAX_VIGOR;
}

/**
 * Calculates the total power of a pokemon (BST + total IVs).
 */
export function calculateTotalPower(p: Pokemon): number {
  if (!p) return 0;
  const species = pokemonDataProvider.getPokemonData(p.id);
  const bst = species ? ((species.hp || 0) + (species.atk || 0) + (species.def || 0) + (species.spa || 0) + (species.spd || 0) + (species.spe || 0)) : 0;
  const ivs = p.ivs;
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
  return bst + totalIvs;
}

/**
 * Generates random IVs (0 to 31) for all stats.
 */
export function generateRandomIVs(): PokemonIVs {
  return {
    hp: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    atk: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    def: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    spa: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    spd: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    spe: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE)
  };
}

/**
 * Calculates the price for selling a pokemon to the Black Market (Team Rocket).
 */
export function calculateRocketSellPrice(p: Pokemon): number {
  if (!p) return 0;
  const ivs = p.ivs;
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
  // Formula: (Level * 50 + (Total IVs / 186) * 500) * 0.8 (Rocket Cut)
  return Math.floor((p.level * ROCKET_SELL_LEVEL_MULTIPLIER + (totalIvs / MAX_TOTAL_IVS_STAT_SUM) * ROCKET_SELL_IV_BONUS_CAP) * ROCKET_SELL_CUT_MULTIPLIER);
}

/**
 * Determina si un Pokémon está en un estado forzado/bloqueado de ataque (lockedmove, twoturnmove, thrash).
 */
export function isPokemonLocked(p: Pokemon | null | undefined): boolean {
  if (!p) return false;
  const isLockedMove = !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0);
  const isTwoTurnActive = !!(p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0);
  const isThrashLocked = !!(p.thrashTurns && p.thrashTurns > 0);
  return isLockedMove || isTwoTurnActive || isThrashLocked;
}
import type { LearnsetMove, MoveBaseData } from '@/types/system/database';

/**
 * Get moves a pokemon knows at a given level (up to 4, most recent)
 */
export function getMovesAtLevel(id: string, level: number, bypassWhitelist = false): PokemonMove[] {
  const history = getSpeciesHistory(id);
  const allPotentialMoves: LearnsetMove[] = [];
  const seenNames = new Set<string>();

  history.forEach(spId => {
    const db = pokemonDataProvider.getPokemonData(spId, bypassWhitelist);
    if (db && db.learnset) {
      (db.learnset as LearnsetMove[]).forEach(m => {
        if (m.lv <= level) {
          allPotentialMoves.push(m);
        }
      });
    }
  });


  allPotentialMoves.sort((a, b) => a.lv - b.lv);

  const uniqueMoves: LearnsetMove[] = [];
  for (let i = allPotentialMoves.length - 1; i >= 0; i--) {
    const m = allPotentialMoves[i];
    if (m && !seenNames.has(m.name)) {
      uniqueMoves.unshift(m);
      seenNames.add(m.name);
    }
  }

  const last4 = uniqueMoves.slice(-MAX_LEARNED_MOVES_SLOTS);
  return last4.map(m => {
    if (!m.id) throw new Error(`[getMovesAtLevel] El movimiento en el learnset no tiene un ID válido.`);
    const moveData = pokemonDataProvider.getMoveData(m.id)
    if (!moveData) throw new Error(`[getMovesAtLevel] No se encontró información para el movimiento: ${m.id}`);
    return { 
      id: m.id,
      name: moveData.name || '???', 
      pp: m.pp || moveData.pp, 
      maxPP: m.pp || moveData.pp,
      type: moveData.type || 'normal',
      power: moveData.power || 0,
      acc: moveData.acc || DEFAULT_ACCURACY_BASE_STAT,
      cat: moveData.cat as MoveCategory,
      priority: moveData.priority,
      effect: moveData.effect,
      recoil: moveData.recoil,
      selfKO: moveData.selfKO,
      drain: moveData.drain,
      hits: moveData.hits,
      fixedDmg: moveData.fixedDmg,
      ohko: moveData.ohko,
      halfHP: moveData.halfHP,
      endeavor: moveData.endeavor,
      levelDmg: moveData.levelDmg,
      counter: moveData.counter,
      turns: moveData.turns,
      sound: moveData.sound
    };
  });
}


/**
 * Get type effectiveness message
 */
export function getTypeEffectivenessMsg(eff: number): string | null {
  if (eff === TYPE_EFFECTIVENESS_THRESHOLDS.IMMUNE) return '¡No afecta!';
  if (eff >= TYPE_EFFECTIVENESS_THRESHOLDS.SUPER_EFFECTIVE) return '¡Es muy eficaz!';
  if (eff <= TYPE_EFFECTIVENESS_THRESHOLDS.NOT_VERY_EFFECTIVE) return 'No es muy eficaz...';
  return null;
}

/**
 * Get display description for a move based on its effect
 */
export function getMoveDescription(id: string, mdProvided?: MoveBaseData | null): string {
  let md = mdProvided;
  if (!md) {
    if (!id) throw new Error('[getMoveDescription] El ID de movimiento no es válido.');
    try {
      md = pokemonDataProvider.getMoveData(id);
    } catch {
      // ignore
    }
  }
  if (!md) {
    throw new Error(`[getMoveDescription] No se encontró el movimiento con ID o nombre: "${id}"`);
  }
  
  if (md.ohko) return "Fulmina al enemigo de un solo golpe si acierta.";
  if (md.halfHP) return "Reduce a la mitad los PS actuales del oponente.";
  if (md.endeavor) return "Iguala los PS actuales del objetivo con los del usuario. Falla si tiene menos.";
  if (md.recoil) return "El usuario recibe daño por retroceso al golpear.";
  if (md.drain && md.cat !== 'status') return "Restaura PS al usuario según el daño causado.";
  if (md.selfKO) return "El usuario se debilita para causar un daño masivo.";
  if (md.priority && md.priority > 0) return "Ataque rápido que siempre golpea primero.";
  if (md.levelDmg) return "Causa un daño igual al nivel del usuario.";
  if (md.counter) return "Devuelve al rival el doble del daño físico recibido este turno.";
  
  const effectText = Array.isArray(md.effect)
    ? md.effect.map(effect => effect.text).find(Boolean)
    : md.effect?.text;
  if (effectText) return effectText;

  const cleanId = toID(md.id || (mdProvided ? '' : id));
  if (cleanId) {
    try {
      const translated = ((MOVE_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string }>)[cleanId] || {}); // open-record
      if (translated.desc) return translated.desc;

      const move = Dex.forGen(ACTIVE_GENERATION).moves.get(cleanId);
      if (move && move.exists) {
        return move.desc || move.shortDesc || "Causa daño al oponente sin efectos secundarios adicionales.";
      }
    } catch {
      // Graceful fallback
    }
  }

  if (md.cat === 'status') return "Un movimiento que causa un efecto de estado o alteración.";
  return "Causa daño al oponente sin efectos secundarios adicionales.";
}
