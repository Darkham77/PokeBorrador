
import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants';
export { POKEMON_SPRITE_IDS };
import { resolveAsset } from '../utils/assetResolver.ts';
import { MAPS_WITH_CYCLES } from '@/data/map-assets';
import { SHOP_ITEMS } from '@/data/items';

/**
 * POKEAPI_BASE: Now local paths for downloaded sprites.
 */
const POKEAPI_BASE = '/assets/sprites/pokemon/';
const POKEAPI_ITEM_BASE = '/assets/sprites/items/';

/**
 * ITEM_MAPPING: Maps internal item names to PokeAPI names.
 */
const ITEM_MAPPING: Record<string, string> = {
  'pocion': 'potion',
  'super_pocion': 'super-potion',
  'hiper_pocion': 'hyper-potion',
  'pocion_max': 'max-potion',
  'revivir_max': 'max-revive',
  'quemadura': 'burn-heal',
  'despertar': 'awakening',
  'cura_total': 'full-heal',
  'elixir': 'elixir',
  'elixir_max': 'max-elixir',
  'piedra_fuego': 'fire-stone',
  'piedra_agua': 'water-stone',
  'piedra_trueno': 'thunder-stone',
  'piedra_hoja': 'leaf-stone',
  'piedra_luna': 'moon-stone',
  'pokeball': 'poke-ball',
  'pokéball': 'poke-ball',
  'superball': 'great-ball',
  'greatball': 'great-ball',
  'super-ball': 'great-ball',
  'super ball': 'great-ball',
  'súper ball': 'great-ball',
  'ultraball': 'ultra-ball',
  'ultra-ball': 'ultra-ball',
  'ultra ball': 'ultra-ball',
  'masterball': 'master-ball',
  'master-ball': 'master-ball',
  'master ball': 'master-ball',
  'netball': 'net-ball',
  'net-ball': 'net-ball',
  'duskball': 'dusk-ball',
  'dusk-ball': 'dusk-ball',
  'turnoball': 'timer-ball',
  'timerball': 'timer-ball',
  'timer-ball': 'timer-ball',
  'turno ball': 'timer-ball',
  'repelente': 'repel',
  'super_repel': 'super-repel',
  'max_repel': 'max-repel',
  'huevo_suerte': 'lucky-egg',
  'huevo_suerte_pequeño': 'lucky-egg',
  'compartir_exp': 'exp-share',
  'restos': 'leftovers',
  'cascabel_concha': 'shell-bell',
  'cinta_elegida': 'choice-band',
  'banda_focus': 'focus-sash',
  'lente_zoom': 'scope-lens',
  'caramelo_raro': 'rare-candy',
  'subida_de_pp': 'pp-up',
  'moneda_amuleto': 'amulet-coin',
  'bola_luminosa': 'light-ball',
  'hueso_grueso': 'thick-club',
  'palo': 'stick',
  'polvo_metálico': 'metal-powder',
  'cuchara_torcida': 'twisted-spoon',
  'hechizo': 'spell-tag',
  'pesa_recia': 'power-weight',
  'brazal_recia': 'power-bracer',
  'cinto_recia': 'power-belt',
  'lente_recia': 'power-lens',
  'banda_recia': 'power-band',
  'franja_recia': 'power-anklet',
  'lazo_destino': 'destiny-knot',
  'piedra_eterna': 'everstone',
  'restaurador_vigor': 'rare-candy',
  'lemonade': 'lemonade',
  'refresco': 'soda-pop',
  'limonada': 'lemonade',
  'iman': 'magnet',
  'subida_pp': 'pp-up',
  'mt_toxico': 'tm-poison',
  'ocaso_ball': 'dusk-ball',
  'turno_ball': 'timer-ball',
  'ultra_ball': 'ultra-ball',
  'master_ball': 'master-ball',
  'super_ball': 'great-ball',
  'brazal_recio': 'power-bracer',
  'baya_de_oro': 'lum-berry',
  'baya_oro': 'lum-berry',
  'carbon': 'charcoal',
  'carbón': 'charcoal',
  'agua_mistica': 'mystic-water',
  'agua_mística': 'mystic-water',
  'semilla_milagro': 'miracle-seed',
  'colmillodragon': 'dragon-fang',
  'colmillodragón': 'dragon-fang',
  'escama_dragon': 'dragon-scale',
  'escama_dragón': 'dragon-scale',
  'polvo_plata': 'silver-powder',
  'flecha_venenosa': 'poison-barb',
  'trozo_estrella': 'star-piece',
  'polvo_estelar': 'stardust',
  'perla_grande': 'big-pearl',
  'perla': 'pearl'
};

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
  cycle?: 'morning' | 'day' | 'dusk' | 'night';
  trainerSuffix?: 'avatar' | 'front' | 'back';
  isLowPower?: boolean;
  [key: string]: unknown;
}

