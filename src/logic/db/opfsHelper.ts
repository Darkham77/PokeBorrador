/**
 * src/logic/db/opfsHelper.ts
 * OPFS (Origin Private File System) binary storage helper.
 * Provides near-native SSD read/write performance for local SQLite database backups.
 */
import { logger } from '../utils/logger.ts';

export function isOPFSSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.storage?.getDirectory);
}

interface FileHandleWritable {
  createWritable: () => Promise<{ write: (d: Uint8Array) => Promise<void>; close: () => Promise<void> }>;
}

export async function saveToOPFS(fileName: string, data: Uint8Array): Promise<boolean> {
  if (!isOPFSSupported()) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(fileName, { create: true });
    
    if ('createWritable' in fileHandle) {
      const writable = await (fileHandle as FileHandleWritable).createWritable();
      await writable.write(data);
      await writable.close();
      logger.debug('OPFS', `Successfully persisted ${data.byteLength} bytes to OPFS file '${fileName}'`);
      return true;
    }
    return false;
  } catch (err) {
    logger.warn('OPFS', `Failed to write to OPFS file '${fileName}': ${(err as Error).message}`);
    return false;
  }
}

export async function loadFromOPFS(fileName: string): Promise<Uint8Array | null> {
  if (!isOPFSSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(fileName, { create: false });
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    logger.debug('OPFS', `Successfully loaded ${bytes.byteLength} bytes from OPFS file '${fileName}'`);
    return bytes;
  } catch (err) {
    logger.debug('OPFS', `OPFS file '${fileName}' not found or unreadable: ${(err as Error).message}`);
    return null;
  }
}
