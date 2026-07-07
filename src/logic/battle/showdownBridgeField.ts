import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getLocalizedWeatherName, mapOfficialToVisualWeather } from '../weather/weatherGenerationProvider.ts';
import { toID } from '@pkmn/sim';
import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move } from '../../types/pokemon/pokemon.ts';

/**
 * Maneja eventos de campo y efectos persistentes:
 * -weather, -start, -end, -sidestart, -sideend, -fieldstart, -fieldend
 */
export function handleFieldEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, getPoke } = ctx;

  switch (type) {
    case '-weather': {
      const weatherType = parts[2] || 'clear';
      const isUpkeep = line.includes('[upkeep]');
      const isFromDebug = line.includes('[from] debug');

      if (store.activeBattle.value) {
        const weatherMap: Record<string, string> = {
          'Sandstorm': 'sandstorm', 'RainDance': 'rain',
          'SunnyDay': 'sun', 'Hail': 'hail', 'none': 'clear'
        };
        const nextWeatherType = weatherMap[weatherType] || 'clear';
        const currentWeatherType = store.activeBattle.value.weather?.type || 'clear';

        store.activeBattle.value.weather = {
          type: nextWeatherType,
          visual: mapOfficialToVisualWeather(weatherType, ACTIVE_GENERATION),
          turns: -1
        };

        if (nextWeatherType !== currentWeatherType && !isUpkeep && !isFromDebug) {
          const weatherEmojis: Record<string, string> = {
            'Sandstorm': '🌀', 'RainDance': '🌧️', 'SunnyDay': '☀️', 'Hail': '❄️', 'none': '🌤️'
          };
          const emoji = weatherEmojis[weatherType] || '🌤️';
          const localizedName = getLocalizedWeatherName(weatherType, ACTIVE_GENERATION);
          store.addLog(`¡El clima cambió a ${localizedName}!`, 'log-info', emoji);
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
        } else if (cleanEffect === 'disable') {
          const moveName = parts[4] || '';
          const moveId = toID(moveName);
          const moveData = pokemonDataProvider.getMoveData(moveId);
          const translatedName = moveData?.name || moveName;
          target.disabledMove = { id: moveId, name: translatedName } as unknown as Move;
          target.disabledTurns = 4;
        } else {
          let isLockedEffect = cleanEffect === 'lockedmove';
          if (!isLockedEffect) {
            try {
              const moveData = pokemonDataProvider.getMoveData(effect);
              isLockedEffect = moveData?.effect === 'locked_move';
            } catch (_e) { /* Ignore missing moves */ }
          }
          if (isLockedEffect) target.volatileCounters['lockedmove'] = 1;
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
          } else if (cleanEffect === 'disable') {
            target.disabledMove = null;
            target.disabledTurns = 0;
          } else {
            let isLockedEffect = cleanEffect === 'lockedmove';
            if (!isLockedEffect) {
              try {
                const moveData = pokemonDataProvider.getMoveData(effect);
                isLockedEffect = moveData?.effect === 'locked_move';
              } catch (_e) { /* Ignore missing moves */ }
            }
            if (isLockedEffect) delete target.volatileCounters['lockedmove'];
          }
        }
      }
      return true;
    }

    case '-sidestart': {
      if (line.includes('[silent]')) return true;
      const rawSide = parts[2] || '';
      const condition = (parts[3] || '').replace('move: ', '');
      const sideLabel = rawSide.startsWith('p1') ? 'tu campo' : 'el campo rival';
      if (condition) store.addLog(`¡${condition} activado en ${sideLabel}!`, 'log-info', '🛡️');
      return true;
    }

    case '-sideend': {
      if (line.includes('[silent]')) return true;
      const condition = (parts[3] || '').replace('move: ', '');
      if (condition) store.addLog(`¡${condition} terminó!`, 'log-info', '🛡️');
      return true;
    }

    case '-fieldstart': {
      if (line.includes('[silent]')) return true;
      const condition = (parts[2] || '').replace('move: ', '');
      if (condition) store.addLog(`¡${condition} activado en el campo!`, 'log-info', '🌀');
      return true;
    }

    case '-fieldend': {
      if (line.includes('[silent]')) return true;
      const condition = (parts[2] || '').replace('move: ', '');
      if (condition) store.addLog(`¡${condition} terminó!`, 'log-info', '🌀');
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
