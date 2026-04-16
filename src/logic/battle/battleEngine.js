/**
 * Battle Engine (V5 Core)
 * Ported from public/js/07_battle.js and 02_pokemon_data.js
 * Pure functions for damage and effectiveness calculations.
 */

export const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];

export function getStatMultiplier(stage) {
  return STAGE_MULT[Math.max(0, Math.min(12, stage + 6))];
}

export function getAccuracyMultiplier(stage) {
  return ACC_STAGE_MULT[Math.max(0, Math.min(12, stage + 6))];
}

export function getTypeEffectiveness(moveType, defType) {
  if (!moveType || !defType) return 1;
  const row = TYPE_CHART[moveType.toLowerCase()];
  if (!row) return 1;
  return row[defType.toLowerCase()] ?? 1;
}

export function getCombinedEffectiveness(moveType, defender) {
  let eff = getTypeEffectiveness(moveType, defender.type);
  if (defender.type2) {
    eff *= getTypeEffectiveness(moveType, defender.type2);
  }
  return eff;
}

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
  const { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplier(attacker, defender, move);
  
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
  const eff = getCombinedEffectiveness(move.type, defender);

  // Final Damage calculation
  const finalDmg = eff > 0 
    ? Math.max(1, Math.floor(baseDamage * stab * finalAbilityMult * eff * random * critMult * weatherMult)) 
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

export function calculateCatchRate(pokemon, ballType = 'poke-ball') {
  const hpFactor = (3 * pokemon.maxHp - 2 * pokemon.hp) / (3 * pokemon.maxHp);
  let ballMult = 1;
  
  if (ballType === 'super-ball') ballMult = 1.5;
  if (ballType === 'ultra-ball') ballMult = 2;
  if (ballType === 'master-ball') return 255; // Always captures

  const catchRate = pokemon.catchRate || 45; // Default catch rate
  const statusMult = (pokemon.status === 'sleep' || pokemon.status === 'freeze') ? 2 : 
                     (pokemon.status ? 1.5 : 1);

  return Math.min(255, Math.floor(catchRate * ballMult * hpFactor * statusMult));
}
