/**
 * Battle Formulas Central Manager (Gen 2 / Gen 4+ math)
 * Defines core rules, constants, and math for the game engine.
 * Refer to `@/project-standards/references/core/game_formulas_manual.md` for logic details.
 */

import { getCombinedEffectiveness } from '../pokemon/typeEngine';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getMechanicalWeather, WEATHER_MECHANICAL } from './weatherMapper';
import { getDayCycle } from '../timeUtils';

export const CURRENT_GENERATION = 2;
export const ACTIVE_RULE_SET = 2;

/**
 * Stage Multipliers (-6 to +6) mapping
 */
export const STAGE_MULTIPLIERS_STAT = {
  '-6': 0.25, '-5': 0.28, '-4': 0.33, '-3': 0.40, '-2': 0.50, '-1': 0.66,
  '0': 1.0, '1': 1.5, '2': 2.0, '3': 2.5, '4': 3.0, '5': 3.5, '6': 4.0
};
export const STAGE_MULTIPLIERS_ACC = {
  '-6': 0.33, '-5': 0.37, '-4': 0.43, '-3': 0.50, '-2': 0.60, '-1': 0.75,
  '0': 1.0, '1': 1.33, '2': 1.66, '3': 2.0, '4': 2.33, '5': 2.66, '6': 3.0
};

/**
 * Returns the effective stat of a pokemon considering stages, weather, status, and abilities.
 * @param {Object} pokemon 
 * @param {string} statKey 
 * @param {Object} stages 
 * @param {Object} weather 
 */
export function getEffectiveStat(pokemon, statKey, stages, weather) {
  const breakdown = getStatBreakdown(pokemon, statKey, stages, weather);
  return breakdown.final;
}

export function getStatBreakdown(pokemon, statKey, stages, weather) {
  const mechWeather = getMechanicalWeather(weather?.type);
  const cycle = getDayCycle();
  
  let baseVal = pokemon[statKey] || 10;
  if (statKey === 'spa' && !pokemon.spa) baseVal = pokemon.atk;
  if (statKey === 'spd' && !pokemon.spd) baseVal = pokemon.def;

  const results = {
    base: baseVal,
    weatherMult: 1,
    stageMult: 1,
    statusMult: 1,
    abilityMult: 1,
    final: baseVal
  };

  // Weather Modifiers (Apply to Base in Gen 4+)
  if (statKey === 'def') {
    if ((mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL) && (pokemon.type === 'ice' || pokemon.type2 === 'ice')) {
      results.weatherMult = 1.5;
      baseVal = Math.floor(baseVal * 1.5);
    }
  }
  if (statKey === 'spd') {
    if (mechWeather === WEATHER_MECHANICAL.SANDSTORM && (pokemon.type === 'rock' || pokemon.type2 === 'rock')) {
      results.weatherMult = 1.5;
      baseVal = Math.floor(baseVal * 1.5);
    }
  }

  // Stage Multipliers
  const stage = stages ? Math.max(-6, Math.min(6, (stages[statKey] || 0))) : 0;
  results.stageMult = STAGE_MULTIPLIERS_STAT[String(stage)] || 1.0;
  let val = Math.floor(baseVal * results.stageMult);

  // Ability & Status Modifiers
  const ab = pokemon.ability;
  const isSun = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'));
  const isRain = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'));

  if (statKey === 'atk') {
    if (ab === 'Potencia' || ab === 'Energía pura') results.abilityMult *= 2;
    if (ab === 'Agallas' && pokemon.status) results.abilityMult *= 1.5;
    
    val = Math.floor(val * results.abilityMult);

    if (pokemon.status === 'burn' && ab !== 'Agallas') {
      results.statusMult = 0.5;
      val = Math.floor(val * 0.5);
    }
  }

  if (statKey === 'def') {
    if (ab === 'Escama especial' && pokemon.status) {
      results.abilityMult = 1.5;
      val = Math.floor(val * 1.5);
    }
  }

  if (statKey === 'spe') {
    if (ab === 'Clorofila' && isSun) results.abilityMult *= 2;
    if (ab === 'Nado rápido' && isRain) results.abilityMult *= 2;
    if (ab === 'Ímpetu arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) results.abilityMult *= 2;
    if (ab === 'Quitanieves' && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)) results.abilityMult *= 2;
    
    val = Math.floor(val * results.abilityMult);

    if (pokemon.status === 'paralyze') {
      results.statusMult = 0.5; // Modern mechanics (Gen 7+): 50% speed reduction
      val = Math.floor(val * 0.5);
    }
  }

  results.final = Math.max(1, val);
  return results;
}

