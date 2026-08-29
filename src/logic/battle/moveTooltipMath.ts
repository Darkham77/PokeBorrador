const MIST_ACCURACY_PENALTY_PCT = 0.8
const FOG_ACCURACY_PENALTY_PCT = 0.6
const WEATHER_PENALIZED_ACCURACY_TEXT = 'Penalizado por Clima Soleado (Precisión 50%)'
const WEATHER_ADVERSE_PENALTY_TEXT = 'Penalizado por clima adverso (0.5x y requiere carga)'
const WEATHER_BALL_BOOST_TEXT = 'Tipo y potencia adaptados al clima (100 BP).'
const WEATHER_RAIN_PENALTY_TEXT = 'Penalizado por Lluvia (0.5x)'
const WEATHER_SUN_BOOST_TEXT = 'Potenciado por Sol (1.5x)'
const WEATHER_SUN_PENALTY_TEXT = 'Penalizado por Sol (0.5x)'
const WEATHER_RAIN_BOOST_TEXT = 'Potenciado por Lluvia (1.5x)'
const HELD_ITEM_TYPE_BOOST_MULTIPLIER = 1.2
const SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER = 0.5
const STAGE_MATH_BASE = 3
/** Pokémon Showdown stat stage bounds: stages range from -6 to +6 */
const STAGE_MIN_BOUND = -6
const STAGE_MAX_BOUND = 6
const THICK_FAT_REDUCTION_MULTIPLIER = 0.5
const STAGE_PRECISION_LIMIT = 100
const STAGE_PRECISION_FULL = 1000
const LOW_HP_THIRD_DIVISOR = 3
const BASE_POWER_MINIMAL_BOUND = 1
const DEFAULT_WEATHER_NEUTRAL_MULTIPLIER = 1
const STAGE_PRECISION_SUN_PENALTY = 50
const CRIT_REDUCTION_ZERO = 0
const CRIT_PERCENT_SCALE = 100

import type { DayPhase } from '@/logic/utils/timeUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { type PurePokemon, type PureMove, calculateDamageRangePure } from '@/logic/battle/battleMath'
import type { Move } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
import { isItemId, type ItemId } from '@/data/inventory/items'
import {
  STAB_STANDARD_MULTIPLIER,
  STAB_ADAPTABILITY_MULTIPLIER,
  LOW_HP_ABILITY_MULTIPLIER,
  TECHNICIAN_POWER_CAP,
  SAND_FORCE_MULTIPLIER,
  DEFAULT_CRIT_RATE,
  SCOPE_LENS_CRIT_RATE,
  FOCUS_ENERGY_CRIT_RATE
} from '@/logic/constants/gameplay'

export { parseStatusEffectInfo } from './tooltip/moveTooltipConditions.ts'

const HELD_ITEM_TYPE_BOOSTERS_MAP: Readonly<Partial<Record<ItemId, PokemonType>>> = {
  blackbelt: 'fighting',
  blackglasses: 'dark',
  charcoal: 'fire',
  dragonfang: 'dragon',
  hardstone: 'rock',
  magnet: 'electric',
  metalcoat: 'steel',
  miracleseed: 'grass',
  mysticwater: 'water',
  nevermeltice: 'ice',
  poisonbarb: 'poison',
  sharpbeak: 'flying',
  silkscarf: 'normal',
  silverpowder: 'bug',
  softsand: 'ground',
  spelltag: 'ghost',
  twistedspoon: 'psychic'
} as const;

/**
 * Gets modifier info for a move based on weather and cycle.
 */
