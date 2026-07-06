// fallow-ignore-file security-sink
import { Battle, type ID } from '@pkmn/sim';
import { getShowdownFormatId } from './showdownAdapter.ts';

// Global cache to preserve adventure mode custom stats across Showdown's internal set unpacking
const statsMap = new Map<string, unknown>();

const debugLogs: string[] = [];
function logDebug(msg: string) {
  debugLogs.push(msg);
  console.log(msg);
}

// Monkey-patch spreadModify to allow adventure mode custom stats injection
const originalSpreadModify = Battle.prototype.spreadModify;
Battle.prototype.spreadModify = function (baseStats, set) {
  logDebug(`[E2E-WORKER-DEBUG] spreadModify called for set.name="${set?.name}", set.species="${set?.species}"`);
  if (set && set.name) {
    const stats = statsMap.get(set.name);
    logDebug(`[E2E-WORKER-DEBUG] spreadModify stats found for ${set.name}: ${stats ? JSON.stringify(stats) : 'NOT FOUND'}`);
    if (stats) {
      return { ...(stats as Record<string, number>) };
    }
  }
  if (set && (set as any).stats) {
    return { ...(set as any).stats };
  }
  return originalSpreadModify.call(this, baseStats, set);
};

/** Forma estructural mínima del lado interno de @pkmn/sim (no exportado públicamente). */
interface PkmnSimSide {
  active?: Array<{
    name?: string;
    moves?: string[];
    moveSlots?: Array<{ id: string; pp: number; disabled?: boolean | string } | null>;
    trapped?: boolean | string;
    maybeTrapped?: boolean | string;
  } | null>;
  pokemon?: Array<{ hp: number; fainted: boolean; status: string } | null>;
}

let currentBattle: Battle | null = null;

export function setTestingBattle(battle: Battle | null): void {
  currentBattle = battle;
}

export function injectUidsIntoRequest(
  playerOrBattle: 'p1' | 'p2' | Battle,
  requestOrPlayer: unknown,
  request?: unknown
): unknown {
  let battle: Battle | null = null;
  let player: 'p1' | 'p2';
  let req: any = null;

  if (playerOrBattle instanceof Battle || (playerOrBattle && typeof playerOrBattle === 'object' && 'p1' in playerOrBattle)) {
    battle = playerOrBattle as Battle;
    player = requestOrPlayer as 'p1' | 'p2';
    req = request;
  } else {
    battle = currentBattle;
    player = playerOrBattle as 'p1' | 'p2';
    req = requestOrPlayer;
  }

  if (req && req.side && Array.isArray(req.side.pokemon)) {
    console.log(`[E2E-WORKER-INJECT] Processing request directly from simulator for side ${player}. reqMon length: ${req.side.pokemon.length}`);
    
    const simulatorPokemon = battle?.[player]?.pokemon || [];
    const assignedUids = new Set<string>();

    req.side.pokemon.forEach((reqMon: any) => {
      if (reqMon && reqMon.ident) {
        const cleanIdent = reqMon.ident.replace(/^(p1a|p2a|p1|p2):\s*/, '').trim().toLowerCase();
        const matched = simulatorPokemon.find(p => {
          if (!p || !(p as any).uid) return false;
          const uid = (p as any).uid.toLowerCase();
          const uidPrefix = uid.split('-')[0];
          const isMatch = uid.startsWith(cleanIdent) || cleanIdent.startsWith(uidPrefix);
          return isMatch && !assignedUids.has((p as any).uid);
        });
        if (matched && (matched as any).uid) {
          reqMon.uid = (matched as any).uid;
          assignedUids.add(reqMon.uid);
          console.log(`  -> [E2E-WORKER-INJECT] Matched "${reqMon.ident}" to simulator UID: ${reqMon.uid}`);
        } else {
          throw new Error(`[Worker-injectUidsIntoRequest] No UID found on simulator Pokemon instance: ${reqMon.ident}`);
        }
      }
    });
  }
  return req;
}


