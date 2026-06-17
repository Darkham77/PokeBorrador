import { defineStore } from 'pinia';
import type { ShowdownLocalDB } from '../sandbox_db/cloner/extract_logic.ts';
import showdownDB from '../sandbox_db/data/showdown_db_es.json';
import { parseShowdownLog, type ParsedEvent } from '../sandbox_db/ShowdownParser.ts';
import { executeAnimationQueue } from '../logic/showdownAnimations.ts';
import gsap from 'gsap';
import { NATURES } from '../../src/data/battle/natures.ts';

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
  num?: number;
  baseStoredStats?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  storedStats?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  boosts?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    accuracy: number;
    evasion: number;
  } | null;
  statusState?: {
    id: string;
    time: number;
  } | null;
  moveSlots?: Array<{
    id: string;
    pp: number;
    maxpp: number;
    disabled?: boolean | string;
  }> | null;
  ability?: string;
  nature?: string;
  volatiles?: Record<string, { id: string; duration?: number; time?: number; layers?: number; hp?: number; source?: string }> | null;
}

export interface SandboxSimPokemon {
  id: string;
  name: string;
  hp?: number;
  maxHp?: number;
  status?: string;
  baseStoredStats?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  storedStats?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  boosts?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    accuracy: number;
    evasion: number;
  } | null;
  statusState?: {
    id: string;
    time: number;
  } | null;
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
    weather: { weather: '', weatherDuration: 0 } as { weather: string; weatherDuration: number },
    playerSideConditions: [] as Array<{ id: string; duration?: number; layers?: number }>,
    enemySideConditions: [] as Array<{ id: string; duration?: number; layers?: number }>,
  }),

  actions: {
    /**
     * Establece el líder Pokémon del jugador y auto-completa sus movimientos según su tipo elemental
     */
    setPlayerLeader(pokemonId: string) {
      this.playerPokemonId = pokemonId;
      this.playCry(pokemonId);
      const poke = typedDB.pokemon[pokemonId];
      if (poke) {
        const allLocalMoves = Object.values(typedDB.moves) as LocalMove[];
        this.playerMoves = getRandomMoves(poke.types, allLocalMoves);
      }
    },

    /**
     * Establece el líder Pokémon del rival y auto-completa sus movimientos según su tipo elemental
     */
    setEnemyLeader(pokemonId: string) {
      this.enemyPokemonId = pokemonId;
      this.playCry(pokemonId);
      const poke = typedDB.pokemon[pokemonId];
      if (poke) {
        const allLocalMoves = Object.values(typedDB.moves) as LocalMove[];
        this.enemyMoves = getRandomMoves(poke.types, allLocalMoves);
      }
    },

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
        // SANITIZE LEADER MOVES: Filtrar vacíos, nulos, no válidos o duplicados
        let sanitizedMoves = leaderMoves
          .map(m => m ? m.trim().toLowerCase() : '')
          .filter(m => m !== '' && typedDB.moves[m]);
        
        sanitizedMoves = [...new Set(sanitizedMoves)];
        
        // Autocompletar hasta tener exactamente 4 movimientos válidos
        if (sanitizedMoves.length < 4) {
          const allLocalMoves = Object.values(typedDB.moves) as LocalMove[];
          const extraMoves = getRandomMoves(leaderPoke.types, allLocalMoves);
          for (const moveId of extraMoves) {
            if (!sanitizedMoves.includes(moveId) && sanitizedMoves.length < 4) {
              sanitizedMoves.push(moveId);
            }
          }
        }

        const leaderAbility = leaderPoke.abilities && leaderPoke.abilities.length > 0
          ? leaderPoke.abilities[0]
          : 'Espesura';
        const leaderNature = NATURES[Math.floor(Math.random() * NATURES.length)] || 'Serio';

        team.push({
          id: leaderId,
          name: leaderPoke.name,
          types: leaderPoke.types,
          spriteUrl: isShiny
            ? (isPlayer ? `showdown/assets/back-shiny/${leaderPoke.sprites.backShiny}` : `showdown/assets/front-shiny/${leaderPoke.sprites.frontShiny}`)
            : (isPlayer ? `showdown/assets/back/${leaderPoke.sprites.back}` : `showdown/assets/front/${leaderPoke.sprites.front}`),
          isAnimated: isShiny
            ? (isPlayer ? leaderPoke.sprites.backShinyAnimated : leaderPoke.sprites.frontShinyAnimated)
            : (isPlayer ? leaderPoke.sprites.backAnimated : leaderPoke.sprites.frontAnimated),
          moves: sanitizedMoves,
          hp: leaderPoke.baseStats.hp,
          maxHp: leaderPoke.baseStats.hp,
          status: '',
          num: leaderPoke.num,
          ability: leaderAbility,
          nature: leaderNature,
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
            ? `showdown/assets/back/${poke.sprites.back}`
            : `showdown/assets/front/${poke.sprites.front}`;
            
          const benchAbility = poke.abilities && poke.abilities.length > 0
            ? poke.abilities[Math.floor(Math.random() * poke.abilities.length)]
            : 'Espesura';
          const benchNature = NATURES[Math.floor(Math.random() * NATURES.length)] || 'Serio';

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
            num: poke.num,
            ability: benchAbility,
            nature: benchNature,
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
          localPoke.baseStoredStats = workerPoke.baseStoredStats;
          localPoke.storedStats = workerPoke.storedStats;
          localPoke.boosts = workerPoke.boosts;
          localPoke.statusState = workerPoke.statusState;
          localPoke.moveSlots = workerPoke.moveSlots;
          if (workerPoke.ability) localPoke.ability = workerPoke.ability;
          if (workerPoke.nature) localPoke.nature = workerPoke.nature;
          localPoke.volatiles = workerPoke.volatiles;
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
          this.weather = data.fieldState || { weather: '', weatherDuration: 0 };
          this.playerSideConditions = data.playerSideConditions || [];
          this.enemySideConditions = data.enemySideConditions || [];
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
          this.weather = data.fieldState || { weather: '', weatherDuration: 0 };
          this.playerSideConditions = data.playerSideConditions || [];
          this.enemySideConditions = data.enemySideConditions || [];
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
          const audio = new Audio(`showdown/assets/cries/${pokemon.sprites.cry}`);
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
     * Orquestador secuencial de animaciones delegadas
     */
    async executeAnimationQueue(events: ParsedEvent[]) {
      await executeAnimationQueue(this, events);
      this.isAnimating = false;
    },
  },
});
