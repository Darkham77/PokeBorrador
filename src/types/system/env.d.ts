import type { ShowdownPlayerRequest } from '../battle/battle.ts';

declare global {
  // FileSystem API (OPFS)
  interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
  }
  interface FileSystemFileHandle extends FileSystemHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
    getFile(): Promise<File>;
  }
  interface FileSystemWritableFileStream extends WritableStream {
    write(data: unknown): Promise<void>;
    close(): Promise<void>;
  }
  interface StorageManager {
    getDirectory(): Promise<FileSystemDirectoryHandle>;
  }

  // Compression API
  class CompressionStream extends TransformStream<Uint8Array, Uint8Array> {
    constructor(format: 'gzip' | 'deflate' | 'deflate-raw');
  }
  class DecompressionStream extends TransformStream<Uint8Array, Uint8Array> {
    constructor(format: 'gzip' | 'deflate' | 'deflate-raw');
  }

  // Temporal API (Stage 3 Proposal / Native in modern environments)
  namespace Temporal {
    export interface Instant {
      epochMilliseconds: number;
      toString(): string;
    }
    export interface ZonedDateTime {
      epochMilliseconds: number;
      toInstant(): Instant;
      toString(): string;
    }
    export interface Duration {
      total(options: { unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' }): number;
      toString(): string;
    }
    export interface PlainDate {
      toString(): string;
    }
    export interface PlainTime {
      toString(): string;
    }
    export class Now {
      static instant(): Instant;
    }
  }

  // Node 26+ / ESNext Collection Methods (V8 14.6)
  interface Map<K, V> {
    getOrInsertComputed(key: K, callback: (key: K) => V): V;
    getOrInsert(key: K, defaultValue: V): V;
  }

  // Node 26+ / Iterator Sequencing (V8 14.6)
  interface IteratorObject<T> extends Iterator<T> {
    [Symbol.iterator](): IteratorObject<T>;
    drop(limit: number): IteratorObject<T>;
    take(limit: number): IteratorObject<T>;
    map<U>(callback: (value: T) => U): IteratorObject<U>;
    filter(callback: (value: T) => boolean): IteratorObject<T>;
  }

  var Iterator: {
    from<T>(iterable: Iterable<T>): IteratorObject<T>;
    concat<T>(...iterables: Iterable<T>[]): IteratorObject<T>;
  };

  interface DebugPokemon {
    uid?: string; // domain-ok
    name?: string; // domain-ok
    hp?: number;
    maxHp?: number;
    status?: string; // domain-ok
    nickname?: string; // domain-ok
    moves?: Array<{ id: string; pp?: number; maxpp?: number } | null>;
    volatileCounters?: Record<string, unknown> | null; // open-record
  }

  interface BattleLogEntry {
    side: 'player' | 'enemy';
    msg: string; // text-ok
  }

  interface DebugGameStore {
    state?: {
      team?: Array<DebugPokemon | null>;
    } | null;
  }

  interface DebugPinia {
    _s?: Map<string, DebugGameStore>;
  }

  interface DebugStore {
    currentFsmState?: string; // domain-ok
    currentSubState?: string; // domain-ok
    isProcessing?: boolean;
    isIntroAnimating?: boolean;
    battleLogs?: BattleLogEntry[];
    player?: DebugPokemon | null;
    enemy?: DebugPokemon | null;
    _p?: DebugPinia;
    fsm?: {
      currentState?: { value?: string };
      currentSubState?: { value?: string };
    };
    state?: {
      over?: boolean;
      turnCount?: number;
      playerRequest?: ShowdownPlayerRequest;
      enemyRequest?: ShowdownPlayerRequest;
      player?: DebugPokemon | null;
      enemy?: DebugPokemon | null;
      playerTeam?: Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string | null }> | null;
      enemyTeam?: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted?: boolean }> | null;
      p1SlotOrder?: string[]; // domain-ok
      activeBattle?: {
        player?: DebugPokemon | null;
        enemy?: DebugPokemon | null;
      } | null;
    } | null;
  }

  interface Window {
    __VITE_DEBUG__?: {
      /** Semilla RNG inyectada por el E2E para combates deterministas */
      battleSeed?: number[];
      /** Cola de choices del enemigo consumida por el motor de combate en tests */
      enemyChoicesQueue?: string[]; // domain-ok
      mockEnemyChoices?: string[]; // domain-ok
      enemyChoiceIndex?: number;
      cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>;
      mockChoices?: string[]; // domain-ok
      /** Genera un Pokémon de debug vía encuentro */
      spawnEncounter?: (config: unknown) => Promise<void>;
      /** Crea un Pokémon de debug directamente en el equipo */
      createPokemon?: (config: unknown) => Promise<void>;
      getSimulatorState?: () => Promise<{ p1: unknown[]; p2: unknown[] }>;
      nextEnemyChoice?: string; // domain-ok
      getGameStore?: () => { state: { team: unknown[]; money?: number } } & Record<string, unknown>; // open-record
      p1ChoiceIdx?: number;
      p2ChoiceIdx?: number;
      isDeterministicSimulation?: boolean;
      isScriptedReplayMode?: boolean;
      playerChoices?: string[]; // domain-ok
      executeScriptedAction?: () => Promise<boolean>;
      waitForBattleReady?: () => Promise<{ subState: string; p1ChoiceIdx: number; p2ChoiceIdx: number; over: boolean }>;
      getScriptedReplayReadiness?: () => { subState: string; p1ChoiceIdx: number; p2ChoiceIdx: number; over: boolean; isReady: boolean };
      certifiedReplayIntroDiagnostics?: { isIntroInProgress: boolean; isWildEntryAnimation: boolean; wildRevealActive: boolean; isEmerging: boolean; upcomingIsEmerging: boolean; trainerAnimState: 'entering' | 'retreating' | 'idle' | null; isCaptureSequenceActive: boolean };
      useItemInBattle?: (itemId: string, targetUid: string) => void;
      healAll?: () => void;
      forceFlee?: () => void | Promise<void>;
      forceEncounterType?: string; // domain-ok
      /** Comandos y utilidades de debug registradas en runtime */
      [key: string]: unknown; // open-record
    };
    __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
    drawBattleBackground?: (locationId: string, cycle: string) => void;
    pwa_app_mounted?: boolean;
    initSqlJs?: (options?: unknown) => Promise<unknown>;
    __GTS_SIMULATION__?: boolean;
    __E2E__?: boolean;
    __showdownWorker__?: Worker;
    __SIMULATOR_BATTLE__?: { p1?: { active?: Array<{ hp?: number }> }; p2?: { active?: Array<{ hp?: number }> } };
    __VITE_DEBUG_BREEDING_STORE_RESOLVER__?: () => unknown;
    showGameError?: (error: Error | string, context?: Record<string, unknown>) => void; // text-ok // string-ok // open-record
    __WEATHER_SESSION_SEED__?: number;
  }
}

export {};
