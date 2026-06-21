// fallow-ignore-file security-sink typescript-any
import { Battle, ID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';

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
          formatid: `gen${ACTIVE_GENERATION}customgame` as ID,
          seed: seedArr.join(',') as unknown as `${number},${string}`
        });

        // Configurar los dos jugadores
        currentBattle.setPlayer('p1', { name: p1.name, team: p1.team });
        currentBattle.setPlayer('p2', { name: p2.name, team: p2.team });

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

        const { p1Choice, p2Choice } = payload;

        // Registrar las elecciones de ambos jugadores
        if (p1Choice) currentBattle.choose('p1', p1Choice);
        if (p2Choice) currentBattle.choose('p2', p2Choice);

        const turnLogs = getNewLogs();
        const isOver = currentBattle.ended;
        const winner = currentBattle.winner;

        self.postMessage({ 
          type: 'TURN_SUCCESS', 
          payload: { 
            logs: turnLogs,
            isOver,
            winner
          } 
        });
        break;
      }

      default:
        console.warn(`[Showdown Worker] Evento desconocido: ${type}`);
    }
  } catch (error) {
    const errorMsg = (error as Error).message;
    const errorStack = (error as Error).stack || '';
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
