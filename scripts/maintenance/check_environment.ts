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
      hasNvm = !!process.env.NVM_DIR;
    }

    console.error('\n\x1b[31m\x1b[1m❌ ERROR DE ENTORNO EN POKÉ VICIO:\x1b[0m');
    console.error(`Requisito único configurado en package.json ("engines"):`);
    console.error(`  - Node.js: \x1b[33m${nodeReqStr}\x1b[0m (Detectado: v${process.versions.node})`);
    console.error(`  - npm:     \x1b[33m${npmReqStr}\x1b[0m (Detectado: v${npmCurrentStr === '0.0.0' ? 'desconocido' : npmCurrentStr})\n`);
    
    const targetNodeVer = nodeReqStr.replace(/[^0-9.]/g, '');

    if (hasNvm) {
      console.error('\x1b[32m\x1b[1m💡 NVM DETECTADO EN EL SISTEMA:\x1b[0m');
      console.error('Ejecuta los siguientes comandos para activar la versión requerida en este proyecto:');
      console.error('  1. Instalar la versión requerida (si aún no la tienes):');
      console.error(`     nvm install ${targetNodeVer}`);
      console.error('  2. Activar la versión para este proyecto:');
      console.error(`     nvm use`);
      console.error('     (o ejecuta ./setup-linux.sh / .\\setup-windows.ps1)\n');
      console.error('  ℹ️  Convivencia multi-proyecto: No necesitas sobreescribir tu alias default de NVM.');
      console.error('     Este proyecto lee .nvmrc automáticamente para convivir con tus otros proyectos.\n');
    } else {
      console.error('\x1b[33m\x1b[1m⚠️ NVM NO DETECTADO EN EL SISTEMA:\x1b[0m');
      console.error('Se recomienda encarecidamente instalar NVM (Node Version Manager) para convivir con múltiples versiones de Node.js sin problemas de permisos.\n');
      
      if (isWindows) {
        console.error('\x1b[1m🪟 INSTALACIÓN DE NVM EN WINDOWS (nvm-windows):\x1b[0m');
        console.error('  ⚠️  IMPORTANTE: Desinstala primero cualquier versión previa de Node.js instalada manualmente');
        console.error('      desde el Panel de Control / Configuración de Windows antes de instalar NVM.\n');
        console.error('  1. Instalar NVM via winget (PowerShell / CMD):');
        console.error('     winget install CoreyButler.NVMforWindows');
        console.error('  2. Abrir PowerShell en esta carpeta y ejecutar el setup del proyecto:');
        console.error('     .\\setup-windows.ps1\n');
      } else {
        console.error('\x1b[1m🐧 INSTALACIÓN DE NVM EN LINUX / MACOS:\x1b[0m');
        console.error('  1. Instalar NVM:');
        console.error('     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        console.error('  2. Reiniciar la terminal (o ejecutar: source ~/.bashrc / source ~/.zshrc)');
        console.error('  3. Ejecutar el setup del proyecto:');
        console.error('     ./setup-linux.sh\n');
      }
    }
    process.exit(1);
  }
} catch (e) {
  // Safe fail open if script reading fails
  console.warn('[CheckEnv] Warning: Could not verify environment script:', e);
}
