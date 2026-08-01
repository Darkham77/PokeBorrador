import type { PokemonType } from '@/data/battle/types';
import type { NatureId } from '@/data/battle/natures';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ItemId } from '@/data/inventory/items';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { PokemonMoveId } from '@/data/battle/moves';
import type { AbilityId } from '@/data/battle/abilities';

export type { PokemonMoveId };

export type PokemonStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export const POKEMON_STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const satisfies readonly PokemonStatKey[];
export type ActivePokemonStatus = 'par' | 'brn' | 'psn' | 'slp' | 'frz' | 'tox';
export type PokemonStatus = ActivePokemonStatus | '';
export type PokemonGender = 'm' | 'f' | null;
export type VolatileStatusKey = string; // Showdown dynamic volatile status key (e.g. toID(move.name))

export function isVolatileStatusKey(value: string): value is VolatileStatusKey {
  return typeof value === 'string' && value.length > 0 && /^[a-z0-9]+$/i.test(value);
}

export function requireVolatileStatusKey(value: string): VolatileStatusKey {
  if (isVolatileStatusKey(value)) return value;
  throw new Error(`Invalid volatile status key: ${value}`);
}

export type ObtainedMethod = 'wild' | 'trade' | 'egg' | 'starter' | 'gift' | 'fishing' | 'archaeology' | 'gift_starter' | 'reward' | 'event';

export function isPokemonStatus(status: unknown): status is PokemonStatus {
  if (status === '') return true;
  if (typeof status !== 'string') return false;
  return ['par', 'brn', 'psn', 'slp', 'frz', 'tox'].includes(status);
}

export function requirePokemonStatus(status: string): PokemonStatus {
  if (isPokemonStatus(status)) return status;
  throw new Error(`Invalid Pokemon status: ${status}`);
}

export interface BreedingCompatibility {
  level: number;
  reason: string; // domain-ok
  sharedGroups: string[]; // domain-ok
  eggSpecies?: PokemonSpeciesId;
  motherId?: string; // domain-ok
}



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
  text?: string; // domain-ok
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
  name: string; // domain-ok
  type?: PokemonType;
  cat?: 'physical' | 'special' | 'status';
  power?: number;
  acc?: number;
  pp: number;
  maxPP: number;
  desc?: string; // domain-ok
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
  side?: 'player' | 'enemy';
  ohko?: boolean;
  endeavor?: boolean;
  counter?: boolean;
  turns?: number;
  sound?: boolean;
  disabled?: boolean;
}

export type PokemonMove = Move;

export interface Pokemon {
  uid: string; // domain-ok
  id: PokemonSpeciesId;
  name: string; // domain-ok
  species: PokemonSpeciesId;
  details?: string; // domain-ok
  nickname?: string | null; // domain-ok
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
  isShiny?: boolean;
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
  region?: string; // domain-ok
  ot_id?: string; // domain-ok
  tags?: string[]; // domain-ok
  onMission?: boolean;
  onDefense?: boolean;
  inDaycare?: boolean;
  daycareSlot?: number;
  daycareDepositedAt?: string; // domain-ok
  furyCutterCount?: number;
  lastMove?: Move | null;
  thrashTurns?: number;
  encoreMove?: Move | null;
  disabledMove?: Move | null;
  pendingMoves?: PokemonMove[];
  trapped?: boolean;
  identified?: boolean;
  originalForm?: Pokemon | null;
  pts?: number;
  futureSightTurns?: number;
  futureSightDmg?: number;
  chargingMove?: Move | null;
  aura?: string; // domain-ok
  isAncestral?: boolean;
  choiceMove?: PokemonMoveId;
  originalDitto?: Partial<Pokemon>;
  form?: string; // domain-ok
}


export interface PokemonEgg {
  uid: string; // domain-ok
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
    name: string; // domain-ok
    ivTotal: number;
  };
  tint?: string; // domain-ok
  isAncestral?: boolean;
  color?: string; // domain-ok
  isNpc?: boolean;
}
