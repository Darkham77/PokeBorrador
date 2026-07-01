// fallow-ignore-file security-sink
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from './showdownAdapter.ts';

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

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INIT_BATTLE': {
        const { p1, p2 } = payload;
        
        lastLogIndex = 0;

        const seedArr = payload.seed || [
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000)
        ];

        currentBattle = new Battle({ 
          formatid: getShowdownFormatId(),
          seed: seedArr.join(',') as unknown as `${number},${string}`
        });


        // Configurar los dos jugadores
        currentBattle.setPlayer('p1', { name: p1.name || 'Player 1', team: p1.team });
        currentBattle.setPlayer('p2', { name: p2.name || 'Player 2', team: p2.team });

        // Asociar UIDs del set directamente a las instancias creadas en el simulador
        if (Array.isArray(p1.team)) {
          currentBattle.p1.pokemon.forEach((pokemon, idx) => {
            const set = p1.team[idx];
            if (pokemon && set && set.uid) {
              (pokemon as any).uid = set.uid;
              console.log(`[ShowdownWorker] Injected p1[${idx}] ${pokemon.name} with UID: ${set.uid}`);
            } else {
              console.log(`[ShowdownWorker] WARNING: p1[${idx}] has no UID in set!`);
            }
          });
        }
        if (Array.isArray(p2.team)) {
          currentBattle.p2.pokemon.forEach((pokemon, idx) => {
            const set = p2.team[idx];
            if (pokemon && set && set.uid) {
              (pokemon as any).uid = set.uid;
              console.log(`[ShowdownWorker] Injected p2[${idx}] ${pokemon.name} with UID: ${set.uid}`);
            } else {
              console.log(`[ShowdownWorker] WARNING: p2[${idx}] has no UID in set!`);
            }
          });
        }

        // Sincronizar HP iniciales
        syncSideStates(currentBattle.p1 as unknown as PkmnSimSide, payload.p1Hps, undefined);
        syncSideStates(currentBattle.p2 as unknown as PkmnSimSide, payload.p2Hps, undefined);

        if (payload.weather && payload.weather !== 'none') {
          currentBattle.field.setWeather(payload.weather, 'debug' as const);
        }

        // Enviar logs iniciales de inicio de combate junto con los requests iniciales
        const initLogs = getNewLogs();
        self.postMessage({ 
          type: 'INIT_BATTLE_SUCCESS', 
          payload: { 
            logs: initLogs,
            p1Request: currentBattle.p1.activeRequest,
            p2Request: currentBattle.p2.activeRequest
          } 
        });
        break;
      }

      case 'EXECUTE_TURN': {
        if (!currentBattle) throw new Error('currentBattle is null');
        const battle = currentBattle;

        const { p1Choice, p2Choice, p1Hps, p2Hps, p1Statuses, p2Statuses, p1Skip, p2Skip } = payload;

        // Sincronizar estados de HP y Statuses antes de mandar elecciones
        const p1Side = battle.p1 as unknown as PkmnSimSide;
        const p2Side = battle.p2 as unknown as PkmnSimSide;
        syncSideStates(p1Side, p1Hps, p1Statuses);
        syncSideStates(p2Side, p2Hps, p2Statuses);

        // Regenerar los activeRequests en el simulador tras sincronizar la salud
        if (typeof battle.makeRequest === 'function') {
          battle.makeRequest();
        }

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

        // Sincronizar estados finales tras procesar el turno para corregir desincronizaciones de daño
        if (p1Hps && battle.p1.active?.[0]) {
          const activeMon = battle.p1.active[0] as any;
          if (activeMon.uid && p1Hps[activeMon.uid] > 0) {
            activeMon.hp = p1Hps[activeMon.uid];
            activeMon.fainted = false;
            if (activeMon.status === 'fnt') activeMon.status = '';
            if (battle.p1.activeRequest) {
              delete (battle.p1.activeRequest as any).forceSwitch;
            }
          }
        }
        if (p2Hps && battle.p2.active?.[0]) {
          const activeMon = battle.p2.active[0] as any;
          if (activeMon.uid && p2Hps[activeMon.uid] > 0) {
            activeMon.hp = p2Hps[activeMon.uid];
            activeMon.fainted = false;
            if (activeMon.status === 'fnt') activeMon.status = '';
            if (battle.p2.activeRequest) {
              delete (battle.p2.activeRequest as any).forceSwitch;
            }
          }
        }

        const turnLogs = getNewLogs();
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
            p1Request: battle.p1.activeRequest,
            p2Request: battle.p2.activeRequest
          } 
        });
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

function syncSideStates(
  side: PkmnSimSide,
  hps: unknown,
  statuses: unknown
) {
  const mons = side.pokemon;
  if (!mons) return;

  const isRecord = (obj: unknown): obj is Record<string, unknown> => {
    return !!obj && typeof obj === 'object' && !Array.isArray(obj);
  };

  if (isRecord(hps)) {
    mons.forEach((pokemon, idx) => {
      const uid = (pokemon as any)?.uid;
      if (pokemon && uid) {
        const hp = hps[uid];
        if (hp !== undefined) {
          console.log(`[ShowdownWorker] Syncing ${pokemon.name} (UID:${uid}, idx:${idx}) HP: ${pokemon.hp} -> ${hp}`);
          pokemon.hp = hp as number;
          if ((hp as number) <= 0) {
            if (!pokemon.fainted) {
              if (typeof pokemon.faint === 'function') pokemon.faint();
              else {
                pokemon.fainted = true;
                pokemon.status = 'fnt';
              }
            } else {
              pokemon.fainted = true;
              pokemon.status = 'fnt';
            }
          } else {
            pokemon.fainted = false;
            if (pokemon.status === 'fnt') pokemon.status = '';
          }
        } else {
          console.log(`[ShowdownWorker] WARNING: HP not found for UID: ${uid} in payload:`, JSON.stringify(hps));
        }
      } else if (pokemon) {
        console.log(`[ShowdownWorker] WARNING: pokemon at idx ${idx} has no UID!`);
      }
    });
  } else if (Array.isArray(hps)) {
    hps.forEach((hp: number, index: number) => {
      const pokemon = mons[index];
      if (pokemon) {
        pokemon.hp = hp;
        if (hp <= 0) {
          if (!pokemon.fainted) {
            if (typeof pokemon.faint === 'function') pokemon.faint();
            else {
              pokemon.fainted = true;
              pokemon.status = 'fnt';
            }
          } else {
            pokemon.fainted = true;
            pokemon.status = 'fnt';
          }
        } else {
          pokemon.fainted = false;
          if (pokemon.status === 'fnt') pokemon.status = '';
        }
      }
    });
  }

  if (isRecord(statuses)) {
    mons.forEach((pokemon) => {
      const uid = (pokemon as any)?.uid;
      if (pokemon && uid) {
        const status = statuses[uid];
        if (status !== undefined && !pokemon.fainted) {
          pokemon.status = status ? (status as string).toLowerCase() : '';
        }
      }
    });
  } else if (Array.isArray(statuses)) {
    statuses.forEach((status: string, index: number) => {
      const pokemon = mons[index];
      if (pokemon && !pokemon.fainted) {
        pokemon.status = status ? status.toLowerCase() : '' as any;
      }
    });
  }

  // Recalcular pokemonLeft basándose en los Pokémon que no están debilitados
  (side as any).pokemonLeft = mons.filter(p => p && !p.fainted).length;
}

