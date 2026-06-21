
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry';
import { type PurePokemon, type PureMove } from '@/logic/battle/battleMath';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { Move } from '@/types/pokemon/pokemon';

/**
 * Gets modifier info for a move based on weather and cycle.
 */
export function calculateMoveModifierInfo(
  move: Move,
  weather: string | undefined,
  cycle: string
): { type: string; text: string } | null {
  const m = move;
  const mechWeather = getMechanicalWeather(weather);

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN;
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL;
  const isDayTime = cycle === 'day' || cycle === 'morning';
  const isNightTime = cycle === 'night' || cycle === 'dusk';

  const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime);
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime);

  const moveId = m.id || '';

  if (moveId === 'thunder' || moveId === 'hurricane') {
    const isThunderstorm = weather?.toLowerCase() === 'thunderstorm';
    if (isSunny) return { type: 'penalized', text: 'Penalizado por Clima Soleado (Precisión 50%)' };
    if (isRaining || isThunderstorm) return { type: 'boosted', text: `Potenciado por ${isThunderstorm ? 'Tormenta Eléctrica' : 'Lluvia'} (¡No falla!)` };
  }

  if (moveId === 'blizzard') {
    if (isSnowing) return { type: 'boosted', text: 'Potenciado por Granizo/Ventisca (¡No falla!)' };
  }

  // Charging Moves
  if (moveId === 'solar_beam' || moveId === 'solar_blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return { type: 'penalized', text: 'Penalizado por clima adverso (0.5x y requiere carga)' };
    if (isSunActive) return { type: 'boosted', text: 'Carga instantánea por Sol/Horario.' };
  }

  // Weather Ball
  if (moveId === 'weather_ball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'boosted', text: 'Tipo y potencia adaptados al clima (100 BP).' };
  }

  // General Accuracy Warning (Fog)
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.toLowerCase() === 'mist';
    const label = isMist ? 'Bruma' : 'Niebla';
    const penalty = isMist ? '80%' : '60%' ;
    return { type: 'penalized', text: `Precisión reducida al ${penalty} por ${label}.` };
  }

  if (m.cat === 'status') return null;

  // Elemental Multipliers
  if (m.type === 'fire') {
    const isExtreme = weather?.toLowerCase() === 'storm' || weather?.toLowerCase() === 'thunderstorm' || weather?.toLowerCase() === 'heavy_rain';
    if (isRaining) return { type: 'penalized', text: `Penalizado por ${isExtreme ? 'Tormenta' : 'Lluvia'} (${isExtreme ? 'x0' : '0.5x'})` };
    if (isSunActive) return { type: 'boosted', text: `Potenciado por ${isSunny ? 'Sol' : 'Horario'} (1.5x/1.2x)` };
  }
  if (m.type === 'water') {
    const isExtreme = weather?.toLowerCase() === 'heatwave' || weather?.toLowerCase() === 'intense_sun';
    if (isSunny) return { type: 'penalized', text: `Penalizado por ${isExtreme ? 'Calor Extremo' : 'Sol'} (${isExtreme ? 'x0' : '0.5x'})` };
    if (isRainActive) return { type: 'boosted', text: `Potenciado por ${isRaining ? 'Lluvia' : 'Horario'} (1.5x/1.2x)` };
  }
  return null;
}

/**
 * Calculates move power details.
 */
