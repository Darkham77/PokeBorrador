import type { BattleSide } from '../battle/battle.ts';
import type { PokemonType } from '@/data/battle/types';
import type { NatureId } from '@/data/battle/natures';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ItemId } from '@/data/inventory/items';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { PokemonMoveId, MoveCategory } from '@/data/battle/moves';
import type { AbilityId } from '@/data/battle/abilities';

export type { PokemonMoveId };

export const POKEMON_STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export type PokemonStatKey = (typeof POKEMON_STAT_KEYS)[number];
export const STAT_BAR_MODES = ['full', 'stat', 'iv'] as const;
export type StatBarMode = (typeof STAT_BAR_MODES)[number];
export const POKEMON_STATUSES = ['par', 'brn', 'psn', 'slp', 'frz', 'tox'] as const; // lib-duplicate-ok: Library utility implementation duplication
export type PokemonStatus = (typeof POKEMON_STATUSES)[number] | '';
export const STATUS_CLEAR_TARGETS = ['any', 'poison', ...POKEMON_STATUSES] as const;
export type StatusClearTarget = (typeof STATUS_CLEAR_TARGETS)[number];
export const POKERUS_STATUSES = ['uninfected', 'infected', 'cured'] as const;
export type PokerusStatus = (typeof POKERUS_STATUSES)[number];
export const POKEMON_GENDERS = ['m', 'f'] as const;
export type PokemonGender = (typeof POKEMON_GENDERS)[number] | null;

export const POKEMON_GENDER_NAMES = ['male', 'female', 'genderless'] as const;
export type PokemonGenderName = (typeof POKEMON_GENDER_NAMES)[number];

export const POKEDEX_STATUSES = ['none', 'seen', 'caught'] as const;
export type PokedexStatus = (typeof POKEDEX_STATUSES)[number];

export const POKEMON_STORAGE_LOCATIONS = ['team', 'box'] as const;
export type PokemonStorageLocation = (typeof POKEMON_STORAGE_LOCATIONS)[number];

export const POKEMON_SELECTION_SOURCES = ['team', 'box', 'market', 'pokedex'] as const;
export type PokemonSelectionSource = (typeof POKEMON_SELECTION_SOURCES)[number];

export type VolatileStatusKey = string; // string-ok: Internal string formatting or DOM token identifier Showdown dynamic volatile status key (e.g. toID(move.name))

export function isVolatileStatusKey(value: string): value is VolatileStatusKey {
  return typeof value === 'string' && value.length > 0 && /^[a-z0-9]+$/i.test(value);
}

export function requireVolatileStatusKey(value: string): VolatileStatusKey {
  if (isVolatileStatusKey(value)) return value;
  throw new Error(`Invalid volatile status key: ${value}`);
}

export const OBTAINED_METHODS = ['wild', 'trade', 'egg', 'starter', 'gift', 'fishing', 'archaeology', 'gift_starter', 'reward', 'event'] as const;
export type ObtainedMethod = (typeof OBTAINED_METHODS)[number];

export function isPokemonStatus(status: unknown): status is PokemonStatus {
  if (status === '') return true;
  if (typeof status !== 'string') return false;
  return ['par', 'brn', 'psn', 'slp', 'frz', 'tox'].includes(status);
}

export function requirePokemonStatus(status: string): PokemonStatus {
  if (isPokemonStatus(status)) return status;
  throw new Error(`Invalid Pokemon status: ${status}`);
}

export function isPokerusStatus(status: unknown): status is PokerusStatus {
  if (typeof status !== 'string') return false;
  return POKERUS_STATUSES.includes(status as PokerusStatus);
}

export function requirePokerusStatus(status: string): PokerusStatus {
  if (isPokerusStatus(status)) return status;
  throw new Error(`Invalid Pokerus status: ${status}`);
}

export interface BreedingCompatibility {
  level: number;
  reason: string; // domain-ok: Open dynamic text or non-domain string payload
  sharedGroups: string[]; // domain-ok: Open dynamic text or non-domain string payload
  eggSpecies?: PokemonSpeciesId;
  motherId?: string; // domain-ok: Open dynamic text or non-domain string payload
}



