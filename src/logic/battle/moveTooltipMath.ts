
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
const STAGE_MATH_BASE_ACCURACY = 3
const STAGE_MATH_BASE_REGULAR = 2
/** Pokémon Showdown acc/eva stage base multiplier (shared for net stage calc) */
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
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry';
import { type PurePokemon, type PureMove } from '@/logic/battle/battleMath';
import { SHOWDOWN_BOOST_STAT_KEYS } from '@/types/pokemon/pokemon';
import type { Move, MoveEffectBoosts, ShowdownBoostStatKey, ShowdownSecondaryEffect } from '@/types/pokemon/pokemon';
import type { ParsedStatusEffectInfo, TooltipStageStatId, TooltipStageStatName } from '@/types/battle/tooltip';
import type { PokemonType } from '@/data/battle/types';
import {
  STAB_STANDARD_MULTIPLIER,
  STAB_ADAPTABILITY_MULTIPLIER,
  LOW_HP_ABILITY_MULTIPLIER,
  TECHNICIAN_POWER_CAP,
  SAND_FORCE_MULTIPLIER,
  DEFAULT_CRIT_RATE,
  SCOPE_LENS_CRIT_RATE,
  FOCUS_ENERGY_CRIT_RATE,
  DEFAULT_ACCURACY_BASE_STAT
} from '@/logic/constants/gameplay';

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

  // Charging Moves
  if (moveId === 'solarbeam' || moveId === 'solarblade') {
    if (isSunny) return { type: 'boosted', text: 'Carga instantánea por Sol.' };
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'penalized', text: WEATHER_ADVERSE_PENALTY_TEXT };
  }

  // Weather Ball
  if (moveId === 'weatherball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'boosted', text: WEATHER_BALL_BOOST_TEXT };
  }

  // General Accuracy Warning (Fog)
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.toLowerCase() === 'mist';
    const label = isMist ? 'Bruma' : 'Niebla';
    const penalty = isMist ? '80%' : '60%' ; // no-magic
    return { type: 'penalized', text: `Precisión reducida al ${penalty} por ${label}.` }; // no-magic
  }

  if (m.cat === 'status') return null;

  // Elemental Multipliers
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
 * Calculates move power details.
 */
