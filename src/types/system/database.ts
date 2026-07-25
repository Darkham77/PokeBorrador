
import type { StatId } from '@/logic/pokemon/statsMath';

export interface LearnsetMove {
  lv: number;
  id: string;
  name: string;
  pp: number;
}

export interface PokemonBaseData {
  name: string;
  type: string;
  type2?: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  catchRate: number;
  learnset: LearnsetMove[];
  isFloating?: boolean;
}

export interface PokemonData extends PokemonBaseData {
  id: string;
  category: string;
  height: number | null;
  weight: number | null;
  description: string;
}

export interface AbilityBaseData {
  name?: string;
  desc: string;
  effect?: string;
}

export interface MoveBaseData {
  id: string;
  name: string;
  power: number;
  acc: number;
  type: string;
  cat: 'physical' | 'special' | 'status';
  pp: number;
  priority?: number;
  effect?: string;
  recoil?: number | boolean;
  selfKO?: boolean;
  drain?: number | boolean;
  hits?: number | string;
  fixedDmg?: number;
  ohko?: boolean;
  halfHP?: boolean;
  endeavor?: boolean;
  levelDmg?: boolean;
  counter?: boolean;
  turns?: number;
  sound?: boolean;
}

export interface SpeciesMetadata {
  category: string;
  description: string;
  catchRate: number;
}

export interface PokemonAesthetics {
  floating?: boolean;
  // Añadir más campos según sea necesario (alturas de sprite, etc)
}

export interface NatureBaseData {
  name: string;
  up: StatId | null;
  down: StatId | null;
  desc: string;
}
export type DBMode = 'online' | 'offline';

export interface DBConfig {
  url: string;
  key: string;
}

export interface DBRouterOptions {
  inMemory?: boolean;
}

export interface DBCompatibilityResponse {
  compatible: boolean;
  client: number;
  db: number;
  error?: string;
}

export interface DBResponse<T = unknown> {
  data: T | null;
  error: unknown;
  count?: number;
}

export interface ProxyQueryChainItem {
  type: string;
  args: unknown[];
}

/** Shared Supabase row shape used across leaderboard, playerSearch and social stores. */
export interface ProfileRow {
  id: string
  username: string
  elo_rating?: number
  trainer_level?: number
  badges?: number
  player_class?: string
  faction?: string
  nick_style?: string
  avatar_style?: string
  gender?: string
}

/** Shared Supabase row shape for game_saves table. */
export interface GameSaveRow {
  user_id: string
  save_data: Record<string, unknown>
  updated_at: string
}