export type StatSpread = Record<PokemonStatKey, number>;

export type PokemonIVs = Record<PokemonStatKey, number>;

export type PokemonEVs = Record<PokemonStatKey, number>;

export interface MoveEffect {
  type: 'status' | 'stat' | 'flinch' | 'confuse' | 'trap' | 'drain' | 'recoil' | 'recharge' | 'fixed' | 'multi' | 'heal';
  status?: PokemonStatus;
  stat?: PokemonStatKey;
  stages?: number;
  chance?: number;
  val?: number;
  percent?: number;
  text?: string; // domain-ok: Open dynamic text or non-domain string payload
}

export const SHOWDOWN_BOOST_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'] as const;
export type ShowdownBoostStatKey = (typeof SHOWDOWN_BOOST_STAT_KEYS)[number];
export type MoveEffectBoosts = Partial<Record<ShowdownBoostStatKey, number>>;

export interface ShowdownHitEffect {
  boosts?: MoveEffectBoosts;
  status?: PokemonStatus;
  volatileStatus?: string; // domain-ok: Showdown condition id boundary
  sideCondition?: string; // domain-ok: Showdown side condition id boundary
  slotCondition?: string; // domain-ok: Showdown slot condition id boundary
  pseudoWeather?: string; // domain-ok: Showdown pseudo-weather id boundary
  terrain?: string; // domain-ok: Showdown terrain id boundary
  weather?: string; // domain-ok: Showdown weather id boundary
}

export interface ShowdownSecondaryEffect extends ShowdownHitEffect {
  chance?: number;
  self?: ShowdownHitEffect;
}

export interface Move {
  id?: PokemonMoveId;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  type?: PokemonType;
  cat?: MoveCategory;
  power?: number;
  acc?: number;
  pp: number;
  maxPP: number;
  desc?: string; // domain-ok: Open dynamic text or non-domain string payload
  drain?: number | boolean;
  priority?: number;
  crit?: number;
  target?: 'enemy' | 'self' | 'all';
  effect?: MoveEffect | MoveEffect[];
  boosts?: MoveEffectBoosts;
  secondary?: ShowdownSecondaryEffect;
  secondaries?: ShowdownSecondaryEffect[];
  self?: ShowdownSecondaryEffect;
  status?: PokemonStatus;
  volatileStatus?: string; // domain-ok: Showdown condition id boundary
  sideCondition?: string; // domain-ok: Showdown side condition id boundary
  weather?: string; // domain-ok: Showdown weather id boundary
  fixedDmg?: number;
  levelDmg?: boolean;
  halfHP?: boolean;
  hits?: number | [number, number] | '2-5';
  recoil?: number | boolean;
  selfKO?: boolean;
  side?: BattleSide;
  ohko?: boolean;
  endeavor?: boolean;
  counter?: boolean;
  turns?: number;
  sound?: boolean;
  disabled?: boolean;
}

