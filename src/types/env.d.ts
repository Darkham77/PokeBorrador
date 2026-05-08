
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

  // Temporal API (Stage 3 Proposal)
  namespace Temporal {
    class Instant {
      static from(item: string | number | Instant): Instant;
      static fromEpochMilliseconds(ms: number): Instant;
      epochNanoseconds: bigint;
      epochMilliseconds: bigint;
      epochSeconds: bigint;
      add(duration: Duration): Instant;
      toZonedDateTimeISO(tz: string): unknown;
    }
    class Now {
      static instant(): Instant;
    }
    class Duration {
      static from(item: string | Record<string, unknown> | unknown): Duration;
    }
  }

  interface Window {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_KEY: string;
  }
}

export {};
