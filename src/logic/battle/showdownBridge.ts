import type { BattleContext } from '@/types/battle/battleContext';
// fallow-ignore-file security-sink typescript-any
import { logger } from '@/logic/utils/logger';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { getLocalizedWeatherName } from '@/logic/weather/weatherGenerationProvider';

/**
 * Filtra la lista de logs del simulador para evitar procesar líneas duplicadas generadas por |split|.
 */
export function filterShowdownLogs(logs: string[]): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < logs.length; i++) {
    const line = logs[i] || '';
    if (line.startsWith('|split|')) {
      const parts = line.split('|');
      const side = parts[2]; // 'p1' o 'p2'
      
      const secretLine = logs[i + 1] || '';
      const publicLine = logs[i + 2] || '';
      
      if (side === 'p1') {
        if (secretLine) filtered.push(secretLine);
      } else {
        if (publicLine) filtered.push(publicLine);
      }
      i += 2;
    } else {
      filtered.push(line);
    }
  }
  return filtered;
}

/**
 * Traduce y procesa una sola línea del log estructurado de Showdown,
 * actualizando el estado reactivo del combate y disparando logs/UI.
 */
export async function parseShowdownLogLine(store: BattleContext, line: string) {
  if (!line || !line.startsWith('|')) return;

  const parts = line.split('|').map(p => p.trim());
  const type = parts[1];

  const p = store.activeBattle.value?.player;
  const e = store.activeBattle.value?.enemy;
  if (!p || !e) return;

  // Helper para identificar si el objetivo es el jugador o enemigo
  const getSide = (rawId: string): 'player' | 'enemy' | null => {
    if (rawId.startsWith('p1a:') || rawId.startsWith('p1:')) return 'player';
    if (rawId.startsWith('p2a:') || rawId.startsWith('p2:')) return 'enemy';
    return null;
  };

  const getPoke = (rawId: string) => {
    const side = getSide(rawId);
    return side === 'player' ? p : side === 'enemy' ? e : null;
  };

  try {
    switch (type) {
      case 'move': {
        // Formato: |move|p1a: Bulbasaur|Tackle|p2a: Pikachu
        const side = getSide(parts[2] || '');
        const attacker = getPoke(parts[2] || '');
        const moveId = parts[3] || 'Movimiento';
        const moveData = pokemonDataProvider.getMoveData(moveId);
        const translatedName = moveData?.name || moveId;

        if (attacker && side) {
          const style = attacker === p ? 'log-player' : 'log-enemy';
          store.addLog(`¡${attacker.name} usó ${translatedName}!`, style, attacker);

          store.attackerSide.value = side;
          store.activeMove.value = {
            id: moveId.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: translatedName,
            cat: moveData?.cat || 'physical'
          } as unknown as import('@/types/pokemon/pokemon').Move;

          if (store.animations?.awaitTween) {
            await store.animations.awaitTween(`attack-${side}`);
          }

          store.attackerSide.value = null;
          store.activeMove.value = null;
        }
        break;
      }

      case '-damage': {
        // Formato: |-damage|p2a: Pikachu|50/100
        const victim = getPoke(parts[2] || '');
        const hpString = parts[3] || '';
        
        if (victim && hpString) {
          const hpParts = hpString.split('/');
          const currentHP = parseInt(hpParts[0] || '0');
          const maxHP = parseInt(hpParts[1] || '100');
          
          // Ajustar vida en el store del juego
          victim.hp = currentHP;
          victim.maxHp = maxHP;

          store.addLog(`¡${victim.name} recibió daño!`, 'log-info', victim);

          const side = victim === p ? 'player' : 'enemy';
          if (store.animations?.handleShakeRequest) {
            await store.animations.handleShakeRequest({ side });
          }
        }
        break;
      }

      case '-heal': {
        // Formato: |-heal|p1a: Bulbasaur|100/100
        const target = getPoke(parts[2] || '');
        const hpString = parts[3] || '';

        if (target && hpString) {
          const hpParts = hpString.split('/');
          const currentHP = parseInt(hpParts[0] || '0');
          const maxHP = parseInt(hpParts[1] || '100');

          target.hp = currentHP;
          target.maxHp = maxHP;

          store.addLog(`¡${target.name} recuperó salud!`, 'log-info', target);
        }
        break;
      }

      case 'faint': {
        // Formato: |faint|p2a: Pikachu
        const target = getPoke(parts[2] || '');
        if (target) {
          target.hp = 0;
          store.addLog(`¡${target.name} se debilitó!`, 'log-info', target);
        }
        break;
      }

      case '-status': {
        // Formato: |-status|p1a: Bulbasaur|par
        const target = getPoke(parts[2] || '');
        const statusType = parts[3] || '';
        if (target && statusType) {
          target.status = statusType as import('@/types/pokemon/pokemon').PokemonStatus;
          store.addLog(`¡${target.name} sufrió un problema de estado: ${statusType.toUpperCase()}!`, 'log-info', target);
        }
        break;
      }

      case '-curestatus': {
        // Formato: |-curestatus|p1a: Bulbasaur|par
        const target = getPoke(parts[2] || '');
        if (target) {
          target.status = null;
          store.addLog(`¡${target.name} se curó de su estado alterado!`, 'log-info', target);
        }
        break;
      }

      case '-boost':
      case '-setboost': {
        // Formato: |-boost|p1a: Bulbasaur|atk|1 o |-setboost|p1a: Poliwag|atk|6|[from] move: Belly Drum
        const target = getPoke(parts[2] || '');
        const stat = parts[3] || '';
        const amount = parseInt(parts[4] || '1');
        
        if (target) {
          const side = target === p ? 'player' : 'enemy';
          const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
          if (stages && stat in stages) {
            const key = stat as keyof typeof stages;
            if (type === '-setboost') {
              stages[key] = amount;
            } else {
              stages[key] = Math.min(6, (stages[key] || 0) + amount);
            }
            
            if (amount === 6) {
              store.addLog(`¡El ${stat.toUpperCase()} de ${target.name} se maximizó!`, 'log-info', target);
            } else {
              store.addLog(`¡El ${stat.toUpperCase()} de ${target.name} aumentó!`, 'log-info', target);
            }
          }
        }
        break;
      }

      case '-unboost': {
        // Formato: |-unboost|p1a: Bulbasaur|atk|1
        const target = getPoke(parts[2] || '');
        const stat = parts[3] || '';
        const amount = parseInt(parts[4] || '1');

        if (target) {
          const side = target === p ? 'player' : 'enemy';
          const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
          if (stages && stat in stages) {
            const key = stat as keyof typeof stages;
            stages[key] = Math.max(-6, (stages[key] || 0) - amount);
            store.addLog(`¡El ${stat.toUpperCase()} de ${target.name} disminuyó!`, 'log-info', target);
          }
        }
        break;
      }

      case '-weather': {
        // Formato: |-weather|Sandstorm|[from] ...
        const weatherType = parts[2] || 'clear';
        const isUpkeep = line.includes('[upkeep]');
        const isFromDebug = line.includes('[from] debug');

        if (store.activeBattle.value) {
          const weatherMap: Record<string, string> = {
            'Sandstorm': 'sandstorm',
            'RainDance': 'rain',
            'SunnyDay': 'sun',
            'Hail': 'hail',
            'none': 'clear'
          };
          const nextWeatherType = weatherMap[weatherType] || 'clear';
          const currentWeatherType = store.activeBattle.value.weather?.type || 'clear';

          store.activeBattle.value.weather = {
            type: nextWeatherType,
            visual: weatherType.toLowerCase(),
            turns: -1
          };

          if (nextWeatherType !== currentWeatherType && !isUpkeep && !isFromDebug) {
            const weatherEmojis: Record<string, string> = {
              'Sandstorm': '🌀',
              'RainDance': '🌧️',
              'SunnyDay': '☀️',
              'Hail': '❄️',
              'none': '🌤️'
            };
            const emoji = weatherEmojis[weatherType] || '🌤️';
            const localizedName = getLocalizedWeatherName(weatherType, ACTIVE_GENERATION);
            store.addLog(`¡El clima cambió a ${localizedName}!`, 'log-info', emoji);
          }
        }
        break;
      }

      default:
        // Logs genéricos o no manejados estructuradamente por la UI se ignoran o se imprimen en depuración
        logger.debug('ShowdownBridge', `Línea de log de Showdown sin parseador visual específico: ${line}`);
    }
  } catch (error) {
    logger.error('ShowdownBridge', `Error al parsear línea de log: ${line}`, (error as Error).message);
  }
}
