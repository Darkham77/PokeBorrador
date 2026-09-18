import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping';
export { POKEMON_SPRITE_IDS };
import { resolveAsset } from '../utils/assetResolver.ts';
import { isMapWithCycleId, type MapRouteId } from '@/data/world/map-assets';
import { getItemById, type ItemId } from '@/data/inventory/items';
import { isPlayerClassId, type PlayerClassId } from '@/data/player/playerClasses';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { GymId } from '@/data/world/gyms';
import type { RankedTierId } from '@/data/system/rankedData';

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

import type { DayPhase } from '../utils/timeUtils.ts';
import type { TrainerAssetView, GenderId } from '@/types/system/game';

export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES];

export interface AssetOptions {
  isShiny?: boolean;
  shiny?: boolean; // Legacy fallback
  isBack?: boolean;
  back?: boolean; // Legacy fallback
  isAnimated?: boolean;
  animated?: boolean;
  cycle?: DayPhase;
  trainerSuffix?: TrainerAssetView;
  gender?: GenderId;
  isLowPower?: boolean;
  [key: string]: unknown;
}

/**
 * Global Asset Service / Router
 * Centralizes asset path construction and LOD application.
 */
function resolvePokemonAsset(
  id: string | number,
  options: AssetOptions,
  extension: string,
  isShiny: boolean,
  isBack: boolean
): string {
  const stringId = String(id).toLowerCase() // text-ok: UI text display localization string
  if (typeof id === 'string' && id.toLowerCase().startsWith('egg')) return resolveAsset(`/assets/sprites/egg${extension}`) // text-ok: UI text display localization string

  const num = (POKEMON_SPRITE_IDS as Record<string, number | string>)[stringId] ?? id // open-record: Generic key-value data dictionary container
  
  if (options.isAnimated || options.animated) {
    const sideDir = isBack ? 'Back' : 'Front'
    const shinyDir = isShiny ? ' shiny' : ''
    return resolveAsset(`/assets/sprites/pokemon/animated/${sideDir}${shinyDir}/${num}${extension}`)
  }

  const folder = isShiny ? 'shiny/' : ''
  const back = isBack ? 'back/' : ''
  return resolveAsset(`${POKEAPI_BASE}${back}${folder}${num}${extension}`)
}

const MAP_CYCLE_SUFFIXES: Record<string, string> = {
  morning: '_amanecer',
  day: '_dia',
  dusk: '_atardecer',
  night: '_noche'
}

function resolveMapAsset(
  id: string | number,
  options: AssetOptions,
  extension: string
): string {
  let finalId = id
  if (options.cycle && isMapWithCycleId(String(id))) {
    finalId = `${id}${MAP_CYCLE_SUFFIXES[options.cycle] || '_dia'}`
  }
  if (options.isLowPower) {
    finalId = `${finalId}_mobile`
  }
  return resolveAsset(`/assets/maps/${finalId}${extension}`)
}

const TRAINER_LEGACY_MAPPING: Record<string, string> = {
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
}

const TRAINER_NPC_MAPPING: Record<string, string> = {
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
}

function resolveTrainerAsset(
  id: string | number,
  options: AssetOptions,
  extension: string,
  isBack: boolean
): string {
  const idStr = String(id)
  if (idStr.startsWith('http')) return idStr

  const sanitizedId = idStr.toLowerCase().replace(/[\s.]/g, '') // text-ok: UI text display localization string
  const finalId = TRAINER_LEGACY_MAPPING[sanitizedId] || sanitizedId

  if (isPlayerClassId(finalId)) {
    const suffix = options.trainerSuffix || (isBack ? 'back' : 'front')
    const gender = options.gender || 'h'
    return resolveAsset(`/assets/sprites/trainers/${finalId}_${gender}_${suffix}${extension}`)
  }

  const npcId = TRAINER_NPC_MAPPING[finalId] || finalId
  return resolveAsset(`/assets/sprites/npc/${npcId}${extension}`)
}

