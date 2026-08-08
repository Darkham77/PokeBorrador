const TECHNICIAN_MAX_POWER_LIMIT = 60;
const GUTS_STATUS_ATK_MULTIPLIER = 1.5;
const BURN_STATUS_ATK_MULTIPLIER = 0.5;
const MARVEL_SCALE_DEF_MULTIPLIER = 1.5;
const SOLAR_POWER_SPA_MULTIPLIER = 1.5;
const CHOICE_SCARF_SPE_MULTIPLIER = 1.5;
const PARALYSIS_SPEED_MULTIPLIER_GEN6_PLUS = 0.5;
const PARALYSIS_SPEED_MULTIPLIER_LEGACY = 0.25;
const DEFAULT_STAT_FALLBACK_VAL = 10;
const CRIT_ROLL_DENOMINATOR_GEN6_BASE = 24;
const CRIT_ROLL_DENOMINATOR_GEN5_BASE = 16;
const DAMAGE_ROLL_MIN_INT = 85;
const DAMAGE_ROLL_RANGE_INT = 16;
import { Dex, toID } from '@pkmn/sim';
import type {
  PurePokemon,
  PureMove,
  PureBattleWeather,
  PureBattleStages,
  PureDamageOptions,
  PureDamageResult
} from './battleMathTypes.ts';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
export * from './battleMathTypes.ts';

export const STAGE_MULTIPLIERS_STAT: Record<string, number> = {
  '-6': 2 / 8, '-5': 2 / 7, '-4': 2 / 6, '-3': 2 / 5, '-2': 2 / 4, '-1': 2 / 3,
  '0': 1.0, '1': 3 / 2, '2': 4 / 2, '3': 5 / 2, '4': 6 / 2, '5': 7 / 2, '6': 8 / 2
};

export const STAGE_MULTIPLIERS_ACC: Record<string, number> = {
  '-6': 3 / 9, '-5': 3 / 8, '-4': 3 / 7, '-3': 3 / 6, '-2': 3 / 5, '-1': 3 / 4,
  '0': 1.0, '1': 4 / 3, '2': 5 / 3, '3': 6 / 3, '4': 7 / 3, '5': 8 / 3, '6': 9 / 3
};

const WEATHER_KEYS = { SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', WIND: 'wind', CLEAR: 'clear' } as const;


const dexGen = Dex.forGen(ACTIVE_GENERATION);

import { isWeatherId } from '../weather/weatherRegistry.ts';
import { isPokemonType } from '../../data/battle/types.ts';

function getMechWeather(type: string | null | undefined): string {
  if (!type) return 'clear';
  const lower = isWeatherId(type) ? type : null;
  if (!lower) return 'clear';
  if (['sun', 'heatwave', 'intense_sun', 'sunnyday', 'desolateland'].includes(lower)) return 'sun';
  if (['rain', 'storm', 'heavy_rain', 'raindance', 'primordialsea'].includes(lower)) return 'rain';
  if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm';
  if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'snow';
  if (['fog', 'mist'].includes(lower)) return 'fog';
  if (['thunderstorm'].includes(lower)) return 'thunderstorm';
  if (['strong_winds', 'deltastream'].includes(lower)) return 'clear';
  return 'clear';
}


function getTypeEff(moveType: string | undefined, defType: string | undefined, scrapy = false): number {
  if (!moveType || !defType) return 1;
  const mType = isPokemonType(moveType) ? moveType : null;
  const dType = isPokemonType(defType) ? defType : null;
  if (!mType || !dType) return 1;

  if (scrapy && dType === 'ghost' && (mType === 'normal' || mType === 'fighting')) {
    return 1;
  }

  const typeData = dexGen.types.get(dType);
  if (!typeData) return 1;

  const attackKey = mType.charAt(0).toUpperCase() + mType.slice(1);
  const damageTaken = typeData.damageTaken[attackKey];
  if (damageTaken === undefined) return 1;

  if (damageTaken === 1) return 2; // Super effective
  if (damageTaken === 2) return 0.5; // Not very effective
  if (damageTaken === 3) return 0; // Immune
  return 1; // Neutral
}

function getCombinedEff(moveType: string, defender: PurePokemon, attacker: PurePokemon | null = null, _weather: string | null = null): number {
  const scrapy = attacker?.ability === 'scrappy';
  let eff = getTypeEff(moveType, defender.type, scrapy);
  if (defender.type2) eff *= getTypeEff(moveType, defender.type2, scrapy);

  return eff;
}

import type { PokemonType } from '../../data/battle/types.ts';

const SPECIAL_POKEMON_TYPES: readonly PokemonType[] = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];

