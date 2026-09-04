/**
 * src/logic/pokemon/pokemonMath.ts
 *
 * Pure utility functions for Pokémon data interpretation.
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 *
 * Extracted from pokemonUtils.ts for testability
 * with the native Node.js 26+ test runner.
 *
 * @module pokemonMath
 */

import type { MoveBaseData } from '../../types/system/database.ts';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { MOVE_TRANSLATIONS_ES } from '../../data/battle/moves.ts';
import { TYPE_EFFECTIVENESS_THRESHOLDS } from '../constants/gameplay.ts';

// ── Type Effectiveness ────────────────────────────────────────────────────────

/**
 * Returns a human-readable message for a type-effectiveness multiplier.
 * Returns null for neutral (1×) effectiveness.
 */
export function getTypeEffectivenessMsg(eff: number): string | null {
  if (eff === TYPE_EFFECTIVENESS_THRESHOLDS.IMMUNE)    return '¡No afecta!';
  if (eff >= TYPE_EFFECTIVENESS_THRESHOLDS.SUPER_EFFECTIVE)     return '¡Es muy eficaz!';
  if (eff <= TYPE_EFFECTIVENESS_THRESHOLDS.NOT_VERY_EFFECTIVE)   return 'No es muy eficaz...';
  return null;
}

// ── Move Description ──────────────────────────────────────────────────────────



/**
 * Returns a human-readable description for a move, based on its MoveBaseData.
 *
 * When `md` is provided, the pokemonDataProvider is never called.
 * This makes the function fully pure and testable in Node.js 26+ natively.
 */
export function getMoveDescriptionPure(_name: string, md: MoveBaseData | null): string {
  if (!md) return 'Causa daño al oponente sin efectos secundarios adicionales.';

  if (md.ohko)                          return 'Fulmina al enemigo de un solo golpe si acierta.';
  if (md.halfHP)                        return 'Reduce a la mitad los PS actuales del oponente.';
  if (md.endeavor)                      return 'Iguala los PS actuales del objetivo con los del usuario. Falla si tiene menos.';
  if (md.recoil)                        return 'El usuario recibe daño por retroceso al golpear.';
  if (md.drain && md.cat !== 'status')  return 'Restaura PS al usuario según el daño causado.';
  if (md.selfKO)                        return 'El usuario se debilita para causar un daño masivo.';
  if (md.priority && md.priority > 0)   return 'Ataque rápido que siempre golpea primero.';
  if (md.levelDmg)                      return 'Causa un daño igual al nivel del usuario.';
  if (md.counter)                       return 'Devuelve al rival el doble del daño físico recibido este turno.';

  const effectText = Array.isArray(md.effect)
    ? md.effect.map(effect => effect.text).find(Boolean)
    : md.effect?.text;
  if (effectText) return effectText;

  try {
    if (!md.id) {
      throw new Error("ID de movimiento no proporcionado en getMoveDescriptionPure");
    }
    const cleanId = toID(md.id);
    const translated = ((MOVE_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string }>)[cleanId] || {}); // open-record: Generic key-value data dictionary container
    if (translated.desc) return translated.desc;

    const move = Dex.forGen(ACTIVE_GENERATION).moves.get(cleanId);
    if (move && move.exists) {
      return move.desc || move.shortDesc || 'Causa daño al oponente sin efectos secundarios adicionales.';
    }
  } catch {
    // Graceful fallback
  }

  if (md.cat === 'status') return 'Un movimiento que causa un efecto de estado o alteración.';
  return 'Causa daño al oponente sin efectos secundarios adicionales.';
}
