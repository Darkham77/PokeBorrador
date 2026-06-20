
export interface LearnsetMove {
  lv: number;
  id: string;
  name: string;
  pp: number;
}

export interface PokemonBaseData {
  name: string;
  emoji?: string;
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
  height: number;
  weight: number;
  description: string;
}

export interface PokemonAesthetics {
  floating?: boolean;
  // Añadir más campos según sea necesario (alturas de sprite, etc)
}

export interface NatureBaseData {
  name: string;
  up: string | null;
  down: string | null;
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
  error: Error | string | null | unknown;
  count?: number;
}

export interface ProxyQueryChainItem {
  type: string;
  args: unknown[];
}