export function calculateMovePower(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  weather: { type: string; turns: number } | null,
  mechWeather: string,
  cycle: 'morning' | 'day' | 'dusk' | 'night' | undefined,
  basePower: number,
  moveType: string
): { base: number; final: number; list: { label: string; mult: number }[]; class: string } {
  let currentPower = basePower;
  const powerList: { label: string; mult: number }[] = [];

  if (basePower > 0) {
    // STAB
    if (moveType === attacker.type?.toLowerCase() || moveType === attacker.type2?.toLowerCase()) {
      const stab = attacker.ability === 'Adaptable' ? 2.0 : 1.5;
      powerList.push({ label: `STAB (${move.type})`, mult: stab });
      currentPower *= stab;
    }

    // Weather
    if (weather && weather.turns !== 0) {
      const wType = weather.type.toLowerCase();
      let weatherMult = 1;
      if (mechWeather === WEATHER_MECHANICAL.SUN) {
        if (moveType === 'fire') weatherMult = 1.5;
        if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5;
      } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
        if (moveType === 'water') weatherMult = 1.5;
        if (moveType === 'fire') weatherMult = (wType === 'storm' || wType === 'heavy_rain') ? 0 : 0.5;
        if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5;
      } else if (wType === 'thunderstorm') {
        if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5;
      }

      if (weatherMult !== 1) {
        powerList.push({ label: `Clima (${weather.type})`, mult: weatherMult });
        currentPower *= weatherMult;
      }
    }

    // Solar Beam
    if (move.id === 'solar_beam' && weather && weather.turns !== 0) {
      const isSun = mechWeather === WEATHER_MECHANICAL.SUN;
      const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm';
      if (!isSun && !isClear) {
        powerList.push({ label: 'Rayo Solar Clima', mult: 0.5 });
        currentPower *= 0.5;
      }
    }

    // Day cycle
    if (weather && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
      let cycleMult = 1;
      if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') cycleMult = 1.2;
      if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') cycleMult = 1.2;
      if (cycleMult !== 1) {
        powerList.push({ label: `Horario (${cycle})`, mult: cycleMult });
        currentPower *= cycleMult;
      }
    }

    // Attacker Ability
    let abilMult = 1;
    const isLowHp = (attacker.hp ?? 0) <= ((attacker.maxHp ?? 1) / 3);
    if (isLowHp) {
      if (attacker.ability === 'Mar llamas' && moveType === 'fire') abilMult = 1.5;
      if (attacker.ability === 'Torrente' && moveType === 'water') abilMult = 1.5;
      if (attacker.ability === 'Espesura' && moveType === 'grass') abilMult = 1.5;
      if (attacker.ability === 'Enjambre' && moveType === 'bug') abilMult = 1.5;
    }
    if (attacker.ability === 'Experto' && basePower <= 60) {
      abilMult *= 1.5;
    }
    if (weather && weather.turns !== 0 && attacker.ability === 'Fuerza arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
      if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
        abilMult *= 1.3;
      }
    }
    if (abilMult !== 1) {
      powerList.push({ label: `Habilidad (${attacker.ability})`, mult: abilMult });
      currentPower *= abilMult;
    }

    // Defender Ability
    if (defender && (defender.ability === 'thickfat' || defender.ability === 'Sebo') && (moveType === 'fire' || moveType === 'ice')) {
      powerList.push({ label: 'Habilidad Rival (Sebo)', mult: 0.5 });
      currentPower *= 0.5;
    }

    // Held Item
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
      let itemMult = 1;
      if (typeBoosters[h] === moveType) itemMult = 1.2;
      
      if (h === 'choice_band') {
        if (move.cat === 'physical') {
          itemMult = 1.5;
        } else {
          powerList.push({ label: 'Objeto (choice_band - Solo Físico)', mult: 1.0 });
        }
      }

      if (itemMult !== 1) {
        powerList.push({ label: `Objeto (${h})`, mult: itemMult });
        currentPower *= itemMult;
      }
    }
  }

  const finalPower = Math.max(1, Math.round(currentPower));
  return {
    base: basePower,
    final: finalPower,
    list: powerList,
    class: finalPower > basePower ? 'boosted' : (finalPower < basePower ? 'penalized' : '')
  };
}

/**
 * Calculates move accuracy details.
 */
export function calculateMoveAccuracy(
  move: Move,
  weather: { type: string; turns: number } | null,
  mechWeather: string,
  cycle: 'morning' | 'day' | 'dusk' | 'night' | undefined,
  baseAcc: number,
  accStage: number,
  evaStage: number
): { base: number; final: number; list: { label: string; mult: number | string }[]; class: string } {
  let currentAcc = baseAcc;
  const accList: { label: string; mult: number | string }[] = [];

  if (baseAcc > 0 && baseAcc < 1000) {
    const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'));
    const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'));
    const isThunderstorm = weather?.type === 'thunderstorm';

    if ((isRainActive || isThunderstorm) && (move.id === 'thunder' || move.id === 'hurricane')) {
      currentAcc = 100;
      accList.push({ label: 'Lluvia (¡No falla!)', mult: '100%' });
    } else if (isSunActive && (move.id === 'thunder' || move.id === 'hurricane')) {
      currentAcc = 50;
      accList.push({ label: 'Sol (Precisión 50%)', mult: '0.5' });
    } else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && move.id === 'blizzard') {
      currentAcc = 100;
      accList.push({ label: 'Nieve (¡No falla!)', mult: '100%' });
    } else if (mechWeather === WEATHER_MECHANICAL.FOG) {
      const isMist = weather?.type === "mist" || weather?.type === "mist_visual";
      const factor = isMist ? 0.8 : 0.6;
      currentAcc = Math.floor(baseAcc * factor);
      accList.push({ label: `Niebla/Bruma`, mult: factor });
    }

    if (accStage !== 0) {
      const factor = 1 + (0.33 * accStage);
      accList.push({ label: `Rango Prec. (${accStage > 0 ? '+' : ''}${accStage})`, mult: factor });
      currentAcc *= factor;
    }

    if (evaStage !== 0) {
      const factor = 1 - (0.33 * evaStage);
      accList.push({ label: `Rango Eva. Rival (${evaStage > 0 ? '+' : ''}${evaStage})`, mult: factor });
      currentAcc *= factor;
    }
  }

  const finalAccuracy = Math.max(0, Math.min(100, Math.round(currentAcc)));
  return {
    base: baseAcc,
    final: baseAcc === 1000 ? 1000 : finalAccuracy,
    list: accList,
    class: baseAcc === 1000 ? '' : (finalAccuracy > baseAcc ? 'boosted' : (finalAccuracy < baseAcc ? 'penalized' : ''))
  };
}

