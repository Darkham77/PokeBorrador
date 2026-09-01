import { ACTIVE_GENERATION, SHOWDOWN_DISABLE_DURATION_TURNS } from '../../data/system/constants.ts';
import { getLocalizedWeatherName, mapOfficialToVisualWeather } from '../weather/weatherGenerationProvider.ts';
import { toID } from '@/logic/utils/strings.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { toPokemonType } from '@/data/battle/types';
import { isPokemonMoveId, requirePokemonMoveId } from '@/data/battle/moves';
import { requireWeatherId } from '../weather/weatherRegistry';
import { requireBattleConditionKey, type BattleConditionKey } from '@/types/battle/battle';
import { requireVolatileStatusKey } from '@/types/pokemon/pokemon';

const WEATHER_EMOJIS: Record<string, string> = {
  'Sandstorm': '🌀',
  'RainDance': '🌧️',
  'SunnyDay': '☀️',
  'Hail': '❄️',
  'Snow': '❄️',
  'none': '🌤️'
};

const CANONICAL_TERRAINS = new Set<BattleConditionKey>([ // runtime-set
  'electricterrain',
  'grassyterrain',
  'mistyterrain',
  'psychicterrain'
]);

const FIELD_START_MESSAGES: Record<string, string> = {
  'Trick Room': '¡Espacio Raro distorsionó el tiempo!',
  'Gravity': '¡La gravedad se intensificó!',
  'Magic Room': '¡Zona Mágica eliminó el efecto de los objetos!',
  'Wonder Room': '¡Zona Extraña cambió la Defensa y Def. Esp.!',
  'Electric Terrain': '¡Un terreno eléctrico envolvió el campo!',
  'Grassy Terrain': '¡Un terreno de hierba envolvió el campo!',
  'Misty Terrain': '¡Un terreno de niebla envolvió el campo!',
  'Psychic Terrain': '¡Un terreno psíquico envolvió el campo!',
  'electricterrain': '¡Un terreno eléctrico envolvió el campo!',
  'grassyterrain': '¡Un terreno de hierba envolvió el campo!',
  'mistyterrain': '¡Un terreno de niebla envolvió el campo!',
  'psychicterrain': '¡Un terreno psíquico envolvió el campo!'
};

const FIELD_END_MESSAGES: Record<string, string> = {
  'Trick Room': '¡Espacio Raro volvió a la normalidad!',
  'Gravity': '¡La gravedad volvió a la normalidad!',
  'Magic Room': '¡El efecto de Zona Mágica terminó!',
  'Wonder Room': '¡El efecto de Zona Extraña terminó!',
  'Electric Terrain': '¡El terreno eléctrico desapareció!',
  'Grassy Terrain': '¡El terreno de hierba desapareció!',
  'Misty Terrain': '¡El terreno de niebla desapareció!',
  'Psychic Terrain': '¡El terreno psíquico desapareció!'
};

type VolatileTarget = NonNullable<ReturnType<SBCtx['getPoke']>>;
type VolatileStartHandler = (ctx: SBCtx, target: VolatileTarget, parts: string[], line: string) => void;
type VolatileEndHandler = (ctx: SBCtx, target: VolatileTarget, line: string) => void;

const VOLATILE_START_HANDLERS: Record<string, VolatileStartHandler> = {
  typechange: (_ctx, target, parts) => {
    const newType = parts[4] || '';
    if (newType && !newType.startsWith('[')) target.type = toPokemonType(toID(newType));
  },
  typeadd: (_ctx, target, parts) => {
    const addedType = parts[4] || parts[3] || '';
    if (addedType) target.addedType = toPokemonType(toID(addedType));
  },
  confusion: ({ store }, target, _parts, line) => {
    target.volatileCounters!['confusion'] = 1;
    delete target.volatileCounters!['lockedmove'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} se confundió!`, 'log-info', target);
  },
  disable: ({ store }, target, parts, line) => {
    const moveName = parts[4] || '';
    const cleanMoveId = toID(moveName);
    if (isPokemonMoveId(cleanMoveId)) {
      const moveId = requirePokemonMoveId(cleanMoveId);
      const moveData = pokemonDataProvider.getMoveData(moveId);
      const translatedName = moveData?.name || moveName;
      target.disabledMove = { id: moveId, name: translatedName, pp: 0, maxPP: 0 };
      target.disabledTurns = SHOWDOWN_DISABLE_DURATION_TURNS;
      if (!line.includes('[silent]')) store.addLog(`¡El ataque ${translatedName} de ${target.name} ha sido desactivado temporalmente!`, 'log-info', target);
    }
  },
  leechseed: ({ store }, target, _parts, line) => {
    target.volatileCounters!['leechseed'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} fue infectado con Drenadoras!`, 'log-info', target);
  },
  substitute: ({ store }, target, _parts, line) => {
    target.volatileCounters!['substitute'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} creó un sustituto!`, 'log-info', target);
  },
  attract: ({ store }, target, _parts, line) => {
    target.volatileCounters!['attract'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} se enamoró!`, 'log-info', target);
  },
  taunt: ({ store }, target, _parts, line) => {
    target.volatileCounters!['taunt'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} cayó bajo la mofa!`, 'log-info', target);
  },
  encore: ({ store }, target, _parts, line) => {
    target.volatileCounters!['encore'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} recibió un Bis!`, 'log-info', target);
  }
};

