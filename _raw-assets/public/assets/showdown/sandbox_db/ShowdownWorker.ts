import { Battle } from '@pkmn/sim';

let battle: Battle | null = null;

// Escuchar mensajes del hilo principal
self.addEventListener('message', (event) => {
  const { action, data } = event.data;

  try {
    if (action === 'start') {
      const { playerPokemon, enemyPokemon } = data;

      // 1. Crear la instancia del combate con formato Gen 3 Custom Game
      battle = new Battle({ formatid: 'gen3customgame' as never });

      // 2. Definir los jugadores y sus equipos
      // El formato de equipo en Showdown es una lista de objetos
      battle.setPlayer('p1', {
        name: 'Player',
        team: [
          {
            name: playerPokemon.name,
            species: playerPokemon.id,
            moves: playerPokemon.moves,
            ability: playerPokemon.ability || 'overgrow',
            level: 50,
            evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: 'Serious',
            item: '',
            gender: '',
          },
        ],
      });

      battle.setPlayer('p2', {
        name: 'Enemy IA',
        team: [
          {
            name: enemyPokemon.name,
            species: enemyPokemon.id,
            moves: enemyPokemon.moves,
            ability: enemyPokemon.ability || 'torrent',
            level: 50,
            evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: 'Serious',
            item: '',
            gender: '',
          },
        ],
      });

      // 3. Iniciar la batalla de forma defensiva
      if (!battle.started) {
        battle.start();
      }

      // 4. Recopilar salud inicial real calculada por Showdown
      const playerActive = battle.p1.active[0];
      const enemyActive = battle.p2.active[0];

      // 5. Devolver logs de inicio de combate e información de salud real
      const logs = battle.log.slice();
      self.postMessage({
        action: 'started',
        data: {
          logs,
          playerHP: playerActive ? playerActive.hp : 100,
          playerMaxHP: playerActive ? playerActive.maxhp : 100,
          enemyHP: enemyActive ? enemyActive.hp : 100,
          enemyMaxHP: enemyActive ? enemyActive.maxhp : 100,
        }
      });

    } else if (action === 'choose') {
      if (!battle) {
        throw new Error('El combate no ha sido inicializado.');
      }

      const { playerChoice } = data; // ej: 'move 1' o 'switch 1'

      // 1. Obtener la longitud de los logs antes de procesar el turno
      const oldLogLength = battle.log.length;

      // 2. Registrar elección del jugador
      battle.choose('p1', playerChoice);

      // 3. Registrar elección del enemigo (IA básica: Elige un ataque aleatorio disponible)
      const enemyActive = battle.p2.active[0];
      if (enemyActive && !enemyActive.fainted) {
        // Obtener movimientos válidos
        const moves = enemyActive.moves;
        const randomMoveIndex = Math.floor(Math.random() * moves.length) + 1;
        
        try {
          const success = battle.choose('p2', `move ${randomMoveIndex}`);
          if (!success) {
            // Si falla la elección manual (ej. bloqueado en Dig o Fly)
            battle.choose('p2', 'default');
          }
        } catch (e) {
          battle.choose('p2', 'default');
        }
      }

      // 4. Capturar solo los nuevos logs generados en este turno
      const newLogs = battle.log.slice(oldLogLength);
      
      // 4. Recopilar estado de salud actualizado
      const playerActive = battle.p1.active[0];
      const enemyActiveNew = battle.p2.active[0];

      self.postMessage({
        action: 'turn_resolved',
        data: {
          logs: newLogs,
          playerHP: playerActive ? playerActive.hp : 0,
          playerMaxHP: playerActive ? playerActive.maxhp : 100,
          enemyHP: enemyActiveNew ? enemyActiveNew.hp : 0,
          enemyMaxHP: enemyActiveNew ? enemyActiveNew.maxhp : 100,
          playerFainted: playerActive ? playerActive.fainted : true,
          enemyFainted: enemyActiveNew ? enemyActiveNew.fainted : true,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ action: 'error', data: { message } });
  }
});
