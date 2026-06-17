
/**
 * Módulo de Registro de Combate (Battle Logger)
 * Encargado de procesar y estandarizar los logs de batalla.
 */

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getItemByName, getItemById } from '@/data/inventory/items';
import { PLAYER_CLASSES } from '@/data/player/playerClasses';
import { logger } from '../utils/logger.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleLog, BattleSource } from '@/types/battle/battle';

interface LogContext {
  gs: {
    state: {
      playerClass: string | null
      avatar_style?: string | null
      team: Pokemon[]
    }
  }
  activeBattle?: {
    trainerSprite?: string | null
    enemy?: Pokemon | null
  } | null
  attackerSide?: 'player' | 'enemy' | null
}

// Re-use exported types

/**
 * Procesa un mensaje de log y devuelve el objeto listo para la cola del store.
 * @param {string} msg Mensaje
 * @param {string} type Tipo de log (log-info, log-player, log-enemy, log-error)
 * @param {Object|string} source Fuente del sprite (Pokemon, 'player', 'enemy_trainer', o nombre de ítem)
 * @param {Object} ctx Contexto necesario (gs, activeBattle, attackerSide)
 */
export function formatBattleLog(msg: string, type: string, source: BattleSource, ctx: LogContext): BattleLog {
  const { gs, activeBattle, attackerSide } = ctx;
  let icon: string | null = null;
  let iconType: string | null = null;

  if (!source && !msg.startsWith('DEBUG:')) {
    logger.warn('BattleLogger', `Log sin fuente detectado: "${msg}". Se recomienda pasar un Pokémon o 'player'/'enemy_trainer'.`);
  }

  if (msg.startsWith('DEBUG:')) {
    icon = '⚙️';
    iconType = 'emoji';
  } else if (source) {
    if (source === 'player') {
      const cls = (PLAYER_CLASSES as Record<string, { avatarSpriteId: string }>)[gs.state.playerClass || ''];
      const spriteId = cls?.avatarSpriteId || gs.state.avatar_style || 'entrenador';
      icon = getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'avatar' });
      iconType = 'player_avatar';
    } else if (source === 'enemy_trainer') {
      const spriteId = activeBattle?.trainerSprite || 'entrenador';
      icon = getAssetUrl(ASSET_TYPES.TRAINER, spriteId);
      iconType = 'trainer';
    } else if (typeof source === 'object' && source) {
      const poke = source as Partial<Pokemon>;
      const pokeId = poke.id;
      if (pokeId) {
        icon = getAssetUrl(ASSET_TYPES.POKEMON, pokeId, { isShiny: poke.isShiny });
        iconType = 'pokemon';
      }
    } else if (typeof source === 'string') {
      const isEmoji = /^\p{Emoji}/u.test(source) && source.length <= 4;
      if (isEmoji) {
        icon = source;
        iconType = 'emoji';
      } else {
        const item = getItemById(source) || getItemByName(source);
        const spriteId = item ? item.sprite : source;
        icon = getAssetUrl(ASSET_TYPES.ITEM, spriteId);
        iconType = 'item';
      }
    }
  }

  let side = 'enemy';
  if (source === 'player' || (source && typeof source === 'object' && gs.state.team.some((p) => p && p.uid === (source as Pokemon).uid))) {
    side = 'player';
  } else if (source === 'enemy_trainer' || (source && typeof source === 'object' && (source as Pokemon).uid === activeBattle?.enemy?.uid)) {
    side = 'enemy';
  } else if (attackerSide) {
    side = attackerSide;
  }

  return {
    id: Temporal.Now.instant().epochMilliseconds + Math.random(),
    msg,
    type,
    side,
    icon,
    iconType
  };
}
