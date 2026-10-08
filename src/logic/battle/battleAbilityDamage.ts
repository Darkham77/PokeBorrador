import { ACTIVE_GENERATION } from '@/data/system/constants';
import { HELD_ITEM_TYPE_BOOST_MULTIPLIER } from '@/logic/constants/gameplay.ts';
import type { PokemonType } from '../../data/battle/types.ts';
import type { MoveCategory } from '../../data/battle/moves.ts';
import { getMechanicalWeather } from '../weather/weatherRegistry.ts';
import type { PurePokemon, PureMove, PureBattleWeather } from './battleMathTypes.ts';

const TECHNICIAN_MAX_POWER_LIMIT = 60 as const;
const GUTS_STATUS_ATK_MULTIPLIER = 1.5 as const;
const PINCH_MULTIPLIER = 1.5 as const;
const TECHNICIAN_MULTIPLIER = 1.5 as const;
const SAND_FORCE_MULTIPLIER = 1.3 as const;
const LOW_HP_DIVISOR = 3 as const;
const CHOICE_ITEM_MULTIPLIER = 1.5 as const;
const LIFE_ORB_MULTIPLIER = 1.3 as const;
const THICK_FAT_MULTIPLIER = 0.5 as const;
const STANDARD_STAB = 1.5 as const;
const ADAPTABILITY_STAB = 2.0 as const;

const SPECIAL_POKEMON_TYPES_SET: ReadonlySet<PokemonType> = new Set<PokemonType>([ // runtime-set: Fast O(1) membership lookup set
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'
]);

const PINCH_ABILITY_TYPES: Readonly<Record<string, string>> = {
  blaze: 'fire',
  torrent: 'water',
  overgrow: 'grass',
  swarm: 'bug',
};

const HELD_ITEM_TYPE_BOOSTERS: Record<string, string> = {
  charcoal: 'fire',
  magnet: 'electric',
  mystic_water: 'water',
  miracle_seed: 'grass',
  black_belt: 'fighting',
  twisted_spoon: 'psychic',
  spell_tag: 'ghost',
  silver_powder: 'bug',
  poison_barb: 'poison'
};

export function getMoveCategory(move: PureMove): MoveCategory {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= 3) {
    if (move.type && SPECIAL_POKEMON_TYPES_SET.has(move.type)) return 'special';
    return 'physical';
  }
  return move.cat ?? 'physical';
}

function isSandForceType(type: string): boolean {
  return type === 'ground' || type === 'rock' || type === 'steel';
}

function checkPinchAbilityBoost(ab: string | null | undefined, moveType: string, hp: number, maxHp: number): boolean {
  return hp <= (maxHp / LOW_HP_DIVISOR) && Boolean(ab && PINCH_ABILITY_TYPES[ab] === moveType);
}

function checkSandForceBoost(ab: string | null | undefined, moveType: string, weather?: PureBattleWeather | null): boolean {
  if (!weather || weather.turns === 0 || ab !== 'sandforce') return false;
  return getMechanicalWeather(weather.type) === 'sandstorm' && isSandForceType(moveType);
}

export function getAbilityMultiplierPure(
  attacker: PurePokemon,
  move: PureMove,
  weather?: PureBattleWeather | null
): { mult: number; triggeredAbility: string | null } {
  let mult = 1;
  let triggeredAbility: string | null = null;
  const ab = attacker.ability;
  const power = move.power ?? 0;
  const moveType = move.type ?? 'normal';

  if (checkPinchAbilityBoost(ab, moveType, attacker.hp ?? 0, attacker.maxHp ?? 1)) {
    mult *= PINCH_MULTIPLIER;
    triggeredAbility = ab!;
  }
  if (ab === 'guts' && attacker.status && getMoveCategory(move) === 'physical') {
    mult *= GUTS_STATUS_ATK_MULTIPLIER;
    triggeredAbility = ab;
  }
  if (ab === 'technician' && power > 0 && power <= TECHNICIAN_MAX_POWER_LIMIT) {
    mult *= TECHNICIAN_MULTIPLIER;
    triggeredAbility = ab;
  }
  if (checkSandForceBoost(ab, moveType, weather)) {
    mult *= SAND_FORCE_MULTIPLIER;
    triggeredAbility = ab!;
  }

  return { mult, triggeredAbility };
}

export function calculateHeldItemDamageMultiplier(heldItem: string | undefined, moveType: string, moveCat: string): number {
  if (!heldItem) return 1;
  if (HELD_ITEM_TYPE_BOOSTERS[heldItem] === moveType) return HELD_ITEM_TYPE_BOOST_MULTIPLIER;
  if (heldItem === 'choiceband' && moveCat === 'physical') return CHOICE_ITEM_MULTIPLIER;
  if (heldItem === 'choicespecs' && moveCat === 'special') return CHOICE_ITEM_MULTIPLIER;
  if (heldItem === 'lifeorb') return LIFE_ORB_MULTIPLIER;
  return 1;
}

export function calculateStabMultiplier(attacker: PurePokemon, moveType: string): number {
  let stab: number = (moveType === attacker.type || moveType === attacker.type2) ? STANDARD_STAB : 1;
  if (attacker.ability === 'adaptability' && stab > 1) stab = ADAPTABILITY_STAB;
  return stab;
}

export function resolveAbilitiesMultiplier(
  attacker: PurePokemon,
  defender: PurePokemon,
  moveData: PureMove & { cat: string },
  moveType: string,
  weather: PureBattleWeather | null | undefined
): { finalAbilityMult: number; triggeredAbility?: string | null } {
  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplierPure(attacker, moveData, weather);
  if (defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    finalAbilityMult *= THICK_FAT_MULTIPLIER;
    triggeredAbility = 'thickfat';
  }
  return { finalAbilityMult, triggeredAbility };
}