const VOLATILE_END_HANDLERS: Record<string, VolatileEndHandler> = {
  confusion: ({ store }, target, line) => {
    delete target.volatileCounters!['confusion'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} ya no está confundido!`, 'log-info', target);
  },
  disable: ({ store }, target, line) => {
    target.disabledMove = null;
    target.disabledTurns = 0;
    if (target.moves) target.moves.forEach(m => { if (m) m.disabled = false; });
    if (!line.includes('[silent]')) store.addLog(`¡El movimiento de ${target.name} volvió a estar disponible!`, 'log-info', target);
  },
  leechseed: ({ store }, target, line) => {
    delete target.volatileCounters!['leechseed'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} se liberó de las Drenadoras!`, 'log-info', target);
  },
  substitute: ({ store }, target, line) => {
    delete target.volatileCounters!['substitute'];
    if (!line.includes('[silent]')) store.addLog(`¡El sustituto de ${target.name} se rompió!`, 'log-info', target);
  },
  attract: ({ store }, target, line) => {
    delete target.volatileCounters!['attract'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} ya no está enamorado!`, 'log-info', target);
  },
  taunt: ({ store }, target, line) => {
    delete target.volatileCounters!['taunt'];
    if (!line.includes('[silent]')) store.addLog(`¡El efecto de Mofa sobre ${target.name} terminó!`, 'log-info', target);
  },
  encore: ({ store }, target, line) => {
    delete target.volatileCounters!['encore'];
    if (!line.includes('[silent]')) store.addLog(`¡El efecto de Bis sobre ${target.name} terminó!`, 'log-info', target);
  }
};

/**
 * Maneja eventos de campo y efectos persistentes:
 * -weather, -start, -end, -sidestart, -sideend, -fieldstart, -fieldend
 */
function handleWeatherEvent(ctx: SBCtx, parts: string[], line: string): boolean {
  const { store } = ctx;
  const weatherType = parts[2] || 'clear';
  const isUpkeep = line.includes('[upkeep]');
  const isFromDebug = line.includes('[from] debug');

  if (store.activeBattle.value) {
    const nextWeatherType = mapOfficialToVisualWeather(weatherType, ACTIVE_GENERATION);
    const currentWeatherType = store.activeBattle.value.weather?.type || 'clear';

    store.activeBattle.value.weather = {
      type: requireWeatherId(nextWeatherType),
      visual: nextWeatherType,
      turns: -1
    };

    if (nextWeatherType !== currentWeatherType && !isUpkeep && !isFromDebug) {
      const emoji = WEATHER_EMOJIS[weatherType] || '🌤️';
      const localizedName = getLocalizedWeatherName(weatherType, ACTIVE_GENERATION);
      if (weatherType !== 'none' || nextWeatherType !== 'clear') {
        store.addLog(`¡El clima cambió a ${localizedName}!`, 'log-info', emoji);
      }
    }
  }
  return true;
}

function handleStartVolatileEvent(ctx: SBCtx, parts: string[], line: string): boolean {
  const { store, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const effect = parts[3] || '';
  if (!target || !effect) return true;

  const cleanEffect = toID(effect);
  if (!target.volatileCounters) target.volatileCounters = {};

  const specificHandler = VOLATILE_START_HANDLERS[cleanEffect];
  if (specificHandler) {
    specificHandler(ctx, target, parts, line);
    return true;
  }

  if (cleanEffect.startsWith('perish')) {
    const perishCount = parseInt(cleanEffect.slice(-1), 10);
    target.volatileCounters['perishsong'] = perishCount;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} escucha el Canto Mortal! (${perishCount} turnos)`, 'log-info', target);
    return true;
  }

  const isAbilityEffect = effect.startsWith('ability:');
  const isMoveEffect = effect.startsWith('move:');
  const rawEffectId = isMoveEffect ? effect.replace(/^move:\s*/i, '') : isAbilityEffect ? effect.replace(/^ability:\s*/i, '') : effect;
  const cleanEffectKey = toID(rawEffectId);
  const isLockedEffect = !isAbilityEffect && (cleanEffectKey === 'lockedmove' || (isPokemonMoveId(cleanEffectKey) && pokemonDataProvider.getMoveData(rawEffectId).self?.volatileStatus === 'lockedmove'));

  if (isLockedEffect) {
    target.volatileCounters['lockedmove'] = 1;
  } else if (cleanEffectKey) {
    target.volatileCounters[requireVolatileStatusKey(cleanEffectKey)] = 1;
  }
  if (!isAbilityEffect && !line.includes('[silent]')) store.addLog(`¡${target.name} se vio afectado por ${cleanEffectKey}!`, 'log-info', target);

  return true;
}

