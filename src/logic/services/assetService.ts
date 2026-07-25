import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping';
export { POKEMON_SPRITE_IDS };
import { resolveAsset } from '../utils/assetResolver.ts';
import { MAPS_WITH_CYCLES } from '@/data/world/map-assets';
import { getItemById } from '@/data/inventory/items';
import { Dex } from '@pkmn/sim';

/**
 * POKEAPI_BASE: Now local paths for downloaded sprites.
 */
const POKEAPI_BASE = '/assets/sprites/pokemon/static/';



/**
 * ASSET_TYPES: Supported categories for the Asset Service.
 */
export const ASSET_TYPES = {
  POKEMON: 'pokemon',
  MAP: 'map',
  TRAINER: 'trainer',
  ITEM: 'item',
  BANNER: 'banner',
  BATTLE_BG: 'battle_bg',
  UI: 'ui',
  VFX: 'vfx',
  ATLAS: 'atlas',
  FACTION: 'faction',
  RANK: 'rank',
  ICON: 'icon',
  ENVIRONMENT: 'environment',
  FX: 'fx',
  DATA: 'data',
  BADGE: 'badge'
} as const;

export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES];

export interface AssetOptions {
  isShiny?: boolean;
  shiny?: boolean; // Legacy fallback
  isBack?: boolean;
  back?: boolean; // Legacy fallback
  isAnimated?: boolean;
  animated?: boolean;
  cycle?: 'morning' | 'day' | 'dusk' | 'night';
  trainerSuffix?: 'avatar' | 'front' | 'back';
  gender?: 'h' | 'm';
  isLowPower?: boolean;
  [key: string]: unknown;
}

/**
 * Global Asset Service / Router
 * Centralizes asset path construction and LOD application.
 */