export function calculateMoveModifierInfo(
  move: Move,
  weather: string | undefined,
  _cycle: string
): { type: string; text: string } | null {
  const m = move;
  const mechWeather = getMechanicalWeather(weather);

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN;
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL;

  const moveId = m.id || '';

  if (moveId === 'thunder' || moveId === 'hurricane') {
    const isThunderstorm = weather?.toLowerCase() === 'thunderstorm';
    if (isSunny) return { type: 'penalized', text: WEATHER_PENALIZED_ACCURACY_TEXT };
    if (isRaining || isThunderstorm) return { type: 'boosted', text: `Potenciado por ${isThunderstorm ? 'Tormenta Eléctrica' : 'Lluvia'} (¡No falla!)` };
  }

  if (moveId === 'blizzard') {
    if (isSnowing) return { type: 'boosted', text: 'Potenciado por Granizo/Nieve (¡No falla!)' };
  }

  if (moveId === 'solarbeam' || moveId === 'solarblade') {
    if (isSunny) return { type: 'boosted', text: 'Carga instantánea por Sol.' };
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'penalized', text: WEATHER_ADVERSE_PENALTY_TEXT };
  }

  if (moveId === 'weatherball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'boosted', text: WEATHER_BALL_BOOST_TEXT };
  }

  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.toLowerCase() === 'mist';
    const label = isMist ? 'Bruma' : 'Niebla'; // spanish-ok
    const penalty = isMist ? '80%' : '60%';
    return { type: 'penalized', text: `Precisión reducida al ${penalty} por ${label}.` };
  }

  if (m.cat === 'status') return null;

  if (m.type === 'fire') {
    if (isRaining) return { type: 'penalized', text: WEATHER_RAIN_PENALTY_TEXT };
    if (isSunny) return { type: 'boosted', text: WEATHER_SUN_BOOST_TEXT };
  }
  if (m.type === 'water') {
    if (isSunny) return { type: 'penalized', text: WEATHER_SUN_PENALTY_TEXT };
    if (isRaining) return { type: 'boosted', text: WEATHER_RAIN_BOOST_TEXT };
  }

  return null;
}

/**
 * Calculates move base power factoring STAB, abilities, weather, and held items.
 */
