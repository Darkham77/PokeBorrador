/**
 * Battle Engine (V5 Core)
 * Ported from public/js/07_battle.js and 02_pokemon_data.js
 * Pure functions for damage and effectiveness calculations.
 */

import { getStatMultiplier } from '../pokemon/statEngine';
import { getTypeEffectiveness, getCombinedEffectiveness } from '../pokemon/typeEngine';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getMechanicalWeather, WEATHER_MECHANICAL } from './weatherMapper';
import { getDayCycle } from '../timeUtils';

export { getTypeEffectiveness, getCombinedEffectiveness, getStatMultiplier };

/**
 * Core Damage Calculation (Gen 4+ Based)
 * @param {Object} attacker 
 * @param {Object} defender 
 * @param {Object} move Move data (power, type, cat)
 * @param {Object} ctx Battle context (weather, terrain, stages)
 */
export function calculateDamage(attacker, defender, move, ctx = {}) {
  const { atkStages = 0, defStages = 0, weather = null } = ctx;
  
  let power = move.power;
  let moveType = move.type;
  let moveCat = move.cat;

  // Last-resort lookup if properties are missing (e.g. from legacy debug pokemons)
  if (power === undefined || !moveType || !moveCat) {
    const md = pokemonDataProvider.getMoveData(move.name);
    if (md) {
      if (power === undefined) power = md.power || 0;
      if (!moveType) moveType = md.type || 'normal';
      if (!moveCat) moveCat = md.cat || 'physical';
    } else {
      power = power || 0;
      moveType = moveType || 'normal';
      moveCat = moveCat || 'physical';
    }
  }

  // check status moves later after effectiveness
  // if (moveCat === 'status' || (power === 0 && moveCat !== 'status')) return { dmg: 0, eff: 1 };

  // Dream Eater: Only works if target is asleep
  if (move.effect === 'dream_eater' && defender.status !== 'sleep') {
    return { dmg: 0, eff: 0, isNoEffect: true };
  }

  // Magnitude: Handle random power if not already set by action
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

  // Fury Cutter: Power doubles each consecutive use
  if (move.id === 'fury_cutter' && attacker.furyCutterCount) {
    power = Math.min(160, power * Math.pow(2, attacker.furyCutterCount - 1));
  }

  // Solar Beam / Solar Blade power reduction in bad weather
  const mechWeather = getMechanicalWeather(weather?.type);
  const cycle = getDayCycle();
  const isSolarBoosted = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'));
  
  if ((move.id === 'solar_beam' || move.id === 'solar_blade') && !isSolarBoosted && mechWeather !== WEATHER_MECHANICAL.CLEAR) {
    power = Math.floor(power * 0.5);
  }

  // 1. Daño Fijo (Fixed Damage)
  if (move.fixedDmg) {
    return { dmg: move.fixedDmg, eff: 1, isNoEffect: false };
  }

  // 2. Daño por Nivel (Level Damage)
  if (move.levelDmg) {
    return { dmg: attacker.level, eff: 1, isNoEffect: false };
  }

  // 3. Daño Porcentual (Half HP / Super Fang)
  if (move.halfHP) {
    const dmg = Math.max(1, Math.floor(defender.hp / 2));
    return { dmg, eff: 1, isNoEffect: false };
  }

  // Effectiveness calculation
  const eff = getCombinedEffectiveness(moveType, defender, attacker);

  // Status moves effectiveness check (New rule: MUST respect immunities)
  if (moveCat === 'status' || (power === 0 && moveCat !== 'status')) {
    return { 
      dmg: 0, 
      eff, 
      isNoEffect: eff === 0 
    };
  }

  const isPhysical = moveCat === 'physical';
  const atkStat = isPhysical ? attacker.atk : (attacker.spa || attacker.atk);
  let defStat = isPhysical ? defender.def : (defender.spd || defender.def);

  // Sandstorm SpD boost for Rock types
  if (!isPhysical && mechWeather === WEATHER_MECHANICAL.SANDSTORM && (defender.type === 'rock' || defender.type2 === 'rock')) {
    defStat = Math.floor(defStat * 1.5);
  }

  // Snow Def boost for Ice types (Gen 9)
  if (isPhysical && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL) && (defender.type === 'ice' || defender.type2 === 'ice')) {
    defStat = Math.floor(defStat * 1.5);
  }
  
  const atkMult = getStatMultiplier(atkStages);
  const defMult = getStatMultiplier(defStages);

  let A = Math.floor(atkStat * atkMult);
  if (isPhysical && attacker.status === 'burn') {
    A = Math.max(1, Math.floor(A * 0.5));
  }
  
  const D = Math.max(1, Math.floor(defStat * defMult));

  // Base Damage Formula
  const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  // Ability & STAB modifiers
  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplier(attacker, defender, { ...move, type: moveType, power });
  
  // Thick Fat (Sebo)
  if (defender.ability === 'Sebo' && (moveType === 'fire' || moveType === 'ice')) {
    finalAbilityMult *= 0.5;
    triggeredAbility = 'Sebo';
  }

  // Held Items
  let itemMult = 1;
  if (attacker.heldItem) {
    const h = attacker.heldItem;
    // Type boosters (20%)
    const typeBoosters = { 'Carbón': 'fire', 'Imán': 'electric', 'Agua Mística': 'water', 'Semilla Milagro': 'grass', 'Cinturón Negro': 'fighting', 'Cuchara Torcida': 'psychic', 'Hechizo': 'ghost', 'Polvo Plata': 'bug', 'Flecha Venenosa': 'poison' };
    if (typeBoosters[h] === moveType) itemMult = 1.2;
    
    // Global Power Items
    if (h === 'Cinta Elegida' && moveCat === 'physical') itemMult = 1.5;
  }

  // STAB
  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'Adaptable' && stab > 1) stab = 2;

  // Weather & Cycle Multiplier
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

  // RPG Cycle Fallback (Only if no active weather or weather is clear)
  if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
    const cycle = getDayCycle();
    if (cycle === 'day' || cycle === 'morning') {
      if (moveType === 'fire') weatherMult = 1.2;
    } else if (cycle === 'night' || cycle === 'dusk') {
      if (moveType === 'water') weatherMult = 1.2;
    }
  }

  // Critical Hit logic
  let critRate = (attacker.heldItem === 'Lente Zoom') ? 0.12 : 0.06;
  if (attacker.focusEnergy) critRate = 0.25;
  
  let isCrit = Math.random() < critRate;
  if (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla') isCrit = false;
  
  const critMult = isCrit ? 2 : 1;

  // Random factor
  const random = 0.85 + Math.random() * 0.15;

  // Final Damage calculation
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

  // Agallas (Guts)
  if (ab === 'Agallas' && attacker.status && move.cat === 'physical') {
    mult *= 1.5;
    triggeredAbility = ab;
  }

  // Experto (Technician)
  if (ab === 'Experto' && power > 0 && power <= 60) {
    mult *= 1.5;
    triggeredAbility = ab;
  }

  return { mult, triggeredAbility };
}

