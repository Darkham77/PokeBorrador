import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'backup_legacy_code', 'public', 'docs', 'scratch']);

async function getFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...(await getFiles(res)));
    } else {
      if (['.vue', '.ts', '.js'].includes(path.extname(res))) {
        files.push(res);
      }
    }
  }
  return files;
}

async function main() {
  const content = await fs.readFile('scratch/audit_report.txt', 'utf-8');
  const lines = content.split('\n');

  const animationViolations = {};
  const timerViolations = {};
  const willChangeViolations = {};
  const zIndexViolations = {};

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Format: [ERROR] filePath:line -> message ("context")
    const match = line.match(/^\[(ERROR|WARNING)\]\s+(.*?):(\d+)\s+->\s+(.*)$/);
    if (!match) continue;

    const [, severity, file, lineNo, message] = match;

    if (message.includes('Animación manual detectada') || message.includes('transition:')) {
      animationViolations[file] = (animationViolations[file] || 0) + 1;
    } else if (message.includes('timer de ANIMACIÓN') || message.includes('setTimeout') || message.includes('setInterval')) {
      timerViolations[file] = (timerViolations[file] || 0) + 1;
    } else if (message.includes('will-change') || message.includes('promoción de capa')) {
      willChangeViolations[file] = (willChangeViolations[file] || 0) + 1;
    } else if (message.includes('Z-Index')) {
      zIndexViolations[file] = (zIndexViolations[file] || 0) + 1;
    }
  }

  // Count GSAP usage in codebase
  const gsapUsage = {};
  const files = await getFiles(path.resolve(process.cwd(), 'src'));
  
  for (const file of files) {
    const fileContent = await fs.readFile(file, 'utf-8');
    const relPath = path.relative(process.cwd(), file);
    
    // Simple regex to match gsap.to, gsap.from, gsap.timeline, gsap.delayedCall, etc.
    const matches = fileContent.match(/gsap\.[a-zA-Z]+/g);
    if (matches) {
      gsapUsage[relPath] = matches.length;
    }
  }

  console.log('--- GSAP USAGE (gsap.to, gsap.timeline, etc.) TOP FILES ---');
  Object.entries(gsapUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([file, count]) => {
      console.log(`${file}: ${count} references`);
    });

  console.log('\n--- MANUAL ANIMATIONS (transition/keyframes) TOP AFFECTED ---');
  Object.entries(animationViolations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([file, count]) => {
      console.log(`${file}: ${count}`);
    });

  console.log('\n--- TIMERS (setTimeout/setInterval) AFFECTED ---');
  Object.entries(timerViolations)
    .sort((a, b) => b[1] - a[1])
    .forEach(([file, count]) => {
      console.log(`${file}: ${count}`);
    });

  console.log('\n--- WILL-CHANGE (GPU Promotion) AFFECTED ---');
  Object.entries(willChangeViolations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`${file}: ${count}`);
    });

  console.log('\n--- Z-INDEX AFFECTED ---');
  Object.entries(zIndexViolations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`${file}: ${count}`);
    });
}

main().catch(console.error);
