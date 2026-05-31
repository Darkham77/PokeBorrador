/**
 * @file configure_official_servers.ts
 * @description Script automático para parsear el archivo .env maestro y configurar src/data/official_servers.ts.
 * 
 * UTILIDAD:
 * Extrae las configuraciones de cada perfil de servidor (SERVER_<profile>_*) y genera
 * la lista OFFICIAL_SERVERS para la interfaz de usuario del juego. Pisa completamente
 * la configuración anterior con los datos exactos del .env maestro.
 * 
 * CUMPLE CON:
 * - Regla de Aislamiento y Parseo Multi-Servidor (env-multi-server-parser).
 * - Estándares Node.js 26+ (Explicit Resource Management con 'using', prefijos node:).
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const ENV_FILE = path.resolve(process.cwd(), '.env');
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/official_servers.ts');

export async function configureOfficialServers() {
  console.log(styleText('bold', '\n--- 🌐 OFFICIAL SERVERS CONFIGURATOR (Node.js 26+) ---'));
  console.log(styleText('cyan', `📄 Leyendo archivo .env maestro: ${ENV_FILE}`));

  try {
    await fsPromises.access(ENV_FILE);
  } catch {
    console.error(styleText('red', '❌ Error: Archivo .env maestro no encontrado.'));
    process.exit(1);
  }

  let content = '';
  try {
    // Uso de Explicit Resource Management (await using) para el manejo del archivo
    await using fileHandle = await fsPromises.open(ENV_FILE, 'r');
    content = await fileHandle.readFile({ encoding: 'utf-8' });
  } catch (e: unknown) {
    console.error(styleText('red', `❌ Error al leer el archivo .env: ${(e as Error).message}`));
    process.exit(1);
  }

  const lines = content.split('\n');
  const serverConfigs: Record<string, Record<string, string>> = {};

  // Known key suffixes in order of length (longest first) to ensure greedy matching.
  // When a new SERVER_<PROFILE>_<SUFFIX> key is added to .env, add its suffix here.
  const KNOWN_SUFFIXES = [
    'SUPABASE_PUBLIC_URL', 'API_EXTERNAL_URL', 'SUPABASE_ANON_KEY',
    'SERVICE_ROLE_KEY', 'POSTGRES_PASSWORD', 'SECRET_KEY_BASE',
    'DASHBOARD_USERNAME', 'DASHBOARD_PASSWORD', 'KONG_HTTPS_PORT',
    'PG_META_CRYPTO_KEY', 'VAULT_ENC_KEY', 'DATABASE_URL',
    'JWT_SECRET', 'SUPABASE_URL', 'TENANT_ID', 'IS_DEFAULT',
    'LOGFLARE_PRIVATE_ACCESS_TOKEN', 'LOGFLARE_PUBLIC_ACCESS_TOKEN',
    'ANON_KEY', 'SITE_URL', 'REGION', 'NAME', 'KEY', 'URL', 'ID',
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      const fullKey = match[1].trim();
      let value = match[2].trim();

      // Eliminar comillas iniciales y finales si están presentes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (fullKey.startsWith('SERVER_')) {
        const withoutPrefix = fullKey.slice('SERVER_'.length); // e.g. "nas_franco_ANON_KEY"

        // Find which known suffix this key ends with
        const matchedSuffix = KNOWN_SUFFIXES.find(s => withoutPrefix.endsWith(`_${s}`));
        if (matchedSuffix === undefined) continue;

        // Profile is everything before _<SUFFIX>
        const profile = withoutPrefix.slice(0, withoutPrefix.length - matchedSuffix.length - 1);
        if (!profile) continue;

        const cleanKey = matchedSuffix;
        if (!serverConfigs[profile]) serverConfigs[profile] = {};
        const targetConf = serverConfigs[profile];
        if (targetConf) targetConf[cleanKey] = value;
      }
    }
  }

  const profiles = Object.keys(serverConfigs);
  if (profiles.length === 0) {
    console.warn(styleText('yellow', '⚠️ Advertencia: No se encontraron configuraciones de servidor (SERVER_<profile>_*) en el .env.'));
  } else {
    console.log(styleText('green', `✅ Se encontraron ${profiles.length} perfiles de servidor: ${profiles.join(', ')}`));
  }

  // Verificar si algún perfil tiene explícitamente IS_DEFAULT=true
  const hasExplicitDefault = profiles.some(p => (serverConfigs[p] || {}).IS_DEFAULT === 'true');

  const officialServers = profiles.map((profile) => {
    const conf = serverConfigs[profile] || {};
    const id = conf.ID || profile;
    const name = conf.NAME || profile;
    const region = conf.REGION || 'Desarrollo';
    
    // Determinar URLs y Claves exactas del .env (pisando todo lo viejo)
    const url = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || conf.SITE_URL || conf.API_EXTERNAL_URL || conf.URL || '';
    const anonKey = conf.ANON_KEY || conf.SUPABASE_ANON_KEY || conf.KEY || '';

    let isDefaultVal = false;
    if (hasExplicitDefault) {
      isDefaultVal = conf.IS_DEFAULT === 'true';
    } else {
      isDefaultVal = profile === 'cloud' || id === 'official_prod';
    }

    let serverObjStr = `  {\n    id: '${id}',\n    name: '${name}',\n    region: '${region}',\n    url: '${url}',\n    anonKey: '${anonKey}'`;
    if (isDefaultVal) {
      serverObjStr += `,\n    isDefault: true`;
    }
    serverObjStr += `\n  }`;
    return serverObjStr;
  });

  const outputContent = `/**
 * AUTO-GENERATED OFFICIAL SERVERS CONFIGURATION
 * Generated by scripts/configure_official_servers.ts
 * Last configured: ${Temporal.Now.instant().toString()}
 * 
 * Lista de servidores registrados para la GUI de Login.
 * Creado automáticamente a partir del archivo .env maestro.
 */

export interface OfficialServer {
  id: string;
  name: string;
  region: string;
  url: string;
  anonKey: string;
  isDefault?: boolean;
}

export const OFFICIAL_SERVERS: OfficialServer[] = [
${officialServers.join(',\n')}
];

export const DEFAULT_SERVER = (OFFICIAL_SERVERS.find(s => s.isDefault) || OFFICIAL_SERVERS[0]) as OfficialServer;
`;

  // Asegurar que el directorio de salida exista
  const outputDir = path.dirname(OUTPUT_FILE);
  await fsPromises.mkdir(outputDir, { recursive: true });

  await fsPromises.writeFile(OUTPUT_FILE, outputContent, 'utf-8');
  console.log(styleText('green', `✨ src/data/official_servers.ts configurado exitosamente con ${profiles.length} servidores.\n`));
}

// Permitir ejecución directa
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('configure_official_servers.ts') ||
  process.argv[1].includes('configure_official_servers.ts')
);

if (isDirectRun) {
  configureOfficialServers().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${err.message}`));
    process.exit(1);
  });
}
