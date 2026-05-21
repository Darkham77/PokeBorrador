import { defineStore } from 'pinia';
import type { ShowdownLocalDB } from './sandbox_db/cloner/extract_logic.ts';
import showdownDB from './sandbox_db/data/showdown_db.json';
import { parseShowdownLog, type ParsedEvent } from './sandbox_db/ShowdownParser.ts';
import gsap from 'gsap';

const typedDB = showdownDB as unknown as ShowdownLocalDB;

export interface SandboxPokemon {
  id: string;
  name: string;
  types: string[];
  spriteUrl: string;
  isAnimated: boolean;
  moves: string[];
  hp?: number;
  maxHp?: number;
  status?: string; // fnt, psn, tox, brn, par, slp, frz
}

export interface SandboxSimPokemon {
  id: string;
  name: string;
  hp?: number;
  maxHp?: number;
  status?: string;
}

interface LocalMove {
  id: string;
  name: string;
  type: string;
  basePower: number;
}

/**
 * Genera movimientos aleatorios para un Pokémon del banco, garantizando al menos un ataque STAB
 */
function getRandomMoves(pokemonTypes: string[], allMoves: LocalMove[]): string[] {
  const moves: string[] = [];
  const primaryType = pokemonTypes[0];
  const sameTypeMoves = allMoves.filter(m => m.type === primaryType && m.basePower > 0);
  
  if (sameTypeMoves.length > 0) {
    const idx = Math.floor(Math.random() * sameTypeMoves.length);
    const chosenMove = sameTypeMoves[idx];
    if (chosenMove) {
      moves.push(chosenMove.id);
    }
  }
  
  while (moves.length < 4) {
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    if (randomMove && !moves.includes(randomMove.id)) {
      moves.push(randomMove.id);
    }
  }
  return moves;
}

