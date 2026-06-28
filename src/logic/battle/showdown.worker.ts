// fallow-ignore-file security-sink
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from './showdownAdapter.ts';

/** Forma estructural mínima del lado interno de @pkmn/sim (no exportado públicamente). */
interface PkmnSimSide {
  active?: Array<{ moveSlots?: Array<{ id: string; pp: number; disabled?: boolean | string } | null> } | null>;
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
        syncSideStates(currentBattle.p1, payload.p1Hps, undefined);
        syncSideStates(currentBattle.p2, payload.p2Hps, undefined);

        if (payload.weather && payload.weather !== 'none') {
          currentBattle.field.setWeather(payload.weather, 'debug' as const);
        }

        // Enviar logs iniciales de inicio de combate
        const initLogs = getNewLogs();
        self.postMessage({ type: 'INIT_SUCCESS', payload: { logs: initLogs } });
        break;
      }

      case 'EXECUTE_TURN': {
        if (!currentBattle) {
          throw new Error('No hay ninguna batalla activa inicializada en el worker.');
        }

        const { p1Choice, p2Choice, p1Hps, p2Hps, p1Statuses, p2Statuses, p1Skip, p2Skip } = payload;

        // Sincronizar HP y Estados antes del turno
        syncSideStates(currentBattle.p1, p1Hps, p1Statuses);
        syncSideStates(currentBattle.p2, p2Hps, p2Statuses);

        // Si se indicó saltar turno (por uso de objeto), aplicar volatile flinch para omitir ataque
        if (p1Skip && currentBattle.p1.active?.[0]) {
          const activeMon = currentBattle.p1.active[0] as unknown as { addVolatile: (status: string) => void };
          if (typeof activeMon?.addVolatile === 'function') {
            activeMon.addVolatile('flinch');
          }
        }
        if (p2Skip && currentBattle.p2.active?.[0]) {
          const activeMon = currentBattle.p2.active[0] as unknown as { addVolatile: (status: string) => void };
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

        if (p1Choice) {
          const resolved1 = resolveChoice(currentBattle.p1, p1Choice);
          const res1 = currentBattle.choose('p1', resolved1);
          console.log(`[Showdown Worker] p1 choose(${resolved1}) res:`, res1);
          if (!res1) {
            throw new Error(`INVALID_CHOICE: Elección inválida para p1: "${p1Choice}" (resuelto a "${resolved1}")`);
          }
        }
        if (p2Choice) {
          const resolved2 = resolveChoice(currentBattle.p2, p2Choice);
          const res2 = currentBattle.choose('p2', resolved2);
          console.log(`[Showdown Worker] p2 choose(${resolved2}) res:`, res2);
          if (!res2) {
            throw new Error(`INVALID_CHOICE: Elección inválida para p2: "${p2Choice}" (resuelto a "${resolved2}")`);
          }
        }

        const turnLogs = getNewLogs();
        const isOver = currentBattle.ended;
        const winner = currentBattle.winner;
        const p1ForceSwitch = !!(currentBattle.p1.activeRequest?.forceSwitch?.[0]);
        const p2ForceSwitch = !!(currentBattle.p2.activeRequest?.forceSwitch?.[0]);

        self.postMessage({ 
          type: 'TURN_SUCCESS', 
          payload: { 
            logs: turnLogs,
            isOver,
            winner,
            p1ForceSwitch,
            p2ForceSwitch
          } 
        });
        break;
      }

      case 'CHECK_TRAPPED': {
        const activeReq = currentBattle?.p1?.activeRequest;
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

