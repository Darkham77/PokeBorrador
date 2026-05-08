import fs from 'node:fs/promises';
import path from 'node:path';

async function walk(dir: string): Promise<string[]> {
  let files: string[] = [];
  const list = await fs.readdir(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    if ((await fs.stat(fullPath)).isDirectory()) {
      files = files.concat(await walk(fullPath));
    } else if (file.endsWith('.scss') || file.endsWith('.vue')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function cleanupDuplicates() {
  const root = process.cwd();
  const files = await walk(root);
  console.log(`Analyzing ${files.length} files for duplicate will-change...`);

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    let lines = content.split('\n');
    let newLines: string[] = [];
    let lastWillChange = '';
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('will-change:')) {
        if (trimmed === lastWillChange) {
          // Duplicate found on consecutive or nearby lines in same block
          modified = true;
          continue; 
        }
        lastWillChange = trimmed;
      } else if (trimmed === '}' || trimmed === '{') {
        lastWillChange = ''; // Reset context on block boundaries
      }
      
      newLines.push(line);
    }

    if (modified) {
      await fs.writeFile(file, newLines.join('\n'), 'utf-8');
      console.log(`CLEANED DUPLICATES: ${file}`);
    }
  }
  console.log('CLEANUP COMPLETE.');
}

cleanupDuplicates();
