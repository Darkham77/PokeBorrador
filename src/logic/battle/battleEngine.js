/**
 * Battle Engine (V5 Core)
 * Ported from public/js/07_battle.js and 02_pokemon_data.js
 * Pure functions for damage and effectiveness calculations.
 */

import { getStatMultiplier } from '../pokemon/statEngine';
import { getTypeEffectiveness, getCombinedEffectiveness } from '../pokemon/typeEngine';

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
  
  let power = move.power || 0;
  if (power === 0) return { dmg: 0, eff: 1 };

  const isPhysical = move.cat === 'physical';
  const atkStat = isPhysical ? attacker.atk : (attacker.spa || attacker.atk);
  const defStat = isPhysical ? defender.def : (defender.spd || defender.def);
  
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
  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplier(attacker, defender, move);
  
  // Thick Fat (Sebo)
  if (defender.ability === 'Sebo' && (move.type === 'fire' || move.type === 'ice')) {
    finalAbilityMult *= 0.5;
    triggeredAbility = 'Sebo';
  }

  // Held Items
  let itemMult = 1;
  if (attacker.heldItem) {
    const h = attacker.heldItem;
    // Type boosters (20%)
    const typeBoosters = { 'Carbón': 'fire', 'Imán': 'electric', 'Agua Mística': 'water', 'Semilla Milagro': 'grass', 'Cinturón Negro': 'fighting', 'Cuchara Torcida': 'psychic', 'Hechizo': 'ghost', 'Polvo Plata': 'bug', 'Flecha Venenosa': 'poison' };
    if (typeBoosters[h] === move.type) itemMult = 1.2;
    
    // Global Power Items
    if (h === 'Cinta Elegida' && move.cat === 'physical') itemMult = 1.5;
  }

  // STAB
  let stab = (move.type === attacker.type || move.type === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'Adaptable' && stab > 1) stab = 2;

  // Weather Multiplier
  let weatherMult = 1;
  if (weather && weather.turns > 0) {
    if (weather.type === 'sun') {
      if (move.type === 'fire') weatherMult = 1.5;
      else if (move.type === 'water') weatherMult = 0.5;
    } else if (weather.type === 'rain') {
      if (move.type === 'water') weatherMult = 1.5;
      else if (move.type === 'fire') weatherMult = 0.5;
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

  // Effectiveness
  const eff = getCombinedEffectiveness(move.type, defender, attacker);

  // Final Damage calculation
  const finalDmg = eff > 0 
    ? Math.max(1, Math.floor(baseDamage * stab * finalAbilityMult * eff * random * critMult * weatherMult * itemMult)) 
    : 0;

  return {
    dmg: finalDmg,
    eff,
    stab,
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
  const { getStatMultiplier, getDayCycle } = options;
  const baseSpe = pokemon.spe || 40;
  const stage = stages?.spe || 0;
  let spe = Math.max(1, Math.floor(baseSpe * getStatMultiplier(stage)));
  
  if (pokemon.ability === 'Fuga' && pokemon.status) {
    spe *= 2;
  }
  
  const cycle = (typeof getDayCycle === 'function') ? getDayCycle() : 'day';
  if (pokemon.ability === 'Clorofila' && (cycle === 'day' || cycle === 'morning')) {
    spe *= 2;
  }
  if (pokemon.ability === 'Nado rápido' && (cycle === 'dusk' || cycle === 'night')) {
    spe *= 2;
  }

  if (pokemon.status === 'paralyze') spe = Math.max(1, Math.floor(spe * 0.5));
  return spe;
}

export function calculateCatchRate(pokemon, ballType = 'poke-ball', eventCatchMult = 1) {
  const hpFactor = (3 * pokemon.maxHp - 2 * pokemon.hp) / (3 * pokemon.maxHp);
  let ballMult = 1;
  
  if (ballType === 'super-ball') ballMult = 1.5;
  if (ballType === 'ultra-ball') ballMult = 2;
  if (ballType === 'master-ball') return 255; // Always captures

  const catchRate = pokemon.catchRate || 45; // Default catch rate
  const statusMult = (pokemon.status === 'sleep' || pokemon.status === 'freeze') ? 2 : 
                     (pokemon.status ? 1.5 : 1);

  // Stacking catch bonuses additively (ballMult + eventBonus)
  const eventBonus = eventCatchMult - 1;
  const totalMult = Math.max(0.1, ballMult + eventBonus);

  const finalRate = Math.min(255, Math.floor(catchRate * totalMult * hpFactor * statusMult));
  return Math.random() * 255 < finalRate;
}
