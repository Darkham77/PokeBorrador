// fallow-ignore-file security-sink
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from './showdownAdapter.ts';

/** Forma estructural mínima del lado interno de @pkmn/sim (no exportado públicamente). */
interface PkmnSimSide {
  active?: Array<{
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

        const seedArr = [
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
        currentBattle.setPlayer('p1', { name: p1.name, team: p1.team });
        currentBattle.setPlayer('p2', { name: p2.name, team: p2.team });

        // Sincronizar HP iniciales
        syncSideStates(currentBattle.p1 as unknown as PkmnSimSide, payload.p1Hps, undefined);
        syncSideStates(currentBattle.p2 as unknown as PkmnSimSide, payload.p2Hps, undefined);

        if (payload.weather && payload.weather !== 'none') {
          currentBattle.field.setWeather(payload.weather, 'debug' as const);
        }

        // Enviar logs iniciales de inicio de combate junto con los requests iniciales
        const initLogs = getNewLogs();
        self.postMessage({ 
          type: 'INIT_SUCCESS', 
          payload: { 
            logs: initLogs,
            p1Request: currentBattle.p1.activeRequest,
            p2Request: currentBattle.p2.activeRequest
          } 
        });
        break;
      }

      case 'EXECUTE_TURN': {
        if (!currentBattle) {
          throw new Error('No hay ninguna batalla activa inicializada en el worker.');
        }
        const battle = currentBattle;

        const { p1Choice, p2Choice, p1Hps, p2Hps, p1Statuses, p2Statuses, p1Skip, p2Skip } = payload;

        // Sincronizar HP y Estados antes del turno
        syncSideStates(battle.p1 as unknown as PkmnSimSide, p1Hps, p1Statuses);
        syncSideStates(battle.p2 as unknown as PkmnSimSide, p2Hps, p2Statuses);

        // Si se indicó saltar turno (por uso de objeto), aplicar volatile flinch para omitir ataque
        if (p1Skip && battle.p1.active?.[0]) {
          const activeMon = battle.p1.active[0] as unknown as { addVolatile: (status: string) => void };
          if (typeof activeMon?.addVolatile === 'function') {
            activeMon.addVolatile('flinch');
          }
        }
        if (p2Skip && battle.p2.active?.[0]) {
          const activeMon = battle.p2.active[0] as unknown as { addVolatile: (status: string) => void };
          if (typeof activeMon?.addVolatile === 'function') {
            activeMon.addVolatile('flinch');
          }
        }

        // Registrar las elecciones de ambos jugadores.
        // Caso especial: 'struggle' = drenar PP del activo en el sim y enviar 'move 1'
        // para que @pkmn/sim lo procese como Struggle correctamente.
        // NOTA: en @pkmn/sim, .moves es string[], .moveSlots contiene los objetos {id, pp, maxpp}.
        const resolveChoice = (side: PkmnSimSide, choice: string): string => {
          if (choice.includes('struggle') && side?.active?.[0]) {
            const activeMon = side.active[0]
            if (activeMon?.moveSlots) {
              activeMon.moveSlots.forEach((m: { id: string; pp: number; disabled?: boolean | string } | null) => { if (m) m.pp = 0 })
            }
            return 'default'
          }
          return choice
        };

        const chooseOrThrow = (player: 'p1' | 'p2', choice: string) => {
          const resolved = resolveChoice(battle[player] as unknown as PkmnSimSide, choice);
          let ok = battle.choose(player, resolved);
          if (!ok) {
            throw new Error(`INVALID_CHOICE: Elección "${choice}" (resuelta a "${resolved}") rechazada por el simulador para ${player}.`);
          }
        };

        if (p1Choice) {
          chooseOrThrow('p1', p1Choice);
        }
        if (p2Choice) {
          chooseOrThrow('p2', p2Choice);
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

function syncSideStates(side: PkmnSimSide, hps: number[] | undefined, statuses: string[] | undefined) {
  const mons = side.pokemon;
  if (mons) {
    if (hps) {
      hps.forEach((hp: number, index: number) => {
        const pokemon = mons[index];
        if (pokemon) {
          pokemon.hp = hp;
          if (hp <= 0) {
            pokemon.fainted = true;
            pokemon.status = 'fnt';
          } else {
            pokemon.fainted = false;
            if (pokemon.status === 'fnt') pokemon.status = '';
          }
        }
      });
    }
    if (statuses) {
      statuses.forEach((status: string, index: number) => {
        const pokemon = mons[index];
        if (pokemon && !pokemon.fainted) {
          pokemon.status = status ? status.toLowerCase() : '';
        }
      });
    }
  }
}

