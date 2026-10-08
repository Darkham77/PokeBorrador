import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getLocalizedWeatherName, mapOfficialToVisualWeather } from '../weather/weatherVisualMapper.ts';
import { toID } from '@/logic/utils/strings.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { isWeatherId, requireWeatherId } from '../weather/weatherRegistry.ts';
import { requireBattleConditionKey, type BattleConditionKey } from '@/types/battle/battle.ts';
import { CANONICAL_TERRAINS } from '../constants/gameplay.ts';
import { handleStartVolatileEvent, handleEndVolatileEvent } from './showdownBridgeVolatiles.ts';

const CANONICAL_TERRAINS_SET: ReadonlySet<BattleConditionKey> = new Set<BattleConditionKey>(CANONICAL_TERRAINS);

const WEATHER_EMOJIS: Record<string, string> = {
  'Sandstorm': '🌀',
  'RainDance': '🌧️',
  'SunnyDay': '☀️',
  'Hail': '❄️',
  'Snow': '❄️',
  'none': '🌤️'
};

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

    const validatedWeather = requireWeatherId(nextWeatherType);
    store.activeBattle.value.weather = {
      type: validatedWeather,
      visual: validatedWeather,
      turns: -1
    };

    if (nextWeatherType !== currentWeatherType && !isUpkeep && !isFromDebug) {
      const emoji = WEATHER_EMOJIS[weatherType] || '🌤️';
      const localizedName = getLocalizedWeatherName(isWeatherId(weatherType) ? weatherType : 'none', ACTIVE_GENERATION);
      if (weatherType !== 'none' || nextWeatherType !== 'clear') {
        store.addLog(`¡El clima cambió a ${localizedName}!`, 'log-info', emoji);
      }
    }
  }
  return true;
}

function handleSideStart(ctx: SBCtx, parts: string[], line: string): boolean {
  if (line.includes('[silent]')) return true;
  const rawSide = parts[2] || '';
  const conditionRaw = (parts[3] || '').replace('move: ', '');
  const isPlayer = rawSide.toLowerCase().startsWith((ctx.playerSide || 'p1').toLowerCase()); // text-ok: UI text display localization string
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
    const isPlayer = rawSideEnd.toLowerCase().startsWith((ctx.playerSide || 'p1').toLowerCase()); // text-ok: UI text display localization string
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
    if (CANONICAL_TERRAINS_SET.has(cleanField)) {
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
    if (CANONICAL_TERRAINS_SET.has(cleanEndField)) {
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