/**
 * Calculates crit chance.
 */
export function calculateCritChance(
  attacker: PurePokemon,
  defender: PurePokemon | null
): { value: string; class: string } {
  let critRate = 0.0625;
  if (attacker.heldItem === 'scope_lens') critRate = 0.12;
  if (attacker.focusEnergy) critRate = 0.25;
  if (defender && (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla')) {
    critRate = 0;
  }

  const critVal = (critRate * 100).toFixed(2).replace('.00', '');
  const critClass = critRate > 0.0625 ? 'boosted' : (critRate === 0 ? 'penalized' : 'neutral');

  return {
    value: critVal,
    class: critClass
  };
}

import { calculateDamageRangePure } from '@/logic/battle/battleMath';

/**
 * Calculates effectiveness and estimated damage range.
 */
export function calculateMoveEffectivenessAndDamage(
  move: Move,
  md: { type?: string; cat?: string; power?: number; acc?: number },
  attacker: PurePokemon,
  defender: PurePokemon | null,
  weather: { type: string; turns: number } | null,
  cycle: 'morning' | 'day' | 'dusk' | 'night' | undefined,
  basePower: number,
  playerStages: { atk?: number } | null,
  enemyStages: { def?: number } | null
) {
  if (!defender) return { effectiveness: null, damageRange: null };

  const pureMove: PureMove = {
    id: move.id,
    name: move.name,
    type: move.type || md.type || 'normal',
    power: basePower,
    cat: (move.cat || md.cat || 'physical') as PureMove['cat'],
    effect: typeof move.effect === 'string' ? move.effect : undefined
  };

  const pureCtx = {
    atkStages: playerStages?.atk || 0,
    defStages: enemyStages?.def || 0,
    weather: weather ? { type: weather.type, turns: weather.turns } : null
  };

  return calculateDamageRangePure(attacker, defender, pureMove, pureCtx, cycle);
}

/**
 * Parses status effect description details.
 */
export function parseStatusEffectInfo(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  playerStages: Record<string, number | undefined> | null | undefined,
  enemyStages: Record<string, number | undefined> | null | undefined
) {
  const moveIdLookup = move.id || '';
  const md = (moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) || {} : {}) as { effect?: string };
  const effectStr = (move.effect || md.effect) as string | undefined;

  if (!effectStr || typeof effectStr !== 'string') return null;

  // 1. Mapear efectos tipo stat_up/stat_down
  const statMatch = effectStr.match(/stat_(up|down)_(self|enemy)_([a-z0-9_]+)/);
  if (statMatch) {
    const [, direction, target, statKey] = statMatch;
    if (!direction || !target || !statKey) return null;

    const isUp = direction === 'up';
    const isSelf = target === 'self';

    let stat = statKey;
    let amount = 1;
    if (statKey.endsWith('_2')) {
      stat = statKey.substring(0, statKey.length - 2);
      amount = 2;
    } else if (statKey.endsWith('_3')) {
      stat = statKey.substring(0, statKey.length - 2);
      amount = 3;
    }

    if (stat.endsWith('_10')) stat = stat.substring(0, stat.length - 3);
    if (stat.endsWith('_20')) stat = stat.substring(0, stat.length - 3);
    if (stat.endsWith('_30')) stat = stat.substring(0, stat.length - 3);
    if (stat.endsWith('_50')) stat = stat.substring(0, stat.length - 3);

    const statNames: Record<string, string> = {
      atk: 'Ataque',
      def: 'Defensa',
      spa: 'At. Especial',
      spd: 'Def. Especial',
      spe: 'Velocidad',
      acc: 'Precisión',
      eva: 'Evasión',
      all: 'Todos los Stats'
    };
    const statName = statNames[stat] || stat.toUpperCase();

    const targetPokemon = isSelf ? attacker : defender;
    const targetStages = isSelf ? playerStages : enemyStages;

    if (!targetPokemon) return null;

    const currentStage = targetStages ? (targetStages[stat as keyof typeof targetStages] || 0) as number : 0;
    const finalStage = Math.max(-6, Math.min(6, currentStage + (isUp ? amount : -amount)));

    const getStageMultiplier = (stage: number) => {
      if (stat === 'acc' || stat === 'eva') {
        if (stage >= 0) return (3 + stage) / 3;
        return 3 / (3 - stage);
      }
      if (stage >= 0) return (2 + stage) / 2;
      return 2 / (2 - stage);
    };

    const baseStatVal = (stat === 'acc' || stat === 'eva') ? 100 : ((targetPokemon as unknown as Record<string, number>)[stat] || 100);
    const initialStatVal = Math.round(baseStatVal * getStageMultiplier(currentStage));
    const finalStatVal = Math.round(baseStatVal * getStageMultiplier(finalStage));
    const suffix = (stat === 'acc' || stat === 'eva') ? '%' : '';

    return {
      isCondition: false,
      isSelf,
      direction,
      stat,
      statName,
      amount,
      targetName: isSelf ? 'Usuario (Tú)' : 'Rival',
      currentStage,
      finalStage,
      initialStatVal: initialStatVal + suffix,
      finalStatVal: finalStatVal + suffix,
      label: `${isUp ? 'Aumenta' : 'Reduce'} ${statName} en ${amount} ${amount === 1 ? 'nivel' : 'niveles'}`,
      effect: undefined,
      details: undefined
    };
  }

  // 2. Mapear efectos tipo status condition / condiciones de combate específicas
  const conditionDescriptions: Record<string, { label: string; effect: string; details: string; isSelf: boolean }> = {
    'poison': {
      label: 'Envenenamiento',
      effect: 'Estado Alterado (PSN)',
      details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno.',
      isSelf: false
    },
    'bad_poison': {
      label: 'Envenenamiento Grave',
      effect: 'Estado Alterado (TÓXICO)',
      details: 'El objetivo pierde PS progresivamente: empieza en 1/16 y aumenta en 1/16 cada turno consecutivo.',
      isSelf: false
    },
    'burn': {
      label: 'Quemadura',
      effect: 'Estado Alterado (BRN)',
      details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno. Además, reduce a la mitad (x0.5) su Ataque Físico.',
      isSelf: false
    },
    'paralyze': {
      label: 'Parálisis',
      effect: 'Estado Alterado (PAR)',
      details: 'Reduce la Velocidad del objetivo al 50% (x0.5) y otorga un 25% de probabilidad de no atacar en cada turno.',
      isSelf: false
    },
    'sleep': {
      label: 'Sueño',
      effect: 'Estado Alterado (SLP)',
      details: 'El objetivo se duerme durante 1 a 3 turnos, impidiéndole atacar por completo.',
      isSelf: false
    },
    'freeze': {
      label: 'Congelación',
      effect: 'Estado Alterado (FRZ)',
      details: 'El objetivo queda congelado e incapaz de moverse. Cada turno tiene un 20% de probabilidad de descongelarse.',
      isSelf: false
    },
    'confuse': {
      label: 'Confusión',
      effect: 'Estado Volátil',
      details: 'El objetivo se confunde durante 1 a 4 turnos. En cada turno, tiene una probabilidad del 33% de golpearse a sí mismo (daño físico de potencia 40).',
      isSelf: false
    },
    'leech_seed': {
      label: 'Semilla Drenadora',
      effect: 'Efecto de Campo Volátil',
      details: 'Al final de cada turno, el objetivo pierde 1/8 (12.5%) de sus PS máximos y se los transfiere al usuario.',
      isSelf: false
    },
    'heal_50': {
      label: 'Recuperación de Salud',
      effect: 'Efecto de Curación',
      details: 'Restaura el 50% de los PS máximos del usuario de forma inmediata.',
      isSelf: true
    },
    'reset_stats': {
      label: 'Niebla / Reinicio',
      effect: 'Efecto de Limpieza',
      details: 'Elimina todos los cambios en los rangos de estadísticas (ataque, defensa, velocidad, etc.) de todos los Pokémon activos y los devuelve a +0.',
      isSelf: true
    }
  };

  const cond = conditionDescriptions[effectStr];
  if (cond) {
    return {
      isCondition: true,
      isSelf: cond.isSelf,
      direction: cond.isSelf ? 'up' : 'down',
      targetName: cond.isSelf ? 'Usuario (Tú)' : 'Rival',
      label: cond.label,
      effect: cond.effect,
      details: cond.details,
      stat: undefined,
      statName: undefined,
      amount: undefined,
      currentStage: undefined,
      finalStage: undefined,
      initialStatVal: undefined,
      finalStatVal: undefined
    };
  }

  return null;
}
