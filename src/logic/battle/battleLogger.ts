/**
 * Battle Logger Module
 * Responsible for processing and standardizing battle logs.
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
      team: Pokemon[];
      playerClass?: string | null;
      avatar_style?: string | null;
    };
  };
  activeBattle?: {
    trainerSprite?: string | null;
    enemy?: Pokemon | null;
  } | null;
  attackerSide?: BattleSide | null;
}

// Re-use exported types

let nextLogSequenceId = 0; // singleton-ok: Singleton instance state container

/**
 * Resolves the player avatar icon from game store state.
 */
function resolvePlayerAvatarIcon(gs: LogContext['gs']): string {
  const pClass = gs.state.playerClass;
  const cls = typeof pClass === 'string' && isPlayerClassId(pClass) ? PLAYER_CLASSES[pClass] : null;
  const spriteId = cls?.avatarSpriteId || gs.state.avatar_style || 'entrenador';
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'avatar' });
}

function resolveStringSourceIcon(source: string): { icon: string; iconType: string } {
  if (source === 'egg') {
    return {
      icon: getAssetUrl(ASSET_TYPES.POKEMON, 'egg'),
      iconType: 'egg'
    };
  }
  if (source === 'npc_egg') {
    return {
      icon: getAssetUrl(ASSET_TYPES.POKEMON, 'egg'),
      iconType: 'npc_egg'
    };
  }
  const isEmoji = /^\p{Emoji}/u.test(source) && source.length <= 4;
  if (isEmoji) {
    return { icon: source, iconType: 'emoji' };
  }
  let item = null;
  try {
    item = getItemById(source);
  } catch {
    logger.error(
      'BattleLogger',
      `La fuente de texto "${source}" no es un ID de item registrado en el catálogo.`
    );
  }
  const spriteId = item && item.sprite ? item.sprite : source;
  return {
    icon: getAssetUrl(ASSET_TYPES.ITEM, spriteId),
    iconType: 'item'
  };
}

function resolveLogIconAndType(
  msg: string,
  source: BattleSource,
  ctx: LogContext
): { icon: string | null; iconType: string | null } {
  if (msg.startsWith('DEBUG:')) {
    return { icon: '⚙️', iconType: 'emoji' };
  }
  if (!source) {
    logger.warn(
      'BattleLogger',
      `Log sin fuente detectado: "${msg}". Se recomienda pasar un Pokémon o 'player'/'enemy_trainer'.`
    );
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
    if ('isEgg' in source || 'totalSteps' in source) {
      const isNpc = Boolean((source as { isNpc?: boolean }).isNpc);
      return {
        icon: getAssetUrl(ASSET_TYPES.POKEMON, 'egg'),
        iconType: isNpc ? 'npc_egg' : 'egg'
      };
    }
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
  if (
    source === 'player' ||
    (source &&
      typeof source === 'object' &&
      gs.state.team.some((p) => p && p.uid === (source as Pokemon).uid))
  ) {
    return 'player';
  }
  if (
    source === 'enemy_trainer' ||
    (source && typeof source === 'object' && (source as Pokemon).uid === activeBattle?.enemy?.uid)
  ) {
    return 'enemy';
  }
  return attackerSide || 'enemy';
}

/**
 * Formats a battle log entry by automatically resolving icons and side alignment.
 *
 * @param msg Message
 * @param type Log type (log-info, log-player, log-enemy, log-error)
 * @param source Sprite source (Pokemon, 'player', 'enemy_trainer', or item name)
 * @param ctx Required context (gs, activeBattle, attackerSide)
 */
export function formatBattleLog(
  msg: string,
  type: string,
  source: BattleSource,
  ctx: LogContext
): BattleLog {
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
