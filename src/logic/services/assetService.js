import { resolveAsset } from '../utils/assetResolver';

/**
 * POKEAPI_BASE: Official PokeAPI sprites repository.
 */
const POKEAPI_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEAPI_ITEM_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

/**
 * POKEMON_SPRITE_IDS: Internal name to Pokedex ID mapping.
 */
export const POKEMON_SPRITE_IDS = {
  bulbasaur: 1, ivysaur: 2, venusaur: 3,
  charmander: 4, charmeleon: 5, charizard: 6,
  squirtle: 7, wartortle: 8, blastoise: 9,
  caterpie: 10, metapod: 11, butterfree: 12,
  weedle: 13, kakuna: 14, beedrill: 15,
  pidgey: 16, pidgeotto: 17, pidgeot: 18,
  rattata: 19, raticate: 20,
  spearow: 21, fearow: 22,
  ekans: 23, arbok: 24,
  pikachu: 25, raichu: 26,
  sandshrew: 27, sandslash: 28,
  nidoran_f: 29, nidorina: 30, nidoqueen: 31,
  nidoran_m: 32, nidorino: 33, nidoking: 34,
  clefairy: 35, clefable: 36,
  vulpix: 37, ninetales: 38,
  jigglypuff: 39, wigglytuff: 40,
  zubat: 41, golbat: 42,
  oddish: 43, gloom: 44, vileplume: 45,
  paras: 46, parasect: 47,
  venonat: 48, venomoth: 49,
  diglett: 50, dugtrio: 51,
  meowth: 52, persian: 53,
  psyduck: 54, golduck: 55,
  mankey: 56, primeape: 57,
  growlithe: 58, arcanine: 59,
  poliwag: 60, poliwhirl: 61, poliwrath: 62,
  abra: 63, kadabra: 64, alakazam: 65,
  machop: 66, machoke: 67, machamp: 68,
  bellsprout: 69, weepinbell: 70, victreebel: 71,
  tentacool: 72, tentacruel: 73,
  geodude: 74, graveler: 75, golem: 76,
  ponyta: 77, rapidash: 78,
  slowpoke: 79, slowbro: 80,
  magnemite: 81, magneton: 82,
  farfetchd: 83, doduo: 84, dodrio: 85,
  seel: 86, dewgong: 87,
  grimer: 88, muk: 89,
  shellder: 90, cloyster: 91,
  gastly: 92, haunter: 93, gengar: 94,
  onix: 95, drowzee: 96, hypno: 97,
  krabby: 98, kingler: 99,
  voltorb: 100, electrode: 101,
  exeggcute: 102, exeggutor: 103,
  cubone: 104, marowak: 105,
  hitmonlee: 106, hitmonchan: 107, lickitung: 108,
  koffing: 109, weezing: 110,
  rhyhorn: 111, rhydon: 112,
  chansey: 113, tangela: 114, kangaskhan: 115,
  horsea: 116, seadra: 117,
  goldeen: 118, seaking: 119,
  staryu: 120, starmie: 121,
  mr_mime: 122, scyther: 123, jynx: 124, electabuzz: 125, magmar: 126, pinsir: 127, tauros: 128,
  magikarp: 129, gyarados: 130, lapras: 131, ditto: 132,
  eevee: 133, vaporeon: 134, jolteon: 135, flareon: 136,
  porygon: 137, omanyte: 138, omastar: 139, kabuto: 140, kabutops: 141, aerodactyl: 142,
  snorlax: 143, articuno: 144, zapdos: 145, moltres: 146,
  dratini: 147, dragonair: 148, dragonite: 149,
  mewtwo: 150, mew: 151,
  pichu: 172, cleffa: 173, igglybuff: 174, togepi: 175, tyrogue: 236, smoochum: 238, elekid: 239, magby: 240
};

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
  'superball': 'super-ball',
  'ultraball': 'ultra-ball',
  'masterball': 'master-ball'
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
  FACTION: 'faction'
};

/**
 * Global Asset Service / Router
 * Centralizes asset path construction and LOD application.
 */
export const getAssetUrl = (type, rawId, options = {}) => {
  if (!rawId) return '';
  const { isShiny = false, isBack = false } = options;

  // Clean ID: strip extensions if present (e.g., 'item.png' -> 'item')
  const id = typeof rawId === 'string' 
    ? rawId.replace(/\.(png|webp|jpg|jpeg|gif|bmp)$/i, '') 
    : rawId;

  switch (type) {
    case ASSET_TYPES.POKEMON: {
      const num = POKEMON_SPRITE_IDS[id.toLowerCase()] || id;
      if (typeof id === 'string' && id.includes('egg')) return `${POKEAPI_ITEM_BASE}egg.png`;
      
      const folder = isShiny ? 'shiny/' : '';
      const back = isBack ? 'back/' : '';
      return `${POKEAPI_BASE}${back}${folder}${num}.png`;
    }

    case ASSET_TYPES.MAP:
      return resolveAsset(`/assets/maps/${id}.webp`, true);

    case ASSET_TYPES.TRAINER: {
      // Remote Showdown sprites mapping
      const showdownTrainers = [
        'brock', 'misty', 'ltsurge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni',
        'rainbowrocketgrunt', 'bugcatcher-gen6', 'red-lgpe', 'jacq', 'blue-gen3'
      ];
      if (showdownTrainers.includes(id.toLowerCase())) {
        return `https://play.pokemonshowdown.com/sprites/trainers/${id.toLowerCase()}.png`;
      }
      
      // Other remote URLs
      if (id.startsWith('http')) return id;
      
      // Local assets
      return resolveAsset(`/assets/sprites/trainers/${id}.webp`, true);
    }

    case ASSET_TYPES.BANNER:
      return resolveAsset(`/assets/ui/banners/${id}.webp`, true);

    case ASSET_TYPES.BATTLE_BG:
      return resolveAsset(`/assets/sprites/battle/${id}.webp`, true);

    case ASSET_TYPES.UI:
      return resolveAsset(`/assets/ui/${id}.webp`, true);

    case ASSET_TYPES.FACTION:
      return resolveAsset(`/assets/factions/${id}.webp`, true);

    case ASSET_TYPES.ITEM: {
      // PokeAPI items
      const mappedId = ITEM_MAPPING[id] || id.replace(/_/g, '-');
      // If numeric or in mapping, it's definitely PokeAPI
      if (!isNaN(id) || ITEM_MAPPING[id]) {
        return `${POKEAPI_ITEM_BASE}${mappedId}.png`;
      }
      // Local fallback
      return `/assets/items/${id}.png`;
    }

    default:
      return id;
  }
};

export function useAssets() {
  return { getAssetUrl, ASSET_TYPES };
}