export function calculateMovePower(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  _weather: { type: string; turns: number } | null,
  mechWeather: string,
  _cycle: DayPhase | undefined,
  basePower: number,
  moveTypeOverride?: string
): { base: number; final: number; list: { label: string; mult: number }[]; class: string } {
  let currentPower = basePower;
  const powerList: { label: string; mult: number }[] = [];

  if (basePower > 0) {
    let moveType = (moveTypeOverride || move.type || '').toLowerCase();

    if (move.id === 'weatherball') {
      if (mechWeather === WEATHER_MECHANICAL.SUN) { moveType = 'fire'; currentPower = 100; powerList.push({ label: 'Weather Ball (Sol)', mult: 2.0 }); }
      else if (mechWeather === WEATHER_MECHANICAL.RAIN) { moveType = 'water'; currentPower = 100; powerList.push({ label: 'Weather Ball (Lluvia)', mult: 2.0 }); }
      else if (mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) { moveType = 'ice'; currentPower = 100; powerList.push({ label: 'Weather Ball (Nieve)', mult: 2.0 }); }
      else if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) { moveType = 'rock'; currentPower = 100; powerList.push({ label: 'Weather Ball (Arena)', mult: 2.0 }); }
    }

    const isStab = attacker.type === moveType || attacker.type2 === moveType;
    if (isStab) {
      const stabMult = attacker.ability === 'adaptability' ? STAB_ADAPTABILITY_MULTIPLIER : STAB_STANDARD_MULTIPLIER;
      powerList.push({ label: `STAB ${attacker.ability === 'adaptability' ? '(Adaptabilidad)' : ''}`.trim(), mult: stabMult });
      currentPower *= stabMult;
    }

    if (moveType === 'fire') {
      if (mechWeather === WEATHER_MECHANICAL.SUN) { powerList.push({ label: 'Clima (Sol)', mult: 1.5 }); currentPower *= 1.5; }
      else if (mechWeather === WEATHER_MECHANICAL.RAIN) { powerList.push({ label: 'Clima (Lluvia)', mult: 0.5 }); currentPower *= 0.5; }
    } else if (moveType === 'water') {
      if (mechWeather === WEATHER_MECHANICAL.RAIN) { powerList.push({ label: 'Clima (Lluvia)', mult: 1.5 }); currentPower *= 1.5; }
      else if (mechWeather === WEATHER_MECHANICAL.SUN) { powerList.push({ label: 'Clima (Sol)', mult: 0.5 }); currentPower *= 0.5; }
    }

    if (move.id === 'solarbeam' || move.id === 'solarblade') {
      if (mechWeather !== WEATHER_MECHANICAL.SUN && mechWeather !== WEATHER_MECHANICAL.CLEAR) {
        powerList.push({ label: 'Clima Adverso', mult: SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER });
        currentPower *= SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER;
      }
    }

    let abilMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
    if (attacker.ability) {
      const a = attacker.ability;
      const curHp = attacker.hp || 1;
      const maxHp = attacker.maxHp || 1;
      const isLowHp = curHp <= Math.floor(maxHp / LOW_HP_THIRD_DIVISOR);

      if (isLowHp) {
        if (a === 'overgrow' && moveType === 'grass') abilMult *= LOW_HP_ABILITY_MULTIPLIER;
        if (a === 'blaze' && moveType === 'fire') abilMult *= LOW_HP_ABILITY_MULTIPLIER;
        if (a === 'torrent' && moveType === 'water') abilMult *= LOW_HP_ABILITY_MULTIPLIER;
        if (a === 'swarm' && moveType === 'bug') abilMult *= LOW_HP_ABILITY_MULTIPLIER;
      }

      if (a === 'technician' && basePower <= TECHNICIAN_POWER_CAP) abilMult *= 1.5;
      if (a === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM && (moveType === 'rock' || moveType === 'ground' || moveType === 'steel')) {
        abilMult *= SAND_FORCE_MULTIPLIER;
      }
    }
    if (abilMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
      powerList.push({ label: `Habilidad (${attacker.ability})`, mult: abilMult });
      currentPower *= abilMult;
    }

    if (defender && defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
      powerList.push({ label: 'Habilidad Rival (Sebo)', mult: THICK_FAT_REDUCTION_MULTIPLIER });
      currentPower *= THICK_FAT_REDUCTION_MULTIPLIER;
    }

    if (attacker.heldItem) {
      const h = attacker.heldItem;
      const canonicalKey = h.replace(/_/g, '');
      const itemKey: ItemId | null = isItemId(h) ? h : (isItemId(canonicalKey) ? canonicalKey : null);
      let itemMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
      if (itemKey && HELD_ITEM_TYPE_BOOSTERS_MAP[itemKey] === moveType) itemMult = HELD_ITEM_TYPE_BOOST_MULTIPLIER;
      
      if (h === 'choiceband' || h === 'choice_band') {
        if (move.cat === 'physical') {
          itemMult = STAB_STANDARD_MULTIPLIER;
        } else {
          powerList.push({ label: 'Objeto (choice_band - Solo Físico)', mult: DEFAULT_WEATHER_NEUTRAL_MULTIPLIER });
        }
      }

      if (itemMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
        powerList.push({ label: `Objeto (${h})`, mult: itemMult });
        currentPower *= itemMult;
      }
    }
  }

  const finalPower = Math.max(BASE_POWER_MINIMAL_BOUND, Math.round(currentPower));
  return {
    base: basePower,
    final: finalPower,
    list: powerList,
    class: finalPower > basePower ? 'boosted' : (finalPower < basePower ? 'penalized' : '')
  };
}

/**
 * Calculates move accuracy details.
 */
