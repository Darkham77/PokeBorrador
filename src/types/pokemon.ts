
export type PokemonStatus = 'paralyze' | 'burn' | 'freeze' | 'poison' | 'toxic' | 'sleep' | null;

export interface PokemonIVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface PokemonMove {
  name: string;
  pp: number;
  maxPP: number;
  type?: string;
  power?: number;
  acc?: number;
  cat?: 'physical' | 'special' | 'status';
  effect?: string | null;
  flinch?: boolean;
  selfKO?: boolean;
}

export interface Pokemon {
  uid: string;
  id: string;
  name: string;
  emoji?: string;
  type: string;
  type2?: string;
  catchRate: number;
  level: number;
  exp: number;
  expNeeded: number;
  ivs: PokemonIVs;
  nature: string;
  ability: string;
  gender: 'M' | 'F' | null;
  isShiny: boolean;
  isGuardian?: boolean;
  moves: PokemonMove[];
  status: PokemonStatus;
  sleepTurns: number;
  friendship: number;
  vigor: number;
  heldItem: string | null;
  nickname: string | null;
  obtainedAt: number;
  obtainedMethod?: 'wild' | 'egg' | 'trade' | 'event';
  isAtmospheric?: boolean;
  weatherOrigin?: string;
  
  // Stats (calculated)
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;

  // Battle volatile states
  confused?: number;
  flinched?: boolean;
  seeded?: boolean;
  tauntTurns?: number;
  disabledTurns?: number;
  disabledMove?: string | null;
  encoreTurns?: number;
  encoreMove?: string | null;
  focusEnergy?: boolean;
  lockOn?: boolean;
  ingrain?: boolean;
  futureSightTurns?: number;
  futureSightDmg?: number;
  badPoison?: number;
  onMission?: boolean;
  onDefense?: boolean;
  
  // Metadata
  isEgg?: boolean;
  steps?: number;

  // Breeding/Ownership
  region?: string;
  ot_id?: string;
}

export interface BreedingCompatibility {
  level: number;
  reason: string;
  sharedGroups: string[];
  eggSpecies?: string;
  motherId?: string;
}
