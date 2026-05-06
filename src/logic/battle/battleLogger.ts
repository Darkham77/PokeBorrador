
/**
 * Módulo de Registro de Combate (Battle Logger)
 * Encargado de procesar y estandarizar los logs de batalla.
 */

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { SHOP_ITEMS } from '@/data/items';
import { PLAYER_CLASSES } from '@/data/playerClasses';

/**
 * Procesa un mensaje de log y devuelve el objeto listo para la cola del store.
 * @param {string} msg Mensaje
 * @param {string} type Tipo de log (log-info, log-player, log-enemy, log-error)
 * @param {Object|string} source Fuente del sprite (Pokemon, 'player', 'enemy_trainer', o nombre de ítem)
 * @param {Object} ctx Contexto necesario (gs, activeBattle, attackerSide)
 */
export function formatBattleLog(msg: any, type: any, source: any, ctx: any) {
  const { gs, activeBattle, attackerSide } = ctx;
  let icon: any = null;
  let iconType: any = null;

  if (!source && !msg.startsWith('DEBUG:')) {
    console.warn(`[BattleLogger] Log sin fuente detectado: "${msg}". Se recomienda pasar un Pokémon o 'player'/'enemy_trainer'.`);
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
      const pokeId = source.id || source.pokemonId || source.pokedexId || source.id_pokemon;
      if (pokeId) {
        icon = getAssetUrl(ASSET_TYPES.POKEMON, pokeId, { isShiny: source.isShiny });
        iconType = 'pokemon';
      }
    } else if (typeof source === 'string') {
      const sLower = source.toLowerCase();
      const item = SHOP_ITEMS.find((i: any) => i.name.toLowerCase() === sLower || i.id.toLowerCase() === sLower);
      const spriteId = item ? item.sprite : source;
      icon = getAssetUrl(ASSET_TYPES.ITEM, spriteId);
      iconType = 'item';
    }
  }

  let side = 'enemy';
  if (source === 'player' || (source && typeof source === 'object' && gs.state.team.some((p: any) => p && p.uid === source.uid))) {
    side = 'player';
  } else if (source === 'enemy_trainer' || (source && typeof source === 'object' && source.uid === activeBattle?.enemy?.uid)) {
    side = 'enemy';
  } else if (attackerSide) {
    side = attackerSide;
  }

  return {
    id: Date.now() + Math.random(),
    msg,
    type,
    side,
    icon,
    iconType
  };
}
