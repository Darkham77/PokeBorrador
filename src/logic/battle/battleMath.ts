import { Dex } from '@pkmn/sim';
import type {
  PurePokemon,
  PureMove,
  PureBattleWeather,
  PureBattleStages,
  PureDamageOptions,
  PureDamageResult,
  PureCatchOptions
} from './battleMathTypes.ts';

export * from './battleMathTypes.ts';

export const CURRENT_GENERATION = 2;
export const ACTIVE_RULE_SET = 2;

export const STAGE_MULTIPLIERS_STAT: Record<string, number> = {
  '-6': 0.25, '-5': 0.28, '-4': 0.33, '-3': 0.40, '-2': 0.50, '-1': 0.66,
  '0': 1.0, '1': 1.5, '2': 2.0, '3': 2.5, '4': 3.0, '5': 3.5, '6': 4.0
};

export const STAGE_MULTIPLIERS_ACC: Record<string, number> = {
  '-6': 0.33, '-5': 0.37, '-4': 0.43, '-3': 0.50, '-2': 0.60, '-1': 0.75,
  '0': 1.0, '1': 1.33, '2': 1.66, '3': 2.0, '4': 2.33, '5': 2.66, '6': 3.0
};

const WEATHER_KEYS = { SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', WIND: 'wind', CLEAR: 'clear' } as const;

const WEATHER_MAP: Record<string, string> = {
  sun: 'sun', heatwave: 'sun', intense_sun: 'sun',
  rain: 'rain', storm: 'rain', heavy_rain: 'rain',
  sandstorm: 'sandstorm', dust_storm: 'sandstorm',
  snow: 'snow', hail: 'hail', blizzard: 'hail',
  fog: 'fog', mist: 'fog',
  wind: 'wind', strong_winds: 'wind',
  clear: 'clear', thunderstorm: 'clear'
};

const dexGen = Dex.forGen(3);

function getMechWeather(type: string | null | undefined): string {
  if (!type || type === 'clear' || type === 'null') return WEATHER_KEYS.CLEAR;
  return WEATHER_MAP[type.toLowerCase()] ?? 'unknown';
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

function getCombinedEff(moveType: string, defender: PurePokemon, attacker: PurePokemon | null = null, weather: string | null = null): number {
  const scrapy = attacker?.ability === 'scrappy';
  let eff = getTypeEff(moveType, defender.type, scrapy);
  if (defender.type2) eff *= getTypeEff(moveType, defender.type2, scrapy);

  const mechWeather = getMechWeather(weather);
  if (mechWeather === 'wind' && (defender.type === 'flying' || defender.type2 === 'flying')) {
    const isSuperEffectiveAgainstFlying = (t: string) => ['electric', 'ice', 'rock'].includes(t.toLowerCase());
    if (isSuperEffectiveAgainstFlying(moveType) && eff > 1) {
      eff = 1;
    }
  }

  return eff;
}

export function getMoveCategory(move: PureMove): 'status' | 'physical' | 'special' {
  if (move.cat === 'status') return 'status';
  if (move.type) {
    const specialTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
    if (specialTypes.includes(move.type.toLowerCase())) return 'special';
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
  dayCycle: 'morning' | 'day' | 'dusk' | 'night' = 'day',
  isGym: boolean = false
): number {
  const mechWeather = isGym ? 'clear' : getMechWeather(weather?.type);

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

  if (!isGym && statKey === "spe" && weather?.type === "coldwave" && pokemon.type !== "ice" && pokemon.type2 !== "ice") {
    val = Math.floor(val * 0.5);
  }

  const ab = pokemon.ability;
  const isSun  = !isGym && (mechWeather === WEATHER_KEYS.SUN  || (mechWeather === WEATHER_KEYS.CLEAR && (dayCycle === 'day' || dayCycle === 'morning')));
  const isRain  = !isGym && (mechWeather === WEATHER_KEYS.RAIN || (mechWeather === WEATHER_KEYS.CLEAR && (dayCycle === 'night' || dayCycle === 'dusk')));

  if (statKey === 'atk') {
    let abilMult = 1;
    if (ab === 'hugepower' || ab === 'purepower') abilMult *= 2;
    if (ab === 'guts' && pokemon.status) abilMult *= 1.5;
    val = Math.floor(val * abilMult);
    if (pokemon.status === 'burn' && ab !== 'guts') val = Math.floor(val * 0.5);
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
    if (pokemon.status === 'paralysis') val = Math.floor(val * 0.5);
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

  let critRate = ACTIVE_RULE_SET === 2 ? 0.0625 : (attacker.heldItem === 'scope_lens' ? 0.12 : 0.06);
  if (attacker.focusEnergy) critRate = 0.25;
  let isCrit = forceCrit !== undefined ? forceCrit : (Math.random() < critRate);
  if (defender.ability === 'shellarmor' || defender.ability === 'battlearmor') isCrit = false;

  if (isCrit) {
    const aKey = isPhysical ? 'atk' : 'spa';
    const dKey = isPhysical ? 'def' : 'spd';
    if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
    if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
  }

  const critMult = isCrit ? (ACTIVE_RULE_SET === 2 ? 2.0 : 1.5) : 1;

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
    if (h === 'choice_band' && moveCat === 'physical') itemMult = 1.5;
  }

  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'adaptability' && stab > 1) stab = 2;

  let weatherMult = 1;
  if (!isGym && weather && weather.turns !== 0) {
    const wType = (weather.visual || weather.type).toLowerCase();
    if (mechWeather === WEATHER_KEYS.SUN) {
      if (moveType === 'fire')  weatherMult = 1.5;
      if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5;
    } else if (mechWeather === WEATHER_KEYS.RAIN) {
      if (moveType === 'water') weatherMult = 1.5;
      if (moveType === 'fire')  weatherMult = (wType === 'storm' || wType === 'heavy_rain') ? 0 : 0.5;
    } else if (wType === 'thunderstorm') {
      if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5;
    }
  }

  if (move.id === 'solar_beam' && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_KEYS.SUN;
    const isClear = mechWeather === WEATHER_KEYS.CLEAR && weather.type !== 'thunderstorm';
    if (!isGym && !isSun && !isClear) {
      weatherMult *= 0.5;
    }
  }

  if (!isGym && weatherMult === 1 && (mechWeather === WEATHER_KEYS.CLEAR || !weather)) {
    if ((dayCycle === 'day' || dayCycle === 'morning') && moveType === 'fire')  weatherMult = 1.2;
    if ((dayCycle === 'night' || dayCycle === 'dusk')  && moveType === 'water') weatherMult = 1.2;
  }

  const random = randomFactor ?? (0.85 + Math.random() * 0.15);

  const finalDmg = (eff > 0 && weatherMult > 0)
    ? Math.max(1, Math.floor(baseDamage * stab * finalAbilityMult * eff * random * critMult * weatherMult * itemMult))
    : 0;

  return {
    dmg: finalDmg, eff, stab, power, isCrit,
    isSuperEffective:    eff > 1,
    isNotVeryEffective:  eff < 1 && eff > 0,
    isNoEffect:          eff === 0,
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

// ── Catch Rate logic from catchMath ──────────────────────────────────────────

export function calculateCatchRatePure(pokemon: PurePokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx: PureCatchOptions = {}) {
  const ballName = String(rawBallType || '').toLowerCase();
  
  const BALL_BEHAVIORS: Record<string, { guaranteed?: boolean, mult?: number | ((p: PurePokemon, c: PureCatchOptions) => number) }> = {
    'master': { guaranteed: true },
    '100': { guaranteed: true },
    'ultra': { mult: 2.0 },
    'super': { mult: 1.5 },
    'súper': { mult: 1.5 },
    'net': { 
      mult: (p, c) => {
        const isWaterOrBug = (p.type === 'water' || p.type2 === 'water' || p.type === 'bug' || p.type2 === 'bug');
        const mech = getMechWeather(c.weather?.type);
        const isRain = mech === WEATHER_KEYS.RAIN;
        return (isWaterOrBug || isRain) ? 3.5 : 1.0;
      }
    },
    'dusk': { 
      mult: (_p, c) => {
        const cycle = c.cycle || 'day';
        const isNight = cycle === 'night' || cycle === 'dusk';
        const isCave = !!c.isCave;
        const mech = getMechWeather(c.weather?.type);
        const isFog = mech === WEATHER_KEYS.FOG;
        return (isNight || isCave || isFog) ? 3.0 : 1.0;
      }
    },
    'timer': { 
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
  };

  const behaviorEntry = Object.entries(BALL_BEHAVIORS).find(([key]) => ballName.includes(key));
  const behavior = behaviorEntry ? behaviorEntry[1] : { mult: 1.0 };

  if (behavior.guaranteed) return { caught: true, shakes: 3 };

  let ballMult = 1.0;
  if (typeof behavior.mult === 'function') ballMult = behavior.mult(pokemon, ctx);
  else if (behavior.mult) ballMult = behavior.mult;

  const curHp = pokemon.hp ?? 10;
  const maxHp = pokemon.maxHp ?? 10;
  const hpFactor = (3 * maxHp - 2 * curHp) / (3 * maxHp);
  const catchRate = pokemon.catchRate ?? 45;

  const statusMult = (pokemon.status === 'sleep' || pokemon.status === 'freeze') ? 2.0 : 
                     (pokemon.status ? 1.5 : 1.0);

  const eventBonus = eventCatchMult - 1;
  const totalMult = Math.max(0.1, ballMult + eventBonus);

  const finalRate = Math.min(255, Math.max(1, Math.floor(catchRate * totalMult * hpFactor * statusMult)));
  const b = Math.floor(65535 * Math.pow(finalRate / 255, 0.25));
  
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65535 < b) shakes++;
    else break;
  }

  return { caught: shakes === 4, shakes: Math.min(3, shakes) };
}

export function calculateEscapeChancePure(playerPoke: PurePokemon, wildPoke: PurePokemon, attempts: number, weather: PureBattleWeather | null) {
  const pSpe = getEffectiveStatPure(playerPoke, 'spe', {}, weather);
  const eSpe = getEffectiveStatPure(wildPoke, 'spe', {}, weather);
  const safeESpe = Math.max(1, eSpe);
  const f = Math.floor((pSpe * 128) / safeESpe) + 30 * attempts;
  return Math.floor(Math.random() * 256) < f;
}
