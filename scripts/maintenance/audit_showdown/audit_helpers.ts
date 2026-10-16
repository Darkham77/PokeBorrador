import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function getFilesRecursively(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (entry.isFile()) {
      results.push(join(entry.parentPath ?? dir, entry.name));
    }
  }
  return results;
}

export function safeScanDirectoryFiles(
  targetDir: string,
  extensions: string[] = ['.ts', '.vue']
): string[] {
  if (!existsSync(targetDir)) return [];
  return getFilesRecursively(targetDir).filter((f) => extensions.some((ext) => f.endsWith(ext)));
}
