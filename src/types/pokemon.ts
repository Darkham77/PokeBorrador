export type PokemonStatus = 'paralysis' | 'burn' | 'poison' | 'sleep' | 'freeze' | null;

export interface BreedingCompatibility {
  level: number;
  reason: string;
  sharedGroups: string[];
  eggSpecies?: string;
  motherId?: string;
}

export interface PokemonIVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface MoveEffect {
  type: 'status' | 'stat' | 'flinch' | 'confuse' | 'trap' | 'drain' | 'recoil' | 'recharge' | 'fixed' | 'multi' | 'heal' | string;
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
}

export interface PokemonMove extends Move {}

export interface Pokemon {
  uid: string;
  id: string;
  name: string;
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
  sleepTurns?: number;
  confused?: number;
  attracted?: boolean;
  cursed?: boolean;
  seeded?: boolean;
  badPoison?: boolean;
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
  nature: string;
  heldItem?: string | null;
  emoji?: string;
  friendship?: number;
  vigor?: number;
  catchRate?: number;
  obtainedAt?: number;
  obtainedMethod?: string;
  isAtmospheric?: boolean;
  weatherOrigin?: string;
  region?: string;
  ot_id?: string;
  tags?: string[];
  onMission?: boolean;
  onDefense?: boolean;
  inDaycare?: boolean;
  furyCutterCount?: number;
  lastMove?: Move | null;
  thrashTurns?: number;
  encoreMove?: Move | null;
  disabledMove?: Move | null;
  pendingMoves?: string[];
  originalForm?: any;
}

export interface PokemonEgg {
  uid: string;
  id: string;
  steps: number;
  ready: boolean;
  isShiny?: boolean;
  isGuardian?: boolean;
  nature?: string;
  abilitySlot?: number;
  gender?: 'M' | 'F' | 'N' | null;
  ivs?: Partial<PokemonIVs>;
  movesAtBirth?: string[];
  obtainedAt?: number;
}
