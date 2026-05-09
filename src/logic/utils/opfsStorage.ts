
import { logger } from './logger.ts';

/**
 * OPFS Storage Utility - Origin Private File System.
 * High-performance binary storage for save games.
 */

export async function getOpfsFile(fileName: string) {
  const root = await navigator.storage.getDirectory()
  return await (root as FileSystemDirectoryHandle).getFileHandle(fileName, { create: true })
}

export async function writeOpfsFile(fileName: string, data: Uint8Array | string) {
  const handle = await getOpfsFile(fileName)
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

export async function readOpfsFile(fileName: string): Promise<Uint8Array | null> {
  try {
    const handle = await getOpfsFile(fileName)
    const file = await handle.getFile()
    const buffer = await file.arrayBuffer()
    return new Uint8Array(buffer)
  } catch (e) {
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
  const root = await navigator.storage.getDirectory() as unknown as AsyncIterable<FileSystemHandle> & { values(): AsyncIterable<FileSystemHandle & { name: string }> };
  const backups: string[] = []
  for await (const entry of root.values()) {
    if (entry.name.startsWith('backup_')) {
      backups.push(entry.name)
    }
  }
  return backups
}