self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INIT_BATTLE': {
        const { p1, p2 } = payload;
        
        logDebug(`[E2E-WORKER-DEBUG] init Battle.prototype.spreadModify type is: ${typeof Battle.prototype.spreadModify}`);
        logDebug(`[E2E-WORKER-DEBUG] init statsMap size is: ${statsMap.size}`);
        
        // Cache stats by nickname/short-uid prefix to survive Showdown's set parsing
        statsMap.clear();
        if (p1 && Array.isArray(p1.team)) {
          p1.team.forEach((set: any) => {
            if (set && set.name && set.stats) {
              statsMap.set(set.name, set.stats);
            }
          });
        }
        if (p2 && Array.isArray(p2.team)) {
          p2.team.forEach((set: any) => {
            if (set && set.name && set.stats) {
              statsMap.set(set.name, set.stats);
            }
          });
        }
        
        lastLogIndex = 0;

        const seedArr = payload.seed || [
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000)
        ];

        const seedString = `${seedArr[0]},${seedArr[1]},${seedArr[2]},${seedArr[3]}`;

        const battleInstance = new Battle({ 
          formatid: getShowdownFormatId(),
          seed: seedString as any
        });
        currentBattle = battleInstance;

        // Interceptar y enriquecer el array de logs en tiempo real capturando los UIDs de los Pokémon involucrados en cada llamada a add y addMove
        const originalAdd = battleInstance.add;
        battleInstance.add = function (...parts: any[]) {
          originalAdd.apply(this, parts);
          const lastIndex = battleInstance.log.length - 1;
          if (lastIndex >= 0) {
            const line = battleInstance.log[lastIndex];
            const uidMappings: string[] = [];
            parts.forEach(part => {
              if (part && typeof part === 'object' && 'uid' in part && part.uid) {
                const ident = part.toString();
                if (ident) {
                  const cleanIdent = ident.replace(/\s+/g, '');
                  uidMappings.push(`${cleanIdent}=${part.uid}`);
                }
              }
            });
            if (uidMappings.length > 0) {
              battleInstance.log[lastIndex] = `${line}|[uids]${uidMappings.join(',')}`;
              console.log(`[WORKER-ADD-ENRICH] enriched log line: "${battleInstance.log[lastIndex]}"`);
            }
          }
        };

        const originalAddMove = battleInstance.addMove;
        battleInstance.addMove = function (...parts: any[]) {
          originalAddMove.apply(this, parts);
          const lastIndex = battleInstance.log.length - 1;
          if (lastIndex >= 0) {
            const line = battleInstance.log[lastIndex];
            const uidMappings: string[] = [];
            parts.forEach(part => {
              if (part && typeof part === 'object' && 'uid' in part && part.uid) {
                const ident = part.toString();
                if (ident) {
                  const cleanIdent = ident.replace(/\s+/g, '');
                  uidMappings.push(`${cleanIdent}=${part.uid}`);
                }
              }
            });
            if (uidMappings.length > 0) {
              battleInstance.log[lastIndex] = `${line}|[uids]${uidMappings.join(',')}`;
              console.log(`[WORKER-ADDMOVE-ENRICH] enriched log line: "${battleInstance.log[lastIndex]}"`);
            }
          }
        };


        // Configurar los dos jugadores (esto inicia automáticamente la batalla en pkmn/sim)
        battleInstance.setPlayer('p1', { name: p1.name || 'Player 1', team: p1.team });
        battleInstance.setPlayer('p2', { name: p2.name || 'Player 2', team: p2.team });

        // Asociar UIDs del set a las instancias en el simulador usando índice de slot directo
        if (Array.isArray(p1.team)) {
          battleInstance.p1.pokemon.forEach((pokemon, idx) => {
            if (pokemon) {
              const set = p1.team[idx];
              if (set && set.uid) {
                (pokemon as unknown as Record<string, unknown>).uid = set.uid;
              }
            }
          });
        }
        if (Array.isArray(p2.team)) {
          currentBattle.p2.pokemon.forEach((pokemon, idx) => {
            if (pokemon) {
              const set = p2.team[idx];
              if (set && set.uid) {
                (pokemon as unknown as Record<string, unknown>).uid = set.uid;
              }
            }
          });
        }

        // Enriquecer retrospectivamente las líneas de switch/drag iniciales de los leads que se registraron en setPlayer
        if (currentBattle) {
          (currentBattle as unknown as { log: string[] }).log = currentBattle.log.map(line => {
            if (line.startsWith('|switch|') || line.startsWith('|drag|')) {
              const parts = line.split('|');
              const rawId = parts[2] || '';
              const isPlayer = rawId.startsWith('p1a:') || rawId === 'p1a';
              const sideObj = isPlayer ? currentBattle?.p1 : currentBattle?.p2;
              const activeMon = sideObj?.active?.[0];
              const uid = activeMon ? (activeMon as unknown as { uid?: string }).uid : null;
              if (uid && !line.includes('|[uids]')) {
                const cleanIdent = rawId.replace(/\s+/g, '');
                const enriched = `${line}|[uids]${cleanIdent}=${uid}`;
                console.log(`[WORKER-RETRO-ENRICH] enriched initial lead line: "${enriched}"`);
                return enriched;
              }
            }
            return line;
          });
        }

        // Sincronizar HP iniciales
        if (payload.p1Hps && typeof payload.p1Hps === 'object') {
          const p1Hps = payload.p1Hps as Record<string, number>;
          const p1Statuses = (payload.p1Statuses || {}) as Record<string, string>;
          currentBattle.p1.pokemon.forEach(p => {
            if (p) {
              const uid = (p as unknown as { uid?: string }).uid;
              if (uid && p1Hps[uid] !== undefined) {
                p.hp = p1Hps[uid];
                if (p.hp <= 0) {
                  p.fainted = true;
                  p.status = 'fnt' as ID;
                } else {
                  p.fainted = false;
                  (p as unknown as { faintQueued: boolean }).faintQueued = false;
                  p.status = (p1Statuses[uid] || '') as ID;
                }
              }
            }
          });
          (currentBattle.p1 as unknown as { pokemonLeft: number }).pokemonLeft = currentBattle.p1.pokemon.filter(p => p && !p.fainted).length;
        }
        if (payload.p2Hps && typeof payload.p2Hps === 'object') {
          const p2Hps = payload.p2Hps as Record<string, number>;
          const p2Statuses = (payload.p2Statuses || {}) as Record<string, string>;
          currentBattle.p2.pokemon.forEach(p => {
            if (p) {
              const uid = (p as unknown as { uid?: string }).uid;
              if (uid && p2Hps[uid] !== undefined) {
                p.hp = p2Hps[uid];
                if (p.hp <= 0) {
                  p.fainted = true;
                  p.status = 'fnt' as ID;
                } else {
                  p.fainted = false;
                  (p as unknown as { faintQueued: boolean }).faintQueued = false;
                  p.status = (p2Statuses[uid] || '') as ID;
                }
              }
            }
          });
          (currentBattle.p2 as unknown as { pokemonLeft: number }).pokemonLeft = currentBattle.p2.pokemon.filter(p => p && !p.fainted).length;
        }

        if (payload.weather && payload.weather !== 'none') {
          currentBattle.field.setWeather(payload.weather, 'debug' as const);
        }

        // Enviar logs iniciales de inicio de combate junto con los requests iniciales
        const initLogs = getNewLogs();
        self.postMessage({ 
          type: 'INIT_BATTLE_SUCCESS', 
          payload: { 
            logs: initLogs,
            p1Request: injectUidsIntoRequest('p1', currentBattle.p1.activeRequest),
            p2Request: injectUidsIntoRequest('p2', currentBattle.p2.activeRequest),
            debugLogs
          } 
        });
        break;
      }

      case 'EXECUTE_TURN': {
        if (!currentBattle) throw new Error('currentBattle is null');
        const battle = currentBattle;

        const { p1Choice, p2Choice, p1Skip, p2Skip, p1Hps, p2Hps, weather } = payload;

        // Sincronizar clima
        if (weather) {
          const targetWeather = (weather === 'none' || weather === 'clear') ? '' : weather;
          if (battle.field.weather !== targetWeather) {
            if (!targetWeather) {
              battle.field.clearWeather();
            } else {
              battle.field.setWeather(targetWeather as import('@pkmn/sim').ID, 'debug' as const);
            }
          }
        }

        // Si se reciben HPs/estados de la UI (por ejemplo, por cheats del fuzzer), sincronizarlos
        if (p1Hps && typeof p1Hps === 'object') {
          battle.p1.pokemon.forEach(p => {
            if (p) {
              const uid = (p as unknown as { uid?: string }).uid;
              if (uid && p1Hps[uid] !== undefined) {
                p.hp = p1Hps[uid];
                if (p.hp <= 0) {
                  p.faint();
                } else {
                  p.fainted = false;
                  (p as unknown as { faintQueued: boolean }).faintQueued = false;
                  if (p.status === 'fnt') p.status = '' as ID;
                }
              }
            }
          });
          (battle.p1 as unknown as { pokemonLeft: number }).pokemonLeft = battle.p1.pokemon.filter(p => p && !p.fainted).length;
        }
        if (p2Hps && typeof p2Hps === 'object') {
          battle.p2.pokemon.forEach(p => {
            if (p) {
              const uid = (p as unknown as { uid?: string }).uid;
              if (uid && p2Hps[uid] !== undefined) {
                p.hp = p2Hps[uid];
                if (p.hp <= 0) {
                  p.faint();
                } else {
                  p.fainted = false;
                  (p as unknown as { faintQueued: boolean }).faintQueued = false;
                  if (p.status === 'fnt') p.status = '' as ID;
                }
              }
            }
          });
          (battle.p2 as unknown as { pokemonLeft: number }).pokemonLeft = battle.p2.pokemon.filter(p => p && !p.fainted).length;
        }

        const p1Side = battle.p1 as unknown as PkmnSimSide;
        const p2Side = battle.p2 as unknown as PkmnSimSide;

        // Si se indicó saltar turno (por uso de objeto), aplicar volatile flinch para omitir ataque
        if (p1Skip && p1Side.active?.[0]) {
          const activeMon = p1Side.active[0] as unknown as { addVolatile: (status: string) => void };
          if (typeof activeMon?.addVolatile === 'function') {
            activeMon.addVolatile('flinch');
          }
        }
        if (p2Skip && p2Side.active?.[0]) {
          const activeMon = p2Side.active[0] as unknown as { addVolatile: (status: string) => void };
          if (typeof activeMon?.addVolatile === 'function') {
            activeMon.addVolatile('flinch');
          }
        }

        // Registrar las elecciones de ambos jugadores.
        // Caso especial: 'struggle' = drenar PP del activo en el sim y enviar 'move 1'
        // para que @pkmn/sim lo procese como Struggle correctamente.
        // NOTA: en @pkmn/sim, .moves es string[], .moveSlots contiene los objetos {id, pp, maxpp}.
        const resolveChoice = (side: PkmnSimSide, choice: string, isSkip: boolean): string => {
          if (choice.includes('struggle') && !isSkip && side?.active?.[0]) {
            const activeMon = side.active[0]
            if (activeMon?.moveSlots) {
              activeMon.moveSlots.forEach((m: { id: string; pp: number; disabled?: boolean | string } | null) => { if (m) m.pp = 0 })
            }
            return 'default'
          }
          return choice
        };

        const chooseOrThrow = (player: 'p1' | 'p2', choice: string) => {
          const side = battle[player] as unknown as PkmnSimSide;
          const activeMon = side.active?.[0];
          const resolved = resolveChoice(side, choice, player === 'p1' ? p1Skip : p2Skip);
          const ok = battle.choose(player, resolved);
          if (!ok) {
            const activeName = activeMon ? activeMon.name : 'none';
            const activeMoves = activeMon ? JSON.stringify(activeMon.moves) : 'none';
            const requestStr = JSON.stringify((battle[player] as unknown as { activeRequest?: unknown }).activeRequest || {});
            throw new Error(`INVALID_CHOICE: Elección "${choice}" (resuelta a "${resolved}") rechazada por el simulador para ${player}. ActiveMon: ${activeName}, Simulator Moves: ${activeMoves}, Request: ${requestStr}`);
          }
        };

        const logLenBeforeP1 = battle.log.length;
        if (p1Choice) {
          chooseOrThrow('p1', p1Choice);
        }
        // After p1 chooses, Showdown may auto-process the turn if p2 already had a committed
        // choice queued (common when p1 voluntary-switches in gen5customgame).
        // Detect this by checking if new battle logs were emitted after p1's choose.
        // If the log grew, the turn already resolved — do NOT send p2's choice.
        const turnAlreadyProcessed = battle.log.length > logLenBeforeP1;
        if (p2Choice && !turnAlreadyProcessed) {
          chooseOrThrow('p2', p2Choice);
        }


        const turnLogs = getNewLogs();
        if (p2Skip) {
          turnLogs.unshift('|turnStart|p2Skip=true');
        } else {
          turnLogs.unshift('|turnStart|p2Skip=false');
        }
        const isOver = battle.ended;
        const winner = battle.winner;
        const p1ForceSwitch = !!(battle.p1.activeRequest?.forceSwitch?.[0]);
        const p2ForceSwitch = !!(battle.p2.activeRequest?.forceSwitch?.[0]);

        self.postMessage({ 
          type: 'TURN_SUCCESS', 
          payload: { 
            logs: turnLogs,
            isOver,
            winner,
            p1ForceSwitch,
            p2ForceSwitch,
            p1Request: injectUidsIntoRequest('p1', battle.p1.activeRequest),
            p2Request: injectUidsIntoRequest('p2', battle.p2.activeRequest)
          } 
        });
        break;
      }

      case 'APPLY_CHEAT': {
        const { side, type: cheatType } = payload;
        if (currentBattle) {
          const sideObj = side === 'p1' ? currentBattle.p1 : currentBattle.p2;
          const active = sideObj.active?.[0];
          if (active && cheatType === 'heal') {
            active.hp = active.maxhp;
            active.fainted = false;
            active.status = '';
          }
        }
        self.postMessage({ type: 'APPLY_CHEAT_SUCCESS' });
        break;
      }

      case 'CHECK_TRAPPED': {
        const activeReq = (currentBattle?.p1?.activeRequest as unknown as { active?: Array<{ trapped?: boolean; maybeTrapped?: boolean } | null> } | undefined);
        const trapped = !!(activeReq?.active?.[0]?.trapped || activeReq?.active?.[0]?.maybeTrapped);
        self.postMessage({
          type: 'CHECK_TRAPPED_RESPONSE',
          payload: { trapped }
        });
        break;
      }

      default:
        console.warn(`[Showdown Worker] Evento desconocido: ${type}`);
    }
  } catch (error) {
    const errorMsg = (error as Error).message;
    const errorStack = (error as Error).stack || '';
    console.error('[Showdown Worker] CRITICAL ERROR IN WORKER:', error);
    self.postMessage({ 
      type: 'ERROR', 
      payload: { 
        message: `${errorMsg}\nStack: ${errorStack}\nPayload: ${JSON.stringify(payload || {})}` 
      } 
    });
  }
};

let lastLogIndex = 0;

function getNewLogs(): string[] {
  if (!currentBattle) return [];
  // En Gen 3 obtenemos el log acumulado y devolvemos la porción nueva del turno
  const allLogs = currentBattle.log;
  const newLogs = allLogs.slice(lastLogIndex);
  lastLogIndex = allLogs.length;
  return newLogs;
}