/**
 * Determines the category of a move based on Generation rules.
 */
export function getMoveCategory(move) {
  if (ACTIVE_RULE_SET === 2) {
    // Category by Type
    const physicalTypes = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel'];
    const specialTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
    
    if (move.cat === 'status') return 'status'; // Status moves keep their category
    
    if (physicalTypes.includes(move.type)) return 'physical';
    if (specialTypes.includes(move.type)) return 'special';
  }
  // Gen 4+ uses direct category
  return move.cat || 'physical';
}

/**
 * Returns ability multiplier for offensive calculations.
 */
export function getAbilityMultiplier(attacker, defender, move) {
  let mult = 1;
  let triggeredAbility = null;
  const ab = attacker.ability;
  const power = move.power || 0;

  // Damage boosters at low HP (1/3)
  const isLowHp = attacker.hp <= (attacker.maxHp / 3);
  if (isLowHp) {
    if (ab === 'Mar llamas' && move.type === 'fire') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Torrente' && move.type === 'water') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Espesura' && move.type === 'grass') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Enjambre' && move.type === 'bug') { mult *= 1.5; triggeredAbility = ab; }
  }

  if (ab === 'Agallas' && attacker.status && getMoveCategory(move) === 'physical') {
    mult *= 1.5;
    triggeredAbility = ab;
  }

  if (ab === 'Experto' && power > 0 && power <= 60) {
    mult *= 1.5;
    triggeredAbility = ab;
  }

  return { mult, triggeredAbility };
}

/**
 * Central Damage Formula.
 */
