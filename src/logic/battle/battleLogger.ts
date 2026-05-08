import { Temporal } from '@js-temporal/polyfill'

/**
 * Módulo de Registro de Combate (Battle Logger)
 * Encargado de procesar y estandarizar los logs de batalla.
 */

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { SHOP_ITEMS } from '@/data/items';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import type { Pokemon } from '@/types/pokemon';
import { logger } from '../utils/logger';

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

interface FormattedLog {
  id: number
  msg: string
  type: string
  side: string
  icon: string | null
  iconType: string | null
}

/**
 * Procesa un mensaje de log y devuelve el objeto listo para la cola del store.
 * @param {string} msg Mensaje
 * @param {string} type Tipo de log (log-info, log-player, log-enemy, log-error)
 * @param {Object|string} source Fuente del sprite (Pokemon, 'player', 'enemy_trainer', o nombre de ítem)
 * @param {Object} ctx Contexto necesario (gs, activeBattle, attackerSide)
 */
export function formatBattleLog(msg: string, type: string, source: any, ctx: LogContext): FormattedLog {
  const { gs, activeBattle, attackerSide } = ctx;
  let icon: string | null = null;
  let iconType: string | null = null;

  if (!source && !msg.startsWith('DEBUG:')) {
    logger.warn('BattleLogger', `Log sin fuente detectado: "${msg}". Se recomienda pasar un Pokémon o 'player'/'enemy_trainer'.`);
  }

  if (msg.startsWith('DEBUG:')) {
    icon = '😈';
    iconType = 'emoji';
  } else if (source) {
    if (source === 'player') {
      const cls = (PLAYER_CLASSES as any)[gs.state.playerClass];
      const spriteId = cls?.avatarSpriteId || gs.state.avatar_style || 'entrenador';
      icon = getAssetUrl(ASSET_TYPES.TRAINER, spriteId);
      iconType = 'trainer';
    } else if (source === 'enemy_trainer') {
      const spriteId = activeBattle?.trainerSprite || 'entrenador';
      icon = getAssetUrl(ASSET_TYPES.TRAINER, spriteId);
      iconType = 'trainer';
    } else if (typeof source === 'object' && source) {
      const poke = source as Partial<Pokemon>;
      const pokeId = poke.id || poke.id_pokemon;
      if (pokeId) {
        icon = getAssetUrl(ASSET_TYPES.POKEMON, pokeId, { isShiny: poke.isShiny });
        iconType = 'pokemon';
      }
    } else if (typeof source === 'string') {
      const sLower = source.toLowerCase();
      const item = SHOP_ITEMS.find((i) => i.name.toLowerCase() === sLower || i.id.toLowerCase() === sLower);
      const spriteId = item ? item.sprite : source;
      icon = getAssetUrl(ASSET_TYPES.ITEM, spriteId);
      iconType = 'item';
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
