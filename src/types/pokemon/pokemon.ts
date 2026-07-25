export type ActivePokemonStatus = 'par' | 'brn' | 'psn' | 'slp' | 'frz' | 'tox';
export type PokemonStatus = ActivePokemonStatus | '';

export function isPokemonStatus(status: unknown): status is PokemonStatus {
  if (status === null || status === undefined || status === '') return true;
  if (typeof status !== 'string') return false;
  return ['par', 'brn', 'psn', 'slp', 'frz', 'tox'].includes(status);
}

export interface BreedingCompatibility {
  level: number;
  reason: string;
  sharedGroups: string[];
  eggSpecies?: string;
  motherId?: string;
}

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface PokemonIVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  [key: string]: number | undefined;
}

export interface PokemonEVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  [key: string]: number | undefined;
}

export interface MoveEffect {
  type: 'status' | 'stat' | 'flinch' | 'confuse' | 'trap' | 'drain' | 'recoil' | 'recharge' | 'fixed' | 'multi' | 'heal';
  status?: PokemonStatus;
  stat?: keyof PokemonIVs;
  stages?: number;
  chance?: number;
  val?: number;
  percent?: number;
  text?: string;
}

export interface Move {
  id?: string;
  name: string;
  type?: string;
  cat?: 'physical' | 'special' | 'status';
  power?: number;
  acc?: number;
  pp: number;
  maxPP: number;
  desc?: string;
  drain?: number | boolean;
  priority?: number;
  crit?: number;
  target?: 'enemy' | 'self' | 'all';
  effect?: MoveEffect | MoveEffect[] | string;
  fixedDmg?: number;
  levelDmg?: boolean;
  halfHP?: boolean;
  hits?: number | string;
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
  uid: string;
  id: string;
  name: string;
  species?: string;
  details?: string;
  nickname?: string | null;
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
  type: string;
  type2?: string;
  isShiny?: boolean;
  isGuardian?: boolean;
  isFloating?: boolean;
  gender?: 'M' | 'F' | 'N' | null;
  status?: PokemonStatus;
  fainted?: boolean;
  volatileCounters?: Record<string, number>;
  sleepTurns?: number;
  confused?: number;
  attracted?: boolean;
  cursed?: boolean;
  seeded?: boolean;
  badPoison?: number;
  ingrain?: boolean;
  protect?: boolean;
  detect?: boolean;
  endure?: boolean;
  substitute?: number;
  focusEnergy?: boolean;
  lockOn?: boolean;
  isTransformed?: boolean;
  rageActive?: boolean;
  snatching?: boolean;
  tormentActive?: boolean;
  mustRecharge?: boolean;
  bound?: number;
  tauntTurns?: number;
  encoreTurns?: number;
  disabledTurns?: number;
  flinched?: boolean;
  destinyBond?: boolean;
  perishSongCount?: number;
  ability?: string;
  moves: (Move | null)[];
  caught?: boolean;
  isBoxed?: boolean;
  ivs: PokemonIVs;
  evs?: PokemonEVs;
  nature: string;
  heldItem?: string | null;
  lastItem?: string | null;
  slotIndex?: number;
  position?: number;
  item?: string | null; // @deprecated use heldItem
  friendship?: number;
  vigor?: number;
  maxVigor?: number;
  catchRate?: number;
  obtainedAt?: number;
  obtainedMethod?: string;
  isAtmospheric?: boolean;
  weatherOrigin?: string;
  isWeatherStruggling?: boolean;
  region?: string;
  ot_id?: string;
  tags?: string[];
  onMission?: boolean;
  onDefense?: boolean;
  inDaycare?: boolean;
  daycareSlot?: number;
  daycareDepositedAt?: string;
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
  aura?: string;
  isAncestral?: boolean;
  choiceMove?: string;
  originalDitto?: Partial<Pokemon>;
  form?: string;
}


export interface PokemonEgg {
  uid: string;
  id: string;
  pokemonId?: string;
  steps: number;
  totalSteps?: number;
  ready: boolean;
  isShiny?: boolean;
  isGuardian?: boolean;
  nature?: string;
  abilitySlot?: number;
  gender?: 'M' | 'F' | 'N' | null;
  ivs?: Partial<PokemonIVs>;
  movesAtBirth?: string[];
  obtainedAt?: number;
  scanned?: boolean;
  predictedInfo?: {
    name: string;
    ivTotal: number;
  };
  tint?: string;
  isAncestral?: boolean;
  color?: string;
  isNpc?: boolean;
}
