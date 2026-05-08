import fs from 'node:fs/promises';
import path from 'node:path';

const SASS_TRAPS = [
  'scale', 'grayscale', 'invert', 'opacity', 'brightness', 
  'blur', 'rotate', 'translate', 'saturate', 'drop-shadow',
  'translatex', 'translatey', 'translatez', 'skewx', 'skewy', 'matrix',
  'rgba', 'rgb'
];

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

async function clean() {
  const root = process.cwd();
  const files = await walk(root);
  console.log(`Cleaning ${files.length} files...`);

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    let newContent = content;

    // 1. Fix module calls: color.Scale -> color.scale
    newContent = newContent.replace(/([\.|\$])(Scale|Blur|Translate|Rotate|Invert|GrayScale|Opacity|Brightness|Saturate|Drop-Shadow|Matrix|Skew)\(/gi, (m, prefix, func) => {
      return prefix + func.toLowerCase() + '(';
    });

    if (newContent !== content) {
      await fs.writeFile(file, newContent, 'utf-8');
      console.log(`FIXED: ${file}`);
    }
  }
  console.log('CLEANING COMPLETE.');
}

clean();
