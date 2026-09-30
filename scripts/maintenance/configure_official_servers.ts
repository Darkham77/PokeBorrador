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

const TEST_DOCKER_SERVER: OfficialServer = {
  id: 'test_postgres',
  name: 'Local Docker Test Server',
  region: 'Testing',
  url: 'http://127.0.0.1:54321',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjI1MDAwMDAwMDB9.bWuWcdy1ICtTs7Zq7TNjum7G0VIS5je9rFlzshoeBLA'
};

export async function configureOfficialServers(): Promise<void> {
  console.log(styleText('bold', `\n--- 🌐 OFFICIAL SERVERS CONFIGURATOR (Node.js ${CONFIGURATOR_TARGET_NODE_VERSION_LABEL}+) ---`));
  console.log(styleText('cyan', `📄 Leyendo archivo .env maestro: ${MASTER_ENV_FILE_PATH}`));

  try {
    await fsPromises.access(MASTER_ENV_FILE_PATH);
  } catch {
    console.error(styleText('red', '❌ Error: Archivo .env maestro no encontrado.'));
    process.exit(1);
  }

  const { readAndParseEnv } = await import('../lib/supabaseClient.ts');
  const serverConfigs = await readAndParseEnv();

  const profiles = Object.keys(serverConfigs);
  if (profiles.length === 0) {
    console.warn(styleText('yellow', '⚠️ Advertencia: No se encontraron configuraciones de servidor (SERVER_<profile>_*) en el .env.'));
  } else {
    console.log(styleText('green', `✅ Se encontraron ${profiles.length} perfiles de servidor: ${profiles.join(', ')}`));
  }

  // Verificar si algún perfil tiene explícitamente IS_DEFAULT=true
  const hasExplicitDefault = profiles.some(p => (serverConfigs[p] || {}).IS_DEFAULT === 'true');

  const officialServers: OfficialServer[] = profiles.map((profile) => {
    const conf = serverConfigs[profile] || {};
    const id = conf.ID || profile;
    const name = conf.NAME || profile;
    const region = conf.REGION || 'Desarrollo';
    
    const url = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || conf.SITE_URL || conf.API_EXTERNAL_URL || conf.URL || '';
    const anonKey = conf.ANON_KEY || conf.SUPABASE_ANON_KEY || conf.KEY || '';

    const isDefaultVal = hasExplicitDefault
      ? conf.IS_DEFAULT === 'true'
      : (profile === 'cloud' || id === 'official_prod');

    const server: OfficialServer = {
      id,
      name,
      region,
      url,
      anonKey,
      ...(isDefaultVal ? { isDefault: true } : {}),
    };
    return server;
  });

  if (!officialServers.some(s => s.id === 'test_postgres')) {
    officialServers.push(TEST_DOCKER_SERVER);
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