export function calculateMovePower(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  weather: { type: string; turns: number } | null,
  mechWeather: string,
  _cycle: 'morning' | 'day' | 'dusk' | 'night' | undefined,
  basePower: number,
  moveType: string
): { base: number; final: number; list: { label: string; mult: number }[]; class: string } {
  let currentPower = basePower;
  const powerList: { label: string; mult: number }[] = [];

  if (basePower > 0) {
    // STAB
    if (moveType === attacker.type?.toLowerCase() || moveType === attacker.type2?.toLowerCase()) {
      const stab = attacker.ability === 'adaptability' ? STAB_ADAPTABILITY_MULTIPLIER : STAB_STANDARD_MULTIPLIER;
      powerList.push({ label: `STAB (${move.type})`, mult: stab });
      currentPower *= stab;
    }

    // Weather
    if (weather && weather.turns !== 0) {
      let weatherMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
      if (mechWeather === WEATHER_MECHANICAL.SUN) {
        if (moveType === 'fire') weatherMult = STAB_STANDARD_MULTIPLIER;
        if (moveType === 'water') weatherMult = SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER;
      } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
        if (moveType === 'water') weatherMult = STAB_STANDARD_MULTIPLIER;
        if (moveType === 'fire') weatherMult = SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER;
      }

      if (weatherMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
        powerList.push({ label: `Clima (${weather.type})`, mult: weatherMult });
        currentPower *= weatherMult;
      }
    }

    // Solar Beam
    if (move.id === 'solarbeam' && weather && weather.turns !== 0) {
      const isSun = mechWeather === WEATHER_MECHANICAL.SUN;
      const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR;
      if (!isSun && !isClear) {
        powerList.push({ label: 'Rayo Solar Clima', mult: SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER });
        currentPower *= SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER;
      }
    }


    // Attacker Ability
    let abilMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
    const isLowHp = (attacker.hp ?? 0) <= ((attacker.maxHp ?? 1) / LOW_HP_THIRD_DIVISOR);
    if (isLowHp) {
      if (attacker.ability === 'blaze' && moveType === 'fire') abilMult = LOW_HP_ABILITY_MULTIPLIER;
      if (attacker.ability === 'torrent' && moveType === 'water') abilMult = LOW_HP_ABILITY_MULTIPLIER;
      if (attacker.ability === 'overgrow' && moveType === 'grass') abilMult = LOW_HP_ABILITY_MULTIPLIER;
      if (attacker.ability === 'swarm' && moveType === 'bug') abilMult = LOW_HP_ABILITY_MULTIPLIER;
    }
    if (attacker.ability === 'technician' && basePower <= TECHNICIAN_POWER_CAP) {
      abilMult *= LOW_HP_ABILITY_MULTIPLIER;
    }
    if (weather && weather.turns !== 0 && attacker.ability === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
      if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
        abilMult *= SAND_FORCE_MULTIPLIER;
      }
    }
    if (abilMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
      powerList.push({ label: `Habilidad (${attacker.ability})`, mult: abilMult });
      currentPower *= abilMult;
    }

    // Defender Ability
    if (defender && defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
      powerList.push({ label: 'Habilidad Rival (Sebo)', mult: THICK_FAT_REDUCTION_MULTIPLIER });
      currentPower *= THICK_FAT_REDUCTION_MULTIPLIER;
    }

    // Held Item
    if (attacker.heldItem) {
      const h = attacker.heldItem;
      const typeBoosters: Record<string, string> = {
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
      let itemMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
      if (typeBoosters[h] === moveType) itemMult = HELD_ITEM_TYPE_BOOST_MULTIPLIER;
      
      if (h === 'choiceband') {
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
  _cycle: 'morning' | 'day' | 'dusk' | 'night' | undefined,
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
      accList.push({ label: 'Sol (Precisión 50%)', mult: '0.5' }); // no-magic
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

const CRIT_REDUCTION_ZERO = 0;
const CRIT_PERCENT_SCALE = 100;

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

import { calculateDamageRangePure } from '@/logic/battle/battleMath';

/**
 * Calculates effectiveness and estimated damage range.
 */
export function calculateMoveEffectivenessAndDamage(
  move: Move,
  md: { type?: PokemonType; cat?: Move['cat']; power?: number; acc?: number },
  attacker: PurePokemon,
  defender: PurePokemon | null,
  weather: { type: string; turns: number } | null,
  cycle: 'morning' | 'day' | 'dusk' | 'night' | undefined,
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

const TOOLTIP_STAGE_STAT_NAMES = {
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Especial',
  spd: 'Def. Especial',
  spe: 'Velocidad',
  acc: 'Precisión',
  eva: 'Evasión',
  all: 'Todos los Stats',
} as const satisfies Record<TooltipStageStatId, TooltipStageStatName>;

const TOOLTIP_CONDITION_DETAILS = { // no-magic
  psn: {
    label: 'Envenenamiento',
    effect: 'Estado Alterado (PSN)',
    details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno.',
    isSelf: false,
  },
  tox: {
    label: 'Envenenamiento Grave',
    effect: 'Estado Alterado (TÓXICO)',
    details: 'El objetivo pierde PS progresivamente: empieza en 1/16 y aumenta en 1/16 cada turno consecutivo.',
    isSelf: false,
  },
  brn: {
    label: 'Quemadura',
    effect: 'Estado Alterado (BRN)',
    details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno. Además, reduce a la mitad (x0.5) su Ataque Físico.',
    isSelf: false,
  },
  par: {
    label: 'Parálisis',
    effect: 'Estado Alterado (PAR)',
    details: 'Reduce la Velocidad del objetivo al 50% (x0.5) y otorga un 25% de probabilidad de no atacar en cada turno.',
    isSelf: false,
  },
  slp: {
    label: 'Sueño',
    effect: 'Estado Alterado (SLP)',
    details: 'El objetivo se duerme durante 1 a 3 turnos, impidiéndole atacar por completo.',
    isSelf: false,
  },
  frz: {
    label: 'Congelación',
    effect: 'Estado Alterado (FRZ)',
    details: 'El objetivo queda congelado e incapaz de moverse. Cada turno tiene un 20% de probabilidad de descongelarse.',
    isSelf: false,
  },
  confusion: {
    label: 'Confusión',
    effect: 'Estado Volátil',
    details: 'El objetivo se confunde durante 1 a 4 turnos. En cada turno, puede golpearse a sí mismo.',
    isSelf: false,
  },
  leechseed: {
    label: 'Semilla Drenadora',
    effect: 'Efecto de Campo Volátil',
    details: 'Al final de cada turno, el objetivo pierde 1/8 de sus PS máximos y se los transfiere al usuario.',
    isSelf: false,
  },
} as const;

type TooltipConditionKey = keyof typeof TOOLTIP_CONDITION_DETAILS;

function isTooltipConditionKey(value: string): value is TooltipConditionKey {
  return value in TOOLTIP_CONDITION_DETAILS;
}

function toTooltipStageStatId(stat: ShowdownBoostStatKey): TooltipStageStatId {
  if (stat === 'accuracy') return 'acc';
  if (stat === 'evasion') return 'eva';
  if (stat === 'atk' || stat === 'def' || stat === 'spa' || stat === 'spd' || stat === 'spe') return stat;
  throw new Error(`[moveTooltipMath] Unsupported boost stat for tooltip: ${stat}`);
}

function getPokemonStageBaseStat(pokemon: PurePokemon, stat: TooltipStageStatId): number {
  if (stat === 'acc' || stat === 'eva' || stat === 'all') return DEFAULT_ACCURACY_BASE_STAT;
  return pokemon[stat] || DEFAULT_ACCURACY_BASE_STAT;
}

function getStageMultiplier(stat: TooltipStageStatId, stage: number): number {
  if (stat === 'acc' || stat === 'eva') {
    if (stage >= 0) return (STAGE_MATH_BASE_ACCURACY + stage) / STAGE_MATH_BASE_ACCURACY;
    return STAGE_MATH_BASE_ACCURACY / (STAGE_MATH_BASE_ACCURACY - stage);
  }
  if (stage >= 0) return (STAGE_MATH_BASE_REGULAR + stage) / STAGE_MATH_BASE_REGULAR;
  return STAGE_MATH_BASE_REGULAR / (STAGE_MATH_BASE_REGULAR - stage);
}

function firstBoostEntry(effect: { boosts?: MoveEffectBoosts } | undefined): [ShowdownBoostStatKey, number] | null {
  if (!effect?.boosts) return null;
  for (const stat of SHOWDOWN_BOOST_STAT_KEYS) {
    const stages = effect.boosts[stat];
    if (stages !== undefined && stages !== 0) return [stat, stages];
  }
  return null;
}

function firstShowdownSecondary(move: Move): ShowdownSecondaryEffect | undefined {
  if (move.secondary) return move.secondary;
  return move.secondaries?.[0];
}

function buildConditionInfo(conditionKey: TooltipConditionKey, isSelfOverride?: boolean): ParsedStatusEffectInfo {
  const condition = TOOLTIP_CONDITION_DETAILS[conditionKey];
  const isSelf = isSelfOverride ?? condition.isSelf;
  return {
    isCondition: true,
    isSelf,
    direction: isSelf ? 'up' : 'down',
    targetName: isSelf ? 'Usuario (Tú)' : 'Rival',
    label: condition.label,
    effect: condition.effect,
    details: condition.details,
  };
}

function buildBoostInfo(
  rawStat: ShowdownBoostStatKey,
  stages: number,
  isSelf: boolean,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  playerStages: Partial<Record<TooltipStageStatId, number>> | null | undefined,
  enemyStages: Partial<Record<TooltipStageStatId, number>> | null | undefined
): ParsedStatusEffectInfo | null {
  const stat = toTooltipStageStatId(rawStat);
  const targetPokemon = isSelf ? attacker : defender;
  if (!targetPokemon) return null;

  const isUp = stages > 0;
  const amount = Math.abs(stages);
  const targetStages = isSelf ? playerStages : enemyStages;
  const currentStage = targetStages?.[stat] ?? 0;
  const finalStage = Math.max(-6, Math.min(6, currentStage + stages));
  const baseStatVal = getPokemonStageBaseStat(targetPokemon, stat);
  const suffix = stat === 'acc' || stat === 'eva' ? '%' : '';
  const initialStatVal = `${Math.round(baseStatVal * getStageMultiplier(stat, currentStage))}${suffix}`;
  const finalStatVal = `${Math.round(baseStatVal * getStageMultiplier(stat, finalStage))}${suffix}`;
  const statName = TOOLTIP_STAGE_STAT_NAMES[stat];

  return {
    isCondition: false,
    isSelf,
    direction: isUp ? 'up' : 'down',
    stat,
    statName,
    amount,
    targetName: isSelf ? 'Usuario (Tú)' : 'Rival',
    currentStage,
    finalStage,
    initialStatVal,
    finalStatVal,
    label: `${isUp ? 'Aumenta' : 'Reduce'} ${statName} en ${amount} ${amount === 1 ? 'nivel' : 'niveles'}`,
  };
}

export function parseStatusEffectInfo(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  playerStages: Partial<Record<TooltipStageStatId, number>> | null | undefined,
  enemyStages: Partial<Record<TooltipStageStatId, number>> | null | undefined
): ParsedStatusEffectInfo | null {
  const directBoost = firstBoostEntry(move);
  if (directBoost) {
    const [stat, stages] = directBoost;
    return buildBoostInfo(stat, stages, false, attacker, defender, playerStages, enemyStages);
  }

  const selfBoost = firstBoostEntry(move.self);
  if (selfBoost) {
    const [stat, stages] = selfBoost;
    return buildBoostInfo(stat, stages, true, attacker, defender, playerStages, enemyStages);
  }

  const secondary = firstShowdownSecondary(move);
  const secondaryBoost = firstBoostEntry(secondary);
  if (secondaryBoost) {
    const [stat, stages] = secondaryBoost;
    return buildBoostInfo(stat, stages, secondary?.self !== undefined, attacker, defender, playerStages, enemyStages);
  }

  const statusKey = move.status || secondary?.status;
  if (statusKey) {
    return buildConditionInfo(statusKey);
  }

  const volatileKey = move.volatileStatus || secondary?.volatileStatus;
  if (volatileKey && isTooltipConditionKey(volatileKey)) {
    return buildConditionInfo(volatileKey);
  }

  return null;
}
