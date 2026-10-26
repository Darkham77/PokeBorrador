import type { AssetUri, DisplayText, IsoDateString, JsonObject } from '@francogp/auditor';

import type { PokemonType } from '@/data/battle/types';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { GymId } from '@/data/world/gyms';
import type {
  PokemonMoveId,
  PokemonStatus,
  MoveEffect,
  MoveEffectBoosts,
  ShowdownSecondaryEffect,
  PokemonStatKey
} from '@/types/pokemon/pokemon';
import type { FactionId, GenderId } from '@/types/system/game';
export type { SessionMode } from '../auth/auth.ts';
import type { GenderName } from '@pkmn/types';

import type { AbilityId } from '@/data/battle/abilities';
import type { MoveCategory } from '@/data/battle/moves';

export const SQL_PROXY_ACTIONS = ['select', 'upsert', 'update', 'delete', 'insert'] as const;
export type SqlProxyAction = (typeof SQL_PROXY_ACTIONS)[number];

export const SQL_PROXY_COUNT_MODES = ['exact', 'planned', 'estimated'] as const;
export type SqlProxyCountMode = (typeof SQL_PROXY_COUNT_MODES)[number];

export interface LearnsetMove {
  lv: number;
  id: PokemonMoveId;
  name: DisplayText;
  pp: number;
}

export interface PokemonBaseData {
  name: DisplayText;
  type: PokemonType;
  type2?: PokemonType;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  catchRate: number;
  learnset: LearnsetMove[];
  abilities?: AbilityId[];
  gender?: GenderName | number;
  height?: number | null;
  weight?: number | null;
  compatMoves?: PokemonMoveId[];
  isFloating?: boolean;
}

export interface PokemonData extends PokemonBaseData {
  id: PokemonSpeciesId;
  category: DisplayText;
  height: number | null;
  weight: number | null;
  description: DisplayText;
}

export interface AbilityBaseData {
  name?: DisplayText;
  desc: DisplayText;
  effect?: DisplayText;
}

export interface MoveBaseData {
  id: PokemonMoveId;
  name: DisplayText;
  power: number;
  acc: number;
  type: PokemonType;
  cat: MoveCategory;
  pp: number;
  priority?: number;
  effect?: MoveEffect | MoveEffect[];
  boosts?: MoveEffectBoosts;
  secondary?: ShowdownSecondaryEffect;
  secondaries?: ShowdownSecondaryEffect[];
  self?: ShowdownSecondaryEffect;
  status?: PokemonStatus;
  volatileStatus?: DisplayText;
  sideCondition?: DisplayText;
  weather?: DisplayText;
  recoil?: number | boolean;
  selfKO?: boolean;
  drain?: number | boolean;
  hits?: number | [number, number] | readonly number[] | number[] | '2-5';
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
  category: DisplayText;
  description: DisplayText;
  catchRate: number;
}

export interface PokemonAesthetics {
  floating?: boolean;
  // Add more fields as needed (sprite heights, etc.)
}

export interface NatureBaseData {
  name: DisplayText;
  up: PokemonStatKey | null;
  down: PokemonStatKey | null;
  desc: DisplayText;
}

export interface DBConfig {
  url: AssetUri;
  key: DisplayText;
}

export interface DBRouterOptions {
  inMemory?: boolean;
}

export interface DBCompatibilityResponse {
  compatible: boolean;
  client: number;
  db: number;
  error?: DisplayText;
}

export interface DBResponse<T = unknown> {
  data: T | null;
  error: unknown;
  count?: number;
}

export interface ProxyQueryChainItem {
  type: DisplayText;
  args: unknown[];
}

/** Shared Supabase row shape used across leaderboard, playerSearch and social stores. */
export interface ProfileRow {
  id: DisplayText;
  username: DisplayText;
  elo_rating?: number;
  trainer_level?: number;
  badges?: number;
  player_class?: PlayerClassId | null;
  faction?: FactionId | null;
  nick_style?: DisplayText | null;
  avatar_style?: DisplayText | null;
  gender?: GenderId | null;
  last_played_at?: IsoDateString | null;
  pokedex_caught?: number | null;
  pokedex_seen?: number | null;
  trainers_defeated?: number | null;
  wild_wins?: number | null;
  war_coins?: number | null;
  defeated_gyms?: readonly GymId[] | null;
}

/** Shared Supabase row shape for game_saves table. */
export interface GameSaveRow {
  user_id: DisplayText;
  save_data: JsonObject;
  updated_at: IsoDateString;
}
