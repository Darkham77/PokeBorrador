import type {
  PurePokemon,
  PureMove,
  PureBattleWeather,
  PureBattleStages,
  PureDamageOptions,
  PureDamageResult
} from './battleMathTypes.ts';
import { TYPE_CHART, type PokemonType } from '../../data/battle/types.ts';

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

// ── Pure Helper Functions ──────────────────────────────────────────────────────

function getMechWeather(type: string | null | undefined): string {
  if (!type || type === 'clear' || type === 'null') return WEATHER_KEYS.CLEAR;
  return WEATHER_MAP[type.toLowerCase()] ?? 'unknown';
}

function getTypeEff(moveType: string | undefined, defType: string | undefined, scrapy = false): number {
  if (!moveType || !defType) return 1;
  if (scrapy && defType === 'ghost' && (moveType === 'normal' || moveType === 'fighting')) return 1;
  const row = TYPE_CHART[moveType.toLowerCase() as PokemonType];
  return row ? (row[defType.toLowerCase() as PokemonType] ?? 1) : 1;
}

function getCombinedEff(moveType: string, defender: PurePokemon, attacker: PurePokemon | null = null, weather: string | null = null): number {
  const scrapy = attacker?.ability === 'scrappy';
  let eff = getTypeEff(moveType, defender.type, scrapy);
  if (defender.type2) eff *= getTypeEff(moveType, defender.type2, scrapy);

  // Delta Stream (Strong Winds): Remove Flying-type weaknesses
  const mechWeather = getMechWeather(weather);
  if (mechWeather === 'wind' && (defender.type === 'flying' || defender.type2 === 'flying')) {
    const isSuperEffectiveAgainstFlying = (t: string) => ['electric', 'ice', 'rock'].includes(t.toLowerCase());
    if (isSuperEffectiveAgainstFlying(moveType) && eff > 1) {
      eff = 1; // Neutralize super-effective hits against flying types
    }
  }

  return eff;
}

// ── Exported Pure Functions ────────────────────────────────────────────────────

/**
 * Determines the category of a move based on Generation rules.
 */
export function getMoveCategory(move: PureMove): 'status' | 'physical' | 'special' {
  if (ACTIVE_RULE_SET === 2) {
    const physicalTypes = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel'];
    const specialTypes  = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
    if (move.cat === 'status') return 'status';
    if (move.type && physicalTypes.includes(move.type)) return 'physical';
    if (move.type && specialTypes.includes(move.type))  return 'special';
  }
  return move.cat ?? 'physical';
}

/**
 * Returns ability multiplier for offensive calculations.
 */
export function getAbilityMultiplier(attacker: PurePokemon, move: PureMove, weather?: PureBattleWeather | null): { mult: number; triggeredAbility: string | null } {
  let mult = 1;
  let triggeredAbility: string | null = null;
  const ab = attacker.ability;
  const power = move.power ?? 0;
  const moveType = move.type ?? 'normal';

  const isLowHp = (attacker.hp ?? 0) <= ((attacker.maxHp ?? 1) / 3);
  if (isLowHp) {
    if (ab === 'Mar llamas' && moveType === 'fire')  { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Torrente'   && moveType === 'water') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Espesura'   && moveType === 'grass') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Enjambre'   && moveType === 'bug')   { mult *= 1.5; triggeredAbility = ab; }
  }
  if (ab === 'Agallas' && attacker.status && getMoveCategory(move) === 'physical') {
    mult *= 1.5; triggeredAbility = ab;
  }
  if (ab === 'Experto' && power > 0 && power <= 60) {
    mult *= 1.5; triggeredAbility = ab;
  }
  
  // Weather-dependent abilities
  if (weather && weather.turns !== 0) {
    const mech = getMechWeather(weather.type);
    if (ab === 'Fuerza arena' && mech === WEATHER_KEYS.SANDSTORM) {
      if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
        mult *= 1.3; triggeredAbility = ab;
      }
    }
  }

  return { mult, triggeredAbility };
}

/**
 * Returns the effective stat of a pokemon considering stages, weather, status, and abilities.
 */
