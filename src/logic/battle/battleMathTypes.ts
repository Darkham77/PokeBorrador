export interface PurePokemon {
  id?: string;
  name?: string;
  level: number;
  hp?: number;
  maxHp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
  type: string;
  type2?: string;
  status?: string;
  ability?: string | null;
  heldItem?: string;
  catchRate?: number;
  furyCutterCount?: number;
  focusEnergy?: boolean;
}

export interface PureMove {
  name?: string;
  type?: string;
  power?: number;
  cat?: 'physical' | 'special' | 'status';
  effect?: string;
  id?: string;
  fixedDmg?: number;
  levelDmg?: boolean;
  halfHP?: boolean;
}

export interface PureBattleWeather {
  type: string;
  turns: number;
  visual?: string;
}

export interface PureBattleStages {
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
  acc?: number;
  eva?: number;
}

export interface PureDamageOptions {
  atkStages?: number;
  defStages?: number;
  weather?: PureBattleWeather | null;
  magnitudeSet?: boolean;
  isGym?: boolean;
}

export interface PureDamageResult {
  dmg: number;
  damage?: number;
  eff: number;
  stab?: number;
  power?: number;
  isCrit?: boolean;
  isSuperEffective?: boolean;
  isNotVeryEffective?: boolean;
  isNoEffect: boolean;
  triggeredAbility?: string | null;
}

export interface PureCatchOptions {
  weather?: PureBattleWeather | null;
  turnCount?: number;
  cycle?: string;
  isCave?: boolean;
  playerClass?: string | null;
  classLevel?: number;
  activeTeam?: { type1: string; type2?: string | null }[];
  ivTotal?: number;
}