export function calculateDamage(attacker, defender, move, ctx = {}) {
  const { atkStages = 0, defStages = 0, weather = null } = ctx;
  
  let power = move.power;
  let moveType = move.type;

  if (power === undefined || !moveType) {
    const md = pokemonDataProvider.getMoveData(move.name);
    if (md) {
      if (power === undefined) power = md.power || 0;
      if (!moveType) moveType = md.type || 'normal';
    } else {
      power = power || 0;
      moveType = moveType || 'normal';
    }
  }

  let moveCat = getMoveCategory({ ...move, type: moveType });

  if (move.effect === 'dream_eater' && defender.status !== 'sleep') {
    return { dmg: 0, eff: 0, isNoEffect: true };
  }

  if (move.effect === 'magnitude' && !ctx.magnitudeSet) {
    const magRoll = Math.random() * 100;
    if (magRoll < 5) power = 10;
    else if (magRoll < 15) power = 30;
    else if (magRoll < 35) power = 50;
    else if (magRoll < 65) power = 70;
    else if (magRoll < 85) power = 90;
    else if (magRoll < 95) power = 110;
    else power = 150;
  }

  if (move.id === 'fury_cutter' && attacker.furyCutterCount) {
    power = Math.min(160, power * Math.pow(2, attacker.furyCutterCount - 1));
  }

  const mechWeather = getMechanicalWeather(weather?.type);
  const cycle = getDayCycle();
  const isSolarBoosted = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'));
  
  if ((move.id === 'solar_beam' || move.id === 'solar_blade') && !isSolarBoosted && mechWeather !== WEATHER_MECHANICAL.CLEAR) {
    power = Math.floor(power * 0.5);
  }

  if (move.fixedDmg) return { dmg: move.fixedDmg, eff: 1, isNoEffect: false };
  if (move.levelDmg) return { dmg: attacker.level, eff: 1, isNoEffect: false };
  if (move.halfHP) {
    const dmg = Math.max(1, Math.floor(defender.hp / 2));
    return { dmg, eff: 1, isNoEffect: false };
  }

  const eff = getCombinedEffectiveness(moveType, defender, attacker);

  if (moveCat === 'status' || (power === 0 && moveCat !== 'status')) {
    return { dmg: 0, eff, isNoEffect: eff === 0 };
  }

  const isPhysical = moveCat === 'physical';
  let aStages = { [isPhysical ? 'atk' : 'spa']: atkStages };
  let dStages = { [isPhysical ? 'def' : 'spd']: defStages };

  // Critical Hit logic
  let critRate = (attacker.heldItem === 'Lente Zoom') ? 0.12 : 0.06;
  if (attacker.focusEnergy) critRate = 0.25;
  if (ACTIVE_RULE_SET === 2) critRate = 0.0625; // Base probability 1/16
  
  let isCrit = Math.random() < critRate;
  if (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla') isCrit = false;
  
  // Stat Reset Rule for Crits
  if (isCrit) {
    if (aStages[isPhysical ? 'atk' : 'spa'] < 0) aStages[isPhysical ? 'atk' : 'spa'] = 0;
    if (dStages[isPhysical ? 'def' : 'spd'] > 0) dStages[isPhysical ? 'def' : 'spd'] = 0;
  }

  const critMult = isCrit ? (ACTIVE_RULE_SET === 2 ? 2.0 : 1.5) : 1;

  const A = getEffectiveStat(attacker, isPhysical ? 'atk' : 'spa', aStages, weather);
  const D = getEffectiveStat(defender, isPhysical ? 'def' : 'spd', dStages, weather);

  // Base Damage Formula
  const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplier(attacker, defender, { ...move, type: moveType, power, cat: moveCat });
  
  if (defender.ability === 'Sebo' && (moveType === 'fire' || moveType === 'ice')) {
    finalAbilityMult *= 0.5;
    triggeredAbility = 'Sebo';
  }

  let itemMult = 1;
  if (attacker.heldItem) {
    const h = attacker.heldItem;
    const typeBoosters = { 'Carbón': 'fire', 'Imán': 'electric', 'Agua Mística': 'water', 'Semilla Milagro': 'grass', 'Cinturón Negro': 'fighting', 'Cuchara Torcida': 'psychic', 'Hechizo': 'ghost', 'Polvo Plata': 'bug', 'Flecha Venenosa': 'poison' };
    if (typeBoosters[h] === moveType) itemMult = 1.2;
    if (h === 'Cinta Elegida' && moveCat === 'physical') itemMult = 1.5;
  }

  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'Adaptable' && stab > 1) stab = 2;

  let weatherMult = 1;
  if (weather && weather.turns !== 0) {
    if (mechWeather === WEATHER_MECHANICAL.SUN) {
      if (moveType === 'fire') weatherMult = 1.5;
      else if (moveType === 'water') weatherMult = 0.5;
    } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
      if (moveType === 'water') weatherMult = 1.5;
      else if (moveType === 'fire') weatherMult = 0.5;
    }
  }

  if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
    if (cycle === 'day' || cycle === 'morning') {
      if (moveType === 'fire') weatherMult = 1.2;
    } else if (cycle === 'night' || cycle === 'dusk') {
      if (moveType === 'water') weatherMult = 1.2;
    }
  }

  const random = 0.85 + Math.random() * 0.15;

  const finalDmg = eff > 0 
    ? Math.max(1, Math.floor(baseDamage * stab * finalAbilityMult * eff * random * critMult * weatherMult * itemMult)) 
    : 0;

  return {
    dmg: finalDmg,
    eff,
    stab,
    power,
    isCrit,
    isSuperEffective: eff > 1,
    isNotVeryEffective: eff < 1 && eff > 0,
    isNoEffect: eff === 0,
    triggeredAbility
  };
}

/**
 * Capture Math
 */