export function getEffectiveStat(
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

  // Weather modifiers on base stat
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

  // Stage multiplier
  const stage = Math.max(-6, Math.min(6, (stages[statKey as keyof PureBattleStages] as number) || 0));
  const stageMult = (STAGE_MULTIPLIERS_STAT[String(stage)] as number) ?? 1.0;
  let val = Math.floor(baseVal * stageMult);

  // Weather: Coldwave speed reduction (50% for non-ice)
  if (!isGym && statKey === "spe" && weather?.type === "coldwave" && pokemon.type !== "ice" && pokemon.type2 !== "ice") {
    val = Math.floor(val * 0.5);
  }

  // Ability + status modifiers
  const ab = pokemon.ability;
  const isSun  = !isGym && (mechWeather === WEATHER_KEYS.SUN  || (mechWeather === WEATHER_KEYS.CLEAR && (dayCycle === 'day' || dayCycle === 'morning')));
  const isRain  = !isGym && (mechWeather === WEATHER_KEYS.RAIN || (mechWeather === WEATHER_KEYS.CLEAR && (dayCycle === 'night' || dayCycle === 'dusk')));

  if (statKey === 'atk') {
    let abilMult = 1;
    if (ab === 'Potencia' || ab === 'Energía pura') abilMult *= 2;
    if (ab === 'Agallas' && pokemon.status) abilMult *= 1.5;
    val = Math.floor(val * abilMult);
    if (pokemon.status === 'burn' && ab !== 'Agallas') val = Math.floor(val * 0.5);
  }
  if (statKey === 'def') {
    if (ab === 'Escama especial' && pokemon.status) val = Math.floor(val * 1.5);
  }
  if (statKey === 'spa') {
    if (ab === 'Poder solar' && isSun) val = Math.floor(val * 1.5);
  }
  if (statKey === 'spe') {
    let abilMult = 1;
    if (ab === 'Clorofila'   && isSun)  abilMult *= 2;
    if (ab === 'Nado rápido' && isRain) abilMult *= 2;
    if (ab === 'Ímpetu arena' && mechWeather === WEATHER_KEYS.SANDSTORM) abilMult *= 2;
    if (ab === 'Quitanieves'  && (mechWeather === WEATHER_KEYS.SNOW || mechWeather === WEATHER_KEYS.HAIL)) abilMult *= 2;
    val = Math.floor(val * abilMult);
    if (pokemon.status === 'paralysis') val = Math.floor(val * 0.5);
  }

  return Math.max(1, val);
}

/**
 * Central Damage Formula (pure, no external deps).
 * NOTE: move.power and move.type MUST be provided; this function does NOT
 * call any data provider. Callers are responsible for resolving move data.
 */
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

  const hasAclimatacion = attacker.ability === 'Aclimatación' || defender.ability === 'Aclimatación';
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

  // Stages per stat
  const aStages: PureBattleStages = { [isPhysical ? 'atk' : 'spa']: atkStages };
  const dStages: PureBattleStages = { [isPhysical ? 'def' : 'spd']: defStages };

  // Critical hit
  let critRate = ACTIVE_RULE_SET === 2 ? 0.0625 : (attacker.heldItem === 'scope_lens' ? 0.12 : 0.06);
  if (attacker.focusEnergy) critRate = 0.25;
  let isCrit = forceCrit !== undefined ? forceCrit : (Math.random() < critRate);
  if (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla') isCrit = false;

  if (isCrit) {
    const aKey = isPhysical ? 'atk' : 'spa';
    const dKey = isPhysical ? 'def' : 'spd';
    if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
    if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
  }

  const critMult = isCrit ? (ACTIVE_RULE_SET === 2 ? 2.0 : 1.5) : 1;

  const isGym = ctx.isGym || false;
  const A = getEffectiveStat(attacker, isPhysical ? 'atk' : 'spa', aStages, weather, dayCycle, isGym);
  const D = getEffectiveStat(defender, isPhysical ? 'def' : 'spd', dStages, weather, dayCycle, isGym);

  const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  // Ability multiplier (attacker)
  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplier(attacker, { ...move, type: moveType, power, cat: moveCat }, weather);

  // Defender: Sebo
  if (defender.ability === 'Sebo' && (moveType === 'fire' || moveType === 'ice')) {
    finalAbilityMult *= 0.5;
    triggeredAbility = 'Sebo';
  }

  // Item boost
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

  // STAB
  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'Adaptable' && stab > 1) stab = 2;

  // Weather multiplier
  let weatherMult = 1;
  if (!isGym && weather && weather.turns !== 0) {
    const wType = (weather.visual || weather.type).toLowerCase();
    if (mechWeather === WEATHER_KEYS.SUN) {
      if (moveType === 'fire')  weatherMult = 1.5;
      if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5; // Heatwave evaporates water
    } else if (mechWeather === WEATHER_KEYS.RAIN) {
      if (moveType === 'water') weatherMult = 1.5;
      if (moveType === 'fire')  weatherMult = (wType === 'storm' || wType === 'heavy_rain') ? 0 : 0.5; // Extreme rain extinguishes fire
    } else if (wType === 'thunderstorm') {
      if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5;
    }
  }

  // Solar Beam power reduction (Sandstorm, Snow, Hail, Fog, Rain, Thunderstorm)
  if (move.id === 'solar_beam' && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_KEYS.SUN;
    const isClear = mechWeather === WEATHER_KEYS.CLEAR && weather.type !== 'thunderstorm';
    if (!isGym && !isSun && !isClear) {
      weatherMult *= 0.5;
    }
  }

  // Day cycle bonus on clear weather
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