export function getMoveCategory(move: PureMove): 'status' | 'physical' | 'special' {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= 3) {
    if (move.type && SPECIAL_POKEMON_TYPES.includes(move.type)) return 'special';
    return 'physical';
  }
  return move.cat ?? 'physical';
}

export function getAbilityMultiplierPure(attacker: PurePokemon, move: PureMove, weather?: PureBattleWeather | null): { mult: number; triggeredAbility: string | null } {
  let mult = 1;
  let triggeredAbility: string | null = null;
  const ab = attacker.ability;
  const power = move.power ?? 0;
  const moveType = move.type ?? 'normal';

  const isLowHp = (attacker.hp ?? 0) <= ((attacker.maxHp ?? 1) / 3);
  if (isLowHp) {
    if (ab === 'blaze' && moveType === 'fire')  { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'torrent'   && moveType === 'water') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'overgrow'   && moveType === 'grass') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'swarm'   && moveType === 'bug')   { mult *= 1.5; triggeredAbility = ab; }
  }
  if (ab === 'guts' && attacker.status && getMoveCategory(move) === 'physical') {
    mult *= GUTS_STATUS_ATK_MULTIPLIER; triggeredAbility = ab;
  }
  if (ab === 'technician' && power > 0 && power <= TECHNICIAN_MAX_POWER_LIMIT) {
    mult *= 1.5; triggeredAbility = ab;
  }

  if (weather && weather.turns !== 0) {
    const mech = getMechWeather(weather.type);
    if (ab === 'sandforce' && mech === WEATHER_KEYS.SANDSTORM) {
      if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
        mult *= 1.3; triggeredAbility = ab;
      }
    }
  }

  return { mult, triggeredAbility };
}

