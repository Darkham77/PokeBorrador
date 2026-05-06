import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants';
export { POKEMON_SPRITE_IDS };
import { resolveAsset } from '../utils/assetResolver';
import { MAPS_WITH_CYCLES } from '@/data/map-assets';


/**
 * POKEAPI_BASE: Now local paths for downloaded sprites.
 */
const POKEAPI_BASE = '/assets/sprites/pokemon/';
const POKEAPI_ITEM_BASE = '/assets/items/';

/**
 * ITEM_MAPPING: Maps internal item names to PokeAPI names.
 */
const ITEM_MAPPING = {
  'pocion': 'potion',
  'super_pocion': 'super-potion',
  'hiper_pocion': 'hyper-potion',
  'pocion_max': 'max-potion',
  'revivir_max': 'max-revive',
  'quemadura': 'burn-heal',
  'despertar': 'awakening',
  'cura_total': 'full-heal',
  'elixir': 'ether',
  'elixir_max': 'max-elixir',
  'piedra_fuego': 'fire-stone',
  'piedra_agua': 'water-stone',
  'piedra_trueno': 'thunder-stone',
  'piedra_hoja': 'leaf-stone',
  'piedra_luna': 'moon-stone',
  'pokeball': 'poke-ball',
  'pokéball': 'poke-ball',
  'superball': 'super-ball',
  'super-ball': 'super-ball',
  'super ball': 'super-ball',
  'súper ball': 'super-ball',
  'ultraball': 'ultra-ball',
  'ultra-ball': 'ultra-ball',
  'ultra ball': 'ultra-ball',
  'masterball': 'master-ball',
  'master-ball': 'master-ball',
  'master ball': 'master-ball',
  'turnoball': 'timer-ball',
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
  'restaurador_vigor': 'rare-candy'
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
  DATA: 'data'
};

/**
 * Global Asset Service / Router
 * Centralizes asset path construction and LOD application.
 */
export const getAssetUrl = (type, rawId, options = {}) => {
  if (!rawId) return '';
  const { 
    isShiny = (options.shiny || false), 
    isBack = (options.back || false) 
  } = options;

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
      const num = POKEMON_SPRITE_IDS[stringId] || id;
      if (typeof id === 'string' && id.toLowerCase().startsWith('egg')) return resolveAsset(`${POKEAPI_ITEM_BASE}egg${extension}`);
      
      const folder = isShiny ? 'shiny/' : '';
      const back = isBack ? 'back/' : '';
      return resolveAsset(`${POKEAPI_BASE}${back}${folder}${num}${extension}`);
    }

    case ASSET_TYPES.MAP: {
      let finalId = id;
      
      // Aplicar sufijos de ciclo horario si el mapa lo soporta
      if (options.cycle && MAPS_WITH_CYCLES.includes(id)) {
        const suffixes = {
          morning: '_amanecer',
          day: '_dia',
          dusk: '_atardecer',
          night: '_noche'
        };
        finalId = `${id}${suffixes[options.cycle] || '_dia'}`;
      }

      const mapPath = `/assets/maps/${finalId}${extension}`;
      return resolveAsset(mapPath);
    }


    case ASSET_TYPES.TRAINER: {
      // Legacy mapping for mission keys (if trainerType was used as spriteId)
      const LEGACY_MAPPING = {
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
        'rocket': 'teamrocket',
        'cazador': 'cazabichos'
      };

      // Sanitize ID: remove spaces and dots (e.g., "Lt. Surge" -> "ltsurge")
      const sanitizedId = id.toLowerCase().replace(/[\s.]/g, '');
      const finalId = LEGACY_MAPPING[sanitizedId] || sanitizedId;

      // Other remote URLs fallback
      if (typeof id === 'string' && id.startsWith('http')) return id;
      
      // Local assets (prioritized)
      return resolveAsset(`/assets/sprites/trainers/${finalId}${extension}`);
    }

    case ASSET_TYPES.ENVIRONMENT:
      return resolveAsset(`/assets/environment/${id}.webp`);

    case ASSET_TYPES.BANNER:
      return resolveAsset(`/assets/ui/banners/${id}${extension}`);

    case ASSET_TYPES.BATTLE_BG:
      return resolveAsset(`/assets/sprites/battle/${id}${extension}`);

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
      // PokeAPI items mapping
      const mappedId = ITEM_MAPPING[idStr] || idStr.replace(/_/g, '-');
      
      // If it's in mapping, numeric, or a known PokeAPI slug pattern
      const isPokeAPI = (ITEM_MAPPING[idStr] !== undefined) || 
                       !isNaN(idStr) || 
                       idStr.includes('-') || 
                       idStr.includes('ball') || 
                       idStr.includes('stone') ||
                       idStr.includes('repel') ||
                       idStr.includes('fossil') ||
                       ['potion', 'revive', 'heal', 'ether', 'elixir', 'antidote', 'share', 'leftovers', 'bell', 'band', 'sash', 'lens', 'candy', 'up', 'egg', 'nugget', 'pearl', 'dust', 'piece', 'spoon', 'tag', 'powder', 'club', 'light', 'stick', 'ticket', 'radar', 'awakening'].some(k => mappedId.includes(k));

      if (isPokeAPI) {
        return resolveAsset(`${POKEAPI_ITEM_BASE}${mappedId}${extension}`);
      }
      
      // Local fallback
      return resolveAsset(`/assets/items/${idStr}${extension}`);
    }

    default:
      return id;
  }
};

export function useAssets() {
  return { getAssetUrl, ASSET_TYPES };
}
