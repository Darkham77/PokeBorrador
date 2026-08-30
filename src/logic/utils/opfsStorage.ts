
import { logger } from './logger.ts';

/**
 * OPFS Storage Utility - Origin Private File System.
 * High-performance binary storage for save games.
 */

export async function getOpfsFile(fileName: string, options: FileSystemGetFileOptions = { create: true }) {
  const root = await navigator.storage.getDirectory()
  return await (root as FileSystemDirectoryHandle).getFileHandle(fileName, options)
}

export async function writeOpfsFile(fileName: string, data: Uint8Array | string) {
  const handle = await getOpfsFile(fileName, { create: true })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

export async function readOpfsFile(fileName: string): Promise<Uint8Array | null> {
  try {
    const handle = await getOpfsFile(fileName, { create: false })
    const file = await handle.getFile()
    const buffer = await file.arrayBuffer()
    if (buffer.byteLength === 0) {
      return null
    }
    return new Uint8Array(buffer)
  } catch (e) {
    if ((e as Error).name === 'NotFoundError') {
      return null
    }
    logger.warn('OPFS', `Error reading ${fileName}: ${(e as Error).message}`)
    return null
  }
}

export async function deleteOpfsFile(fileName: string) {
  try {
    const root = await navigator.storage.getDirectory()
    await (root as FileSystemDirectoryHandle).removeEntry(fileName)
  } catch (e) {
    logger.warn('OPFS', `Error deleting ${fileName}: ${(e as Error).message}`)
  }
}

export async function listBackups(): Promise<string[]> {
  const root = (await navigator.storage.getDirectory()) as FileSystemDirectoryHandle & { values(): AsyncIterable<{ name: string }> }; // domain-ok
  const backups: string[] = [] // no-domain
  for await (const entry of root.values()) {
    if (entry.name.startsWith('backup_')) {
      backups.push(entry.name)
    }
  }
  return backups
}

/**
 * Invalidates and purges all cached individual user save files and legacy localStorage caches
 * when a fresh database is imported, preventing old save caches from overriding new migrations.
 */
export async function purgeAllCachedSaves(): Promise<void> {
  // 1. Purge OPFS cached save files
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
    try {
      const root = (await navigator.storage.getDirectory()) as FileSystemDirectoryHandle & { values(): AsyncIterable<{ name: string }> }; // domain-ok
      for await (const entry of root.values()) {
        const name = entry.name;
        if (name.startsWith('save_') || name.startsWith('backup_') || name.startsWith('pokevicio_save') || name.endsWith('.gz')) {
          await deleteOpfsFile(name);
        }
      }
      logger.info('OPFS', 'All cached save files purged from OPFS.');
    } catch (err) {
      logger.warn('OPFS', `Error purging cached OPFS saves: ${(err as Error).message}`);
    }
  }

  // 2. Purge localStorage cached saves
  if (typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = []; // no-domain
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('pokemon_local_save_') ||
          key.startsWith('pokevicio_save_') ||
          key.startsWith('daycare_warehouse_eggs_') ||
          key === 'pvs_sandbox_save'
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      logger.info('Storage', `Purged ${keysToRemove.length} cached save entries from localStorage.`);
    } catch (err) {
      logger.warn('Storage', `Error purging localStorage saves: ${(err as Error).message}`);
    }
  }
}
