import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { MapRouteId } from '@/data/world/map-assets';
import type { ItemId } from '@/data/inventory/items';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { WeatherId } from '@/logic/weather/weatherRegistry';

export const GYM_DIFFICULTY_IDS = ['easy', 'normal', 'hard'] as const;
export type GymDifficultyId = (typeof GYM_DIFFICULTY_IDS)[number];

export interface GymDifficulty {
  pokemon: PokemonSpeciesId[];
  levels: number[];
}

export interface Gym {
  id: string; // domain-ok
  name: string; // domain-ok
  city: string; // domain-ok
  locationId: MapRouteId;
  leader: string; // domain-ok
  type: PokemonType;
  typeColor: string; // domain-ok
  badge: string; // domain-ok
  badgeName: string; // domain-ok
  sprite: NpcSpriteId;
  quote: string; // domain-ok
  victoryQuote: string; // domain-ok
  rewardTM: ItemId;
  pokemon: PokemonSpeciesId[];
  levels: number[];
  badgesRequired: number;
  difficulties: Record<GymDifficultyId, GymDifficulty>;
  fixedCycle?: DayPhase;
  fixedWeather?: WeatherId;
  weatherEnabled?: boolean;
}

export const GYMS = [
  {
    id: 'pewter', name: 'Gimnasio Plateada', city: 'Ciudad Plateada', locationId: 'pewter_city',
    leader: 'Brock', type: 'rock', typeColor: '#c8a060',
    badge: '💎', badgeName: 'Medalla Roca',
    sprite: 'brock',
    quote: '¡Mis Pokémon de roca tienen una defensa impenetrable!',
    victoryQuote: 'Hay muchos tipos de entrenadores en el mundo... Tú pareces ser uno con un gran futuro. Toma esto, te ayudará en tu viaje.',
    rewardTM: 'tm39',
    pokemon: ['geodude', 'onix'], levels: [12, 14], badgesRequired: 0,
    difficulties: {
      easy: { pokemon: ['geodude', 'onix'], levels: [12, 14] },
      normal: { pokemon: ['graveler', 'rhyhorn', 'omanyte', 'onix'], levels: [28, 30, 30, 32] },
      hard: { pokemon: ['golem', 'rhydon', 'omastar', 'kabutops', 'aerodactyl', 'onix'], levels: [62, 64, 64, 64, 65, 68] }
    }
  },
  {
    id: 'cerulean', name: 'Gimnasio Celeste', city: 'Ciudad Celeste', locationId: 'cerulean_city',
    leader: 'Misty', type: 'water', typeColor: '#3B8BFF',
    badge: '💧', badgeName: 'Medalla Cascada',
    sprite: 'misty',
    quote: '¡Soy la chica sensacional del agua! ¡No te voy a perdonar!',
    victoryQuote: '¡Vaya! Eres mucho más fuerte de lo que pareces. Mi estrategia no fue suficiente... ¡Espero que esta MT te sea de utilidad!',
    rewardTM: 'tm03',
    pokemon: ['staryu', 'starmie'], levels: [18, 21], badgesRequired: 1,
    difficulties: {
      easy: { pokemon: ['staryu', 'starmie'], levels: [18, 21] },
      normal: { pokemon: ['golduck', 'seadra', 'dewgong', 'starmie'], levels: [35, 37, 38, 40] },
      hard: { pokemon: ['lapras', 'vaporeon', 'gyarados', 'blastoise', 'cloyster', 'starmie'], levels: [65, 67, 67, 68, 68, 70] }
    }
  },
  {
    id: 'vermilion', name: 'Gimnasio Carmín', city: 'Ciudad Carmín', locationId: 'vermilion_city',
    leader: 'Lt. Surge', type: 'electric', typeColor: '#FFD93D',
    badge: '⚡', badgeName: 'Medalla Trueno',
    sprite: 'ltsurge',
    quote: '¡La electricidad es el arma definitiva! ¡Nunca me han derrotado!',
    victoryQuote: '¡Maldita sea! ¡Me has dejado frito! Eres un recluta de primera, sí señor. ¡Lleva esto contigo al campo de batalla!',
    rewardTM: 'tm24',
    pokemon: ['voltorb', 'pikachu', 'raichu'], levels: [21, 24, 28], badgesRequired: 2,
    difficulties: {
      easy: { pokemon: ['voltorb', 'pikachu', 'raichu'], levels: [21, 24, 28] },
      normal: { pokemon: ['electrode', 'magneton', 'electabuzz', 'raichu'], levels: [42, 44, 46, 50] },
      hard: { pokemon: ['jolteon', 'magneton', 'electabuzz', 'electrode', 'porygon', 'raichu'], levels: [68, 70, 70, 72, 72, 75] }
    }
  },
  {
    id: 'celadon', name: 'Gimnasio Celadón', city: 'Ciudad Celadón', locationId: 'celadon_city',
    leader: 'Erika', type: 'grass', typeColor: '#6BCB77',
    badge: '🌿', badgeName: 'Medalla Arcoíris',
    sprite: 'erika',
    quote: '¡Mis Pokémon de planta son tan hermosos como poderosos!',
    victoryQuote: 'Vaya, me has derrotado... Tu valor es admirable. Por favor, acepta esta humilde muestra de mi respeto.',
    rewardTM: 'tm19',
    pokemon: ['victreebel', 'tangela', 'vileplume'], levels: [29, 24, 29], badgesRequired: 3,
    difficulties: {
      easy: { pokemon: ['victreebel', 'tangela', 'vileplume'], levels: [29, 24, 29] },
      normal: { pokemon: ['victreebel', 'tangela', 'exeggutor', 'vileplume'], levels: [48, 46, 48, 52] },
      hard: { pokemon: ['venusaur', 'exeggutor', 'victreebel', 'tangela', 'parasect', 'vileplume'], levels: [72, 74, 74, 74, 74, 76] }
    }
  },
  {
    id: 'fuchsia', name: 'Gimnasio Fucsia', city: 'Ciudad Fucsia', locationId: 'fuchsia_city',
    leader: 'Koga', type: 'poison', typeColor: '#C77DFF',
    badge: '☠️', badgeName: 'Medalla Alma',
    sprite: 'koga',
    quote: '¡El veneno es el arma más elegante de un ninja Pokémon!',
    victoryQuote: '¡Jajaja! Mis técnicas ninja han sido superadas. Has demostrado una gran tenacidad. ¡Usa esta técnica secreta con sabiduría!',
    rewardTM: 'tm06',
    pokemon: ['koffing', 'muk', 'koffing', 'weezing'], levels: [37, 39, 37, 43], badgesRequired: 4,
    difficulties: {
      easy: { pokemon: ['koffing', 'muk', 'koffing', 'weezing'], levels: [37, 39, 37, 43] },
      normal: { pokemon: ['golbat', 'venomoth', 'muk', 'weezing'], levels: [54, 56, 58, 62] },
      hard: { pokemon: ['golbat', 'venomoth', 'muk', 'nidoking', 'nidoqueen', 'weezing'], levels: [74, 76, 76, 78, 78, 80] }
    }
  },
  {
    id: 'saffron', name: 'Gimnasio Azafrán', city: 'Ciudad Azafrán', locationId: 'saffron_city',
    leader: 'Sabrina', type: 'psychic', typeColor: '#FF793F',
    badge: '🔮', badgeName: 'Medalla Marsh',
    sprite: 'sabrina',
    quote: '¡Puedo leer tu mente y ver cada uno de tus movimientos!',
    victoryQuote: 'Lo predije... Tu victoria estaba escrita en las estrellas. Toma esto, desarrolla tu fuerza interior tanto como la de tus Pokémon.',
    rewardTM: 'tm04',
    pokemon: ['kadabra', 'mrmime', 'jynx', 'alakazam'], levels: [38, 37, 38, 43], badgesRequired: 5,
    difficulties: {
      easy: { pokemon: ['kadabra', 'mrmime', 'jynx', 'alakazam'], levels: [38, 37, 38, 43] },
      normal: { pokemon: ['kadabra', 'mrmime', 'jynx', 'alakazam'], levels: [58, 56, 58, 62] },
      hard: { pokemon: ['hypno', 'slowbro', 'jynx', 'mrmime', 'exeggutor', 'alakazam'], levels: [78, 78, 78, 78, 78, 82] }
    }
  },
  {
    id: 'cinnabar', name: 'Gimnasio Canela', city: 'Isla Canela', locationId: 'cinnabar_island',
    leader: 'Blaine', type: 'fire', typeColor: '#FF6B35',
    badge: '🔥', badgeName: 'Medalla Volcán',
    sprite: 'blaine',
    quote: '¡Si no podés soportar el calor, ¡salí de mi gimnasio!',
    victoryQuote: '¡Fuego! ¡Me has quemado vivo! ¡Qué combate más ardiente! ¡Lleva esta MT y haz que tu pasión arda con la misma intensidad!',
    rewardTM: 'tm38',
    pokemon: ['growlithe', 'ponyta', 'rapidash', 'arcanine'], levels: [42, 40, 42, 47], badgesRequired: 6,
    difficulties: {
      easy: { pokemon: ['growlithe', 'ponyta', 'rapidash', 'arcanine'], levels: [42, 40, 42, 47] },
      normal: { pokemon: ['magmar', 'ninetales', 'rapidash', 'arcanine'], levels: [62, 60, 62, 66] },
      hard: { pokemon: ['flareon', 'magmar', 'ninetales', 'rapidash', 'charizard', 'arcanine'], levels: [80, 82, 82, 82, 83, 85] }
    }
  },
  {
    id: 'viridian', name: 'Gimnasio Verde', city: 'Ciudad Verde', locationId: 'viridian_city',
    leader: 'Giovanni', type: 'ground', typeColor: '#c8a060',
    badge: '🌍', badgeName: 'Medalla Tierra',
    sprite: 'giovanni',
    quote: '¡Seré el último y más difícil obstáculo en tu camino!',
    victoryQuote: 'He perdido... Una vez más. Tu fuerza es incuestionable. No tengo nada más que enseñarte por ahora. Toma esto y sigue tu camino.',
    rewardTM: 'tm26',
    pokemon: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [45, 42, 44, 45, 50], badgesRequired: 7,
    difficulties: {
      easy: { pokemon: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [45, 42, 44, 45, 50] },
      normal: { pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [65, 66, 67, 70] },
      hard: { pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'marowak', 'sandslash', 'rhydon'], levels: [85, 87, 87, 87, 87, 90] }
    }
  },
] as const satisfies readonly Gym[];
export type GymId = (typeof GYMS)[number]['id'];
export const GYM_IDS = GYMS.map(gym => gym.id);

const gymMap: Record<GymId, Gym> = {
  pewter: GYMS[0],
  cerulean: GYMS[1],
  vermilion: GYMS[2],
  celadon: GYMS[3],
  fuchsia: GYMS[4],
  saffron: GYMS[5],
  cinnabar: GYMS[6],
  viridian: GYMS[7],
};

export const GYMS_BY_ID: Record<GymId, Gym> = Object.freeze(gymMap);

const GYM_IDS_SET: ReadonlySet<string> = new Set(GYM_IDS);

export function isGymId(value: string): value is GymId {
  return GYM_IDS_SET.has(value);
}

export function requireGymId(value: string): GymId {
  if (isGymId(value)) return value;
  throw new Error(`Invalid gym id: ${value}`);
}

export function getGymById(gymId: string): Gym {
  const cleanId = requireGymId(gymId);
  const gym = GYMS_BY_ID[cleanId];
  if (!gym) throw new Error(`[gyms] Gimnasio no encontrado: "${gymId}"`);
  return gym;
}