export function getEffectiveSpeed(pokemon, stages, options = {}) {
  const getStatMult = options.getStatMultiplier || getStatMultiplier;
  const getCycle = options.getDayCycle || getDayCycle;
  
  const baseSpe = pokemon.spe || 40;
  const stage = stages?.spe || 0;
  let spe = Math.max(1, Math.floor(baseSpe * getStatMult(stage)));
  
  if (pokemon.ability === 'Fuga' && pokemon.status) {
    spe *= 2;
  }
  
  const weather = options.weather;
  const mechWeather = getMechanicalWeather(weather?.type);
  const cycle = getCycle();

  const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'));
  const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'));

  if (pokemon.ability === 'Clorofila' && isSunActive) {
    spe *= 2;
  }
  if (pokemon.ability === 'Nado rápido' && isRainActive) {
    spe *= 2;
  }
  if (pokemon.ability === 'Ímpetu arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    spe *= 2;
  }
  if (pokemon.ability === 'Quitanieves' && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)) {
    spe *= 2;
  }

  if (pokemon.status === 'paralyze') spe = Math.max(1, Math.floor(spe * 0.5));
  return spe;
}

export function calculateCatchRate(pokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx = {}) {
  const ballName = String(rawBallType || '').toLowerCase();
  
  // 1. Mapeo Parametrizado de Comportamientos
  const BALL_BEHAVIORS = {
    'master': { guaranteed: true },
    '100': { guaranteed: true }, // Debug ball
    'ultra': { mult: 2.0 },
    'super': { mult: 1.5 },
    'súper': { mult: 1.5 },
    'red': { 
      mult: (p) => {
        const isWaterOrBug = [p.type, p.type2].some(t => t === 'water' || t === 'bug');
        return isWaterOrBug ? 3.0 : 1.0;
      }
    },
    'net': { // Alias para Red Ball
      mult: (p) => {
        const isWaterOrBug = [p.type, p.type2].some(t => t === 'water' || t === 'bug');
        return isWaterOrBug ? 3.0 : 1.0;
      }
    },
    'ocaso': {
      mult: (p, c) => {
        const cycle = getDayCycle();
        const isNight = cycle === 'night' || cycle === 'dusk';
        const isCave = c.locationId && /cave|moon|tunnel|islands|mountain|victory|mansion/i.test(c.locationId);
        return (isNight || isCave) ? 3.0 : 1.0;
      }
    },
    'dusk': { // Alias para Ocaso Ball
      mult: (p, c) => {
        const cycle = getDayCycle();
        const isNight = cycle === 'night' || cycle === 'dusk';
        const isCave = c.locationId && /cave|moon|tunnel|islands|mountain|victory|mansion/i.test(c.locationId);
        return (isNight || isCave) ? 3.0 : 1.0;
      }
    },
    'turno': {
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    },
    'timer': { // Alias para Turno Ball
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
  };

  // Identificar el comportamiento por coincidencia parcial de nombre (más robusto)
  const behaviorEntry = Object.entries(BALL_BEHAVIORS).find(([key]) => ballName.includes(key));
  const behavior = behaviorEntry ? behaviorEntry[1] : { mult: 1.0 };

  // SHORTCUT: Captura garantizada
  if (behavior.guaranteed) {
    return { caught: true, shakes: 3 };
  }

  // 2. Cálculo del multiplicador de la bola
  let ballMult = 1.0;
  if (typeof behavior.mult === 'function') {
    ballMult = behavior.mult(pokemon, ctx);
  } else if (behavior.mult) {
    ballMult = behavior.mult;
  }

  // 3. Algoritmo oficial de captura
  const hpFactor = (3 * pokemon.maxHp - 2 * pokemon.hp) / (3 * pokemon.maxHp);
  const catchRate = pokemon.catchRate || 45;
  const statusMult = (pokemon.status === 'sleep' || pokemon.status === 'freeze') ? 2.0 : 
                     (pokemon.status ? 1.5 : 1.0);

  // Stacking catch bonuses additively (ballMult + eventBonus)
  const eventBonus = eventCatchMult - 1;
  const totalMult = Math.max(0.1, ballMult + eventBonus);

  const finalRate = Math.min(255, Math.max(1, Math.floor(catchRate * totalMult * hpFactor * statusMult)));
  
  // Official Gen 3/4 capture algorithm: 4 checks against 'b'
  // b = 65535 * (a/255)^(0.25)
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
    shakes: Math.min(3, shakes) // 0, 1, 2, 3 shakes before breaking, or caught
  };
}
