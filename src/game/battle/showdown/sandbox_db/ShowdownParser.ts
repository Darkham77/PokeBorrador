import type { ShowdownLocalDB } from './cloner/extract_logic.ts';
import showdownDB from './data/showdown_db.json';

const typedDB = showdownDB as unknown as ShowdownLocalDB;

export interface ParsedEvent {
  type: 'start' | 'move' | 'damage' | 'heal' | 'faint' | 'supereffective' | 'resisted' | 'crit' | 'info' | 'unhandled';
  text: string;
  data?: {
    isPlayerAttacking?: boolean;
    moveId?: string;
    isPlayer?: boolean;
    currentHP?: number;
    maxHP?: number;
  };
}

/**
 * Helper para obtener el nombre localizado de un Pokémon a partir de su identificador de Showdown (ej: p1a: Pikachu)
 */
function getPokemonName(rawId: string): string {
  // rawId es tipo: "p1a: Pikachu" o "p2a: Bulbasaur"
  const parts = rawId.split(': ');
  const displayName = parts[1] || rawId;
  const cleanId = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const localPoke = typedDB.pokemon[cleanId];
  return localPoke ? localPoke.name : displayName;
}

/**
 * Helper para obtener el nombre de un movimiento localizado en español
 */
function getMoveName(moveId: string): string {
  const cleanId = moveId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const localMove = typedDB.moves[cleanId];
  return localMove ? localMove.name : moveId;
}

export function filterShowdownLogs(logs: string[]): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < logs.length; i++) {
    const line = logs[i];
    if (line !== undefined) {
      if (line.startsWith('|split|')) {
        // La directiva |split| indica que las siguientes dos líneas son la versión privada y pública del mismo evento.
        // Conservamos la primera línea (privada) y descartamos la segunda (pública).
        const privateLine = logs[i + 1];
        if (privateLine !== undefined) {
          filtered.push(privateLine);
        }
        i += 2; // Omitimos la directiva split, la línea privada ya procesada y la línea pública redundante.
      } else {
        filtered.push(line);
      }
    }
  }
  return filtered;
}

/**
 * Parsea el log crudo de Showdown y lo traduce a una lista de eventos legibles por la UI
 */
