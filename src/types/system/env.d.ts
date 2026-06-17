/**
 * Global Type Declarations for Poke Vicio
 * Adds missing modern APIs to TypeScript context.
 */

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

  interface Window {
    __VITE_DEBUG__?: Record<string, (...args: unknown[]) => unknown>;
    drawBattleBackground?: (locationId: string, cycle: string) => void;
    pwa_app_mounted?: boolean;
  }
}

export {};
