import { GYM_IDS, type GymId } from '@/data/world/gyms';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ItemId } from '@/data/inventory/items';
import type { GameState } from '@/types/system/game';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';

export interface GymRematchRewardItem {
  readonly itemId: ItemId;
  readonly quantity: number;
}

export interface GymRematchConfig {
  readonly gymId: GymId;
  readonly pokemon: readonly PokemonSpeciesId[];
  readonly levels: readonly number[];
  readonly rewardItems: readonly GymRematchRewardItem[];
  readonly rewardBattleCoins: number;
  readonly quote: string; // domain-ok: Open dynamic text or non-domain string payload
}

export const GYM_REMATCHES: Record<GymId, GymRematchConfig> = {
  pewter: {
    gymId: 'pewter',
    pokemon: ['golem', 'rhydon', 'omastar', 'kabutops', 'aerodactyl', 'onix'],
    levels: [72, 73, 74, 75, 76, 78],
    rewardItems: [
      { itemId: 'hardstone', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: '¡Mi fortaleza de roca ahora es invulnerable! ¡Demuéstrame el verdadero poder de tu equipo!'
  },
  cerulean: {
    gymId: 'cerulean',
    pokemon: ['lapras', 'vaporeon', 'gyarados', 'blastoise', 'cloyster', 'starmie'],
    levels: [73, 74, 75, 76, 77, 80],
    rewardItems: [
      { itemId: 'mysticwater', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: '¡Mis olas son un tsunami imparable! ¡Prepárate para sumergirte en el abismo!'
  },
  vermilion: {
    gymId: 'vermilion',
    pokemon: ['electrode', 'magneton', 'jolteon', 'electabuzz', 'pikachu', 'raichu'],
    levels: [74, 75, 75, 76, 77, 80],
    rewardItems: [
      { itemId: 'magnet', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: '¡Diez millones de voltios te esperan! ¡No podrás esquivar mi descarga definitiva!'
  },
  celadon: {
    gymId: 'celadon',
    pokemon: ['tangela', 'victreebel', 'vileplume', 'venusaur', 'parasect', 'exeggutor'],
    levels: [74, 75, 75, 76, 77, 80],
    rewardItems: [
      { itemId: 'miracleseed', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: 'La belleza de la naturaleza florece con más fuerza bajo la tormenta.'
  },
  fuchsia: {
    gymId: 'fuchsia',
    pokemon: ['venomoth', 'muk', 'weezing', 'tentacruel', 'golbat', 'gengar'],
    levels: [75, 76, 76, 77, 78, 80],
    rewardItems: [
      { itemId: 'poisonbarb', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: '¡Las artes ninja no tienen piedad! ¡Siente el veneno de las sombras!'
  },
  saffron: {
    gymId: 'saffron',
    pokemon: ['mrmime', 'hypno', 'jynx', 'slowbro', 'kadabra', 'alakazam'],
    levels: [76, 77, 77, 78, 79, 82],
    rewardItems: [
      { itemId: 'twistedspoon', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: 'Mis poderes psíquicos han visto el desenlace... pero dime, ¿puedes cambiar el destino?'
  },
  cinnabar: {
    gymId: 'cinnabar',
    pokemon: ['ninetales', 'flareon', 'rapidash', 'charizard', 'magmar', 'arcanine'],
    levels: [77, 78, 78, 79, 80, 83],
    rewardItems: [
      { itemId: 'charcoal', quantity: 2 },
      { itemId: 'rarecandy', quantity: 3 }
    ],
    rewardBattleCoins: 150,
    quote: '¡Arde al rojo vivo! ¡Ningún rival apaga las llamas de Isla Canela!'
  },
  viridian: {
    gymId: 'viridian',
    pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'rhydon', 'marowak', 'kangaskhan'],
    levels: [78, 79, 80, 81, 82, 85],
    rewardItems: [
      { itemId: 'softsand', quantity: 2 },
      { itemId: 'rarecandy', quantity: 5 }
    ],
    rewardBattleCoins: 250,
    quote: 'Bienvenido a mi verdadera fuerza. Aquí no hay trucos: sólo poder absoluto.'
  }
};

export function getTodayDateString(): string {
  return Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).toPlainDate().toString();
}

export function isGymRematchAvailable(
  state: GameState,
  gymId: GymId,
  currentDate?: string // domain-ok: Open dynamic text or non-domain string payload
): boolean {
  // Must have defeated hard difficulty first
  const prog = state.gymProgress?.[gymId];
  if (!prog || !prog.hard) return false;

  const today = currentDate || getTodayDateString();
  const lastDoneDate = state.dailyGymRematches?.[gymId];

  // If already done today, not available
  return lastDoneDate !== today;
}

export function isGymRematchCompletedToday(
  state: GameState,
  gymId: GymId,
  currentDate?: string // domain-ok: Open dynamic text or non-domain string payload
): boolean {
  const today = currentDate || getTodayDateString();
  return state.dailyGymRematches?.[gymId] === today;
}

export function recordGymRematchCompletion(
  state: GameState,
  gymId: GymId,
  currentDate?: string // domain-ok: Open dynamic text or non-domain string payload
): void {
  if (!state.dailyGymRematches) {
    state.dailyGymRematches = {};
  }
  const today = currentDate || getTodayDateString();
  state.dailyGymRematches[gymId] = today;
}

export function getAvailableGymRematches(
  state: GameState,
  currentDate?: string // domain-ok: Open dynamic text or non-domain string payload
): GymId[] {
  return GYM_IDS.filter(id => isGymRematchAvailable(state, id, currentDate));
}