export const useShowdownSandboxStore = defineStore('showdownSandbox', {
  state: () => ({
    // Setup UI
    isSetupMode: true,
    playerPokemonId: 'charizard',
    playerMoves: ['flamethrower', 'airslash', 'dragonpulse', 'roost'],
    enemyPokemonId: 'blastoise',
    enemyMoves: ['surf', 'icebeam', 'darkpulse', 'shellsmash'],
    playerShiny: false,
    enemyShiny: false,

    // Battle State
    worker: null as Worker | null,
    playerPokemon: null as SandboxPokemon | null,
    enemyPokemon: null as SandboxPokemon | null,
    playerTeam: [] as SandboxPokemon[],
    enemyTeam: [] as SandboxPokemon[],
    playerSimTeam: [] as SandboxSimPokemon[],
    enemySimTeam: [] as SandboxSimPokemon[],
    activePlayerIndex: 0,
    activeEnemyIndex: 0,
    forcedSwitchRequired: false,
    playerHP: 100,
    playerMaxHP: 100,
    enemyHP: 100,
    enemyMaxHP: 100,
    battleLog: [] as ParsedEvent[],
    currentMessage: '¡Esperando conexión con el motor de Showdown!',
    isAnimating: false,
    gameOver: false,
    winner: null as string | null,
  }),

  actions: {
    /**
     * Genera un equipo completo de 6 Pokémon usando autocompletado competitivo
     */
    generateTeam(leaderId: string, leaderMoves: string[], isShiny: boolean, isPlayer: boolean): SandboxPokemon[] {
      const allPokeIds = Object.keys(typedDB.pokemon);
      const allMoves = Object.values(typedDB.moves);
      const team: SandboxPokemon[] = [];

      // 1. Agregar al líder seleccionado
      const leaderPoke = typedDB.pokemon[leaderId];
      if (leaderPoke && leaderPoke.sprites) {
        team.push({
          id: leaderId,
          name: leaderPoke.name,
          types: leaderPoke.types,
          spriteUrl: isShiny
            ? (isPlayer ? `/showdown/assets/back-shiny/${leaderPoke.sprites.backShiny}` : `/showdown/assets/front-shiny/${leaderPoke.sprites.frontShiny}`)
            : (isPlayer ? `/showdown/assets/back/${leaderPoke.sprites.back}` : `/showdown/assets/front/${leaderPoke.sprites.front}`),
          isAnimated: isShiny
            ? (isPlayer ? leaderPoke.sprites.backShinyAnimated : leaderPoke.sprites.frontShinyAnimated)
            : (isPlayer ? leaderPoke.sprites.backAnimated : leaderPoke.sprites.frontAnimated),
          moves: [...leaderMoves],
          hp: leaderPoke.baseStats.hp,
          maxHp: leaderPoke.baseStats.hp,
          status: '',
        });
      }

      // 2. Autocompletar con otros 5 Pokémon aleatorios
      const availableIds = allPokeIds.filter(id => id !== leaderId);
      
      // Mezclar usando el algoritmo Fisher-Yates
      for (let i = availableIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = availableIds[i];
        if (temp !== undefined) {
          availableIds[i] = availableIds[j]!;
          availableIds[j] = temp;
        }
      }

      for (let k = 0; k < 5; k++) {
        const pokeId = availableIds[k];
        if (!pokeId) continue;
        const poke = typedDB.pokemon[pokeId];
        if (poke && poke.sprites) {
          const moves = getRandomMoves(poke.types, allMoves);
          const spriteUrl = isPlayer
            ? `/showdown/assets/back/${poke.sprites.back}`
            : `/showdown/assets/front/${poke.sprites.front}`;
            
          team.push({
            id: pokeId,
            name: poke.name,
            types: poke.types,
            spriteUrl,
            isAnimated: isPlayer ? poke.sprites.backAnimated : poke.sprites.frontAnimated,
            moves,
            hp: poke.baseStats.hp,
            maxHp: poke.baseStats.hp,
            status: '',
          });
        }
      }

      return team;
    },

    /**
     * Sincroniza de forma segura la salud y estados alterados reportados por el Worker
     * sin destruir las propiedades enriquecidas de la UI (sprites, movimientos, tipos).
     */
    syncTeamStatus(isPlayer: boolean, workerTeam: SandboxPokemon[]) {
      const localTeam = isPlayer ? this.playerTeam : this.enemyTeam;
      for (const workerPoke of workerTeam) {
        const localPoke = localTeam.find(p => p.id === workerPoke.id);
        if (localPoke) {
          localPoke.hp = workerPoke.hp;
          localPoke.maxHp = workerPoke.maxHp;
          localPoke.status = workerPoke.status;
        }
      }
      
      // Actualizar también la referencia del Pokémon activo
      if (isPlayer && this.playerPokemon) {
        const activeLocal = localTeam.find(p => p.id === this.playerPokemon!.id);
        if (activeLocal) {
          this.playerPokemon = { ...activeLocal };
        }
      } else if (!isPlayer && this.enemyPokemon) {
        const activeLocal = localTeam.find(p => p.id === this.enemyPokemon!.id);
        if (activeLocal) {
          this.enemyPokemon = { ...activeLocal };
        }
      }
    },

    /**
     * Inicializa el combate completo de 6vs6 relevos
     */
    async startMockBattle() {
      this.isSetupMode = false;
      this.gameOver = false;
      this.winner = '';
      this.battleLog = [];
      this.forcedSwitchRequired = false;
      this.currentMessage = '¡El combate está por comenzar!';
      this.playerSimTeam = [];
      this.enemySimTeam = [];

      // 1. Generar los equipos completos de 6 miembros
      this.playerTeam = this.generateTeam(this.playerPokemonId, this.playerMoves, this.playerShiny, true);
      this.enemyTeam = this.generateTeam(this.enemyPokemonId, this.enemyMoves, this.enemyShiny, false);

      // Asignar líderes activos
      this.activePlayerIndex = 0;
      this.activeEnemyIndex = 0;
      this.playerPokemon = this.playerTeam[0] || null;
      this.enemyPokemon = this.enemyTeam[0] || null;

      // Reproducir gritos de entrada de manera secuencial y determinista usando GSAP
      const entranceTimeline = gsap.timeline();
      entranceTimeline.to({}, {
        duration: 0.1,
        onStart: () => {
          this.playCry(this.playerPokemonId);
        }
      }).to({}, {
        duration: 0.8,
        onStart: () => {
          this.playCry(this.enemyPokemonId);
        }
      });

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
        new URL('./sandbox_db/ShowdownWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // 4. Escuchar eventos del Worker
      this.worker.addEventListener('message', async (event) => {
        const { action, data } = event.data;

        if (action === 'started') {
          this.playerSimTeam = data.playerTeam || [];
          this.enemySimTeam = data.enemyTeam || [];
          // Sincronizar equipos de 6 y HP reales del líder
          this.syncTeamStatus(true, data.playerTeam);
          this.syncTeamStatus(false, data.enemyTeam);
          this.playerHP = data.playerHP;
          this.playerMaxHP = data.playerMaxHP;
          this.enemyHP = data.enemyHP;
          this.enemyMaxHP = data.enemyMaxHP;

          const events = parseShowdownLog(data.logs);
          await this.executeAnimationQueue(events);
        } else if (action === 'turn_resolved') {
          const events = parseShowdownLog(data.logs);
          await this.executeAnimationQueue(events);

          this.playerSimTeam = data.playerTeam || [];
          this.enemySimTeam = data.enemyTeam || [];
          // Sincronizar estadísticas de los equipos después de animar
          this.syncTeamStatus(true, data.playerTeam);
          this.syncTeamStatus(false, data.enemyTeam);
          this.playerHP = data.playerHP;
          this.playerMaxHP = data.playerMaxHP;
          this.enemyHP = data.enemyHP;
          this.enemyMaxHP = data.enemyMaxHP;

          // Comprobar condiciones de fin de combate o relevo obligatorio
          const playerActiveFainted = data.playerFainted;
          const enemyActiveFainted = data.enemyFainted;

          if (playerActiveFainted) {
            const hasHealthy = this.playerTeam.some(p => (p.hp ?? 0) > 0 && p.status !== 'fnt');
            if (hasHealthy) {
              this.forcedSwitchRequired = true;
              this.currentMessage = '¡Tu Pokémon activo se ha debilitado! ¡Debes elegir un relevo obligatorio!';
            } else {
              this.gameOver = true;
              this.winner = 'IA Rival';
              this.currentMessage = '¡Todo tu equipo ha sido debilitado! ¡Has perdido el combate!';
            }
          } else if (enemyActiveFainted) {
            const hasHealthy = this.enemyTeam.some(p => (p.hp ?? 0) > 0 && p.status !== 'fnt');
            if (!hasHealthy) {
              this.gameOver = true;
              this.winner = 'Jugador';
              this.currentMessage = '¡Has debilitado a todo el equipo rival! ¡Felicidades, ganaste!';
            }
          }
        } else if (action === 'error') {
          this.currentMessage = `Error de simulación: ${data.message}`;
          this.isAnimating = false;
        }
      });

      // 5. Iniciar batalla en el worker des-proxiada
      this.worker.postMessage({
        action: 'start',
        data: {
          playerTeam: JSON.parse(JSON.stringify(this.playerTeam)),
          enemyTeam: JSON.parse(JSON.stringify(this.enemyTeam)),
        },
      });
    },

    /**
     * Reproduce el grito oficial del Pokémon usando HTML5 Audio
     */
    playCry(pokemonId: string) {
      const pokemon = typedDB.pokemon[pokemonId];
      if (pokemon && pokemon.sprites && pokemon.sprites.cry) {
        if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
          const audio = new Audio(`/showdown/assets/cries/${pokemon.sprites.cry}`);
          audio.volume = 0.4;
          audio.play().catch(err => {
            console.warn('El audio no pudo reproducirse (bloqueo de autoplay):', err);
          });
        }
      }
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
     * Envía la elección de relevo al Web Worker
     */
    chooseSwitch(targetIndex: number) {
      if (this.isAnimating || this.gameOver || !this.worker) return;

      this.isAnimating = true;
      this.forcedSwitchRequired = false;

      // Mapear el targetIndex (de la UI estática playerTeam) al simIndex (de la simulación dinámica playerSimTeam)
      const clickedPoke = this.playerTeam[targetIndex];
      let simIndex = targetIndex;
      if (clickedPoke && this.playerSimTeam.length > 0) {
        const foundIndex = this.playerSimTeam.findIndex(p => p.id === clickedPoke.id);
        if (foundIndex !== -1) {
          simIndex = foundIndex;
        }
      }

      this.worker.postMessage({
        action: 'choose',
        data: {
          playerChoice: `switch ${simIndex + 1}`,
        },
      });
    },

    /**
     * Orquestador secuencial de animaciones
     */
    async executeAnimationQueue(events: ParsedEvent[]) {
      for (const event of events) {
        this.battleLog.push(event);
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

        if (event.type === 'move' && data) {
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
          const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
          const hpBarId = data.isPlayer ? '#player-hp' : '#enemy-hp';
          const currentHP = data.currentHP ?? 0;
          const maxHP = data.maxHP ?? 100;
          const hpPct = (currentHP / maxHP) * 100;

          tl.to(spriteId, {
            x: '+=6',
            filter: 'brightness(1.8) sepia(1) saturate(1000%) hue-rotate(-50deg)',
            duration: 0.05,
            yoyo: true,
            repeat: 5,
          })
          .to(spriteId, {
            x: 0,
            filter: 'none',
            duration: 0.05,
          })
          .to(hpBarId, {
            width: `${hpPct}%`,
            duration: 0.4,
            ease: 'power1.out',
            onStart: () => {
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
          const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
          const hpBarId = data.isPlayer ? '#player-hp' : '#enemy-hp';
          const currentHP = data.currentHP ?? 0;
          const maxHP = data.maxHP ?? 100;
          const hpPct = (currentHP / maxHP) * 100;

          tl.to(spriteId, {
            filter: 'brightness(1.5) saturate(1000%) hue-rotate(90deg)',
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
          const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
          
          tl.to(spriteId, {
            y: '+=80',
            opacity: 0,
            duration: 0.5,
            ease: 'power1.in',
            onStart: () => {
              const pokemonId = data.isPlayer ? this.playerPokemon?.id : this.enemyPokemon?.id;
              if (pokemonId) {
                this.playCry(pokemonId);
              }
            }
          });
        } else if (event.type === 'switch' && data) {
          const isPlayer = data.isPlayer;
          const spriteId = isPlayer ? '#player-sprite' : '#enemy-sprite';

          tl.to(spriteId, {
            x: isPlayer ? -150 : 150,
            y: 50,
            scale: 0.2,
            opacity: 0,
            duration: 0.4,
            ease: 'back.in(1.7)',
            onComplete: () => {
              const incomingSpeciesId = data.moveId || '';
              const team = isPlayer ? this.playerTeam : this.enemyTeam;
              const idx = team.findIndex(p => p.id === incomingSpeciesId);
              
              if (idx !== -1) {
                const incomingPoke = team[idx];
                if (incomingPoke !== undefined) {
                  if (isPlayer) {
                    this.activePlayerIndex = idx;
                    this.playerPokemon = incomingPoke;
                    this.playerHP = data.currentHP ?? this.playerHP;
                    this.playerMaxHP = data.maxHP ?? this.playerMaxHP;
                  } else {
                    this.activeEnemyIndex = idx;
                    this.enemyPokemon = incomingPoke;
                    this.enemyHP = data.currentHP ?? this.enemyHP;
                    this.enemyMaxHP = data.maxHP ?? this.enemyMaxHP;
                  }
                }
              }
              
              if (incomingSpeciesId) {
                this.playCry(incomingSpeciesId);
              }
            }
          })
          .set(spriteId, {
            x: isPlayer ? 150 : -150,
            y: -50,
            scale: 0.1,
            opacity: 0
          })
          .to(spriteId, {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: 'back.out(1.2)',
            clearProps: 'transform,opacity'
          });
        } else if (event.type === 'ability') {
          tl.to({}, { duration: 0.1 })
            .to({}, { duration: 1.0 });
        } else if (event.type === 'miss' || event.type === 'status' || event.type === 'weather' || event.type === 'info') {
          tl.to({}, { duration: 0.9 });
        } else {
          tl.to({}, { duration: 1.0 });
        }
      });
    },
  },
});
