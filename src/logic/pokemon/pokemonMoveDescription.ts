/**
 * src/logic/pokemon/pokemonMoveDescription.ts
 *
 * Move description resolver and special mechanics text formatter.
 */

import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { toID } from '@/logic/utils/strings.ts';
import { MOVE_TRANSLATIONS_ES } from '@/data/battle/moves';
import type { MoveBaseData } from '@/types/system/database';

function resolveMoveBaseData(id: string, mdProvided?: MoveBaseData | null): MoveBaseData {
  if (mdProvided) return mdProvided;
  if (!id) throw new Error('[getMoveDescription] El ID de movimiento no es válido.');
  try {
    return pokemonDataProvider.getMoveData(id);
  } catch {
    try {
      const canonicalId = pokemonDataProvider.getMoveIdBySpanishName(id);
      return pokemonDataProvider.getMoveData(canonicalId);
    } catch (_err) { // catch-ok: Fallback to loud throw below if Spanish lookup fails
      throw new Error(`[getMoveDescription] No se encontró el movimiento con ID o nombre: "${id}"`, { cause: _err });
    }
  }
}

function getSpecialMechanicDescription(md: MoveBaseData): string | null {
  if (md.ohko) return "Fulmina al enemigo de un solo golpe si acierta.";
  if (md.halfHP) return "Reduce a la mitad los PS actuales del oponente.";
  if (md.endeavor) return "Iguala los PS actuales del objetivo con los del usuario. Falla si tiene menos.";
  if (md.recoil) return "El usuario recibe daño por retroceso al golpear.";
  if (md.drain && md.cat !== 'status') return "Restaura PS al usuario según el daño causado.";
  if (md.selfKO) return "El usuario se debilita para causar un daño masivo.";
  if (md.priority && md.priority > 0) return "Ataque rápido que siempre golpea primero.";
  if (md.levelDmg) return "Causa un daño igual al nivel del usuario.";
  if (md.counter) return "Devuelve al rival el doble del daño físico recibido este turno.";
  return null;
}

function getMoveEffectOrTranslationText(md: MoveBaseData): string | null {
  const effectText = Array.isArray(md.effect)
    ? md.effect.map(effect => effect.text).find(Boolean)
    : md.effect?.text;
  if (effectText) return effectText;

  const cleanId = toID(md.id);
  if (cleanId) {
    const translated = ((MOVE_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string }>)[cleanId] || {}); // open-record: Generic key-value data dictionary container
    if (translated.desc) return translated.desc;
  }
  return null;
}

/**
 * Get display description for a move based on its effect
 */
export function getMoveDescription(id: string, mdProvided?: MoveBaseData | null): string {
  const md = resolveMoveBaseData(id, mdProvided);
  
  const specialDesc = getSpecialMechanicDescription(md);
  if (specialDesc) return specialDesc;

  const effectOrTranslation = getMoveEffectOrTranslationText(md);
  if (effectOrTranslation) return effectOrTranslation;

  if (md.cat === 'status') return "Un movimiento que causa un efecto de estado o alteración.";
  return "Causa daño al oponente sin efectos secundarios adicionales.";
}