export function getEffectiveStatPure(
  pokemon: PurePokemon,
  statKey: keyof PurePokemon,
  stages: PureBattleStages,
  weather: PureBattleWeather | null,
  _dayCycle: 'morning' | 'day' | 'dusk' | 'night' = 'day',
  isGym: boolean = false
): number {
  const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
  const mechWeather = (isGym && !isMoveWeather) ? 'clear' : getMechWeather(weather?.type);

  let baseVal = (pokemon[statKey] as number) || DEFAULT_STAT_FALLBACK_VAL;
  if (statKey === 'spa' && !pokemon.spa) baseVal = pokemon.atk ?? DEFAULT_STAT_FALLBACK_VAL;
  if (statKey === 'spd' && !pokemon.spd) baseVal = pokemon.def ?? DEFAULT_STAT_FALLBACK_VAL;
  if (statKey === 'atk' && !pokemon.atk) baseVal = pokemon.spa ?? DEFAULT_STAT_FALLBACK_VAL;
  if (statKey === 'def' && !pokemon.def) baseVal = pokemon.spd ?? DEFAULT_STAT_FALLBACK_VAL;

  if (statKey === 'def') {
    if ((mechWeather === WEATHER_KEYS.SNOW || mechWeather === WEATHER_KEYS.HAIL) && (pokemon.type === 'ice' || pokemon.type2 === 'ice')) {
      baseVal = Math.floor(baseVal * 1.5);
    }
  }
  if (statKey === 'spd') {
    if (mechWeather === WEATHER_KEYS.SANDSTORM && (pokemon.type === 'rock' || pokemon.type2 === 'rock')) {
      baseVal = Math.floor(baseVal * 1.5);
    }
  }

  const rawStage = (stages as Record<string, number | undefined>)[statKey] ?? 0; // open-record
  const stage = Math.max(-6, Math.min(6, rawStage));
  const stageMult = (STAGE_MULTIPLIERS_STAT[String(stage)] as number) ?? 1.0;
  let val = Math.floor(baseVal * stageMult);

  const isSun  = ((!isGym || isMoveWeather) && mechWeather === WEATHER_KEYS.SUN) || (_dayCycle === 'day' && (!weather || weather.type === 'clear' || weather.type === 'none'));
  const isRain = (!isGym || isMoveWeather) && mechWeather === WEATHER_KEYS.RAIN;
  const ab = (pokemon.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (statKey === 'atk') {
    let abilMult = 1;
    if (ab === 'hugepower' || ab === 'purepower') abilMult *= 2;
    if (ab === 'guts' && pokemon.status) abilMult *= GUTS_STATUS_ATK_MULTIPLIER;
    val = Math.floor(val * abilMult);
    if ((pokemon.status === 'burn' || pokemon.status === 'brn') && ab !== 'guts') val = Math.floor(val * BURN_STATUS_ATK_MULTIPLIER);
  }
  if (statKey === 'def') {
    if (ab === 'marvelscale' && pokemon.status) val = Math.floor(val * MARVEL_SCALE_DEF_MULTIPLIER);
  }
  if (statKey === 'spa') {
    if (ab === 'solarpower' && isSun) val = Math.floor(val * SOLAR_POWER_SPA_MULTIPLIER);
  }
  if (statKey === 'spe') {
    let abilMult = 1;
    if (ab === 'chlorophyll'   && isSun)  abilMult *= 2;
    if (ab === 'swiftswim' && isRain) abilMult *= 2;
    if (ab === 'sandrush' && mechWeather === WEATHER_KEYS.SANDSTORM) abilMult *= 2;
    if (ab === 'slushrush'  && (mechWeather === WEATHER_KEYS.SNOW || mechWeather === WEATHER_KEYS.HAIL)) abilMult *= 2;
    if (pokemon.heldItem === 'choicescarf') abilMult *= CHOICE_SCARF_SPE_MULTIPLIER;
    val = Math.floor(val * abilMult);
    if (pokemon.status === 'par') {
      const mult = ACTIVE_GENERATION <= 6 ? PARALYSIS_SPEED_MULTIPLIER_LEGACY : PARALYSIS_SPEED_MULTIPLIER_GEN6_PLUS;
      val = Math.floor(val * mult);
    }
  }

  return Math.max(1, val);
}

export function calculateDamagePure(
  attacker: PurePokemon,
  defender: PurePokemon,
  move: PureMove,
  ctx: PureDamageOptions = {},
  dayCycle: 'morning' | 'day' | 'dusk' | 'night' = 'day',
  randomFactor?: number,
  forceCrit?: boolean
): PureDamageResult {
  const { atkStages = 0, defStages = 0, weather: rawWeather = null } = ctx;

  const hasAclimatacion = attacker.ability === 'cloudnine' || defender.ability === 'cloudnine';
  const weather = hasAclimatacion ? null : rawWeather;

  const power    = move.power ?? 0;
  const moveType = move.type  ?? 'normal';
  const moveCat  = getMoveCategory({ ...move, type: moveType });

  if (move.fixedDmg !== undefined) return { dmg: move.fixedDmg, eff: 1, isNoEffect: false };
  if (move.levelDmg)               return { dmg: attacker.level, eff: 1, isNoEffect: false };
  if (move.halfHP) {
    const dmg = Math.max(1, Math.floor((defender.hp ?? 1) / 2));
    return { dmg, eff: 1, isNoEffect: false };
  }

  const eff = getCombinedEff(moveType, defender, attacker, weather?.type);

  if (power === 0) return { dmg: 0, eff, isNoEffect: eff === 0 };

  const mechWeather = getMechWeather(weather?.type);
  const isPhysical = moveCat === 'physical';

  const aStages: PureBattleStages = { [isPhysical ? 'atk' : 'spa']: atkStages };
  const dStages: PureBattleStages = { [isPhysical ? 'def' : 'spd']: defStages };

  // Crit chance: stage-based per generation (Showdown sim/data/conditions.ts)
  // Gen 6+: stage 0 = 1/24, 1 = 1/8, 2 = 1/2, 3+ = always
  // Gen 5:  stage 0 = 1/16, 1 = 1/8, 2 = 1/4, 3 = 1/3, 4+ = always
  // Gen 1-4: simplified approximation (stage 0 = 1/16)
  let critStage = 0;
  if (attacker.heldItem === 'scopelens' || attacker.heldItem === 'razorclaw') critStage += 1;
  if (attacker.focusEnergy) critStage += 2;
  const gen = ACTIVE_GENERATION as number;
  let critRate: number;
  if (gen >= 6) {
    const rates = [1/CRIT_ROLL_DENOMINATOR_GEN6_BASE, 1/8, 1/2, 1, 1];
    critRate = rates[Math.min(critStage, 4)] ?? 1/CRIT_ROLL_DENOMINATOR_GEN6_BASE;
  } else if (gen === 5) {
    const rates = [1/CRIT_ROLL_DENOMINATOR_GEN5_BASE, 1/8, 1/4, 1/3, 1];
    critRate = rates[Math.min(critStage, 4)] ?? 1/CRIT_ROLL_DENOMINATOR_GEN5_BASE;
  } else {
    // Gen 1-4: 1/16 base, doubles per stage up to always
    critRate = Math.min(1, (1/CRIT_ROLL_DENOMINATOR_GEN5_BASE) * Math.pow(2, critStage));
  }
  let isCrit = forceCrit !== undefined ? forceCrit : (Math.random() < critRate);
  if (defender.ability === 'shellarmor' || defender.ability === 'battlearmor') isCrit = false;

  if (isCrit) {
    const aKey = isPhysical ? 'atk' : 'spa';
    const dKey = isPhysical ? 'def' : 'spd';
    if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
    if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
  }

  // Crit multiplier: Gen 1-5 = 2.0x, Gen 6+ = 1.5x (Showdown sim/battle-actions.ts)
  const critMult = isCrit ? (gen <= 5 ? 2.0 : 1.5) : 1;

  const isGym = ctx.isGym || false;
  const A = getEffectiveStatPure(attacker, isPhysical ? 'atk' : 'spa', aStages, weather, dayCycle, isGym);
  const D = getEffectiveStatPure(defender, isPhysical ? 'def' : 'spd', dStages, weather, dayCycle, isGym);

  // Damage formula matching Showdown's exact integer arithmetic (floor at each step)
  const baseDamage = Math.floor(Math.floor(Math.floor(2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplierPure(attacker, { ...move, type: moveType, power, cat: moveCat }, weather);

  if (defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    finalAbilityMult *= 0.5;
    triggeredAbility = 'thickfat';
  }

  let itemMult = 1;
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
    if (typeBoosters[h] === moveType) itemMult = 1.2;
    if (h === 'choiceband' && moveCat === 'physical') itemMult = 1.5;
    if (h === 'choicespecs' && moveCat === 'special') itemMult = 1.5;
    if (h === 'lifeorb') itemMult = 1.3;
  }

  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'adaptability' && stab > 1) stab = 2;

  let weatherMult = 1;
  const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
  if ((!isGym || isMoveWeather) && weather && weather.turns !== 0) {
    if (mechWeather === WEATHER_KEYS.SUN) {
      if (moveType === 'fire')  weatherMult = 1.5;
      if (moveType === 'water') {
        // Ola de calor (heatwave) y Sol Abrasador (intense_sun) evaporan el agua (0x)
        if (weather.type === 'intense_sun' || weather.type === 'heatwave') {
          weatherMult = 0;
        } else {
          weatherMult = 0.5;
        }
      }
    } else if (mechWeather === WEATHER_KEYS.RAIN) {
      if (moveType === 'water') weatherMult = 1.5;
      if (moveType === 'fire')  {
        // Tormenta extrema (storm) y Lluvia Torrencial (heavy_rain) extinguen el fuego (0x)
        if (weather.type === 'heavy_rain' || weather.type === 'storm') {
          weatherMult = 0;
        } else {
          weatherMult = 0.5;
        }
      }
    } else if (weather.type === 'thunderstorm') {
      if (moveType === 'electric' || moveType === 'dragon') {
        weatherMult = 1.5;
      } else if (moveType === 'fire') {
        // En tormentas eléctricas secas la visibilidad y carga reduce la efectividad del fuego a la mitad
        weatherMult = 0.5;
      }
    }
  }

  // Delta Stream (strong_winds) remueve debilidades del tipo volador
  let finalEff = eff;
  const isStrongWinds = (!isGym || isMoveWeather) && weather && weather.turns !== 0 && getMechWeather(weather.type) === 'clear' && weather.type === 'strong_winds';
  if (isStrongWinds && (defender.type === 'flying' || defender.type2 === 'flying')) {
    // Si el movimiento es super efectivo contra el defensor y este es Volador, removemos la debilidad
    if (finalEff > 1) {
      // Delta Stream convierte las debilidades del tipo Volador en daño neutro (x1)
      // Para simplificar, si el daño es super efectivo y es del tipo Electric/Ice/Rock (debilidades de volador), lo neutralizamos.
      if (['electric', 'ice', 'rock'].includes(moveType)) {
        finalEff /= 2;
      }
    }
  }

  // Ciclos implícitos (cuando el clima está despejado o no hay clima)
  if (!isGym && (!weather || weather.type === 'clear' || weather.type === 'none')) {
    if ((dayCycle === 'day' || dayCycle === 'morning') && moveType === 'fire') {
      weatherMult = 1.2;
    } else if ((dayCycle === 'night' || dayCycle === 'dusk') && moveType === 'water') {
      weatherMult = 1.2;
    }
  }

  const cleanMoveId = toID(move.id || '');
  const isSolarMove = cleanMoveId === 'solarbeam' || cleanMoveId === 'solarblade';
  if (isSolarMove && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_KEYS.SUN;
    const isClear = mechWeather === WEATHER_KEYS.CLEAR;
    if ((!isGym || isMoveWeather) && !isSun && !isClear) {
      weatherMult *= 0.5;
    }
  }


  let terrainMult = 1;
  if (weather && weather.type === 'grassyterrain' && moveType === 'ground' && (cleanMoveId === 'earthquake' || cleanMoveId === 'bulldoze' || cleanMoveId === 'magnitude')) {
    terrainMult = 0.5;
  }

  // Random damage roll: Showdown uses integer 85-100 divided by 100 with floor (not a float multiply)
  // Clamp to 100 to guard against mocked Math.random() === 1.0 producing 101
  const randomInt = randomFactor !== undefined
    ? Math.min(100, Math.round(randomFactor * 100))
    : Math.min(100, DAMAGE_ROLL_MIN_INT + Math.floor(Math.random() * DAMAGE_ROLL_RANGE_INT)); // 85 to 100 inclusive

  // Apply modifiers sequentially with floor at each step (matching Showdown's pokeRound chain)
  let finalDmg = (power > 0 && finalEff > 0 && weatherMult > 0)
    ? Math.max(1, Math.floor(
        Math.floor(
          Math.floor(
            Math.floor(
              Math.floor(baseDamage * critMult) * randomInt
            ) / 100
          ) * stab
        ) * finalEff * finalAbilityMult * weatherMult * itemMult * terrainMult
      ))
    : 0;

  if (attacker.status === 'brn' && moveCat === 'physical' && attacker.ability !== 'guts') {
    finalDmg = Math.floor(finalDmg * 0.5);
  }

  return {
    dmg: finalDmg,
    damage: finalDmg,
    eff: finalEff,
    stab,
    power,
    isCrit,
    isSuperEffective: finalEff > 1,
    isNotVeryEffective: finalEff > 0 && finalEff < 1,
    isNoEffect: finalEff === 0 || weatherMult === 0,
    triggeredAbility
  };
}

export interface PureDamageRange {
  normalMin: number
  normalMax: number
  normalPctMin: number
  normalPctMax: number
  critMin: number
  critMax: number
  critPctMin: number
  critPctMax: number
  koChanceText: string
}

export function calculateDamageRangePure(
  attacker: PurePokemon,
  defender: PurePokemon,
  move: PureMove,
  ctx: PureDamageOptions,
  dayCycle: 'morning' | 'day' | 'dusk' | 'night' = 'day'
): { effectiveness: { value: number; label: string; class: string } | null; damageRange: PureDamageRange | null } {
  const sim = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 1.0, false);
  const eff = sim.eff;
  let effLabel = 'Neutro';
  let effClass = 'neutral';
  if (eff > 1) {
    effLabel = 'Súper eficaz';
    effClass = 'boosted';
  } else if (eff < 1 && eff > 0) {
    effLabel = 'Poco eficaz';
    effClass = 'penalized';
  } else if (eff === 0) {
    effLabel = 'Inmune';
    effClass = 'penalized';
  }

  const effectiveness = {
    value: eff,
    label: effLabel,
    class: effClass
  };

  let damageRange: PureDamageRange | null = null;
  const isStatus = move.cat === 'status';

  if (!isStatus && (move.power ?? 0) > 0) {
    const normalMin = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 0.85, false).dmg;
    const normalMax = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 1.0, false).dmg;

    const critMin = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 0.85, true).dmg;
    const critMax = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 1.0, true).dmg;

    const rivalMaxHp = defender.maxHp || 100;
    const normalPctMin = Math.round((normalMin / rivalMaxHp) * 100);
    const normalPctMax = Math.round((normalMax / rivalMaxHp) * 100);
    const critPctMin = Math.round((critMin / rivalMaxHp) * 100);
    const critPctMax = Math.round((critMax / rivalMaxHp) * 100);

    const targetHp = (defender.hp !== undefined ? defender.hp : defender.maxHp) ?? 100;
    let koChanceText = '4+ HKO probable';
    
    if (normalMin >= targetHp) {
      koChanceText = 'OHKO garantizado';
    } else if (normalMax >= targetHp) {
      const diff = normalMax - normalMin;
      if (diff > 0) {
        const pct = Math.round(((normalMax - targetHp) / diff) * 100);
        koChanceText = `OHKO posible (${pct}%)`;
      } else {
        koChanceText = 'OHKO posible';
      }
    } else if (normalMin * 2 >= targetHp) {
      koChanceText = '2HKO garantizado';
    } else if (normalMax * 2 >= targetHp) {
      koChanceText = '2HKO posible';
    } else if (normalMin * 3 >= targetHp) {
      koChanceText = '3HKO garantizado';
    } else if (normalMax * 3 >= targetHp) {
      koChanceText = '3HKO posible';
    }

    damageRange = {
      normalMin,
      normalMax,
      normalPctMin,
      normalPctMax,
      critMin,
      critMax,
      critPctMin,
      critPctMax,
      koChanceText
    };
  }

  return { effectiveness, damageRange };
}
