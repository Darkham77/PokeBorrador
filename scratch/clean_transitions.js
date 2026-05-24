import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'backup_legacy_code', 'public', 'docs', 'scratch', 'showdown']);
const TARGET_EXTENSIONS = new Set(['.vue', '.scss', '.css']);

async function getFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...await getFiles(path.join(dir, entry.name)));
    } else {
      const ext = path.extname(entry.name);
      if (TARGET_EXTENSIONS.has(ext)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files;
}

async function cleanFile(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Regex to match transition: ... ; including multiline
  const cleaned = content.replace(/\btransition\s*:[^;]*;/gi, '');
  
  if (cleaned !== content) {
    await fs.writeFile(filePath, cleaned, 'utf-8');
    console.log(`Cleaned transition from: ${filePath}`);
  }
}

async function main() {
  const root = process.cwd();
  console.log(`Searching for styles/vue files in: ${root}`);
  const files = await getFiles(path.join(root, 'src'));
  for (const f of files) {
    await cleanFile(f);
  }
  console.log('Cleanup finished!');
}

main();
