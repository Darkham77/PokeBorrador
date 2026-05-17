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

  // Temporal API (Stage 3 Proposal) is handled by @js-temporal/polyfill
  const Temporal: typeof import('@js-temporal/polyfill').Temporal;
  namespace Temporal {
    export type Instant = import('@js-temporal/polyfill').Temporal.Instant;
    export type ZonedDateTime = import('@js-temporal/polyfill').Temporal.ZonedDateTime;
    export type Duration = import('@js-temporal/polyfill').Temporal.Duration;
    export type PlainDate = import('@js-temporal/polyfill').Temporal.PlainDate;
    export type PlainTime = import('@js-temporal/polyfill').Temporal.PlainTime;
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
  }
}

export {};
