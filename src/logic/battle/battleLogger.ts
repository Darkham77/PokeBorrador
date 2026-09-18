
/**
 * Módulo de Registro de Combate (Battle Logger)
 * Encargado de procesar y estandarizar los logs de batalla.
 */

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getItemById } from '@/data/inventory/items';
import { PLAYER_CLASSES, isPlayerClassId } from '@/data/player/playerClasses';
import { logger } from '../utils/logger.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleLog, BattleSource, BattleSide } from '@/types/battle/battle';

interface LogContext {
  gs: {
    state: {
      team: Pokemon[]
      playerClass?: string | null
      avatar_style?: string | null
    }
  }
  activeBattle?: {
    trainerSprite?: string | null
    enemy?: Pokemon | null
  } | null
  attackerSide?: BattleSide | null
}

// Re-use exported types

let nextLogSequenceId = 0; // singleton-ok: Singleton instance state container

/**
 * Procesa un mensaje de log y devuelve el objeto listo para la cola del store.
 */
function resolvePlayerAvatarIcon(gs: LogContext['gs']): string {
  const pClass = gs.state.playerClass;
  const cls = typeof pClass === 'string' && isPlayerClassId(pClass) ? PLAYER_CLASSES[pClass] : null;
  const spriteId = cls?.avatarSpriteId || gs.state.avatar_style || 'entrenador';
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'avatar' });
}

function resolveStringSourceIcon(source: string): { icon: string; iconType: string } {
  const isEmoji = /^\p{Emoji}/u.test(source) && source.length <= 4;
  if (isEmoji) {
    return { icon: source, iconType: 'emoji' };
  }
  let item = null;
  try {
    item = getItemById(source);
  } catch {
    logger.warn('BattleLogger', `La fuente de texto "${source}" no es un ID de item registrado. Se intentará cargar como sprite directo.`);
  }
  const spriteId = (item && item.sprite) ? item.sprite : source;
  return {
    icon: getAssetUrl(ASSET_TYPES.ITEM, spriteId),
    iconType: 'item'
  };
}

function resolveLogIconAndType(msg: string, source: BattleSource, ctx: LogContext): { icon: string | null; iconType: string | null } {
  if (msg.startsWith('DEBUG:')) {
    return { icon: '⚙️', iconType: 'emoji' };
  }
  if (!source) {
    logger.warn('BattleLogger', `Log sin fuente detectado: "${msg}". Se recomienda pasar un Pokémon o 'player'/'enemy_trainer'.`);
    return { icon: null, iconType: null };
  }
  if (source === 'player') {
    return { icon: resolvePlayerAvatarIcon(ctx.gs), iconType: 'player_avatar' };
  }
  if (source === 'enemy_trainer') {
    const spriteId = ctx.activeBattle?.trainerSprite || 'entrenador';
    return { icon: getAssetUrl(ASSET_TYPES.TRAINER, spriteId), iconType: 'trainer' };
  }
  if (typeof source === 'object') {
    const poke = source as Partial<Pokemon>;
    if (poke.id) {
      return {
        icon: getAssetUrl(ASSET_TYPES.POKEMON, poke.id, { isShiny: poke.isShiny }),
        iconType: 'pokemon'
      };
    }
  }
  if (typeof source === 'string') {
    return resolveStringSourceIcon(source);
  }
  return { icon: null, iconType: null };
}

function resolveLogSide(source: BattleSource, ctx: LogContext): BattleSide | null {
  const { gs, activeBattle, attackerSide } = ctx;
  if (source === 'player' || (source && typeof source === 'object' && gs.state.team.some((p) => p && p.uid === (source as Pokemon).uid))) {
    return 'player';
  }
  if (source === 'enemy_trainer' || (source && typeof source === 'object' && (source as Pokemon).uid === activeBattle?.enemy?.uid)) {
    return 'enemy';
  }
  return attackerSide || 'enemy';
}

/**
 * Formatea una entrada de log de batalla resolviendo automáticamente iconos y alineación lateral.
 *
 * @param {string} msg Mensaje
 * @param {string} type Tipo de log (log-info, log-player, log-enemy, log-error)
 * @param {Object|string} source Fuente del sprite (Pokemon, 'player', 'enemy_trainer', o nombre de ítem)
 * @param {Object} ctx Contexto necesario (gs, activeBattle, attackerSide)
 */
export function formatBattleLog(msg: string, type: string, source: BattleSource, ctx: LogContext): BattleLog {
  const { icon, iconType } = resolveLogIconAndType(msg, source, ctx);
  const side = resolveLogSide(source, ctx);

  return {
    id: `${Temporal.Now.instant().epochMilliseconds}-${++nextLogSequenceId}`,
    msg,
    type,
    side,
    icon,
    iconType
  };
}
