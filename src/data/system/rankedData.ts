import type { PokemonType } from '../battle/types.ts';

export const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'] as const;
export type RankedTierId = (typeof RANKED_TIER_ORDER)[number];

export const RANKED_TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic',
  'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'
];

export const RANKED_REWARD_MILESTONES = [
  { id: 'bronce_1000', tier: 'Bronce', elo: 1000, rewards: { 'naturepatch': 1 }, icon: '🍃' },
  { id: 'bronce_1100', tier: 'Bronce', elo: 1100, rewards: { 'naturepatch': 1 }, icon: '🍃' },
  { id: 'plata_1200', tier: 'Plata', elo: 1200, rewards: { 'naturepatch': 1, 'vigorcandy': 1 }, icon: '🍬' },
  { id: 'plata_1400', tier: 'Plata', elo: 1400, rewards: { 'naturepatch': 2 }, icon: '🍃' },
  { id: 'oro_1600', tier: 'Oro', elo: 1600, rewards: { 'vigorcandy': 2 }, icon: '🍬' },
  { id: 'oro_1800', tier: 'Oro', elo: 1800, rewards: { 'naturepatch': 2, 'vigorcandy': 1 }, icon: '🍬' },
  { id: 'oro_2000', tier: 'Oro', elo: 2000, rewards: { 'naturepatch': 2 }, icon: '🍃' },
  { id: 'platino_2100', tier: 'Platino', elo: 2100, rewards: { 'naturepatch': 1, 'vigorcandy': 2 }, icon: '💊' },
  { id: 'platino_2400', tier: 'Platino', elo: 2400, rewards: { 'naturepatch': 2, 'vigorcandy': 2 }, icon: '💊' },
  { id: 'diamante_2700', tier: 'Diamante', elo: 2700, rewards: { 'abilitypill': 1, 'vigorcandy': 2 }, icon: '🪙' },
  { id: 'diamante_3000', tier: 'Diamante', elo: 3000, rewards: { 'naturepatch': 3, 'vigorcandy': 2 }, icon: '🍃' },
  { id: 'diamante_3300', tier: 'Diamante', elo: 3300, rewards: { 'abilitypill': 1 }, icon: '💊' },
  { id: 'maestro_3400', tier: 'Maestro', elo: 3400, rewards: { 'abilitypill': 2, 'naturepatch': 3, 'vigorcandy': 3 }, icon: '🌟' }
];

export const RANKED_TYPE_META = {
  normal:   { label: 'Normal', icon: '⚪' },
  fire:     { label: 'Fuego', icon: '🔥' },
  water:    { label: 'Agua', icon: '💧' },
  electric: { label: 'Eléctrico', icon: '⚡' },
  grass:    { label: 'Planta', icon: '🌿' },
  ice:      { label: 'Hielo', icon: '❄️' },
  fighting: { label: 'Lucha', icon: '🥊' },
  poison:   { label: 'Veneno', icon: '☠️' },
  ground:   { label: 'Tierra', icon: '⛰️' },
  flying:   { label: 'Volador', icon: '🦅' },
  psychic:  { label: 'Psíquico', icon: '🔮' },
  bug:      { label: 'Bicho', icon: '🐛' },
  rock:     { label: 'Roca', icon: '🌑' },
  ghost:    { label: 'Fantasma', icon: '👻' },
  dragon:   { label: 'Dragón', icon: '🐲' },
  dark:     { label: 'Siniestro', icon: '🌑' },
  steel:    { label: 'Acero', icon: '⚙️' }
};
