import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// Define directories relative to this script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.resolve(__dirname, '..');
const TARGET_DIR = path.resolve(SOURCE_DIR, '..', 'pokevicio-test');

const DIRECTORIES_TO_COPY: string[] = [ // no-domain: Non-domain utility collection or data structure
  'api',
  path.join('database', 'migrations'),
  'public',
  'scripts',
  'src'
];

const FILES_TO_COPY: string[] = [ // no-domain: Non-domain utility collection or data structure
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'index.html',
  '.gitignore',
  '.env.example',
  'eslint.config.js',
  '.prettierrc',
  '.markdownlint.json',
  'README.md',
  path.join('tests', 'vitest.setup.ts')
];

const PRESERVED_PATTERNS: string[] = [ // no-domain: Non-domain utility collection or data structure
  '.git',
  '.github'
];

function shouldPreserve(name: string): boolean {
  return PRESERVED_PATTERNS.includes(name) || name.startsWith('.git') || name.startsWith('.github');
}

async function copyRecursive(src: string, dest: string, ignoreFilter?: (p: string) => boolean): Promise<void> {
  if (ignoreFilter && ignoreFilter(src)) {
    return;
  }
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(
        path.join(src, entry.name),
        path.join(dest, entry.name),
        ignoreFilter
      );
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function main(): Promise<void> {
  console.log(`\n🚀 Starting Sync PokeBorrador -> pokevicio-test`);
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Target: ${TARGET_DIR}\n`);

  // 1. Validate Source Path
  try {
    await fs.access(SOURCE_DIR);
  } catch (_err) {
    console.error(`❌ Error: Source directory ${SOURCE_DIR} does not exist.`);
    process.exit(1);
  }

  // 2. Validate Target Path (and clone if it does not exist)
  try {
    await fs.access(TARGET_DIR);
  } catch {
    console.log(`📡 Target directory pokevicio-test not found. Cloning repository...`);
    try {
      const parentDir = path.resolve(SOURCE_DIR, '..');
      execSync('git clone git@github.com:francogp/pokevicio-test.git pokevicio-test', {
        cwd: parentDir,
        stdio: 'inherit'
      });
      console.log(`✅ Clone completed successfully.`);
    } catch (err) {
      console.error(`❌ Failed to clone repository:`, err);
      process.exit(1);
    }
  }

  // 3. Clean target directory
  console.log(`🧹 Cleaning target directory (preserving Git files)...`);
  const targetEntries = await fs.readdir(TARGET_DIR, { withFileTypes: true });
  for (const entry of targetEntries) {
    if (shouldPreserve(entry.name)) {
      console.log(`   [PRESERVED] ${entry.name}`);
      continue;
    }
    const fullPath = path.join(TARGET_DIR, entry.name);
    console.log(`   [DELETE] ${entry.name}`);
    await fs.rm(fullPath, { recursive: true, force: true });
  }

  // 4. Copy directories
  console.log(`\n📂 Copying folders...`);
  const ignoreFilter = (srcPath: string): boolean => {
    const rel = path.relative(SOURCE_DIR, srcPath);
    // Ignore .cache folder in scripts
    if (rel.split(path.sep).includes('.cache')) {
      return true;
    }
    return false;
  };

  for (const dir of DIRECTORIES_TO_COPY) {
    const srcPath = path.join(SOURCE_DIR, dir);
    const destPath = path.join(TARGET_DIR, dir);
    try {
      await fs.access(srcPath);
      console.log(`   [COPY DIR] ${dir}`);
      await copyRecursive(srcPath, destPath, ignoreFilter);
    } catch {
      console.warn(`   [WARNING] Directory ${dir} not found, skipping.`);
    }
  }

  // 5. Copy files
  console.log(`\n📄 Copying files...`);
  for (const file of FILES_TO_COPY) {
    const srcPath = path.join(SOURCE_DIR, file);
    const destPath = path.join(TARGET_DIR, file);
    try {
      await fs.access(srcPath);
      console.log(`   [COPY FILE] ${file}`);
      await copyRecursive(srcPath, destPath);
    } catch {
      console.warn(`   [WARNING] File ${file} not found, skipping.`);
    }
  }

  console.log(`\n✨ Sync completed successfully!\n`);
}

main().catch(err => {
  console.error(`❌ Error during sync:`, err);
  process.exit(1);
});
