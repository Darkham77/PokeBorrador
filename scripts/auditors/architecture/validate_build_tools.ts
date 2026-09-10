import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const rootDir = path.resolve(process.cwd());
const isWin = os.platform() === 'win32';
const binName = isWin ? 'css-checker.exe' : 'css-checker';
const localBinPath = path.join(rootDir, 'node_modules', '.bin', binName);
const kitBinPath = path.join(rootDir, 'node_modules', 'css-checker-kit', 'bin', binName);

function copyToLocalBin(sourcePath: string): void {
  try {
    const localBinDir = path.dirname(localBinPath);
    if (!fs.existsSync(localBinDir)) {
      fs.mkdirSync(localBinDir, { recursive: true });
    }
    if (!fs.existsSync(localBinPath)) {
      fs.copyFileSync(sourcePath, localBinPath);
    }
    const kitBinDir = path.dirname(kitBinPath);
    if (!fs.existsSync(kitBinDir)) {
      fs.mkdirSync(kitBinDir, { recursive: true });
    }
    if (!fs.existsSync(kitBinPath)) {
      fs.copyFileSync(sourcePath, kitBinPath);
    }
  } catch {
    // Best effort local mirror, continue if permissions forbid
  }
}

function findBinary(): boolean {
  if (fs.existsSync(localBinPath)) {
    return true;
  }
  if (fs.existsSync(kitBinPath)) {
    copyToLocalBin(kitBinPath);
    return true;
  }

  // Check Node runtime directory (e.g. nvm4w / nodejs / bin)
  const nodeDir = path.dirname(process.execPath);
  const runtimeCandidates = [ // no-domain: Non-domain utility collection or data structure
    path.join(nodeDir, 'bin', binName),
    path.join(nodeDir, binName),
  ];
  for (const candidate of runtimeCandidates) {
    if (fs.existsSync(candidate)) {
      copyToLocalBin(candidate);
      return true;
    }
  }

  // Check user npm global directory
  const homeDir = os.homedir();
  const globalCandidates = isWin // no-domain: Non-domain utility collection or data structure
    ? [
        path.join(homeDir, 'AppData', 'Roaming', 'npm', binName),
        path.join(homeDir, 'AppData', 'Roaming', 'npm', 'bin', binName),
      ]
    : [
        path.join(homeDir, '.npm-global', 'bin', binName),
        path.join(homeDir, '.local', 'bin', binName),
      ];

  for (const candidate of globalCandidates) {
    if (fs.existsSync(candidate)) {
      copyToLocalBin(candidate);
      return true;
    }
  }

  // Check system PATH via native tool
  try {
    const lookupTool = isWin ? 'where.exe' : 'which';
    const output = execFileSync(lookupTool, [binName], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' });
    const discovered = output.split(/\r?\n/).map((line: string) => line.trim()).find((line: string) => line && fs.existsSync(line));
    if (discovered) {
      copyToLocalBin(discovered);
      return true;
    }
  } catch {
    // continue to auto-install
  }

  return false;
}

function runNpm(args: readonly string[], cwd: string): void {
  const nodeDir = path.dirname(process.execPath);
  const npmCli = path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');

  if (fs.existsSync(npmCli)) {
    // Execute npm directly via Node runtime binary without intermediate shell
    execFileSync(process.execPath, [npmCli, ...args], { stdio: 'inherit', cwd });
  } else {
    // Fallback to npm executable directly
    const npmExecutable = isWin ? 'npm.cmd' : 'npm';
    execFileSync(npmExecutable, [...args], { stdio: 'inherit', cwd, shell: isWin });
  }
}

console.log('🔍 [1/1] Verificando binarios nativos y herramientas de build (css-checker-kit)...');

if (!findBinary()) {
  console.log('\x1b[33m\x1b[1m⚠️ css-checker-kit no está preparado. Auto-instalando y compilando binario nativo...\x1b[0m');
  try {
    const pkgDir = path.join(rootDir, 'node_modules', 'css-checker-kit');
    if (!fs.existsSync(pkgDir)) {
      console.log('📦 Instalando css-checker-kit...');
      runNpm(['install', '--save-dev', 'css-checker-kit', '--ignore-scripts=false'], rootDir);
    }

    console.log('⚡ Compilando binario nativo via postinstall...');
    runNpm(['run', 'postinstall', '--ignore-scripts=false'], pkgDir);

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
