import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getLocalizedWeatherName, mapOfficialToVisualWeather } from '../weather/weatherGenerationProvider.ts';
import { toID } from '@pkmn/sim';
import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move } from '../../types/pokemon/pokemon.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';

/**
 * Maneja eventos de campo y efectos persistentes:
 * -weather, -start, -end, -sidestart, -sideend, -fieldstart, -fieldend
 */
export async function handleFieldEvents(ctx: SBCtx): Promise<boolean> {
  const { store, type, parts, line, getPoke, playerSide = 'p1' } = ctx;

  switch (type) {
    case '-weather': {
      const weatherType = parts[2] || 'clear';
      const isUpkeep = line.includes('[upkeep]');
      const isFromDebug = line.includes('[from] debug');

      if (store.activeBattle.value) {
        const nextWeatherType = mapOfficialToVisualWeather(weatherType, ACTIVE_GENERATION);
        const currentWeatherType = store.activeBattle.value.weather?.type || 'clear';

        store.activeBattle.value.weather = {
          type: nextWeatherType,
          visual: nextWeatherType,
          turns: -1
        };

        if (nextWeatherType !== currentWeatherType && !isUpkeep && !isFromDebug) {
          const weatherEmojis: Record<string, string> = {
            'Sandstorm': '🌀', 'RainDance': '🌧️', 'SunnyDay': '☀️', 'Hail': '❄️', 'none': '🌤️'
          };
          const emoji = weatherEmojis[weatherType] || '🌤️';
          const localizedName = getLocalizedWeatherName(weatherType, ACTIVE_GENERATION);
          if (weatherType !== 'none' || nextWeatherType !== 'clear') {
            store.addLog(`¡El clima cambió a ${localizedName}!`, 'log-info', emoji);
          }
        }
      }
      return true;
    }

    case '-start': {
      const target = getPoke(parts[2] || '');
      const effect = parts[3] || '';
      if (target && effect) {
        const cleanEffect = toID(effect);
        if (!target.volatileCounters) target.volatileCounters = {};

        if (cleanEffect === 'confusion') {
          target.volatileCounters['confusion'] = 1;
          delete target.volatileCounters['lockedmove'];
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} se confundió!`, 'log-info', target);
        } else if (cleanEffect === 'disable') {
          const moveName = parts[4] || '';
          const moveId = toID(moveName);
          const { pokemonDataProvider } = await import('../providers/pokemonDataProvider.ts');
          const moveData = pokemonDataProvider.getMoveData(moveId);
          const translatedName = moveData?.name || moveName;
          target.disabledMove = { id: moveId, name: translatedName } as unknown as Move;
          target.disabledTurns = 4;
          if (!line.includes('[silent]')) store.addLog(`¡El ataque ${translatedName} de ${target.name} ha sido desactivado temporalmente!`, 'log-info', target);
        } else if (cleanEffect === 'leechseed') {
          target.volatileCounters['leechseed'] = 1;
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} fue infectado con Drenadoras!`, 'log-info', target);
        } else if (cleanEffect === 'substitute') {
          target.volatileCounters['substitute'] = 1;
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} creó un sustituto!`, 'log-info', target);
        } else if (cleanEffect === 'attract') {
          target.volatileCounters['attract'] = 1;
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} se enamoró!`, 'log-info', target);
        } else if (cleanEffect === 'taunt') {
          target.volatileCounters['taunt'] = 1;
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} cayó bajo la mofa!`, 'log-info', target);
        } else if (cleanEffect === 'encore') {
          target.volatileCounters['encore'] = 1;
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} recibió un Bis!`, 'log-info', target);
        } else {
          const isLockedEffect = cleanEffect === 'lockedmove' || (pokemonDataProvider.getMoveData(effect)?.effect === 'locked_move');
          if (isLockedEffect) {
            target.volatileCounters['lockedmove'] = 1;
          } else if (cleanEffect) {
            target.volatileCounters[cleanEffect] = 1;
          }
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} se vio afectado por ${cleanEffect}!`, 'log-info', target);
        }
      }
      return true;
    }

    case '-end': {
      const target = getPoke(parts[2] || '');
      const effect = parts[3] || '';
      if (target && effect) {
        const cleanEffect = toID(effect);
        if (target.volatileCounters) {
          if (cleanEffect === 'confusion') {
            delete target.volatileCounters['confusion'];
            if (!line.includes('[silent]')) store.addLog(`¡${target.name} ya no está confundido!`, 'log-info', target);
          } else if (cleanEffect === 'disable') {
            target.disabledMove = null;
            target.disabledTurns = 0;
            if (!line.includes('[silent]')) store.addLog(`¡El movimiento de ${target.name} volvió a estar disponible!`, 'log-info', target);
          } else if (cleanEffect === 'leechseed') {
            delete target.volatileCounters['leechseed'];
            if (!line.includes('[silent]')) store.addLog(`¡${target.name} se liberó de las Drenadoras!`, 'log-info', target);
          } else if (cleanEffect === 'substitute') {
            delete target.volatileCounters['substitute'];
            if (!line.includes('[silent]')) store.addLog(`¡El sustituto de ${target.name} se rompió!`, 'log-info', target);
          } else if (cleanEffect === 'attract') {
            delete target.volatileCounters['attract'];
            if (!line.includes('[silent]')) store.addLog(`¡${target.name} ya no está enamorado!`, 'log-info', target);
          } else if (cleanEffect === 'taunt') {
            delete target.volatileCounters['taunt'];
            if (!line.includes('[silent]')) store.addLog(`¡El efecto de Mofa sobre ${target.name} terminó!`, 'log-info', target);
          } else if (cleanEffect === 'encore') {
            delete target.volatileCounters['encore'];
            if (!line.includes('[silent]')) store.addLog(`¡El efecto de Bis sobre ${target.name} terminó!`, 'log-info', target);
          } else {
            const isLockedEffect = cleanEffect === 'lockedmove' || (pokemonDataProvider.getMoveData(effect)?.effect === 'locked_move');
            if (isLockedEffect) {
              delete target.volatileCounters['lockedmove'];
            } else if (cleanEffect) {
              delete target.volatileCounters[cleanEffect];
            }
            if (!line.includes('[silent]')) store.addLog(`¡El efecto de ${cleanEffect} sobre ${target.name} terminó!`, 'log-info', target);
          }
        }
      }
      return true;
    }

    case '-sidestart': {
      if (line.includes('[silent]')) return true;
      const rawSide = parts[2] || '';
      const conditionRaw = (parts[3] || '').replace('move: ', '');
      const isPlayer = rawSide.toLowerCase().startsWith(playerSide.toLowerCase());
      const sideLabel = isPlayer ? 'tu campo' : 'el campo rival';
      if (conditionRaw && store.activeBattle.value) {
        const key = conditionRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sideObj = isPlayer
          ? (store.activeBattle.value.playerSideConditions ??= {})
          : (store.activeBattle.value.enemySideConditions ??= {});
        // Spikes stack up to 3; Toxic Spikes stack up to 2; others are on/off (turns=1)
        if (key === 'spikes') {
          sideObj[key] = { turns: Math.min(3, (sideObj[key]?.turns ?? 0) + 1) };
        } else if (key === 'toxicspikes') {
          sideObj[key] = { turns: Math.min(2, (sideObj[key]?.turns ?? 0) + 1) };
        } else {
          sideObj[key] = { turns: 1 };
        }
        store.addLog(`¡${conditionRaw} activado en ${sideLabel}!`, 'log-info', '🛡️');
      }
      return true;
    }

    case '-sideend': {
      if (line.includes('[silent]')) return true;
      const rawSideEnd = parts[2] || '';
      const conditionEndRaw = (parts[3] || '').replace('move: ', '');
      if (conditionEndRaw && store.activeBattle.value) {
        const key = conditionEndRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isPlayer = rawSideEnd.toLowerCase().startsWith(playerSide.toLowerCase());
        const sideObj = isPlayer
          ? store.activeBattle.value.playerSideConditions
          : store.activeBattle.value.enemySideConditions;
        if (sideObj) delete sideObj[key];
        store.addLog(`¡${conditionEndRaw} terminó!`, 'log-info', '🛡️');
      }
      return true;
    }

    case '-swapsideconditions': {
      if (line.includes('[silent]')) return true;
      if (store.activeBattle.value) {
        const temp = store.activeBattle.value.playerSideConditions;
        store.activeBattle.value.playerSideConditions = store.activeBattle.value.enemySideConditions;
        store.activeBattle.value.enemySideConditions = temp;
        store.addLog('¡Los efectos de ambos lados del campo fueron intercambiados!', 'log-info', '🔄');
      }
      return true;
    }

    case '-fieldstart': {
      if (line.includes('[silent]')) return true;
      const fieldCondition = (parts[2] || '').replace('move: ', '');
      if (fieldCondition && store.activeBattle.value) {
        const terrains = ['Electric Terrain', 'Grassy Terrain', 'Misty Terrain', 'Psychic Terrain'];
        if (terrains.includes(fieldCondition)) {
          store.activeBattle.value.terrain = fieldCondition;
        } else {
          if (!store.activeBattle.value.fieldConditions) {
            store.activeBattle.value.fieldConditions = {};
          }
          store.activeBattle.value.fieldConditions[fieldCondition] = { turns: 0 };
        }
        const fieldMessages: Record<string, string> = {
          'Trick Room': '¡Espacio Raro distorsionó el tiempo!',
          'Gravity': '¡La gravedad se intensificó!',
          'Magic Room': '¡Zona Mágica eliminó el efecto de los objetos!',
          'Wonder Room': '¡Zona Extraña cambió la Defensa y Def. Esp.!',
          'Electric Terrain': '¡Un terreno eléctrico envolvió el campo!',
          'Grassy Terrain': '¡Un terreno de hierba envolvió el campo!',
          'Misty Terrain': '¡Un terreno de niebla envolvió el campo!',
          'Psychic Terrain': '¡Un terreno psíquico envolvió el campo!',
        };
        const msg = fieldMessages[fieldCondition] || `¡${fieldCondition} activado en el campo!`;
        store.addLog(msg, 'log-info', '🌀');
      }
      return true;
    }

    case '-fieldend': {
      if (line.includes('[silent]')) return true;
      const fieldConditionEnd = (parts[2] || '').replace('move: ', '');
      if (fieldConditionEnd && store.activeBattle.value) {
        const terrains = ['Electric Terrain', 'Grassy Terrain', 'Misty Terrain', 'Psychic Terrain'];
        if (terrains.includes(fieldConditionEnd)) {
          store.activeBattle.value.terrain = null;
        } else if (store.activeBattle.value.fieldConditions) {
          delete store.activeBattle.value.fieldConditions[fieldConditionEnd];
        }
        const fieldEndMessages: Record<string, string> = {
          'Trick Room': '¡Espacio Raro volvió a la normalidad!',
          'Gravity': '¡La gravedad volvió a la normalidad!',
          'Magic Room': '¡El efecto de Zona Mágica terminó!',
          'Wonder Room': '¡El efecto de Zona Extraña terminó!',
          'Electric Terrain': '¡El terreno eléctrico desapareció!',
          'Grassy Terrain': '¡El terreno de hierba desapareció!',
          'Misty Terrain': '¡El terreno de niebla desapareció!',
          'Psychic Terrain': '¡El terreno psíquico desapareció!',
        };
        const msg = fieldEndMessages[fieldConditionEnd] || `¡${fieldConditionEnd} terminó!`;
        store.addLog(msg, 'log-info', '🌀');
      }
      return true;
    }

    case '-fieldactivate': {
      if (line.includes('[silent]')) return true;
      const rawMove = parts[2] || '';
      const moveName = rawMove.startsWith('move:') ? rawMove.replace('move:', '').trim() : rawMove;
      store.addLog(`¡Se activó ${moveName} en el campo!`, 'log-info', '🌀');
      return true;
    }

    default:
      return false;
  }
}
