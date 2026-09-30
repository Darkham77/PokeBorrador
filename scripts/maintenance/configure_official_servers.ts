/**
 * @file configure_official_servers.ts
 * @description Script automático para parsear el archivo .env maestro y generar src/data/system/servers.local.json en PokéBorrador.
 * 
 * UTILIDAD:
 * Extrae las configuraciones de cada perfil de servidor (SERVER_<profile>_*) del .env maestro
 * y genera `src/data/system/servers.local.json`. Como este archivo está en .gitignore, cada entorno
 * mantiene su configuración activa sin ensuciar archivos rastreados por Git ni provocar conflictos al hacer pull.
 * 
 * CUMPLE CON:
 * - Regla de Aislamiento y Parseo Multi-Servidor (env-multi-server-parser).
 * - Estándares Node.js 26+ (styleText, compileCache, formato JSON nativo).
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import type { OfficialServer } from '../../src/data/system/official_servers.ts';

enableCompileCache();

const MASTER_ENV_FILE_PATH = path.resolve(process.cwd(), '.env');
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/system/servers.local.json');
const CONFIGURATOR_TARGET_NODE_VERSION_LABEL = '26';

export async function configureOfficialServers(): Promise<void> {
  console.log(styleText('bold', `\n--- 🌐 OFFICIAL SERVERS CONFIGURATOR (Node.js ${CONFIGURATOR_TARGET_NODE_VERSION_LABEL}+) ---`));

  try {
    await fsPromises.access(MASTER_ENV_FILE_PATH);
    console.log(styleText('cyan', `📄 Leyendo archivo .env maestro: ${MASTER_ENV_FILE_PATH}`));
  } catch {
    console.log(styleText('yellow', `ℹ️ Archivo .env maestro no encontrado. Leyendo variables de entorno desde process.env...`));
  }

  const { readAndParseEnv } = await import('../lib/supabaseClient.ts');
  const serverConfigs = await readAndParseEnv();

  const profiles = Object.keys(serverConfigs);
  if (profiles.length === 0) {
    throw new Error(
      '[configureOfficialServers] ERROR CRÍTICO: No se encontraron perfiles SERVER_* en el archivo .env ni en process.env. ' +
      'Es estrictamente obligatorio contar con un archivo .env maestro o secrets de CI/CD para compilar la configuración de servidores. ' +
      'Los fallbacks y valores por defecto están estrictamente prohibidos.'
    );
  }

  console.log(styleText('green', `✅ Se encontraron ${profiles.length} perfiles en el entorno / .env: ${profiles.join(', ')}`));

  const hasExplicitDefault = profiles.some(p => (serverConfigs[p] || {}).IS_DEFAULT === 'true');
  const serverMap = new Map<string, OfficialServer>();

  for (const profile of profiles) {
    const conf = serverConfigs[profile] || {};
    const id = conf.ID || profile;
    const name = conf.NAME || profile;
    const region = conf.REGION || 'Desarrollo';
    
    const url = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || conf.SITE_URL || conf.API_EXTERNAL_URL || conf.URL || '';
    const anonKey = conf.ANON_KEY || conf.SUPABASE_ANON_KEY || conf.KEY || '';

    if (!url || !anonKey) {
      console.warn(styleText('yellow', `⚠️ Perfil "${profile}" omitido: falta URL o anonKey.`));
      continue;
    }

    const isDefaultVal = hasExplicitDefault
      ? conf.IS_DEFAULT === 'true'
      : (profile === 'cloud' || id === 'official_prod');

    serverMap.set(id, {
      id,
      name,
      region,
      url,
      anonKey,
      ...(isDefaultVal ? { isDefault: true } : {})
    });
  }

  const officialServers = Array.from(serverMap.values());
  if (officialServers.length === 0) {
    throw new Error(
      '[configureOfficialServers] ERROR CRÍTICO: Ningún perfil en .env o process.env posee URL y anonKey válidos. ' +
      'Es obligatorio que al menos un servidor tenga configurados SERVER_<perfil>_SUPABASE_PUBLIC_URL y SERVER_<perfil>_ANON_KEY.'
    );
  }

  // Garantizar que siempre haya al menos un servidor marcado como default
  const hasDefault = officialServers.some(s => s.isDefault);
  if (!hasDefault) {
    const prodServer = officialServers.find(s => s.id === 'official_prod');
    if (prodServer) {
      prodServer.isDefault = true;
    } else if (officialServers[0]) {
      officialServers[0].isDefault = true;
    }
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  await fsPromises.mkdir(outputDir, { recursive: true });

  await fsPromises.writeFile(OUTPUT_FILE, JSON.stringify(officialServers, null, 2) + '\n', 'utf-8');
  console.log(styleText('green', `✨ src/data/system/servers.local.json configurado exitosamente con ${officialServers.length} servidores.\n`));
}

// Permitir ejecución directa
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('configure_official_servers.ts') ||
  process.argv[1].includes('configure_official_servers.ts')
);

if (isDirectRun) {
  configureOfficialServers().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${(err as Error).message}`));
    process.exit(1);
  });
}
