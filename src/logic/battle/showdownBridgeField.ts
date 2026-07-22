import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getLocalizedWeatherName, mapOfficialToVisualWeather } from '../weather/weatherGenerationProvider.ts';
import { toID } from '@pkmn/sim';
import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move } from '../../types/pokemon/pokemon.ts';

/**
 * Maneja eventos de campo y efectos persistentes:
 * -weather, -start, -end, -sidestart, -sideend, -fieldstart, -fieldend
 */
export async function handleFieldEvents(ctx: SBCtx): Promise<boolean> {
  const { store, type, parts, line, getPoke } = ctx;

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
        } else if (cleanEffect === 'disable') {
          const moveName = parts[4] || '';
          const moveId = toID(moveName);
          const { pokemonDataProvider } = await import('../providers/pokemonDataProvider.ts');
          const moveData = pokemonDataProvider.getMoveData(moveId);
          const translatedName = moveData?.name || moveName;
          target.disabledMove = { id: moveId, name: translatedName } as unknown as Move;
          target.disabledTurns = 4;
        } else {
          let isLockedEffect = cleanEffect === 'lockedmove';
          if (!isLockedEffect) {
            try {
              const { pokemonDataProvider } = await import('../providers/pokemonDataProvider.ts');
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
                const { pokemonDataProvider } = await import('../providers/pokemonDataProvider.ts');
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
      const conditionRaw = (parts[3] || '').replace('move: ', '');
      const sideLabel = rawSide.startsWith('p1') ? 'tu campo' : 'el campo rival';
      if (conditionRaw && store.activeBattle.value) {
        const key = conditionRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isPlayer = rawSide.startsWith('p1');
        const sideObj = isPlayer
          ? (store.activeBattle.value.playerSideConditions ??= {})
          : (store.activeBattle.value.enemySideConditions ??= {});
        // Spikes are stackable (up to 3 layers); others are on/off (turns=1)
        if (key === 'spikes') {
          sideObj[key] = { turns: Math.min(3, (sideObj[key]?.turns ?? 0) + 1) };
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
        const isPlayer = rawSideEnd.startsWith('p1');
        const sideObj = isPlayer
          ? store.activeBattle.value.playerSideConditions
          : store.activeBattle.value.enemySideConditions;
        if (sideObj) delete sideObj[key];
        store.addLog(`¡${conditionEndRaw} terminó!`, 'log-info', '🛡️');
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
        }
        store.addLog(`¡${fieldCondition} activado en el campo!`, 'log-info', '🌀');
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
        }
        store.addLog(`¡${fieldConditionEnd} terminó!`, 'log-info', '🌀');
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
