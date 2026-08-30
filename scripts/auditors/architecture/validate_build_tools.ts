import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const isWin = process.platform === 'win32';



function findBinary(): boolean {
  try {
    if (isWin) {
      execFileSync('where.exe', ['css-checker.exe'], { stdio: 'ignore' });
    } else {
      execFileSync('which', ['css-checker'], { stdio: 'ignore' });
    }
    return true;
  } catch {
    // continue checking local node_modules
  }

  const staticRelativeCandidates: string[] = [ // no-domain
    'node_modules/.bin/css-checker.cmd',
    'node_modules/.bin/css-checker.exe',
    'node_modules/.bin/css-checker',
    'node_modules/css-checker-kit/bin/css-checker.exe',
    'node_modules/css-checker-kit/bin/css-checker',
  ];

  for (const relPath of staticRelativeCandidates) {
    if (fs.existsSync(relPath)) {
      return true;
    }
  }

  if (isWin && process.env.APPDATA) {
    const cleanAppData = process.env.APPDATA.replace(/[^a-zA-Z0-9_:\\\-\s.]/g, '');
    if (fs.existsSync(`${cleanAppData}\\npm\\css-checker.exe`)) return true;
    if (fs.existsSync(`${cleanAppData}\\npm\\css-checker.cmd`)) return true;
  }

  // Check Node environment directory (e.g. nvm4w / nodejs / bin)
  const nodeDir = process.execPath ? process.execPath.substring(0, process.execPath.lastIndexOf('\\')) : '';
  if (nodeDir && isWin) {
    if (fs.existsSync(`${nodeDir}\\bin\\css-checker.exe`)) return true;
    if (fs.existsSync(`${nodeDir}\\css-checker.exe`)) return true;
  }

  return false;
}

console.log('🔍 [1/1] Verificando binarios nativos y herramientas de build (css-checker-kit)...');

if (!findBinary()) {
  console.log('\x1b[33m\x1b[1m⚠️ css-checker-kit no está preparado. Auto-instalando y compilando binario nativo...\x1b[0m');
  try {
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    const pkgDir = 'node_modules/css-checker-kit';
    if (!fs.existsSync(pkgDir)) {
      console.log('📦 Instalando css-checker-kit...');
      execFileSync(npmCmd, ['install', '--save-dev', 'css-checker-kit', '--ignore-scripts=false'], { stdio: 'inherit', cwd: rootDir });
    }
    
    console.log('⚡ Compilando binario nativo via postinstall...');
    execFileSync(npmCmd, ['run', 'postinstall', '--ignore-scripts=false'], { stdio: 'inherit', cwd: pkgDir });

    if (!findBinary()) {
      console.error('\x1b[31m❌ Error: No se pudo auto-compilar css-checker-kit.\x1b[0m');
      process.exit(1);
    }
    console.log('\x1b[32m✅ css-checker-kit instalado y listo.\x1b[0m\n');
  } catch (e) {
    console.error('\x1b[31m❌ Error durante la instalación automática de css-checker-kit:\x1b[0m', e);
    process.exit(1);
  }
} else {
  console.log('✅ Herramientas de build y binarios nativos listos.');
}
