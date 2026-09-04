import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonMoveId, MoveCategory } from '@/data/battle/moves';
import type { PokemonStatus } from '@/types/pokemon/pokemon';
import type { AbilityId } from '@/data/battle/abilities';
import type { ItemId } from '@/data/inventory/items';
import type { WeatherId } from '@/logic/weather/weatherRegistry';

export interface PurePokemon {
  id?: PokemonSpeciesId;
  name?: string;
  level: number;
  hp?: number;
  maxHp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
  type: PokemonType;
  type2?: PokemonType | null;
  status?: PokemonStatus;
  ability?: AbilityId | null;
  heldItem?: ItemId | null;
  catchRate?: number;
  furyCutterCount?: number;
  focusEnergy?: boolean;
  canEvolve?: boolean;
}

export interface PureMove {
  name?: string;
  type?: PokemonType;
  power?: number;
  cat?: MoveCategory;
  effect?: string;
  id?: PokemonMoveId;
  fixedDmg?: number;
  levelDmg?: boolean;
  halfHP?: boolean;
}

export interface PureBattleWeather {
  type: WeatherId;
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
  terrain?: string | null;
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
