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
    write(data: BufferSource | Blob | string | unknown): Promise<void>;
    close(): Promise<void>;
  }
  interface StorageManager {
    getDirectory(): Promise<FileSystemDirectoryHandle | unknown>;
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
    uid?: string;
    name?: string;
    hp?: number;
    maxHp?: number;
    status?: string;
    nickname?: string;
    moves?: unknown[];
    volatileCounters?: Record<string, unknown> | null;
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
    currentFsmState?: string;
    currentSubState?: string;
    isProcessing?: boolean;
    isIntroAnimating?: boolean;
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
      enemyTeam?: Array<DebugPokemon | null>;
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
      enemyChoicesQueue?: string[];
      mockEnemyChoices?: string[];
      enemyChoiceIndex?: number;
      cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>;
      mockChoices?: string[];
      /** Genera un Pokémon de debug vía encuentro */
      spawnEncounter?: (config: unknown) => Promise<void>;
      /** Crea un Pokémon de debug directamente en el equipo */
      createPokemon?: (config: unknown) => Promise<void>;
      getSimulatorState?: () => Promise<{ p1: unknown[]; p2: unknown[] }>;
      nextEnemyChoice?: string;
      getGameStore?: () => { gs?: unknown } & Record<string, unknown>;
      p1ChoiceIdx?: number;
      p2ChoiceIdx?: number;
      isE2eSimulation?: boolean;
      /** Comandos y utilidades de debug registradas en runtime */
      [key: string]: unknown;
    };
    __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
    drawBattleBackground?: (locationId: string, cycle: string) => void;
    pwa_app_mounted?: boolean;
  }
}

export {};