function resolveBannerAsset(id: string | number, extension: string): string {
  const idStr = String(id)
  if (idStr.startsWith('pokecenter_')) {
    const cleanId = idStr.replace('pokecenter_', '')
    return resolveAsset(`/assets/ui/pokecenter/${cleanId}${extension}`)
  }
  const cleanBannerId = idStr.replace(/^\/?(?:public\/)?assets\/ui\/events\//, '')
  return resolveAsset(`/assets/ui/events/${cleanBannerId}${extension}`)
}

function getSafeShopItem(idStr: string): ReturnType<typeof getItemById> | null {
  try {
    return getItemById(idStr);
  } catch {
    return null;
  }
}

function resolveItemAsset(id: string | number, extension: string): string {
  const idStr = String(id).toLowerCase();
  if (idStr.includes('/')) {
    return resolveAsset(`/assets/sprites/${idStr}${extension}`);
  }
  const shopItem = getSafeShopItem(idStr);
  if (shopItem?.sprite) {
    return resolveAsset(`/assets/sprites/${shopItem.sprite}${extension}`);
  }
  return resolveAsset(`/assets/sprites/crafting/tier3/${idStr}${extension}`);
}

type AssetResolverFn = (
  id: string | number,
  options: AssetOptions,
  extension: string,
  isShiny: boolean,
  isBack: boolean
) => string

const ASSET_RESOLVERS: Record<string, AssetResolverFn> = {
  [ASSET_TYPES.POKEMON]: resolvePokemonAsset,
  [ASSET_TYPES.MAP]: (id, options, ext) => resolveMapAsset(id, options, ext),
  [ASSET_TYPES.TRAINER]: (id, options, ext, _, isBack) => resolveTrainerAsset(id, options, ext, isBack),
  [ASSET_TYPES.ENVIRONMENT]: (id) => resolveAsset(`/assets/environment/${id}.webp`),
  [ASSET_TYPES.FX]: (id) => resolveAsset(`/assets/fx/${id}.webp`),
  [ASSET_TYPES.BANNER]: (id, _, ext) => resolveBannerAsset(id, ext),
  [ASSET_TYPES.BATTLE_BG]: (id, _, ext) => resolveAsset(`/assets/maps_battle/${id}${ext}`),
  [ASSET_TYPES.UI]: (id, _, ext) => resolveAsset(`/assets/ui/${id}${ext}`),
  [ASSET_TYPES.VFX]: (id, _, ext) => resolveAsset(`/assets/ui/${id}${ext}`),
  [ASSET_TYPES.ATLAS]: (id, _, ext) => resolveAsset(`/assets/ui/${id}${ext}`),
  [ASSET_TYPES.FACTION]: (id, _, ext) => resolveAsset(`/assets/factions/${id}${ext}`),
  [ASSET_TYPES.RANK]: (id, _, ext) => resolveAsset(`/assets/sprites/ranked_medals/${id}${ext}`),
  [ASSET_TYPES.ICON]: (id, _, ext) => resolveAsset(`/assets/ui/icons/${id}${ext}`),
  [ASSET_TYPES.DATA]: (id) => resolveAsset(`/assets/data/${id}.json`),
  [ASSET_TYPES.ITEM]: (id, _, ext) => resolveItemAsset(id, ext),
  [ASSET_TYPES.BADGE]: (id, _, ext) => resolveAsset(`/assets/sprites/badges/${id}${ext}`)
}

export function getAssetUrl(type: typeof ASSET_TYPES.ITEM, rawId: ItemId, options?: AssetOptions): string;
export function getAssetUrl(type: typeof ASSET_TYPES.POKEMON, rawId: PokemonSpeciesId | number, options?: AssetOptions): string;
export function getAssetUrl(type: typeof ASSET_TYPES.MAP, rawId: MapRouteId, options?: AssetOptions): string;
export function getAssetUrl(type: typeof ASSET_TYPES.TRAINER, rawId: NpcSpriteId | PlayerClassId, options?: AssetOptions): string;
export function getAssetUrl(type: typeof ASSET_TYPES.BADGE, rawId: GymId, options?: AssetOptions): string;
export function getAssetUrl(type: typeof ASSET_TYPES.RANK, rawId: RankedTierId, options?: AssetOptions): string;
export function getAssetUrl(type: AssetType, rawId: string | number, options?: AssetOptions): string; // domain-ok: Asset router generic fallback overload signature
export function getAssetUrl(type: AssetType, rawId: string | number, options: AssetOptions = {}): string { // domain-ok: Asset router generic fallback implementation
  if (!rawId) {
    throw new Error(`[assetService] Cannot resolve asset URL for type '${type}': rawId is required and cannot be empty.`);
  }
  const isShiny = options.isShiny ?? options.shiny ?? false;
  const isBack = options.isBack ?? options.back ?? false;

  // If it's already a full URL or local test path, return it
  if (typeof rawId === 'string' && (rawId.startsWith('http') || rawId.startsWith('data:') || rawId.startsWith('/test aventura/'))) {
    return rawId;
  }

  // Clean ID: strip extensions if present (e.g., 'item.png' -> 'item')
  const id = typeof rawId === 'string' 
    ? rawId.replace(/\.(png|webp|jpg|jpeg|gif|bmp|json)$/i, '') 
    : rawId;

  const extension = (typeof rawId === 'string' && rawId.endsWith('.json')) ? '.json' : '.webp';

  const resolver = ASSET_RESOLVERS[type];
  if (resolver) {
    return resolver(id, options, extension, isShiny, isBack);
  }

  return String(id);
}

export function useAssets() {
  return { getAssetUrl, ASSET_TYPES };
}

/**
 * Gets the PokeAPI sprite URL for a given species ID.
 */
export function getSpriteUrl(id: string, isShiny = false) {
  if (id && (id.toLowerCase() === 'egg' || id.toLowerCase().startsWith('egg_') || id.toLowerCase().startsWith('egg-'))) { // text-ok: UI text display localization string
    return getAssetUrl(ASSET_TYPES.POKEMON, 'egg');
  }
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

/**
 * Gets the PokeAPI back sprite URL for a given species ID.
 */
export function getBackSpriteUrl(id: string, isShiny = false) {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}
