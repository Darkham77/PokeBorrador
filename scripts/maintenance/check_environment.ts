import { safeResolve } from '../lib/safePath.ts';
import fs from 'node:fs';

function parseSemver(v: string): { major: number; minor: number; patch: number } {
  const clean = v.replace(/[^0-9.]/g, '');
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0
  };
}

function compareVersions(current: { major: number; minor: number; patch: number }, required: { major: number; minor: number; patch: number }): boolean { // type-ok: Type contract declaration
  if (current.major > required.major) return true;
  if (current.major < required.major) return false;
  if (current.minor > required.minor) return true;
  if (current.minor < required.minor) return false;
  return current.patch >= required.patch;
}

try {
  const pkgData = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { engines?: { node?: string; npm?: string } };
  if (!pkgData.engines?.node || !pkgData.engines?.npm) {
    throw new Error('package.json must explicitly define both "engines.node" and "engines.npm"');
  }
  
  const nodeReqStr = pkgData.engines.node;
  const npmReqStr = pkgData.engines.npm;

  const nodeRequired = parseSemver(nodeReqStr);
  const npmRequired = parseSemver(npmReqStr);

  const nodeCurrent = parseSemver(process.versions.node);

  const npmUserAgent = process.env.npm_config_user_agent || '';
  const npmMatch = npmUserAgent.match(/npm\/([0-9.]+)/);
  const npmCurrentStr = npmMatch ? npmMatch[1]! : '0.0.0';
  const npmCurrent = parseSemver(npmCurrentStr);

  const isNodeValid = compareVersions(nodeCurrent, nodeRequired);
  const isNpmValid = npmCurrent.major === 0 || compareVersions(npmCurrent, npmRequired);

  if (!isNodeValid || !isNpmValid) {
    const isWindows = process.platform === 'win32';
    let hasNvm = false;

    if (isWindows) {
      hasNvm = !!process.env.NVM_HOME || !!process.env.NVM_SYMLINK;
    } else {
      const homeDir = process.env.HOME || '';
      hasNvm = !!process.env.NVM_DIR || (homeDir !== '' && safeResolve('package.json') !== '');
    }

    console.error('\n\x1b[31m\x1b[1m❌ ERROR DE ENTORNO EN POKÉ VICIO:\x1b[0m');
    console.error(`Requisito único configurado en package.json ("engines"):`);
    console.error(`  - Node.js: \x1b[33m${nodeReqStr}\x1b[0m (Detectado: v${process.versions.node})`);
    console.error(`  - npm:     \x1b[33m${npmReqStr}\x1b[0m (Detectado: v${npmCurrentStr === '0.0.0' ? 'desconocido' : npmCurrentStr})\n`);
    
    const targetNodeVer = nodeReqStr.replace(/[^0-9.]/g, '');

    if (hasNvm) {
      console.error('\x1b[32m\x1b[1m💡 NVM DETECTADO EN EL SISTEMA:\x1b[0m');
      console.error('Ejecuta los siguientes comandos para actualizar automáticamente usando NVM:');
      console.error('  1. Instalar la versión requerida:');
      console.error(`     nvm install ${targetNodeVer}`);
      console.error('  2. Activar la versión:');
      console.error(`     nvm use ${targetNodeVer}`);
      if (!isWindows) {
        console.error('  3. Fijar como default (Linux/macOS):');
        console.error(`     nvm alias default ${targetNodeVer}`);
      }
      console.error('  4. Actualizar npm a v12+:');
      console.error('     npm install -g npm@latest\n');
    } else {
      console.error('\x1b[33m\x1b[1m⚠️ NVM NO DETECTADO EN EL SISTEMA:\x1b[0m');
      console.error('Se recomienda encarecidamente instalar NVM (Node Version Manager) para evitar problemas de permisos y mantener Node.js actualizado.\n');
      
      if (isWindows) {
        console.error('\x1b[1m🪟 INSTALACIÓN DE NVM EN WINDOWS (nvm-windows):\x1b[0m');
        console.error('  ⚠️  IMPORTANTE: Desinstala primero cualquier versión previa de Node.js instalada manualmente');
        console.error('      desde el Panel de Control / Configuración de Windows antes de instalar NVM, o no funcionará.\n');
        console.error('  1. Instalar NVM via winget (PowerShell / CMD):');
        console.error('     winget install CoreyButler.NVMforWindows');
        console.error('  2. Reiniciar la terminal como Administrador y ejecutar:');
        console.error(`     nvm install ${targetNodeVer}`);
        console.error(`     nvm use ${targetNodeVer}`);
        console.error('     npm install -g npm@latest\n');
        console.error(`  📌 Nota (Troubleshooting Windows):`);
        console.error(`     - Si 'npm' no se reconoce tras usar 'nvm use', abre una NUEVA ventana de PowerShell/CMD como Administrador y ejecuta nuevamente 'nvm use ${targetNodeVer}'.`);
        console.error(`     - Si el problema persiste, borra la carpeta '%APPDATA%\\npm' y '%LOCALAPPDATA%\\nvm' e intenta de nuevo 'nvm use ${targetNodeVer}'.\n`);
      } else {
        console.error('\x1b[1m🐧 INSTALACIÓN DE NVM EN LINUX / MACOS:\x1b[0m');
        console.error('  1. Instalar NVM:');
        console.error('     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        console.error('  2. Reiniciar la terminal (o ejecutar: source ~/.bashrc / source ~/.zshrc)');
        console.error('  3. Instalar y activar la versión de Node.js:');
        console.error(`     nvm install ${targetNodeVer}`);
        console.error(`     nvm use ${targetNodeVer}`);
        console.error(`     nvm alias default ${targetNodeVer}`);
        console.error('  4. Actualizar npm a v12+:');
        console.error('     npm install -g npm@latest\n');
      }
    }
    process.exit(1);
  }
} catch (e) {
  // Safe fail open if script reading fails
  console.warn('[CheckEnv] Warning: Could not verify environment script:', e);
}