/**
 * Global Asset Service / Router
 * Centralizes asset path construction and LOD application.
 */
export const getAssetUrl = (type: AssetType, rawId: string | number, options: AssetOptions = {}): string => {
  if (!rawId) return '';
  const { 
    isShiny: isShinyPrimary,
    shiny: isShinyLegacy,
    isBack: isBackPrimary,
    back: isBackLegacy
  } = options;

  const isShiny = isShinyPrimary ?? isShinyLegacy ?? false;
  const isBack = isBackPrimary ?? isBackLegacy ?? false;

  // If it's already a full URL, return it
  if (typeof rawId === 'string' && (rawId.startsWith('http') || rawId.startsWith('data:'))) {
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
      const num = (POKEMON_SPRITE_IDS as Record<string, number>)[stringId] || id;
      if (typeof id === 'string' && id.toLowerCase().startsWith('egg')) return resolveAsset(`${POKEAPI_ITEM_BASE}egg${extension}`);
      
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
      
      // Determine trainer suffix: default to 'front'
      const suffix = options.trainerSuffix || (isBack ? 'back' : 'front');

      // Local assets (prioritized)
      return resolveAsset(`/assets/sprites/trainers/${finalId}_${suffix}${extension}`);
    }

    case ASSET_TYPES.ENVIRONMENT:
      return resolveAsset(`/assets/environment/${id}.webp`);

    case ASSET_TYPES.FX:
      return resolveAsset(`/assets/fx/${id}.webp`);

    case ASSET_TYPES.BANNER:
      return resolveAsset(`/assets/ui/banners/${id}${extension}`);

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
      const normalizedInput = idStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]/g, '_');
      
      const itemAliases: Record<string, string> = {
        'iman': 'magnet',
        'elixir': 'elixir',
        'subida_pp': 'pp-up',
        'mt_toxico': 'tm-poison',
        'ocaso_ball': 'dusk-ball',
        'turno_ball': 'timer-ball',
        'ultra_ball': 'ultra-ball',
        'master_ball': 'master-ball',
        'super_ball': 'great-ball',
        'brazal_recio': 'power-bracer',
        'cinto_recio': 'power-belt',
        'pesa_recia': 'power-weight',
        'banda_recia': 'power-band',
        'lente_recia': 'power-lens',
        'franja_recia': 'power-anklet',
        'baya_de_oro': 'lum-berry',
        'baya_oro': 'lum-berry'
      };

      const mappedAlias = itemAliases[normalizedInput] || itemAliases[idStr];
      const searchName = mappedAlias || idStr;

      // 1. Check SHOP_ITEMS first by name or id
      const shopItem = SHOP_ITEMS.find(i => 
        i.name.toLowerCase() === searchName || 
        i.id.toLowerCase() === searchName ||
        i.name.toLowerCase() === idStr ||
        i.id.toLowerCase() === idStr
      );
      
      const mappedId = shopItem 
        ? shopItem.sprite 
        : (mappedAlias || ITEM_MAPPING[normalizedInput] || ITEM_MAPPING[idStr] || idStr.replace(/_/g, '-'));
      
      // If it's found in SHOP_ITEMS, mapping, numeric, or a known PokeAPI slug pattern
      const isPokeAPI = shopItem !== undefined ||
                       mappedAlias !== undefined ||
                       (ITEM_MAPPING[normalizedInput] !== undefined) || 
                       (ITEM_MAPPING[idStr] !== undefined) || 
                       !isNaN(Number(mappedId)) || 
                       (mappedId.includes('-') && !idStr.startsWith('medalla')) || 
                       mappedId.includes('ball') || 
                       mappedId.includes('stone') ||
                       mappedId.includes('repel') ||
                       mappedId.includes('fossil') ||
                       ['potion', 'revive', 'heal', 'ether', 'elixir', 'antidote', 'share', 'leftovers', 'bell', 'band', 'sash', 'lens', 'candy', 'up', 'egg', 'nugget', 'pearl', 'dust', 'piece', 'spoon', 'tag', 'powder', 'club', 'light', 'stick', 'ticket', 'radar', 'awakening', 'magnet'].some(k => mappedId.includes(k));

      if (isPokeAPI) {
        return resolveAsset(`${POKEAPI_ITEM_BASE}${mappedId}${extension}`);
      }
      
      // Local fallback
      return resolveAsset(`/assets/items/${idStr}${extension}`);
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
