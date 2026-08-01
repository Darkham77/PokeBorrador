import { ACTIVE_GENERATION, SHOWDOWN_DISABLE_DURATION_TURNS } from '../../data/system/constants.ts';
import { getLocalizedWeatherName, mapOfficialToVisualWeather } from '../weather/weatherGenerationProvider.ts';
import { toID } from '@pkmn/sim';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { toPokemonType } from '@/data/battle/types';
import { isPokemonMoveId, requirePokemonMoveId } from '@/data/battle/moves';
import { requireWeatherId } from '../weather/weatherRegistry';
import { requireBattleConditionKey, type BattleConditionKey } from '@/types/battle/battle';
import { requireVolatileStatusKey } from '@/types/pokemon/pokemon';

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
          type: requireWeatherId(nextWeatherType),
          visual: nextWeatherType,
          turns: -1
        };

        if (nextWeatherType !== currentWeatherType && !isUpkeep && !isFromDebug) {
          const weatherEmojis: Record<string, string> = {
            'Sandstorm': '🌀', 'RainDance': '🌧️', 'SunnyDay': '☀️', 'Hail': '❄️', 'Snow': '❄️', 'none': '🌤️'
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

        if (cleanEffect === 'typechange') {
          const newType = parts[4] || '';
          // Canonical ref: external/handler.ts L768 — when Reflect Type is used, args[3] is
          // '[from] move: Reflect Type' (a metadata tag), NOT the new type. The new type must
          // be inferred from the target; we skip the assignment silently in that case.
          if (newType && !newType.startsWith('[')) target.type = toPokemonType(toID(newType));
        } else if (cleanEffect === 'typeadd') {
          const addedType = parts[4] || parts[3] || '';
          if (addedType) {
            target.addedType = toPokemonType(toID(addedType));
          }
        } else if (cleanEffect === 'confusion') {
          target.volatileCounters['confusion'] = 1;
          delete target.volatileCounters['lockedmove'];
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} se confundió!`, 'log-info', target);
        } else if (cleanEffect === 'disable') {
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
        } else if (cleanEffect.startsWith('perish')) {
          // Perish Song emits |-start|...|perish3|, |perish2|, |perish1|, |perish0| per turn residual.
          // The effect ID encodes the countdown value. Map to 'perishsong' volatile.
          // Canonical reference: external/pokemon-showdown-code/client/src/handler.ts#L758-L762
          const perishCount = parseInt(cleanEffect.slice(-1), 10);
          target.volatileCounters['perishsong'] = perishCount;
          if (!line.includes('[silent]')) store.addLog(`¡${target.name} escucha el Canto Mortal! (${perishCount} turnos)`, 'log-info', target);
        } else {
          const isAbilityEffect = effect.startsWith('ability:');
          const isMoveEffect = effect.startsWith('move:');
          const rawEffectId = isMoveEffect ? effect.replace(/^move:\s*/i, '') : isAbilityEffect ? effect.replace(/^ability:\s*/i, '') : effect;
          const cleanEffectKey = toID(rawEffectId);
          // Guard: only call getMoveData if rawEffectId is a valid move ID to avoid crashes on non-move volatile effects.
          const isLockedEffect = !isAbilityEffect && (cleanEffectKey === 'lockedmove' || (isPokemonMoveId(cleanEffectKey) && pokemonDataProvider.getMoveData(rawEffectId).self?.volatileStatus === 'lockedmove'));
          if (isLockedEffect) {
            target.volatileCounters['lockedmove'] = 1;
          } else if (cleanEffectKey) {
            target.volatileCounters[requireVolatileStatusKey(cleanEffectKey)] = 1;
          }
          if (!isAbilityEffect && !line.includes('[silent]')) store.addLog(`¡${target.name} se vio afectado por ${cleanEffectKey}!`, 'log-info', target);
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
            if (target.moves) {
              target.moves.forEach(m => { if (m) m.disabled = false; });
            }
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
          } else if (cleanEffect.startsWith('perish')) {
            // Perish Song -end event: the volatile ends when the pokemon faints (perish0).
            // Canonical reference: external/pokemon-showdown-code/sim/data/moves.ts#L13269-L13272
            delete target.volatileCounters['perishsong'];
          } else {
            const isAbilityEffect = effect.startsWith('ability:');
            const isMoveEffect = effect.startsWith('move:');
            const rawEffectId = isMoveEffect ? effect.replace(/^move:\s*/i, '') : isAbilityEffect ? effect.replace(/^ability:\s*/i, '') : effect;
            const cleanEffectKey = toID(rawEffectId);
            // Guard: only call getMoveData if rawEffectId is a valid move ID to avoid crashes on non-move volatile effects.
            const isLockedEffect = !isAbilityEffect && (cleanEffectKey === 'lockedmove' || (isPokemonMoveId(cleanEffectKey) && pokemonDataProvider.getMoveData(rawEffectId).self?.volatileStatus === 'lockedmove'));
            if (isLockedEffect) {
              delete target.volatileCounters['lockedmove'];
            } else if (cleanEffectKey) {
              delete target.volatileCounters[requireVolatileStatusKey(cleanEffectKey)];
            }
            if (!isAbilityEffect && !line.includes('[silent]')) store.addLog(`¡El efecto de ${cleanEffectKey} sobre ${target.name} terminó!`, 'log-info', target);
          }
        }
      }
      return true;
    }

    case '-sidestart': {
      if (line.includes('[silent]')) return true;
      const rawSide = parts[2] || '';
      const conditionRaw = (parts[3] || '').replace('move: ', '');
      const isPlayer = rawSide.toLowerCase().startsWith(playerSide.toLowerCase()); // text-ok
      const sideLabel = isPlayer ? 'tu campo' : 'el campo rival';
      if (conditionRaw && store.activeBattle.value) {
        const key = requireBattleConditionKey(toID(conditionRaw));
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
        const key = requireBattleConditionKey(toID(conditionEndRaw));
        const isPlayer = rawSideEnd.toLowerCase().startsWith(playerSide.toLowerCase()); // text-ok
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
        const cleanField = requireBattleConditionKey(toID(fieldCondition));
        const canonicalTerrains: readonly BattleConditionKey[] = ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'];
        const isTerrain = canonicalTerrains.includes(cleanField);
        if (isTerrain) {
          store.activeBattle.value.terrain = cleanField;
        } else {
          if (!store.activeBattle.value.fieldConditions) {
            store.activeBattle.value.fieldConditions = {};
          }
          store.activeBattle.value.fieldConditions[cleanField] = { turns: 0 };
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
          'electricterrain': '¡Un terreno eléctrico envolvió el campo!',
          'grassyterrain': '¡Un terreno de hierba envolvió el campo!',
          'mistyterrain': '¡Un terreno de niebla envolvió el campo!',
          'psychicterrain': '¡Un terreno psíquico envolvió el campo!'
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
        const cleanEndField = requireBattleConditionKey(toID(fieldConditionEnd));
        const canonicalTerrains: readonly BattleConditionKey[] = ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'];
        if (canonicalTerrains.includes(cleanEndField)) {
          store.activeBattle.value.terrain = null;
        } else if (store.activeBattle.value.fieldConditions) {
          delete store.activeBattle.value.fieldConditions[cleanEndField];
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
