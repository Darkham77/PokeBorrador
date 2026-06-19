import {
  PDEX_ORDER,
  GEN2_PDEX_ORDER,
  GAME_TMS,
  TM_COMPAT
} from '../../data/pokemon/pokedex.ts';

export {
  PDEX_ORDER,
  GEN2_PDEX_ORDER,
  GAME_TMS,
  TM_COMPAT
};

export const PDEX_TYPE_COLORS: Record<string, string> = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', grass:'#78C850',
  electric:'#F8D030', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848', steel:'#B8B8D0'
};

export interface GameTM {
  id: string;
  name: string;
  type: string;
}
