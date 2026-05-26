import typeChart from '../sandbox_db/data/type_chart.json';

export interface SandboxPokemon {
  id: string;
  name: string;
  types: string[];
  hp?: number;
  maxHp?: number;
  status?: string;
  storedStats?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  boosts?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    accuracy: number;
    evasion: number;
  } | null;
  moveSlots?: Array<{
    id: string;
    pp: number;
    maxpp: number;
    disabled?: boolean | string;
  }> | null;
}

export interface SandboxMove {
  id: string;
  name: string;
  type: string;
  category: string;
  basePower: number;
  accuracy: number | boolean;
}

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  effectiveness: number;
  isImmune: boolean;
  koChanceText: string;
}

/**
 * Obtiene el multiplicador del nivel de estadística (boosts/debuffs) de la Generación 3
 */
function getBoostMultiplier(stage: number): number {
  if (stage === 0) return 1;
  if (stage > 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

/**
 * Calcula el rango de daño síncrono estimado de un movimiento en el Sandbox de Showdown
 */
export function calculateDamageRange(
  attacker: SandboxPokemon,
  defender: SandboxPokemon,
  move: SandboxMove,
  currentWeather: string = 'none'
): DamageResult {
  const level = 50; // Sandbox Pokémon Gen 3 estándar
  const power = move.basePower;

  // Si el movimiento no causa daño (ej. movimientos de estado), retornar daño cero
  if (power <= 0 || move.category.toLowerCase() === 'status') {
    return {
      minDamage: 0,
      maxDamage: 0,
      minPercent: 0,
      maxPercent: 0,
      effectiveness: 1,
      isImmune: false,
      koChanceText: ''
    };
  }

  // 1. Obtener estadísticas base stored del Pokémon
  const attackerAtk = attacker.storedStats?.atk || 80;
  const attackerSpA = attacker.storedStats?.spa || 80;
  const defenderDef = defender.storedStats?.def || 80;
  const defenderSpD = defender.storedStats?.spd || 80;

  // 2. Resolver boosts y debuffs dinámicos de combate
  const atkBoost = attacker.boosts?.atk || 0;
  const spaBoost = attacker.boosts?.spa || 0;
  const defBoost = defender.boosts?.def || 0;
  const spdBoost = defender.boosts?.spd || 0;

  const activeAtk = Math.floor(attackerAtk * getBoostMultiplier(atkBoost));
  const activeSpA = Math.floor(attackerSpA * getBoostMultiplier(spaBoost));
  const activeDef = Math.floor(defenderDef * getBoostMultiplier(defBoost));
  const activeSpD = Math.floor(defenderSpD * getBoostMultiplier(spdBoost));

  // 3. Determinar estadísticas ofensivas y defensivas según categoría del movimiento
  const isPhysical = move.category.toLowerCase() === 'physical';
  const offensiveStat = isPhysical ? activeAtk : activeSpA;
  const defensiveStat = isPhysical ? activeDef : activeSpD;

  // 4. Calcular efectividad de tipos elemental
  let effectiveness = 1;
  const moveType = move.type;
  
  if (defender.types && defender.types.length > 0) {
    for (const defType of defender.types) {
      const typeChartRow = (typeChart as Record<string, Record<string, number>>)[moveType];
      if (typeChartRow && typeChartRow[defType] !== undefined) {
        effectiveness *= typeChartRow[defType]!;
      }
    }
  }

  // Inmunidad completa
  if (effectiveness === 0) {
    return {
      minDamage: 0,
      maxDamage: 0,
      minPercent: 0,
      maxPercent: 0,
      effectiveness: 0,
      isImmune: true,
      koChanceText: 'Inmune'
    };
  }

  // 5. Bonificación STAB (Same-Type Attack Bonus)
  const hasStab = attacker.types.includes(moveType);
  const stabMultiplier = hasStab ? 1.5 : 1.0;

  // 6. Modificador por clima activo en combate
  let weatherMultiplier = 1.0;
  const normalizedWeather = currentWeather.toLowerCase();
  if (normalizedWeather === 'sunnyday' || normalizedWeather === 'sun') {
    if (moveType === 'Fire') weatherMultiplier = 1.5;
    else if (moveType === 'Water') weatherMultiplier = 0.5;
  } else if (normalizedWeather === 'raindance' || normalizedWeather === 'rain') {
    if (moveType === 'Water') weatherMultiplier = 1.5;
    else if (moveType === 'Fire') weatherMultiplier = 0.5;
  }

  // 7. Modificador por Quemadura (Reduce daño físico a la mitad)
  const isBurned = attacker.status === 'brn';
  const burnMultiplier = (isBurned && isPhysical) ? 0.5 : 1.0;

  // 8. Cálculo de base de daño (fórmula de Gen 3 oficial)
  const baseDamage = Math.floor(
    Math.floor(
      Math.floor((2 * level) / 5 + 2) * power * offensiveStat / defensiveStat
    ) / 50
  ) + 2;

  // 9. Aplicar multiplicadores en cascada ordenados
  const stabDmg = baseDamage * stabMultiplier;
  const weatherDmg = stabDmg * weatherMultiplier;
  const typeDmg = weatherDmg * effectiveness;
  const finalMultiplierDmg = typeDmg * burnMultiplier;

  // 10. Calcular rango aleatorio (Random Roll: min 0.85, max 1.00)
  const maxDamage = Math.floor(finalMultiplierDmg);
  const minDamage = Math.floor(finalMultiplierDmg * 0.85);

  // 11. Calcular porcentajes de daño sobre la salud ACTUAL del oponente
  const targetHP = defender.hp !== undefined ? defender.hp : 100;
  const targetMaxHP = defender.maxHp || 100;

  const minPercent = targetMaxHP > 0 ? Math.min(100, Math.round((minDamage / targetMaxHP) * 100)) : 0;
  const maxPercent = targetMaxHP > 0 ? Math.min(100, Math.round((maxDamage / targetMaxHP) * 100)) : 0;

  // 12. Estimar turnos requeridos para debilitamiento (KOs Chance)
  let koChanceText = 'Resta salud';
  if (minDamage >= targetHP) {
    koChanceText = '¡Garantiza OHKO!';
  } else if (maxDamage >= targetHP) {
    const chance = Math.round(((maxDamage - targetHP) / (maxDamage - minDamage || 1)) * 100);
    koChanceText = `Chance de OHKO: ${Math.max(1, Math.min(99, chance))}%`;
  } else if (minDamage * 2 >= targetHP) {
    koChanceText = 'Garantiza 2HKO';
  } else if (maxDamage * 2 >= targetHP) {
    koChanceText = 'Posible 2HKO';
  } else if (minDamage * 3 >= targetHP) {
    koChanceText = 'Garantiza 3HKO';
  } else {
    koChanceText = 'Daño residual';
  }

  return {
    minDamage,
    maxDamage,
    minPercent,
    maxPercent,
    effectiveness,
    isImmune: false,
    koChanceText
  };
}
