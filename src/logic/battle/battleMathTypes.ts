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

const SPECIAL_TYPES_GEN3 = [
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark'
] as const;

const SPECIAL_TYPES_GEN3_SET: ReadonlySet<PokemonType> = new Set<PokemonType>(SPECIAL_TYPES_GEN3); // runtime-set: Fast O(1) membership lookup set

import { ACTIVE_GENERATION } from '@/data/system/constants';
import { HOENN_GENERATION_NUM } from '@/logic/constants/gameplay';

export function getMoveCategory(
  move: PureMove | { cat?: MoveCategory; type?: PokemonType; id?: PokemonMoveId; power?: number }
): MoveCategory {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= HOENN_GENERATION_NUM) {
    if (move.type && SPECIAL_TYPES_GEN3_SET.has(move.type)) return 'special';
    return 'physical';
  }
  return move.cat ?? 'physical';
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

export interface CatchRateResult {
  caught: boolean;
  shakes: number;
  isCritical: boolean;
  statusMultiplierApplied: boolean;
  bugSynergyBonus?: number;
  trainerIvPenaltyApplied?: boolean;
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
  pokedexCount?: number;
  forceCritical?: boolean;
}
