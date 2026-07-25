import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!existsSync(dir)) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

export function safeScanDirectoryFiles(targetDir: string, extensions: string[] = ['.ts', '.vue']): string[] {
  if (!existsSync(targetDir)) return [];
  return getFilesRecursively(targetDir).filter(f => extensions.some(ext => f.endsWith(ext)));
}