export const getAssetUrl = (type: AssetType, rawId: string | number, options: AssetOptions = {}): string => {
  if (!rawId) {
    throw new Error(`[assetService] Cannot resolve asset URL for type '${type}': rawId is required and cannot be empty.`);
  }
  const { 
    isShiny: isShinyPrimary,
    shiny: isShinyLegacy,
    isBack: isBackPrimary,
    back: isBackLegacy
  } = options;

  const isShiny = isShinyPrimary ?? isShinyLegacy ?? false;
  const isBack = isBackPrimary ?? isBackLegacy ?? false;

  // If it's already a full URL or local test path, return it
  if (typeof rawId === 'string' && (rawId.startsWith('http') || rawId.startsWith('data:') || rawId.startsWith('/test aventura/'))) {
    return rawId;
  }

  // Clean ID: strip extensions if present (e.g., 'item.png' -> 'item')
  const id = typeof rawId === 'string' 
    ? rawId.replace(/\.(png|webp|jpg|jpeg|gif|bmp|json)$/i, '') 
    : rawId;

  const extension = (typeof rawId === 'string' && rawId.endsWith('.json')) ? '.json' : '.webp';

  switch (type) {
    case ASSET_TYPES.POKEMON: {
      const stringId = String(id).toLowerCase();
      if (typeof id === 'string' && id.toLowerCase().startsWith('egg')) return resolveAsset(`/assets/sprites/egg${extension}`);

      let num = (POKEMON_SPRITE_IDS as Record<string, number | string>)[stringId];
      if (num === undefined) {
        const species = Dex.species.get(stringId);
        num = (species && species.exists) ? species.num : id;
      }
      
      if (options.isAnimated || options.animated) {
        const sideDir = isBack ? 'Back' : 'Front';
        const shinyDir = isShiny ? ' shiny' : '';
        return resolveAsset(`/assets/sprites/pokemon/animated/${sideDir}${shinyDir}/${num}${extension}`);
      }

      const folder = isShiny ? 'shiny/' : '';
      const back = isBack ? 'back/' : '';
      return resolveAsset(`${POKEAPI_BASE}${back}${folder}${num}${extension}`);
    }

    case ASSET_TYPES.MAP: {
      let finalId = id;
      
      // Aplicar sufijos de ciclo horario si el mapa lo soporta
      if (options.cycle && MAPS_WITH_CYCLES.includes(String(id))) {
        const suffixes: Record<string, string> = {
          morning: '_amanecer',
          day: '_dia',
          dusk: '_atardecer',
          night: '_noche'
        };
        finalId = `${id}${suffixes[options.cycle] || '_dia'}`;
      }

      if (options.isLowPower) {
        finalId = `${finalId}_mobile`;
      }

      const mapPath = `/assets/maps/${finalId}${extension}`;
      return resolveAsset(mapPath);
    }


    case ASSET_TYPES.TRAINER: {
      // Legacy mapping for mission keys (if trainerType was used as spriteId)
      const LEGACY_MAPPING: Record<string, string> = {
        'caza_bichos': 'cazabichos',
        'ornitologo': 'entrenador',
        'cientifico': 'criador',
        'luchador': 'entrenador',
        'pescador': 'tamer',
        'nadador': 'tamer',
        'domador': 'tamer',
        'medium': 'entrenador',
        'motorista': 'teamrocket',
        'montanero': 'tamer',
        'rocket': 'rocket',
        'cazador': 'cazabichos'
      };

      // Sanitize ID: remove spaces and dots (e.g., "Lt. Surge" -> "ltsurge")
      const idStr = String(id);
      const sanitizedId = idStr.toLowerCase().replace(/[\s.]/g, '');
      const finalId = LEGACY_MAPPING[sanitizedId] || sanitizedId;

      // Other remote URLs fallback
      if (idStr.startsWith('http')) return idStr;
      
      const PLAYER_CLASSES_LIST = ['rocket', 'cazabichos', 'entrenador', 'criador'];
      if (PLAYER_CLASSES_LIST.includes(finalId)) {
        const suffix = options.trainerSuffix || (isBack ? 'back' : 'front');
        const gender = options.gender || 'h';
        return resolveAsset(`/assets/sprites/trainers/${finalId}_${gender}_${suffix}${extension}`);
      }

      const NPC_MAPPING: Record<string, string> = {
        'brock': 'brock',
        'misty': 'misty',
        'ltsurge': 'ltsurge',
        'erika': 'erika',
        'koga': 'koga',
        'sabrina': 'sabrina',
        'blaine': 'blaine',
        'giovanni': 'giovanni',
        'blue': 'blue-gen3',
        'youngster': 'youngster',
        'lass': 'lass',
        'picnicker': 'picnicker',
        'camper': 'camper_b',
        'hiker': 'hiker',
        'sailor': 'sailor',
        'scientist': 'scientist',
        'juggler': 'juggler',
        'blackbelt': 'blackbelt',
        'swimmer': 'swimmer',
        'tamer': 'tamer-gen3',
        'birdkeeper': 'birdkeeper',
        'psychic': 'psychic',
        'gentleman': 'gentleman',
        'richboy': 'richboy',
        'tuber': 'tuber',
        'cyclist': 'cyclist',
        'roughneck': 'roughneck',
        'biker': 'biker',
        'teamrocket': 'teamrocket',
        'beauty': 'beauty',
        'supernerd': 'supernerd',
        'burglar': 'burglar',
        'dragontamer': 'dragontamer',
        'acetrainer': 'acetrainer',
        'veteran': 'veteran'
      };

      const npcId = NPC_MAPPING[finalId] || finalId;
      return resolveAsset(`/assets/sprites/npc/${npcId}${extension}`);
    }

    case ASSET_TYPES.ENVIRONMENT:
      return resolveAsset(`/assets/environment/${id}.webp`);

    case ASSET_TYPES.FX:
      return resolveAsset(`/assets/fx/${id}.webp`);

    case ASSET_TYPES.BANNER: {
      const idStr = String(id);
      if (idStr.startsWith('pokecenter_')) {
        const cleanId = idStr.replace('pokecenter_', '');
        return resolveAsset(`/assets/ui/pokecenter/${cleanId}${extension}`);
      }
      return resolveAsset(`/assets/ui/events/${idStr}${extension}`);
    }

    case ASSET_TYPES.BATTLE_BG:
      return resolveAsset(`/assets/maps_battle/${id}${extension}`);

    case ASSET_TYPES.UI:
    case ASSET_TYPES.VFX:
    case ASSET_TYPES.ATLAS:
      return resolveAsset(`/assets/ui/${id}${extension}`);

    case ASSET_TYPES.FACTION:
      return resolveAsset(`/assets/factions/${id}${extension}`);

    case ASSET_TYPES.RANK:
      return resolveAsset(`/assets/ui/ranks/${id}${extension}`);

    case ASSET_TYPES.ICON:
      return resolveAsset(`/assets/ui/icons/${id}${extension}`);

    case ASSET_TYPES.DATA:
      return resolveAsset(`/assets/data/${id}.json`);

    case ASSET_TYPES.ITEM: {
      const idStr = String(id).toLowerCase();
      
      // Direct matching if they passed the full sprite path directly
      if (idStr.startsWith('crafting/') || idStr.startsWith('ores/') || idStr.startsWith('tools/')) {
        return resolveAsset(`/assets/sprites/${idStr}${extension}`);
      }
      
      let shopItem = null;
      try {
        shopItem = getItemById(idStr);
      } catch (err) {
        throw new Error(`[assetService] Error looking up item data for '${idStr}': ${String(err)}`);
      }
      if (shopItem) {
        return resolveAsset(`/assets/sprites/${shopItem.sprite}${extension}`);
      }
      
      return resolveAsset(`/assets/sprites/crafting/tier3/${idStr}${extension}`);
    }

    case ASSET_TYPES.BADGE:
      return resolveAsset(`/assets/sprites/badges/${id}${extension}`);

    default:
      return String(id);
  }
};

export function useAssets() {
  return { getAssetUrl, ASSET_TYPES };
}

/**
 * Gets the PokeAPI sprite URL for a given species ID.
 */
export function getSpriteUrl(id: string, isShiny = false) {
  if (id && (id.toLowerCase() === 'egg' || id.toLowerCase().startsWith('egg_') || id.toLowerCase().startsWith('egg-'))) {
    return getAssetUrl(ASSET_TYPES.ITEM, 'egg');
  }
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

/**
 * Gets the PokeAPI back sprite URL for a given species ID.
 */
export function getBackSpriteUrl(id: string, isShiny = false) {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}