export function parseShowdownLog(logs: string[]): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const filteredLogs = filterShowdownLogs(logs);

  for (const line of filteredLogs) {
    if (!line.startsWith('|')) continue;


    const parts = line.split('|').slice(1);
    const action = parts[0] || '';

    switch (action) {
      case 'start':
        events.push({
          type: 'start',
          text: '¡Comienza el combate!',
        });
        break;

      case 'move': {
        const rawAttacker = parts[1] || '';
        const rawMove = parts[2] || '';
        const attacker = getPokemonName(rawAttacker);
        const moveName = getMoveName(rawMove);
        events.push({
          type: 'move',
          text: `¡${attacker} usó ${moveName}!`,
          data: {
            isPlayerAttacking: rawAttacker.startsWith('p1'),
            moveId: rawMove.toLowerCase().replace(/[^a-z0-9]/g, ''),
          },
        });
        break;
      }

      case '-damage': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        const rawHp = parts[2] || '';
        const hpInfo = rawHp.split('/');
        const currentHP = parseInt(hpInfo[0] || '0', 10);
        const maxHP = parseInt(hpInfo[1] || '100', 10);
        const fromSource = parts[3] || '';
        
        let text = `¡${target} recibió daño!`;
        if (fromSource.includes('[from] Leech Seed')) text = `¡Las drenadoras robaron energía a ${target}!`;
        else if (fromSource.includes('[from] brn')) text = `¡${target} se resiente de la quemadura!`;
        else if (fromSource.includes('[from] psn') || fromSource.includes('[from] tox')) text = `¡El veneno resta salud a ${target}!`;
        else if (fromSource.includes('[from] Sandstorm')) text = `¡La tormenta de arena daña a ${target}!`;
        else if (fromSource.includes('[from] Hail')) text = `¡El granizo golpea a ${target}!`;
        
        events.push({
          type: 'damage',
          text,
          data: {
            isPlayer: rawTarget.startsWith('p1'),
            currentHP: isNaN(currentHP) ? 0 : currentHP,
            maxHP: isNaN(maxHP) ? 100 : maxHP,
          },
        });
        break;
      }

      case '-heal': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        const rawHp = parts[2] || '';
        const hpInfo = rawHp.split('/');
        const currentHP = parseInt(hpInfo[0] || '0', 10);
        const maxHP = parseInt(hpInfo[1] || '100', 10);
        const fromSource = parts[3] || '';

        let text = `¡${target} recuperó salud!`;
        if (fromSource.includes('[from] drain')) text = `¡La salud de ${target} fue restaurada!`;
        else if (fromSource.includes('[from] item: Leftovers')) text = `¡${target} recuperó salud gracias a Restos!`;
        else if (fromSource.includes('[from] Leech Seed')) text = `¡La salud de ${target} fue restaurada por las drenadoras!`;

        events.push({
          type: 'heal',
          text,
          data: {
            isPlayer: rawTarget.startsWith('p1'),
            currentHP: isNaN(currentHP) ? 0 : currentHP,
            maxHP: isNaN(maxHP) ? 100 : maxHP,
          },
        });
        break;
      }

      case 'faint': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        events.push({
          type: 'faint',
          text: `¡${target} se ha debilitado!`,
          data: {
            isPlayer: rawTarget.startsWith('p1'),
          },
        });
        break;
      }

      case 'cant': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        const reason = parts[2] || '';
        let text = `¡${target} no puede moverse!`;
        if (reason === 'flinch') text = `¡${target} retrocedió y no pudo atacar!`;
        else if (reason === 'par') text = `¡${target} está paralizado y no puede moverse!`;
        else if (reason === 'slp') text = `¡${target} está profundamente dormido!`;
        else if (reason === 'frz') text = `¡${target} está congelado sólido!`;
        else if (reason.includes('recharge')) text = `¡${target} debe recargar energía!`;
        
        events.push({ type: 'info', text });
        break;
      }

      case '-immune': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        const fromSource = parts[2] || '';
        let text = `¡No afecta a ${target}!`;
        if (fromSource.includes('Levitate')) text = `¡${target} levita en el aire! Los ataques de tierra no le afectan.`;
        
        events.push({ type: 'info', text });
        break;
      }

      case '-weather': {
        const weatherId = parts[1] || '';
        let text = '';
        if (weatherId === 'none') text = 'El clima ha vuelto a la normalidad.';
        else if (weatherId === 'SunnyDay') text = 'El sol brilla con fuerza.';
        else if (weatherId === 'RainDance') text = 'Sigue lloviendo a cántaros.';
        else if (weatherId === 'Sandstorm') text = 'La tormenta de arena arrecia.';
        else if (weatherId === 'Hail') text = 'El granizo sigue cayendo.';
        
        if (text) events.push({ type: 'info', text });
        break;
      }

      case '-status': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        const status = parts[2] || '';
        let text = `¡${target} sufre un problema de estado!`;
        if (status === 'brn') text = `¡${target} se ha quemado!`;
        else if (status === 'psn' || status === 'tox') text = `¡${target} ha sido envenenado!`;
        else if (status === 'par') text = `¡${target} ha sido paralizado!`;
        else if (status === 'slp') text = `¡${target} se ha quedado dormido!`;
        else if (status === 'frz') text = `¡${target} se ha congelado!`;
        
        events.push({ type: 'info', text });
        break;
      }

      case '-curestatus': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        events.push({
          type: 'info',
          text: `¡${target} se ha curado de su problema de estado!`,
        });
        break;
      }

      case '-boost':
      case '-unboost': {
        const rawTarget = parts[1] || '';
        const target = getPokemonName(rawTarget);
        const stat = parts[2] || '';
        const amount = parseInt(parts[3] || '1', 10);
        
        const statNames: Record<string, string> = {
          atk: 'Ataque', def: 'Defensa', spa: 'Ataque Esp.', spd: 'Defensa Esp.', spe: 'Velocidad', accuracy: 'Precisión', evasion: 'Evasión'
        };
        const statName = statNames[stat] || stat;
        const direction = action === '-boost' ? 'subió' : 'bajó';
        const much = amount > 1 ? ' mucho' : '';
        
        events.push({
          type: 'info',
          text: `¡El ${statName} de ${target} ${direction}${much}!`,
        });
        break;
      }

      case '-supereffective':
        events.push({
          type: 'supereffective',
          text: '¡Es súper eficaz!',
        });
        break;

      case '-resisted':
        events.push({
          type: 'resisted',
          text: 'No es muy eficaz...',
        });
        break;

      case '-crit':
        events.push({
          type: 'crit',
          text: '¡Un golpe crítico!',
        });
        break;

      default:
        // Ignoramos otras directivas internas de Showdown para no saturar el log
        break;
    }
  }

  return events;
}
