import { defineStore } from 'pinia';
import type { ShowdownLocalDB } from '../game/battle/showdown/sandbox_db/cloner/extract_logic.ts';
import showdownDB from '../game/battle/showdown/sandbox_db/data/showdown_db.json';
import { parseShowdownLog, type ParsedEvent } from '../game/battle/showdown/sandbox_db/ShowdownParser.ts';
import gsap from 'gsap';

const typedDB = showdownDB as unknown as ShowdownLocalDB;

export interface SandboxPokemon {
  id: string;
  name: string;
  types: string[];
  spriteUrl: string;
  isAnimated: boolean;
  moves: string[];
}

export const useShowdownSandboxStore = defineStore('showdownSandbox', {
  state: () => ({
    isSetupMode: true,
    playerPokemonId: 'charizard',
    playerMoves: ['flamethrower', 'slash', 'wingattack', 'earthquake'],
    enemyPokemonId: 'blastoise',
    enemyMoves: ['surf', 'bite', 'icebeam', 'rapidspin'],
    worker: null as Worker | null,
    playerPokemon: null as SandboxPokemon | null,
    enemyPokemon: null as SandboxPokemon | null,
    playerHP: 100,
    playerMaxHP: 100,
    enemyHP: 100,
    enemyMaxHP: 100,
    currentMessage: '¡Preparándote para el combate!',
    battleLog: [] as string[],
    isAnimating: false,
    gameOver: false,
    winner: '',
  }),

  actions: {
    /**
     * Inicializa el combate de pruebas aislado usando las selecciones del setup
     */
    async startMockBattle() {
      this.isSetupMode = false;
      this.gameOver = false;
      this.winner = '';
      this.battleLog = [];
      this.currentMessage = '¡El combate está por comenzar!';

      // 1. Obtener datos locales Gen 3 de los Pokémon seleccionados
      const playerPoke = typedDB.pokemon[this.playerPokemonId];
      const enemyPoke = typedDB.pokemon[this.enemyPokemonId];

      if (!playerPoke || !enemyPoke || !playerPoke.sprites || !enemyPoke.sprites) {
        this.currentMessage = 'Error: No se encontraron los datos del Pokémon o faltan los sprites.';
        return;
      }

      this.playerPokemon = {
        id: this.playerPokemonId,
        name: playerPoke.name,
        types: playerPoke.types,
        spriteUrl: `/showdown/assets/back/${playerPoke.sprites.back}`,
        isAnimated: playerPoke.sprites.backAnimated,
        moves: [...this.playerMoves],
      };

      this.enemyPokemon = {
        id: this.enemyPokemonId,
        name: enemyPoke.name,
        types: enemyPoke.types,
        spriteUrl: `/showdown/assets/front/${enemyPoke.sprites.front}`,
        isAnimated: enemyPoke.sprites.frontAnimated,
        moves: [...this.enemyMoves],
      };

      // Inicializar valores de salud
      this.playerHP = 100;
      this.playerMaxHP = 100;
      this.enemyHP = 100;
      this.enemyMaxHP = 100;

      // 2. Destruir worker anterior si existe
      if (this.worker) {
        this.worker.terminate();
      }

      // 3. Crear Web Worker dinámico
      this.worker = new Worker(
        new URL('../game/battle/showdown/sandbox_db/ShowdownWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // 4. Escuchar eventos del Worker
      this.worker.addEventListener('message', async (event) => {
        const { action, data } = event.data;

        if (action === 'started') {
          // Sincronizar salud inicial real calculada por Showdown
          this.playerHP = data.playerHP;
          this.playerMaxHP = data.playerMaxHP;
          this.enemyHP = data.enemyHP;
          this.enemyMaxHP = data.enemyMaxHP;

          const events = parseShowdownLog(data.logs);
          await this.executeAnimationQueue(events);
        } else if (action === 'turn_resolved') {
          const events = parseShowdownLog(data.logs);
          
          // Ejecutar animaciones una por una
          await this.executeAnimationQueue(events);

          // Sincronizar salud final al resolver el turno (por si acaso y para consistencia)
          this.playerHP = data.playerHP;
          this.playerMaxHP = data.playerMaxHP;
          this.enemyHP = data.enemyHP;
          this.enemyMaxHP = data.enemyMaxHP;

          if (data.playerFainted) {
            this.gameOver = true;
            this.winner = 'Blastoise Enemigo';
            this.currentMessage = '¡Tu Charizard se ha debilitado! ¡Has perdido el combate!';
          } else if (data.enemyFainted) {
            this.gameOver = true;
            this.winner = 'Tu Charizard';
            this.currentMessage = '¡El Blastoise enemigo se debilitó! ¡Has ganado!';
          }
        } else if (action === 'error') {
          this.currentMessage = `Error de simulación: ${data.message}`;
          this.isAnimating = false;
        }
      });

      // 5. Iniciar batalla en el worker (desenvolvemos los proxies reactivos de Vue 3 para evitar DataCloneError)
      this.worker.postMessage({
        action: 'start',
        data: {
          playerPokemon: JSON.parse(JSON.stringify(this.playerPokemon)),
          enemyPokemon: JSON.parse(JSON.stringify(this.enemyPokemon)),
        },
      });
    },

    /**
     * Envía la elección del movimiento del jugador al Web Worker
     */
    chooseMove(moveIndex: number) {
      if (this.isAnimating || this.gameOver || !this.worker) return;

      this.isAnimating = true;
      this.worker.postMessage({
        action: 'choose',
        data: {
          playerChoice: `move ${moveIndex + 1}`,
        },
      });
    },

    /**
     * Orquestador secuencial determinista usando GSAP Timelines y Promesas.
     * CUMPLE CON EL MANDATO DE "ZERO-TIMER POLICY" del archivo AGENTS.md.
     */
    async executeAnimationQueue(events: ParsedEvent[]) {
      for (const event of events) {
        // Registrar en el log global histórico
        this.battleLog.push(event.text);
        
        // Ejecutar animación y esperar su resolución antes del siguiente evento
        await this.animateEvent(event);
      }
      this.isAnimating = false;
    },

    /**
     * Ejecuta animaciones y desplazamientos físicos mediante GSAP.
     * Devuelve una Promesa para garantizar la secuencialidad perfecta.
     */
    animateEvent(event: ParsedEvent): Promise<void> {
      return new Promise<void>((resolve) => {
        this.currentMessage = event.text;

        const tl = gsap.timeline({ onComplete: () => resolve() });
        const data = event.data;

        // Animación según tipo de evento
        if (event.type === 'move' && data) {
          // Lunge (embestida) física del atacante
          const spriteId = data.isPlayerAttacking ? '#player-sprite' : '#enemy-sprite';
          const direction = data.isPlayerAttacking ? 25 : -25;

          tl.to(spriteId, {
            x: `+=${direction}`,
            y: `-=${direction / 2}`,
            duration: 0.15,
            ease: 'power1.out',
          })
          .to(spriteId, {
            x: 0,
            y: 0,
            duration: 0.25,
            ease: 'power2.inOut',
          });
        } else if (event.type === 'damage' && data) {
          // Parpadeo y sacudida de daño en el objetivo
          const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
          const hpBarId = data.isPlayer ? '#player-hp' : '#enemy-hp';
          const currentHP = data.currentHP ?? 0;
          const maxHP = data.maxHP ?? 100;
          const hpPct = (currentHP / maxHP) * 100;

          // Parpadeo rojo y vibración física
          tl.to(spriteId, {
            x: '+=6',
            filter: 'brightness(1.8) sepia(1) saturate(1000%) hue-rotate(-50deg)', // Tonalidad roja de golpe
            duration: 0.05,
            yoyo: true,
            repeat: 5,
          })
          .to(spriteId, {
            x: 0,
            filter: 'none',
            duration: 0.05,
          })
          // Animar barra de vida en paralelo al parpadeo
          .to(hpBarId, {
            width: `${hpPct}%`,
            duration: 0.4,
            ease: 'power1.out',
            onStart: () => {
              // Sincronizar el HP numérico de forma reactiva al iniciar la animación
              if (data.isPlayer) {
                this.playerHP = currentHP;
                this.playerMaxHP = maxHP;
              } else {
                this.enemyHP = currentHP;
                this.enemyMaxHP = maxHP;
              }
            }
          }, '<');
        } else if (event.type === 'heal' && data) {
          // Destello verde de curación
          const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
          const hpBarId = data.isPlayer ? '#player-hp' : '#enemy-hp';
          const currentHP = data.currentHP ?? 0;
          const maxHP = data.maxHP ?? 100;
          const hpPct = (currentHP / maxHP) * 100;

          tl.to(spriteId, {
            filter: 'brightness(1.5) saturate(1000%) hue-rotate(90deg)', // Destello verde
            duration: 0.3,
            yoyo: true,
            repeat: 1,
          })
          .to(spriteId, {
            filter: 'none',
            duration: 0.1,
          })
          .to(hpBarId, {
            width: `${hpPct}%`,
            duration: 0.4,
            onStart: () => {
              // Sincronizar el HP numérico de forma reactiva al iniciar la animación de curación
              if (data.isPlayer) {
                this.playerHP = currentHP;
                this.playerMaxHP = maxHP;
              } else {
                this.enemyHP = currentHP;
                this.enemyMaxHP = maxHP;
              }
            }
          }, '<');
        } else if (event.type === 'faint' && data) {
          // Caída del sprite (desvanecimiento hacia abajo)
          const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
          
          tl.to(spriteId, {
            y: '+=80',
            opacity: 0,
            duration: 0.5,
            ease: 'power1.in',
          });
        } else {
          // Delay de lectura determinista usando el timeline para textos estáticos (ej: "¡Es muy eficaz!")
          tl.delay(0.8);
        }
      });
    },
  },
});