export interface Pokemon {
  uid: string; // domain-ok: Open dynamic text or non-domain string payload
  id: PokemonSpeciesId;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  species: PokemonSpeciesId;
  details?: string; // domain-ok: Open dynamic text or non-domain string payload
  nickname?: string | null; // domain-ok: Open dynamic text or non-domain string payload
  level: number;
  exp: number;
  expNeeded: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  type: PokemonType;
  type2?: PokemonType | null;
  addedType?: PokemonType;
  status: PokemonStatus;
  statusTurns?: number;
  sleepTurns?: number;
  isShiny: boolean;
  gender?: PokemonGender;
  substitute?: number;
  protect?: boolean;
  detect?: boolean;
  focusEnergy?: boolean;
  volatileCounters?: Partial<Record<VolatileStatusKey, number>>;
  confused?: number;
  attracted?: boolean;
  cursed?: boolean;
  seeded?: boolean;
  badPoison?: number;
  endure?: boolean;
  isTransformed?: boolean;
  _originalMoves?: (Move | null)[];
  _originalSpecies?: PokemonSpeciesId;
  _originalType?: PokemonType;
  _originalType2?: PokemonType | null;
  rageActive?: boolean;
  snatching?: boolean;
  tormentActive?: boolean;
  mustRecharge?: boolean;
  ingrain?: boolean;
  lockOn?: boolean;
  bound?: number;
  fainted?: boolean;
  tauntTurns?: number;
  encoreTurns?: number;
  disabledTurns?: number;
  flinched?: boolean;
  destinyBond?: boolean;
  perishSongCount?: number;
  ability?: AbilityId;
  moves: (Move | null)[];
  caught?: boolean;
  isBoxed?: boolean;
  ivs: PokemonIVs;
  evs?: PokemonEVs;
  pokerus?: PokerusStatus;
  nature: NatureId;
  heldItem?: ItemId | null;
  lastItem?: ItemId | null;
  slotIndex?: number;
  position?: number;
  item?: ItemId | null; // @deprecated use heldItem
  friendship?: number;
  vigor?: number;
  maxVigor?: number;
  catchRate?: number;
  obtainedAt?: number;
  obtainedMethod?: ObtainedMethod;
  isAtmospheric?: boolean;
  isFloating?: boolean;
  weatherOrigin?: WeatherId;
  isWeatherStruggling?: boolean;
  isGuardian?: boolean;
  region?: string; // domain-ok: Open dynamic text or non-domain string payload
  ot_id?: string; // domain-ok: Open dynamic text or non-domain string payload
  tags?: string[]; // domain-ok: Open dynamic text or non-domain string payload
  onMission?: boolean;
  onEvent?: boolean;
  onDefense?: boolean;
  inDaycare?: boolean;
  daycareSlot?: number;
  daycareDepositedAt?: string; // domain-ok: Open dynamic text or non-domain string payload
  furyCutterCount?: number;
  lastMove?: Move | null;
  thrashTurns?: number;
  encoreMove?: Move | null;
  disabledMove?: Move | null;
  pendingMoves?: Move[];
  trapped?: boolean;
  identified?: boolean;
  originalForm?: Pokemon | null;
  pts?: number;

  chargingMove?: Move | null;
  aura?: string; // domain-ok: Open dynamic text or non-domain string payload
  isAncestral?: boolean;
  choiceMove?: PokemonMoveId;
  originalDitto?: Partial<Pokemon>;
  form?: string; // domain-ok: Open dynamic text or non-domain string payload
  isIllegal?: boolean;
  illegalReasons?: string[]; // domain-ok: Open dynamic text or non-domain string payload
  height?: number;
  weight?: number;
  trophies?: PokemonCompetitionTrophy[];
}

export const POKEMON_COMPETITION_RANKS = ['first', 'second', 'third'] as const;
export type PokemonCompetitionRank = (typeof POKEMON_COMPETITION_RANKS)[number];

export interface PokemonCompetitionTrophy {
  eventId: string; // domain-ok: Open dynamic text or non-domain string payload
  eventName: string; // domain-ok: Open dynamic text or non-domain string payload
  categoryId: string; // domain-ok: Open dynamic text or non-domain string payload
  categoryName: string; // domain-ok: Open dynamic text or non-domain string payload
  rank: PokemonCompetitionRank;
  score: number;
  awardedAt: number;
}


export interface PokemonEgg {
  uid: string; // domain-ok: Open dynamic text or non-domain string payload
  id: PokemonSpeciesId;
  pokemonId?: PokemonSpeciesId;
  steps: number;
  totalSteps?: number;
  ready: boolean;
  isShiny?: boolean;
  isGuardian?: boolean;
  nature?: NatureId;
  abilitySlot?: number;
  gender?: PokemonGender;
  ivs?: Partial<PokemonIVs>;
  movesAtBirth?: PokemonMoveId[];
  obtainedAt?: number;
  scanned?: boolean;
  predictedInfo?: {
    name: string; // domain-ok: Open dynamic text or non-domain string payload
    ivTotal: number;
  };
  tint?: string; // domain-ok: Open dynamic text or non-domain string payload
  isAncestral?: boolean;
  color?: string; // domain-ok: Open dynamic text or non-domain string payload
  isNpc?: boolean;
}
