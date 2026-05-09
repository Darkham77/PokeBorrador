
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

  interface Window {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_KEY: string;
    __VITE_DEBUG__?: Record<string, (...args: unknown[]) => unknown>;
    drawBattleBackground?: (locationId: string, cycle: string) => void;
  }
}

export {};