export function calculateMoveAccuracy(
  move: Move,
  weather: { type: string; turns: number } | null,
  mechWeather: string,
  _cycle: DayPhase | undefined,
  baseAcc: number,
  accStage: number,
  evaStage: number
): { base: number; final: number; list: { label: string; mult: number | string }[]; class: string } {
  let currentAcc = baseAcc;
  const accList: { label: string; mult: number | string }[] = [];

  if (baseAcc > 0 && baseAcc < STAGE_PRECISION_FULL) {
    const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN;
    const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN;
    const isThunderstorm = weather?.type === 'thunderstorm';

    if ((isRainActive || isThunderstorm) && (move.id === 'thunder' || move.id === 'hurricane')) {
      currentAcc = STAGE_PRECISION_LIMIT;
      accList.push({ label: 'Lluvia (¡No falla!)', mult: '100%' });
    } else if (isSunActive && (move.id === 'thunder' || move.id === 'hurricane')) {
      currentAcc = STAGE_PRECISION_SUN_PENALTY;
      accList.push({ label: 'Sol (Precisión 50%)', mult: '0.5' });
    } else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && move.id === 'blizzard') {
      currentAcc = STAGE_PRECISION_LIMIT;
      accList.push({ label: 'Nieve (¡No falla!)', mult: '100%' });
    } else if (mechWeather === WEATHER_MECHANICAL.FOG) {
      const isMist = weather?.type === "mist" || weather?.type === "mist_visual";
      const factor = isMist ? MIST_ACCURACY_PENALTY_PCT : FOG_ACCURACY_PENALTY_PCT;
      currentAcc = Math.floor(baseAcc * factor);
      accList.push({ label: `Niebla/Bruma`, mult: factor });
    }

    const netStage = Math.max(STAGE_MIN_BOUND, Math.min(STAGE_MAX_BOUND, accStage - evaStage));
    if (netStage !== 0) {
      let factor = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
      if (netStage >= 0) {
        factor = (STAGE_MATH_BASE + netStage) / STAGE_MATH_BASE;
      } else {
        factor = STAGE_MATH_BASE / (STAGE_MATH_BASE - netStage);
      }
      accList.push({ label: `Modificador Rango (${netStage > 0 ? '+' : ''}${netStage})`, mult: Number(factor.toFixed(3)) });
      currentAcc *= factor;
    }
  }

  const finalAccuracy = Math.max(0, Math.min(STAGE_PRECISION_LIMIT, Math.round(currentAcc)));
  return {
    base: baseAcc,
    final: baseAcc === STAGE_PRECISION_FULL ? STAGE_PRECISION_FULL : finalAccuracy,
    list: accList,
    class: baseAcc === STAGE_PRECISION_FULL ? '' : (finalAccuracy > baseAcc ? 'boosted' : (finalAccuracy < baseAcc ? 'penalized' : ''))
  };
}

/**
 * Calculates crit chance.
 */
export function calculateCritChance(
  attacker: PurePokemon,
  defender: PurePokemon | null
): { value: string; class: string } {
  let critRate = DEFAULT_CRIT_RATE;
  if (attacker.heldItem === 'scopelens') critRate = SCOPE_LENS_CRIT_RATE;
  if (attacker.focusEnergy) critRate = FOCUS_ENERGY_CRIT_RATE;
  if (defender && (defender.ability === 'shellarmor' || defender.ability === 'battlearmor')) {
    critRate = CRIT_REDUCTION_ZERO;
  }

  const critVal = (critRate * CRIT_PERCENT_SCALE).toFixed(2).replace('.00', '');
  const critClass = critRate > DEFAULT_CRIT_RATE ? 'boosted' : (critRate === CRIT_REDUCTION_ZERO ? 'penalized' : 'neutral');

  return {
    value: critVal,
    class: critClass
  };
}

/**
 * Calculates effectiveness and estimated damage range.
 */
export function calculateMoveEffectivenessAndDamage(
  move: Move,
  md: { type?: PokemonType; cat?: Move['cat']; power?: number; acc?: number },
  attacker: PurePokemon,
  defender: PurePokemon | null,
  weather: { type: string; turns: number } | null,
  cycle: DayPhase | undefined,
  basePower: number,
  playerStages: { atk?: number } | null,
  enemyStages: { def?: number } | null
) {
  if (!defender) return { effectiveness: null, damageRange: null };

  const pureMove: PureMove = {
    id: move.id,
    name: move.name,
    type: move.type || md.type || 'normal',
    power: basePower,
    cat: (move.cat || md.cat || 'physical') as PureMove['cat'],
    effect: typeof move.effect === 'string' ? move.effect : undefined
  };

  const pureCtx = {
    atkStages: playerStages?.atk || 0,
    defStages: enemyStages?.def || 0,
    weather: weather ? { type: weather.type, turns: weather.turns } : null
  };

  return calculateDamageRangePure(attacker, defender, pureMove, pureCtx, cycle);
}
