/**
 * src/logic/battle/battleMath.ts
 *
 * PURE MATH CORE (Zero external dependencies)
 *
 * Extracts the stateless, pure mathematical formulas from battleFormulas.ts
 * into a standalone module with NO imports from Vue, Pinia, Supabase,
 * data providers, or any browser-specific API.
 *
 * This file exists for two purposes:
 *   1. Be importable by the native Node.js 26+ test runner (node:test).
 *   2. Serve as the Single Source of Truth for all combat math, reducing
 *      the risk of drift between battleFormulas.ts (which re-exports these).
 *
 * [PureVue-Ignore]
 */

// ── Type Stubs (inline to avoid alias resolution) ────────────────────────────

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
}

export interface PureDamageResult {
  dmg: number;
  eff: number;
  stab?: number;
  power?: number;
  isCrit?: boolean;
  isSuperEffective?: boolean;
  isNotVeryEffective?: boolean;
  isNoEffect: boolean;
  triggeredAbility?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Type Effectiveness Chart ───────────────────────────────────────────────────

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

const WEATHER_KEYS = { SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', WIND: 'wind', CLEAR: 'clear' } as const;

const WEATHER_MAP: Record<string, string> = {
  sun: 'sun', heatwave: 'sun', intense_sun: 'sun',
  rain: 'rain', storm: 'rain', thunderstorm: 'rain', heavy_rain: 'rain',
  sandstorm: 'sandstorm', dust_storm: 'sandstorm',
  snow: 'snow', hail: 'hail', blizzard: 'hail',
  fog: 'fog', mist: 'fog',
  wind: 'wind', strong_winds: 'wind',
  clear: 'clear'
};

// ── Pure Helper Functions ──────────────────────────────────────────────────────

function getMechWeather(type: string | null | undefined): string {
  if (!type || type === 'clear' || type === 'null') return WEATHER_KEYS.CLEAR;
  return WEATHER_MAP[type.toLowerCase()] ?? 'unknown';
}

function getTypeEff(moveType: string | undefined, defType: string | undefined, scrapy = false): number {
  if (!moveType || !defType) return 1;
  if (scrapy && defType === 'ghost' && (moveType === 'normal' || moveType === 'fighting')) return 1;
  const row = TYPE_CHART[moveType.toLowerCase()];
  return row ? (row[defType.toLowerCase()] ?? 1) : 1;
}

function getCombinedEff(moveType: string, defender: PurePokemon, attacker: PurePokemon | null = null, weather: string | null = null): number {
  const scrapy = attacker?.ability === 'Intrépido';
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
export function getAbilityMultiplier(attacker: PurePokemon, move: PureMove): { mult: number; triggeredAbility: string | null } {
  let mult = 1;
  let triggeredAbility: string | null = null;
  const ab = attacker.ability;
  const power = move.power ?? 0;

  const isLowHp = (attacker.hp ?? 0) <= ((attacker.maxHp ?? 1) / 3);
  if (isLowHp) {
    if (ab === 'Mar llamas' && move.type === 'fire')  { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Torrente'   && move.type === 'water') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Espesura'   && move.type === 'grass') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Enjambre'   && move.type === 'bug')   { mult *= 1.5; triggeredAbility = ab; }
  }
  if (ab === 'Agallas' && attacker.status && getMoveCategory(move) === 'physical') {
    mult *= 1.5; triggeredAbility = ab;
  }
  if (ab === 'Experto' && power > 0 && power <= 60) {
    mult *= 1.5; triggeredAbility = ab;
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
  dayCycle: 'morning' | 'day' | 'dusk' | 'night' = 'day'
): number {
  const mechWeather = getMechWeather(weather?.type);

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

  // Ability + status modifiers
  const ab = pokemon.ability;
  const isSun  = mechWeather === WEATHER_KEYS.SUN  || (mechWeather === WEATHER_KEYS.CLEAR && (dayCycle === 'day' || dayCycle === 'morning'));
  const isRain  = mechWeather === WEATHER_KEYS.RAIN || (mechWeather === WEATHER_KEYS.CLEAR && (dayCycle === 'night' || dayCycle === 'dusk'));

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
  randomFactor?: number
): PureDamageResult {
  const { atkStages = 0, defStages = 0, weather = null } = ctx;

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
  let critRate = ACTIVE_RULE_SET === 2 ? 0.0625 : (attacker.heldItem === 'Lente Zoom' ? 0.12 : 0.06);
  if (attacker.focusEnergy) critRate = 0.25;
  let isCrit = Math.random() < critRate;
  if (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla') isCrit = false;

  if (isCrit) {
    const aKey = isPhysical ? 'atk' : 'spa';
    const dKey = isPhysical ? 'def' : 'spd';
    if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
    if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
  }

  const critMult = isCrit ? (ACTIVE_RULE_SET === 2 ? 2.0 : 1.5) : 1;

  const A = getEffectiveStat(attacker, isPhysical ? 'atk' : 'spa', aStages, weather, dayCycle);
  const D = getEffectiveStat(defender, isPhysical ? 'def' : 'spd', dStages, weather, dayCycle);

  const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  // Ability multiplier (attacker)
  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplier(attacker, { ...move, type: moveType, power, cat: moveCat });

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
      'Carbón': 'fire', 'Imán': 'electric', 'Agua Mística': 'water',
      'Semilla Milagro': 'grass', 'Cinturón Negro': 'fighting',
      'Cuchara Torcida': 'psychic', 'Hechizo': 'ghost', 'Polvo Plata': 'bug',
      'Flecha Venenosa': 'poison'
    };
    if (typeBoosters[h] === moveType) itemMult = 1.2;
    if (h === 'Cinta Elegida' && moveCat === 'physical') itemMult = 1.5;
  }

  // STAB
  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'Adaptable' && stab > 1) stab = 2;

  // Weather multiplier
  let weatherMult = 1;
  if (weather && weather.turns !== 0) {
    const wType = weather.type.toLowerCase();
    if (mechWeather === WEATHER_KEYS.SUN) {
      if (moveType === 'fire')  weatherMult = 1.5;
      if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5; // Heatwave evaporates water
    } else if (mechWeather === WEATHER_KEYS.RAIN) {
      if (moveType === 'water') weatherMult = 1.5;
      if (moveType === 'fire')  weatherMult = (wType === 'storm') ? 0 : 0.5; // Storm extinguishes fire
    }
  }

  // Solar Beam power reduction (Sandstorm, Snow, Hail, Fog)
  if (move.id === 'solar_beam' && weather && weather.turns !== 0) {
    const adverseWeathers = [WEATHER_KEYS.SANDSTORM, WEATHER_KEYS.SNOW, WEATHER_KEYS.HAIL, WEATHER_KEYS.FOG];
    if (adverseWeathers.includes(mechWeather as typeof adverseWeathers[number])) {
      weatherMult *= 0.5;
    }
  }

  // Day cycle bonus on clear weather
  if (weatherMult === 1 && (mechWeather === WEATHER_KEYS.CLEAR || !weather)) {
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

// ── Catch & Escape Logic ─────────────────────────────────────────────────────

export interface PureCatchOptions {
  weather?: PureBattleWeather | null;
  turnCount?: number;
  cycle?: string;
  isCave?: boolean;
}

export function calculateCatchRate(pokemon: PurePokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx: PureCatchOptions = {}) {
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

export function calculateEscapeChance(playerPoke: PurePokemon, wildPoke: PurePokemon, attempts: number, weather: PureBattleWeather | null) {
  const pSpe = getEffectiveStat(playerPoke, 'spe', {}, weather);
  const eSpe = getEffectiveStat(wildPoke, 'spe', {}, weather);
  const safeESpe = Math.max(1, eSpe);

  // Modern (Gen 4+)
  const f = Math.floor((pSpe * 128) / safeESpe) + 30 * attempts;
  return Math.floor(Math.random() * 256) < f;
}