export function calculateCatchRate(pokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx = {}) {
  const ballName = String(rawBallType || '').toLowerCase();
  
  const BALL_BEHAVIORS = {
    'master': { guaranteed: true },
    '100': { guaranteed: true },
    'ultra': { mult: 2.0 },
    'super': { mult: 1.5 },
    'súper': { mult: 1.5 },
    'red': { 
      mult: (p, c) => {
        const isWaterOrBug = [p.type, p.type2].some(t => t === 'water' || t === 'bug');
        const isRain = c.weather && (c.weather.type === 'rain' || c.weather.type === 'storm');
        return (isWaterOrBug || isRain) ? 3.5 : 1.0;
      }
    },
    'net': { 
      mult: (p, c) => {
        const isWaterOrBug = [p.type, p.type2].some(t => t === 'water' || t === 'bug');
        const isRain = c.weather && (c.weather.type === 'rain' || c.weather.type === 'storm');
        return (isWaterOrBug || isRain) ? 3.5 : 1.0;
      }
    },
    'ocaso': {
      mult: (_p, c) => {
        const cycle = c.cycle || getDayCycle();
        const isNight = cycle === 'night' || cycle === 'dusk';
        const isCave = c.locationId && /cave|moon|tunnel|islands|mountain|victory|mansion/i.test(c.locationId);
        const isFog = c.weather && c.weather.type === 'fog';
        return (isNight || isCave || isFog) ? 3.0 : 1.0;
      }
    },
    'dusk': { 
      mult: (_p, c) => {
        const cycle = c.cycle || getDayCycle();
        const isNight = cycle === 'night' || cycle === 'dusk';
        const isCave = c.locationId && /cave|moon|tunnel|islands|mountain|victory|mansion/i.test(c.locationId);
        const isFog = c.weather && c.weather.type === 'fog';
        return (isNight || isCave || isFog) ? 3.0 : 1.0;
      }
    },
    'turno': {
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    },
    'timer': { 
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
  };

  const behaviorEntry = Object.entries(BALL_BEHAVIORS).find(([key]) => ballName.includes(key));
  const behavior = behaviorEntry ? behaviorEntry[1] : { mult: 1.0 };

  if (behavior.guaranteed) {
    return { caught: true, shakes: 3 };
  }

  let ballMult = 1.0;
  if (typeof behavior.mult === 'function') {
    ballMult = behavior.mult(pokemon, ctx);
  } else if (behavior.mult) {
    ballMult = behavior.mult;
  }

  const hpFactor = (3 * pokemon.maxHp - 2 * pokemon.hp) / (3 * pokemon.maxHp);
  const catchRate = pokemon.catchRate ?? 45;
  if (!pokemon.catchRate) {
    console.warn(`Capture warning: Pokémon ${pokemon.name} (${pokemon.id}) missing catchRate. Falling back to 45.`);
  }
  const statusMult = (pokemon.status === 'sleep' || pokemon.status === 'freeze') ? 2.0 : 
                     (pokemon.status ? 1.5 : 1.0);

  const eventBonus = eventCatchMult - 1;
  const totalMult = Math.max(0.1, ballMult + eventBonus);

  const finalRate = Math.min(255, Math.max(1, Math.floor(catchRate * totalMult * hpFactor * statusMult)));
  
  const b = Math.floor(65535 * Math.pow(finalRate / 255, 0.25));
  
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65535 < b) {
      shakes++;
    } else {
      break;
    }
  }

  return {
    caught: shakes === 4,
    shakes: Math.min(3, shakes)
  };
}

/**
 * Calculates escape chance from Wild Pokémon.
 * @param {Object} playerPoke 
 * @param {Object} wildPoke 
 * @param {number} attempts 
 * @param {Object} ctx 
 * @returns {boolean} Whether escape is successful.
 */
export function calculateEscapeChance(playerPoke, wildPoke, attempts, ctx = {}) {
  const pSpe = getEffectiveStat(playerPoke, 'spe', ctx.playerStages || {}, ctx.weather);
  const eSpe = getEffectiveStat(wildPoke, 'spe', ctx.enemyStages || {}, ctx.weather);
  
  // Guard against division by zero
  const safeESpe = Math.max(1, eSpe);

  if (ACTIVE_RULE_SET === 2) {
    const f = Math.floor((pSpe * 32) / Math.floor(safeESpe / 4)) + 30 * attempts;
    if (f > 255) return true;
    return Math.floor(Math.random() * 256) < f;
  } else {
    // Gen 4+
    const f = Math.floor((pSpe * 128) / safeESpe) + 30 * attempts;
    return Math.floor(Math.random() * 256) < f;
  }
}