function handleEndVolatileEvent(ctx: SBCtx, parts: string[], line: string): boolean {
  const { store, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const effect = parts[3] || '';
  if (!target || !effect || !target.volatileCounters) return true;

  const cleanEffect = toID(effect);
  const specificHandler = VOLATILE_END_HANDLERS[cleanEffect];
  if (specificHandler) {
    specificHandler(ctx, target, line);
    return true;
  }

  if (cleanEffect.startsWith('perish')) {
    delete target.volatileCounters['perishsong'];
    return true;
  }

  const isAbilityEffect = effect.startsWith('ability:');
  const isMoveEffect = effect.startsWith('move:');
  const rawEffectId = isMoveEffect ? effect.replace(/^move:\s*/i, '') : isAbilityEffect ? effect.replace(/^ability:\s*/i, '') : effect;
  const cleanEffectKey = toID(rawEffectId);
  const isLockedEffect = !isAbilityEffect && (cleanEffectKey === 'lockedmove' || (isPokemonMoveId(cleanEffectKey) && pokemonDataProvider.getMoveData(rawEffectId).self?.volatileStatus === 'lockedmove'));

  if (isLockedEffect) {
    delete target.volatileCounters['lockedmove'];
  } else if (cleanEffectKey) {
    delete target.volatileCounters[requireVolatileStatusKey(cleanEffectKey)];
  }
  if (!isAbilityEffect && !line.includes('[silent]')) store.addLog(`¡El efecto de ${cleanEffectKey} sobre ${target.name} terminó!`, 'log-info', target);

  return true;
}

function handleSideStart(ctx: SBCtx, parts: string[], line: string): boolean {
  if (line.includes('[silent]')) return true;
  const rawSide = parts[2] || '';
  const conditionRaw = (parts[3] || '').replace('move: ', '');
  const isPlayer = rawSide.toLowerCase().startsWith((ctx.playerSide || 'p1').toLowerCase()); // text-ok
  const sideLabel = isPlayer ? 'tu campo' : 'el campo rival';
  if (conditionRaw && ctx.store.activeBattle.value) {
    const key = requireBattleConditionKey(toID(conditionRaw));
    const sideObj = isPlayer
      ? (ctx.store.activeBattle.value.playerSideConditions ??= {})
      : (ctx.store.activeBattle.value.enemySideConditions ??= {});
    if (key === 'spikes') {
      sideObj[key] = { turns: Math.min(3, (sideObj[key]?.turns ?? 0) + 1) };
    } else if (key === 'toxicspikes') {
      sideObj[key] = { turns: Math.min(2, (sideObj[key]?.turns ?? 0) + 1) };
    } else {
      sideObj[key] = { turns: 1 };
    }
    ctx.store.addLog(`¡${conditionRaw} activado en ${sideLabel}!`, 'log-info', '🛡️');
  }
  return true;
}

function handleSideEnd(ctx: SBCtx, parts: string[], line: string): boolean {
  if (line.includes('[silent]')) return true;
  const rawSideEnd = parts[2] || '';
  const conditionEndRaw = (parts[3] || '').replace('move: ', '');
  if (conditionEndRaw && ctx.store.activeBattle.value) {
    const key = requireBattleConditionKey(toID(conditionEndRaw));
    const isPlayer = rawSideEnd.toLowerCase().startsWith((ctx.playerSide || 'p1').toLowerCase()); // text-ok
    const sideObj = isPlayer
      ? ctx.store.activeBattle.value.playerSideConditions
      : ctx.store.activeBattle.value.enemySideConditions;
    if (sideObj) delete sideObj[key];
    ctx.store.addLog(`¡${conditionEndRaw} terminó!`, 'log-info', '🛡️');
  }
  return true;
}

function handleSwapSideConditions(ctx: SBCtx, line: string): boolean {
  if (line.includes('[silent]')) return true;
  if (ctx.store.activeBattle.value) {
    const temp = ctx.store.activeBattle.value.playerSideConditions;
    ctx.store.activeBattle.value.playerSideConditions = ctx.store.activeBattle.value.enemySideConditions;
    ctx.store.activeBattle.value.enemySideConditions = temp;
    ctx.store.addLog('¡Los efectos de ambos lados del campo fueron intercambiados!', 'log-info', '🔄');
  }
  return true;
}

function handleFieldStart(ctx: SBCtx, parts: string[], line: string): boolean {
  if (line.includes('[silent]')) return true;
  const fieldCondition = (parts[2] || '').replace('move: ', '');
  if (fieldCondition && ctx.store.activeBattle.value) {
    const cleanField = requireBattleConditionKey(toID(fieldCondition));
    if (CANONICAL_TERRAINS.has(cleanField)) {
      ctx.store.activeBattle.value.terrain = cleanField;
    } else {
      if (!ctx.store.activeBattle.value.fieldConditions) {
        ctx.store.activeBattle.value.fieldConditions = {};
      }
      ctx.store.activeBattle.value.fieldConditions[cleanField] = { turns: 0 };
    }
    const msg = FIELD_START_MESSAGES[fieldCondition] || `¡${fieldCondition} activado en el campo!`;
    ctx.store.addLog(msg, 'log-info', '🌀');
  }
  return true;
}

function handleFieldEnd(ctx: SBCtx, parts: string[], line: string): boolean {
  if (line.includes('[silent]')) return true;
  const fieldConditionEnd = (parts[2] || '').replace('move: ', '');
  if (fieldConditionEnd && ctx.store.activeBattle.value) {
    const cleanEndField = requireBattleConditionKey(toID(fieldConditionEnd));
    if (CANONICAL_TERRAINS.has(cleanEndField)) {
      ctx.store.activeBattle.value.terrain = null;
    } else if (ctx.store.activeBattle.value.fieldConditions) {
      delete ctx.store.activeBattle.value.fieldConditions[cleanEndField];
    }
    const msg = FIELD_END_MESSAGES[fieldConditionEnd] || `¡${fieldConditionEnd} terminó!`;
    ctx.store.addLog(msg, 'log-info', '🌀');
  }
  return true;
}

function handleFieldActivate(ctx: SBCtx, parts: string[], line: string): boolean {
  if (line.includes('[silent]')) return true;
  const rawMove = parts[2] || '';
  const moveName = rawMove.startsWith('move:') ? rawMove.replace('move:', '').trim() : rawMove;
  ctx.store.addLog(`¡Se activó ${moveName} en el campo!`, 'log-info', '🌀');
  return true;
}

/**
 * Maneja eventos de campo y efectos persistentes:
 * -weather, -start, -end, -sidestart, -sideend, -fieldstart, -fieldend
 */
export async function handleFieldEvents(ctx: SBCtx): Promise<boolean> {
  const { type, parts, line } = ctx;

  switch (type) {
    case '-weather':
      return handleWeatherEvent(ctx, parts, line);
    case '-start':
      return handleStartVolatileEvent(ctx, parts, line);
    case '-end':
      return handleEndVolatileEvent(ctx, parts, line);
    case '-sidestart':
      // Uses toID() for condition key normalization in handleSideStart
      return handleSideStart(ctx, parts, line);
    case '-sideend':
      return handleSideEnd(ctx, parts, line);
    case '-swapsideconditions':
      return handleSwapSideConditions(ctx, line);
    case '-fieldstart':
      return handleFieldStart(ctx, parts, line);
    case '-fieldend':
      return handleFieldEnd(ctx, parts, line);
    case '-fieldactivate':
      return handleFieldActivate(ctx, parts, line);
    default:
      return false;
  }
}
