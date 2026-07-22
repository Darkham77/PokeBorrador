import { Dex } from '@pkmn/sim';
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

export const CURRENT_GENERATION = ACTIVE_GENERATION;
export const ACTIVE_RULE_SET = ACTIVE_GENERATION;

export const STAGE_MULTIPLIERS_STAT: Record<string, number> = {
  '-6': 0.25, '-5': 0.28, '-4': 0.33, '-3': 0.40, '-2': 0.50, '-1': 0.66,
  '0': 1.0, '1': 1.5, '2': 2.0, '3': 2.5, '4': 3.0, '5': 3.5, '6': 4.0
};

export const STAGE_MULTIPLIERS_ACC: Record<string, number> = {
  '-6': 0.33, '-5': 0.37, '-4': 0.43, '-3': 0.50, '-2': 0.60, '-1': 0.75,
  '0': 1.0, '1': 1.33, '2': 1.66, '3': 2.0, '4': 2.33, '5': 2.66, '6': 3.0
};

const WEATHER_KEYS = { SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', WIND: 'wind', CLEAR: 'clear' } as const;


const dexGen = Dex.forGen(ACTIVE_GENERATION);

function getMechWeather(type: string | null | undefined): string {
  if (!type) return 'clear';
  const lower = type.toLowerCase();
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
  const mType = moveType.toLowerCase();
  const dType = defType.toLowerCase();

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

export function getMoveCategory(move: PureMove): 'status' | 'physical' | 'special' {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= 3) {
    if (move.type) {
      const specialTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
      if (specialTypes.includes(move.type.toLowerCase())) return 'special';
    }
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
    mult *= 1.5; triggeredAbility = ab;
  }
  if (ab === 'technician' && power > 0 && power <= 60) {
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

  let baseVal = (pokemon[statKey] as number) || 10;
  if (statKey === 'spa' && !pokemon.spa) baseVal = pokemon.atk ?? 10;
  if (statKey === 'spd' && !pokemon.spd) baseVal = pokemon.def ?? 10;
  if (statKey === 'atk' && !pokemon.atk) baseVal = pokemon.spa ?? 10;
  if (statKey === 'def' && !pokemon.def) baseVal = pokemon.spd ?? 10;

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

  const stage = Math.max(-6, Math.min(6, (stages[statKey as keyof PureBattleStages] as number) || 0));
  const stageMult = (STAGE_MULTIPLIERS_STAT[String(stage)] as number) ?? 1.0;
  let val = Math.floor(baseVal * stageMult);

  const ab = pokemon.ability;
  const isSun  = (!isGym || isMoveWeather) && (mechWeather === WEATHER_KEYS.SUN || (mechWeather === WEATHER_KEYS.CLEAR && !isGym && (_dayCycle === 'day' || _dayCycle === 'morning')));
  const isRain  = (!isGym || isMoveWeather) && mechWeather === WEATHER_KEYS.RAIN;


  if (statKey === 'atk') {
    let abilMult = 1;
    if (ab === 'hugepower' || ab === 'purepower') abilMult *= 2;
    if (ab === 'guts' && pokemon.status) abilMult *= 1.5;
    val = Math.floor(val * abilMult);
    if ((pokemon.status === 'burn' || pokemon.status === 'brn') && ab !== 'guts') val = Math.floor(val * 0.5);
  }
  if (statKey === 'def') {
    if (ab === 'marvelscale' && pokemon.status) val = Math.floor(val * 1.5);
  }
  if (statKey === 'spa') {
    if (ab === 'solarpower' && isSun) val = Math.floor(val * 1.5);
  }
  if (statKey === 'spe') {
    let abilMult = 1;
    if (ab === 'chlorophyll'   && isSun)  abilMult *= 2;
    if (ab === 'swiftswim' && isRain) abilMult *= 2;
    if (ab === 'sandrush' && mechWeather === WEATHER_KEYS.SANDSTORM) abilMult *= 2;
    if (ab === 'slushrush'  && (mechWeather === WEATHER_KEYS.SNOW || mechWeather === WEATHER_KEYS.HAIL)) abilMult *= 2;
    val = Math.floor(val * abilMult);
    if (pokemon.status === 'par') val = Math.floor(val * 0.5);
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

  let critRate = (ACTIVE_RULE_SET as number) === 2 ? 0.0625 : (attacker.heldItem === 'scopelens' ? 0.12 : 0.06);
  if (attacker.focusEnergy) critRate = 0.25;
  let isCrit = forceCrit !== undefined ? forceCrit : (Math.random() < critRate);
  if (defender.ability === 'shellarmor' || defender.ability === 'battlearmor') isCrit = false;

  if (isCrit) {
    const aKey = isPhysical ? 'atk' : 'spa';
    const dKey = isPhysical ? 'def' : 'spd';
    if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
    if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
  }

  const critMult = isCrit ? ((ACTIVE_RULE_SET as number) === 2 ? 2.0 : 1.5) : 1;

  const isGym = ctx.isGym || false;
  const A = getEffectiveStatPure(attacker, isPhysical ? 'atk' : 'spa', aStages, weather, dayCycle, isGym);
  const D = getEffectiveStatPure(defender, isPhysical ? 'def' : 'spd', dStages, weather, dayCycle, isGym);

  const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

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

  const isSolarBeam = move.id === 'solar_beam' || move.id === 'solarbeam' || move.id === 'rayo_solar' ||
                      move.name?.toLowerCase() === 'rayo solar' || move.name?.toLowerCase() === 'solarbeam' || move.name?.toLowerCase() === 'solar beam';
  if (isSolarBeam && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_KEYS.SUN;
    const isClear = mechWeather === WEATHER_KEYS.CLEAR;
    if ((!isGym || isMoveWeather) && !isSun && !isClear) {
      weatherMult *= 0.5;
    }
  }


  const random = randomFactor ?? (0.85 + Math.random() * 0.15);

  const finalDmg = (finalEff > 0 && weatherMult > 0)
    ? Math.max(1, Math.floor(baseDamage * stab * finalAbilityMult * finalEff * random * critMult * weatherMult * itemMult))
    : 0;

  return {
    dmg: finalDmg, eff: finalEff, stab, power, isCrit,
    isSuperEffective:    finalEff > 1,
    isNotVeryEffective:  finalEff < 1 && finalEff > 0,
    isNoEffect:          finalEff === 0,
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

export { calculateCatchRatePure, calculateEscapeChancePure } from './battleCatchMath.ts'
