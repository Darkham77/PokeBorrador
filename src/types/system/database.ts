
import type { StatId } from '@/logic/pokemon/statsMath';
import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonMoveId, PokemonStatus, MoveEffect, MoveEffectBoosts, ShowdownSecondaryEffect } from '@/types/pokemon/pokemon';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { FactionId, GenderId } from '@/types/system/game';

export interface LearnsetMove {
  lv: number;
  id: PokemonMoveId;
  name: string; // domain-ok
  pp: number;
}

export interface PokemonBaseData {
  name: string; // domain-ok
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
  isFloating?: boolean;
}

export interface PokemonData extends PokemonBaseData {
  id: PokemonSpeciesId;
  category: string; // domain-ok
  height: number | null;
  weight: number | null;
  description: string; // domain-ok
}

export interface AbilityBaseData {
  name?: string; // domain-ok
  desc: string; // domain-ok
  effect?: string; // domain-ok
}

export interface MoveBaseData {
  id: PokemonMoveId;
  name: string; // domain-ok
  power: number;
  acc: number;
  type: PokemonType;
  cat: 'physical' | 'special' | 'status';
  pp: number;
  priority?: number;
  effect?: MoveEffect | MoveEffect[];
  boosts?: MoveEffectBoosts;
  secondary?: ShowdownSecondaryEffect;
  secondaries?: ShowdownSecondaryEffect[];
  self?: ShowdownSecondaryEffect;
  status?: PokemonStatus;
  volatileStatus?: string; // domain-ok: Showdown condition id boundary
  sideCondition?: string; // domain-ok: Showdown side condition id boundary
  weather?: string; // domain-ok: Showdown weather id boundary
  recoil?: number | boolean;
  selfKO?: boolean;
  drain?: number | boolean;
  hits?: number | [number, number] | '2-5';
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
  category: string; // domain-ok
  description: string; // domain-ok
  catchRate: number;
}

export interface PokemonAesthetics {
  floating?: boolean;
  // Añadir más campos según sea necesario (alturas de sprite, etc)
}

export interface NatureBaseData {
  name: string; // domain-ok
  up: StatId | null;
  down: StatId | null;
  desc: string; // domain-ok
}
export type DBMode = 'online' | 'offline';

export interface DBConfig {
  url: string; // domain-ok
  key: string; // domain-ok
}

export interface DBRouterOptions {
  inMemory?: boolean;
}

export interface DBCompatibilityResponse {
  compatible: boolean;
  client: number;
  db: number;
  error?: string; // domain-ok
}

export interface DBResponse<T = unknown> {
  data: T | null;
  error: unknown;
  count?: number;
}

export interface ProxyQueryChainItem {
  type: string; // domain-ok
  args: unknown[];
}

/** Shared Supabase row shape used across leaderboard, playerSearch and social stores. */
export interface ProfileRow {
  id: string // domain-ok
  username: string // domain-ok
  elo_rating?: number
  trainer_level?: number
  badges?: number
  player_class?: PlayerClassId | null
  faction?: FactionId | null
  nick_style?: string | null // domain-ok
  avatar_style?: string | null // domain-ok
  gender?: GenderId | null
}

/** Shared Supabase row shape for game_saves table. */
export interface GameSaveRow {
  user_id: string // domain-ok
  save_data: Record<string, unknown> // open-record
  updated_at: string // domain-ok
}
