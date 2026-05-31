/**
 * @file setup_supabase.ts
 * @description Orquestador CLI en TypeScript (Node.js 26+) para gestionar
 * despliegues multi-servidor de Supabase, reemplazando la versión legacy en Python.
 * 
 * CARACTERÍSTICAS MODERNAS (Node.js 26+):
 * - Uso exclusivo de prefijos 'node:' para imports nativos.
 * - Explicit Resource Management (ERM) mediante 'await using'.
 * - Compilación ultrarrápida nativa sin dependencias externas.
 * - Formato estandarizado mediante ANSI util 'styleText'.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

enableCompileCache();

// ── Constantes y Configuración de Rutas ──────────────────────────────────────
const BASE_DIR          = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO_MAESTRO   = path.resolve(BASE_DIR, '..', '.env'); // .env maestro en raíz de PokeBorrador
const CARPETA_GENERADOS = path.resolve(BASE_DIR, 'generated');
const CARPETA_DOCKER    = path.resolve(BASE_DIR, 'docker');

// ── Contenido de Dockerfile Personalizado (1:1) ──────────────────────────────
const DOCKERFILE_CONTENT = `# ─────────────────────────────────────────────────────────────────────────────
# Poké Vicio — Custom Supabase Postgres Image
# ─────────────────────────────────────────────────────────────────────────────
# Extiende la imagen oficial de Supabase con init scripts del juego.
# El juego aplica sus propias migraciones al conectarse.
#
# Build:  npm run supabase:manage build
# Push:   npm run supabase:manage publish
# Pull:   docker pull francogp612/pokevicio-db:latest
# ─────────────────────────────────────────────────────────────────────────────

FROM supabase/postgres:15.8.1.060

LABEL maintainer="francogpellegrini@gmail.com"
LABEL description="Poké Vicio — Supabase Postgres preconfigurado"
LABEL org.opencontainers.image.source="https://github.com/francogp612/PokeSupabase"

# Copiar init scripts (se ejecutan en orden alfabético al primer arranque)
COPY init/ /docker-entrypoint-initdb.d/

# Copiar scripts SQL internos de Supabase a sus rutas de inicialización en Postgres
COPY volumes/db/realtime.sql /docker-entrypoint-initdb.d/migrations/99-realtime.sql
COPY volumes/db/webhooks.sql /docker-entrypoint-initdb.d/init-scripts/98-webhooks.sql
COPY volumes/db/roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql
COPY volumes/db/jwt.sql /docker-entrypoint-initdb.d/init-scripts/99-jwt.sql
COPY volumes/db/_supabase.sql /docker-entrypoint-initdb.d/migrations/97-_supabase.sql
COPY volumes/db/logs.sql /docker-entrypoint-initdb.d/migrations/99-logs.sql
COPY volumes/db/pooler.sql /docker-entrypoint-initdb.d/migrations/99-pooler.sql

# Copiar archivos de configuración para otros servicios a /supabase-volumes
COPY volumes/api/kong.yml /supabase-volumes/kong/temp.yml
COPY volumes/api/kong-entrypoint.sh /supabase-volumes/kong/kong-entrypoint.sh
COPY volumes/logs/vector.yml /supabase-volumes/vector/vector.yml
COPY volumes/pooler/pooler.exs /supabase-volumes/pooler/pooler.exs
COPY volumes/functions /supabase-volumes/functions
COPY volumes/snippets /supabase-volumes/snippets

# Asegurar que el directorio de configuración personalizada exista y pertenezca a postgres
RUN mkdir -p /etc/postgresql-custom && chown -R postgres:postgres /etc/postgresql-custom
`;

// ── Helpers Visuales y de Consola ────────────────────────────────────────────
function header(title: string, subtitle = '') {
  console.log();
  const rawLength = Math.max(title.length, subtitle.length);
  const border = '━'.repeat(rawLength + 4);
  console.log(styleText('cyan', `┏${border}┓`));
  console.log(styleText('cyan', `┃  ${styleText('bold', title).padEnd(rawLength + styleText('bold', title).length - title.length)}  ┃`));
  if (subtitle) {
    console.log(styleText('cyan', `┃  ${styleText('dim', subtitle).padEnd(rawLength + styleText('dim', subtitle).length - subtitle.length)}  ┃`));
  }
  console.log(styleText('cyan', `┗${border}┛`));
}

function ok(msg: string) {
  console.log(`  ${styleText('green', '✓')} ${msg}`);
}

function warn(msg: string) {
  console.log(`  ${styleText('yellow', '⚠')} ${msg}`);
}

function info(msg: string) {
  console.log(`  ${styleText('dim', 'ℹ')} ${msg}`);
}

// ── Utilidades de Interacción Readline (Primitivos Typer/Confirm) ────────────
function askPrompt(question: string, defaultValue = ''): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const q = defaultValue ? `  ${question} [${defaultValue}]: ` : `  ${question}: `;
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function confirmPrompt(question: string, defaultYes = false): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const opts = defaultYes ? '(Y/n)' : '(y/N)';
    rl.question(`  ${question} ${opts}: `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === 'y' || a === 'yes') resolve(true);
      else if (a === 'n' || a === 'no') resolve(false);
      else resolve(defaultYes);
    });
  });
}

// ── Ejecución de Comandos Externos ───────────────────────────────────────────
function run(cmd: string[], cwd?: string, check = true) {
  console.log(styleText('dim', `▶ ${cmd.join(' ')}`));
  const result = spawnSync(cmd[0]!, cmd.slice(1), {
    cwd,
    stdio: 'inherit'
  });
  if (check && result.status !== 0) {
    console.error(styleText(['bold', 'red'], `\n✗ Error al ejecutar: ${cmd.join(' ')}`));
    process.exit(result.status || 1);
  }
  return result;
}

// ── Lógica de Parseo y Mutación de .env ──────────────────────────────────────
function setEnvVar(content: string, key: string, value: string, afterHeader?: string): string {
  const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(`^${escapedKey}\\s*=\\s*.*$`, 'm');
  const replacement = `${key}=${value}`;
  
  if (pattern.test(content)) {
    return content.replace(pattern, replacement);
  } else {
    if (afterHeader) {
      const escapedHeader = afterHeader.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const hPattern = new RegExp(`^${escapedHeader}\\s*$`, 'm');
      if (hPattern.test(content)) {
        return content.replace(hPattern, `${afterHeader}\n${replacement}`);
      }
    }
    
    let res = content;
    if (res && !res.endsWith('\n')) res += '\n';
    return res + `${replacement}\n`;
  }
}

async function parseMasterEnv(): Promise<Record<string, string>> {
  try {
    await fs.access(ARCHIVO_MAESTRO);
  } catch {
    return {};
  }
  await using fileHandle = await fs.open(ARCHIVO_MAESTRO, 'r');
  const content = await fileHandle.readFile({ encoding: 'utf-8' });
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const k = trimmed.substring(0, idx).trim();
    const v = trimmed.substring(idx + 1).trim();
    result[k] = v;
  }
  return result;
}

async function parseEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    await fs.access(filePath);
  } catch {
    return {};
  }
  await using fileHandle = await fs.open(filePath, 'r');
  const content = await fileHandle.readFile({ encoding: 'utf-8' });
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const k = trimmed.substring(0, idx).trim();
    const v = trimmed.substring(idx + 1).trim();
    result[k] = v;
  }
  return result;
}

function getServerNames(envVars: Record<string, string>): string[] {
  const names = new Set<string>();
  const KNOWN_SUFFIXES = [
    'SUPABASE_PUBLIC_URL', 'API_EXTERNAL_URL', 'SUPABASE_ANON_KEY',
    'SERVICE_ROLE_KEY', 'POSTGRES_PASSWORD', 'SECRET_KEY_BASE',
    'DASHBOARD_USERNAME', 'DASHBOARD_PASSWORD', 'KONG_HTTPS_PORT',
    'PG_META_CRYPTO_KEY', 'VAULT_ENC_KEY', 'DATABASE_URL',
    'JWT_SECRET', 'SUPABASE_URL', 'TENANT_ID', 'IS_DEFAULT',
    'LOGFLARE_PRIVATE_ACCESS_TOKEN', 'LOGFLARE_PUBLIC_ACCESS_TOKEN',
    'ANON_KEY', 'SITE_URL', 'REGION', 'NAME', 'KEY', 'URL', 'ID',
  ];

  for (const key of Object.keys(envVars)) {
    if (key.startsWith('SERVER_')) {
      const withoutPrefix = key.substring(7);
      const matchedSuffix = KNOWN_SUFFIXES.find(s => withoutPrefix.endsWith(`_${s}`));
      if (matchedSuffix !== undefined) {
        const profile = withoutPrefix.substring(0, withoutPrefix.length - matchedSuffix.length - 1);
        if (profile) {
          names.add(profile);
        }
      }
    }
  }
  return Array.from(names).sort();
}

function extractServerVars(envVars: Record<string, string>, serverName: string): Record<string, string> {
  const prefix = `SERVER_${serverName}_`;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(envVars)) {
    if (k.startsWith(prefix)) {
      result[k.substring(prefix.length)] = v;
    }
  }
  return result;
}

// ── Criptografía y Generación de Firmas JWT 1:1 ───────────────────────────────
function b64url(data: Buffer): string {
  return data.toString('base64url');
}

function signJwt(payload: object, secret: string): string {
  const h = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const p = b64url(Buffer.from(JSON.stringify(payload)));
  // Firma usando algoritmo HMAC-SHA256 equivalente exacto al python hmac.new
  const signature = crypto.createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest();
  return `${h}.${p}.${b64url(signature)}`;
}

async function ensureServerKeys(serverName: string, envVars: Record<string, string>): Promise<Record<string, string>> {
  const prefix = `SERVER_${serverName}_`;
  const existing = extractServerVars(envVars, serverName);
  const generated: Record<string, string> = {};

  if (!existing.JWT_SECRET) {
    generated.JWT_SECRET = crypto.randomBytes(32).toString('base64');
  }
  const jwtSecret = existing.JWT_SECRET || generated.JWT_SECRET!;

  // Unix Epoch en segundos
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 157680000; // 5 años de validez

  for (const [key, role] of [['ANON_KEY', 'anon'], ['SERVICE_ROLE_KEY', 'service_role']] as const) {
    if (!existing[key]) {
      const payload = { role, iss: "supabase", iat, exp };
      generated[key] = signJwt(payload, jwtSecret);
    }
  }

  const simpleKeys: Record<string, () => string> = {
    POSTGRES_PASSWORD: () => crypto.randomBytes(20).toString('hex'),
    SECRET_KEY_BASE:   () => crypto.randomBytes(48).toString('base64'),
    VAULT_ENC_KEY:     () => crypto.randomBytes(16).toString('hex'),
    PG_META_CRYPTO_KEY: () => crypto.randomBytes(24).toString('base64'),
    LOGFLARE_PRIVATE_ACCESS_TOKEN: () => crypto.randomBytes(32).toString('hex'),
    LOGFLARE_PUBLIC_ACCESS_TOKEN:  () => crypto.randomBytes(32).toString('hex'),
  };

  for (const [key, fn] of Object.entries(simpleKeys)) {
    if (!existing[key]) {
      generated[key] = fn();
    }
  }

  if (Object.keys(generated).length > 0) {
    await using fileHandle = await fs.open(ARCHIVO_MAESTRO, 'r+');
    let content = await fileHandle.readFile({ encoding: 'utf-8' });
    let hText = `# === [ SERVIDOR: ${serverName} ] ===`;
    if (!content.includes(hText)) {
      const altText = `# === [ SERVIDOR: ${serverName.replace(/_/g, '-')} ] ===`;
      if (content.includes(altText)) {
        hText = altText;
      }
    }
    for (const [k, v] of Object.entries(generated)) {
      content = setEnvVar(content, `${prefix}${k}`, v, hText);
    }
    await fileHandle.truncate(0);
    await fileHandle.write(content, 0, 'utf-8');
  }

  return { ...existing, ...generated };
}

// ── Comandos CLI del Orquestador ─────────────────────────────────────────────

async function listar() {
  header("Servidores configurados");
  const varsEnv = await parseMasterEnv();
  const servidores = getServerNames(varsEnv);
  if (servidores.length === 0) {
    warn("No hay servidores definidos. Usá 'add' para crear uno.");
    return;
  }
  const colName = 'Servidor'.padEnd(20);
  const colUrl = 'URL Pública'.padEnd(45);
  const colStatus = 'Estado Claves';
  console.log(styleText(['bold', 'magenta'], `${colName} ${colUrl} ${colStatus}`));
  console.log(styleText('dim', '━'.repeat(80)));
  for (const nombre of servidores) {
    const svars = extractServerVars(varsEnv, nombre);
    const url = svars.SUPABASE_PUBLIC_URL || "Sin URL";
    const clavesOk = ['JWT_SECRET', 'POSTGRES_PASSWORD', 'ANON_KEY'].every(k => svars[k]);
    const estado = clavesOk ? styleText('green', '✓ OK') : styleText('yellow', '⚠ Faltan');
    console.log(`${nombre.padEnd(20)} ${url.padEnd(45)} ${estado}`);
  }
  console.log();
}

async function clonar() {
  header("Clonando Supabase oficial");
  try {
    await fs.access(CARPETA_DOCKER);
    warn("La carpeta 'docker' ya existe (artefacto de compilación anterior).");
    const answer = await confirmPrompt("¿Querés sobrescribirla con la última versión de Supabase?");
    if (!answer) {
      info("Operación cancelada.");
      return;
    }
    await fs.rm(CARPETA_DOCKER, { recursive: true, force: true });
  } catch {
    // La carpeta no existe, procedemos normalmente
  }

  info("Clonando estructura de Supabase (sparse-checkout)...");
  const tempDir = path.resolve(BASE_DIR, 'temp_supabase');
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Nada que limpiar
  }

  run(["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", "https://github.com/supabase/supabase.git", tempDir]);
  run(["git", "sparse-checkout", "set", "docker"], tempDir);

  info("Moviendo carpeta 'docker' oficial...");
  await fs.rename(path.resolve(tempDir, 'docker'), CARPETA_DOCKER);
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Nada que limpiar
  }

  info("Generando Dockerfile personalizado dinámicamente...");
  await fs.writeFile(path.resolve(CARPETA_DOCKER, 'Dockerfile'), DOCKERFILE_CONTENT, 'utf-8');
  await fs.mkdir(path.resolve(CARPETA_DOCKER, 'init'), { recursive: true });

  ok("Estructura de Supabase y Dockerfile generados correctamente.");
}

async function generar() {
  header("Generando archivos de despliegue");
  const varsEnv = await parseMasterEnv();
  const servidores = getServerNames(varsEnv);
  if (servidores.length === 0) return;

  // Si no existe la plantilla de Supabase, la clonamos automáticamente
  try {
    await fs.access(path.resolve(CARPETA_DOCKER, 'docker-compose.yml'));
  } catch {
    info("No se encontró la plantilla de Supabase en 'supabase/docker'. Clonando automáticamente...");
    await clonar();
  }

  await fs.mkdir(CARPETA_GENERADOS, { recursive: true });

  const baseVars = await parseEnvFile(path.resolve(CARPETA_DOCKER, '.env.example'));

  for (const nombre of servidores) {
    console.log(`  ➤ Procesando: ${nombre}`);
    await ensureServerKeys(nombre, varsEnv);

    // Obtener las claves recién guardadas
    const freshVarsEnv = await parseMasterEnv();
    const serverEnv = { ...baseVars };

    for (const gkey of ["DOCKER_USER", "DOCKER_REPO_DB", "DOCKER_TAG_DB"]) {
      if (freshVarsEnv[gkey]) serverEnv[gkey] = freshVarsEnv[gkey]!;
    }

    const svars = extractServerVars(freshVarsEnv, nombre);
    Object.assign(serverEnv, svars);

    if (svars.TENANT_ID) {
      serverEnv.POOLER_TENANT_ID = svars.TENANT_ID;
      serverEnv.STORAGE_TENANT_ID = svars.TENANT_ID;
    }

    const lineas = [`# Generado para: ${nombre}`, "# NO EDITAR ESTE ARCHIVO", ""];
    for (const [k, v] of Object.entries(serverEnv).sort((a, b) => a[0].localeCompare(b[0]))) {
      lineas.push(`${k}=${v}`);
    }

    const ruta = path.resolve(CARPETA_GENERADOS, `${nombre}.env`);
    await fs.writeFile(ruta, lineas.join('\n') + '\n', 'utf-8');
    ok(`Creado: ${ruta}`);
  }

  // Copiar y adaptar docker-compose.yml
  const composeOrigen = path.resolve(CARPETA_DOCKER, 'docker-compose.yml');
  const composeDestino = path.resolve(CARPETA_GENERADOS, 'docker-compose.yml');
  try {
    await fs.access(composeOrigen);
    let contenidoCompose = await fs.readFile(composeOrigen, 'utf-8');

    // 1. Reemplazar imagen de postgres por la imagen personalizada
    contenidoCompose = contenidoCompose.replace(
      "image: supabase/postgres:15.8.1.085",
      "image: ${DOCKER_USER}/${DOCKER_REPO_DB}:${DOCKER_TAG_DB}"
    );

    // 2. Reemplazar montajes de archivos SQL de Supabase en db por el volumen nombrado
    const sqlMounts = [
      "      - ./volumes/db/realtime.sql:/docker-entrypoint-initdb.d/migrations/99-realtime.sql:Z\n",
      "      # Must be superuser to create event trigger\n",
      "      - ./volumes/db/webhooks.sql:/docker-entrypoint-initdb.d/init-scripts/98-webhooks.sql:Z\n",
      "      # Must be superuser to alter reserved role\n",
      "      - ./volumes/db/roles.sql:/docker-entrypoint-initdb.d/init-scripts/99-roles.sql:Z\n",
      "      # Initialize the database settings with JWT_SECRET and JWT_EXP\n",
      "      - ./volumes/db/jwt.sql:/docker-entrypoint-initdb.d/init-scripts/99-jwt.sql:Z\n",
      "      # Changes required for internal supabase data such as _analytics\n",
      "      - ./volumes/db/_supabase.sql:/docker-entrypoint-initdb.d/migrations/97-_supabase.sql:Z\n",
      "      # Changes required for Analytics support\n",
      "      - ./volumes/db/logs.sql:/docker-entrypoint-initdb.d/migrations/99-logs.sql:Z\n",
      "      # Changes required for Pooler support\n",
      "      - ./volumes/db/pooler.sql:/docker-entrypoint-initdb.d/migrations/99-pooler.sql:Z\n"
    ];
    for (const m of sqlMounts) {
      contenidoCompose = contenidoCompose.replace(m, "");
    }

    // Insertar el montaje de supabase-volumes-v2 en db, usar db-data-v2 y db-config-v2 con :Z
    contenidoCompose = contenidoCompose.replace(
      "      # PGDATA directory is persisted between restarts\n      - ./volumes/db/data:/var/lib/postgresql/data:Z\n      # Use named volume to persist pgsodium decryption key between restarts\n      - db-config:/etc/postgresql-custom",
      "      - supabase-volumes-v2:/supabase-volumes:Z\n      # PGDATA directory is persisted between restarts\n      - db-data-v2:/var/lib/postgresql/data:Z\n      # Use named volume to persist pgsodium decryption key between restarts\n      - db-config-v2:/etc/postgresql-custom:Z"
    );

    // Reemplazar montajes locales de studio, storage, imgproxy y functions por volúmenes nombrados con :Z
    contenidoCompose = contenidoCompose.replace(
      "      - ./volumes/snippets:/app/snippets:Z\n      - ./volumes/functions:/app/edge-functions:Z",
      "      - supabase-volumes-v2:/supabase-volumes:Z"
    );
    contenidoCompose = contenidoCompose.replace(
      "      SNIPPETS_MANAGEMENT_FOLDER: /app/snippets\n      EDGE_FUNCTIONS_MANAGEMENT_FOLDER: /app/edge-functions",
      "      SNIPPETS_MANAGEMENT_FOLDER: /supabase-volumes/snippets\n      EDGE_FUNCTIONS_MANAGEMENT_FOLDER: /supabase-volumes/functions"
    );
    contenidoCompose = contenidoCompose.replace(
      "      - ./volumes/storage:/var/lib/storage:z",
      "      - storage-data:/var/lib/storage:Z"
    );
    contenidoCompose = contenidoCompose.replace(
      "      - ./volumes/functions:/home/deno/functions:Z",
      "      - supabase-volumes-v2:/home/deno:Z"
    );

    // Adaptar Kong
    const kongMounts = (
      "      # https://github.com/supabase/supabase/issues/12661\n" +
      "      - ./volumes/api/kong.yml:/home/kong/temp.yml:ro,z\n" +
      "      - ./volumes/api/kong-entrypoint.sh:/home/kong/kong-entrypoint.sh:ro,z"
    );
    contenidoCompose = contenidoCompose.replace(kongMounts, "      - supabase-volumes-v2:/home:ro,z");

    // Adaptar Vector
    contenidoCompose = contenidoCompose.replace(
      "    healthcheck:\n      test:\n        [\n          \"CMD\",\n          \"wget\",\n          \"--no-verbose\",\n          \"--tries=1\",\n          \"--spider\",\n          \"http://vector:9001/health\"\n        ]\n      timeout: 5s\n      interval: 5s\n      retries: 3\n    depends_on:\n      analytics:\n        condition: service_healthy",
      "    healthcheck:\n      test:\n        [\n          \"CMD\",\n          \"wget\",\n          \"--no-verbose\",\n          \"--tries=1\",\n          \"--spider\",\n          \"http://vector:9001/health\"\n        ]\n      timeout: 5s\n      interval: 5s\n      retries: 3\n    depends_on:\n      db:\n        condition: service_healthy\n      analytics:\n        condition: service_healthy"
    );
    contenidoCompose = contenidoCompose.replace(
      "      - ./volumes/logs/vector.yml:/etc/vector/vector.yml:ro,z",
      "      - supabase-volumes-v2:/supabase-volumes:ro,z"
    );
    contenidoCompose = contenidoCompose.replace(
      '        "/etc/vector/vector.yml"',
      '        "/supabase-volumes/vector/vector.yml"'
    );

    // Adaptar Supavisor
    contenidoCompose = contenidoCompose.replace(
      "  supavisor:\n    container_name: supabase-pooler\n    image: supabase/supavisor:2.7.4\n    restart: unless-stopped\n    ports:",
      "  supavisor:\n    container_name: supabase-pooler\n    image: supabase/supavisor:2.7.4\n    restart: unless-stopped\n    ulimits:\n      nofile:\n        soft: 65536\n        hard: 65536\n    ports:"
    );
    contenidoCompose = contenidoCompose.replace(
      "      - ./volumes/pooler/pooler.exs:/etc/pooler/pooler.exs:ro,z",
      "      - supabase-volumes-v2:/supabase-volumes:ro,z"
    );
    contenidoCompose = contenidoCompose.replace(
      "      DB_POOL_SIZE: ${POOLER_DB_POOL_SIZE}",
      "      DB_POOL_SIZE: ${POOLER_DB_POOL_SIZE}\n      RLIMIT_NOFILE: \"65536\""
    );
    contenidoCompose = contenidoCompose.replace(
      "/etc/pooler/pooler.exs",
      "/supabase-volumes/pooler/pooler.exs"
    );

    // Adaptar Analytics
    contenidoCompose = contenidoCompose.replace(
      "      timeout: 5s\n      interval: 5s\n      retries: 10\n    depends_on:",
      "      timeout: 5s\n      interval: 5s\n      retries: 10\n      start_period: 60s\n    depends_on:"
    );

    // Declarar todos los volúmenes nombrados al final
    contenidoCompose = contenidoCompose.replace(
      "volumes:\n  db-config:",
      "volumes:\n  supabase-volumes-v2:\n  db-data-v2:\n  storage-data:\n  db-config-v2:"
    );

    await fs.writeFile(composeDestino, contenidoCompose, 'utf-8');
    ok(`Creado: ${composeDestino}`);
  } catch (err: unknown) {
    warn(`No se pudo generar docker-compose.yml: ${(err as Error).message}`);
  }

  // Limpiar carpeta volumes en generated si existía
  const vDir = path.resolve(CARPETA_GENERADOS, 'volumes');
  try {
    await fs.rm(vDir, { recursive: true, force: true });
  } catch {
    // No existía
  }
}

async function agregar() {
  header("Agregar/Actualizar servidor");

  const nombreInput = await askPrompt("Nombre del servidor (ej: nas, vps)");
  const nombre = nombreInput.toLowerCase().trim();
  if (!nombre) return;

  const varsEnv = await parseMasterEnv();
  const prefix = `SERVER_${nombre}_`;
  const existente = extractServerVars(varsEnv, nombre);

  if (Object.keys(existente).length > 0) {
    warn(`El servidor '${nombre}' YA EXISTE.`);
    const proceed = await confirmPrompt("¿Estás seguro de que querés modificar sus datos básicos?");
    if (!proceed) {
      info("Operación cancelada.");
      return;
    }
    info("Los valores actuales se usarán como sugerencia (Enter para mantener).");
  }

  const srv_id     = await askPrompt("🏷️  ID del Servidor (ej: local-docker, official-prod)", existente.ID || `srv-${nombre}`);
  const srv_name   = await askPrompt("📝 Nombre del Servidor (ej: Servidor Dev (Docker))", existente.NAME || `Servidor ${nombre.toUpperCase()}`);
  const srv_region = await askPrompt("🌍 Región (ej: Desarrollo, Global / Cloud)", existente.REGION || "Desarrollo");
  const tenant_id  = await askPrompt("🏢 Tenant ID (para Pooler/Storage/DB, ej: your-tenant-id)", existente.POOLER_TENANT_ID || existente.TENANT_ID || "your-tenant-id");

  const defDom = (existente.SUPABASE_PUBLIC_URL || "localhost").split("://").pop()?.split(":")[0] || "localhost";
  const dominio    = await askPrompt("🌐 Dominio o IP", defDom);

  const defPort = existente.API_EXTERNAL_URL ? existente.API_EXTERNAL_URL.split(":").pop() || "8000" : "8000";
  const puerto     = await askPrompt("🔌 Puerto API", defPort);

  const defStudio = existente.SITE_URL ? existente.SITE_URL.split(":").pop() || "3000" : "3000";
  const studio     = await askPrompt("🖥  Puerto Studio", defStudio);

  const dash_user = await askPrompt("👤 Usuario Dashboard", existente.DASHBOARD_USERNAME || "supabase");
  const dash_pass = await askPrompt("🔑 Clave Dashboard", existente.DASHBOARD_PASSWORD || "");

  const schema = (dominio.includes(".") && !dominio.startsWith("192.") && dominio !== "localhost") ? "https" : "http";
  const api_url = `${schema}://${dominio}:${puerto}`;
  const site_url = `${schema}://${dominio}:${studio}`;

  const headerText = `# === [ SERVIDOR: ${nombre} ] ===`;
  await using fileHandle = await fs.open(ARCHIVO_MAESTRO, 'r+');
  let contenido = await fileHandle.readFile({ encoding: 'utf-8' });

  if (!contenido.includes(headerText)) {
    if (contenido && !contenido.endsWith('\n')) contenido += '\n';
    contenido += `\n${headerText}\n`;
  }

  const actualizaciones: Record<string, string> = {
    [`${prefix}ID`]:                  srv_id,
    [`${prefix}NAME`]:                srv_name,
    [`${prefix}REGION`]:              srv_region,
    [`${prefix}TENANT_ID`]:           tenant_id,
    [`${prefix}SUPABASE_PUBLIC_URL`]: api_url,
    [`${prefix}API_EXTERNAL_URL`]:    api_url,
    [`${prefix}SITE_URL`]:            site_url,
    [`${prefix}DASHBOARD_USERNAME`]:  dash_user,
    [`${prefix}DASHBOARD_PASSWORD`]:  dash_pass,
  };

  for (const [k, v] of Object.entries(actualizaciones)) {
    contenido = setEnvVar(contenido, k, v, headerText);
  }

  await fileHandle.truncate(0);
  await fileHandle.write(contenido, 0, 'utf-8');

  info("Generando claves criptográficas seguras...");
  const freshEnv = await parseMasterEnv();
  await ensureServerKeys(nombre, freshEnv);

  ok(`Servidor '${nombre}' configurado completamente en el maestro.`);
  info("Usá 'generar' cuando quieras producir el archivo .env final para el servidor remoto.");
}

async function construir(tag = "latest") {
  header("Docker: Construir");
  const env = await parseMasterEnv();
  const user = env.DOCKER_USER;
  const repo = env.DOCKER_REPO_DB;
  if (!user || !repo) {
    warn("DOCKER_USER o DOCKER_REPO_DB no están configurados en el maestro.");
    return;
  }
  const img = `${user}/${repo}:${tag}`;
  run(["docker", "build", "-t", img, "."], CARPETA_DOCKER);
  ok(`Imagen: ${img}`);
}

async function publicar(tag = "latest") {
  header("Docker: Publicar");
  const env = await parseMasterEnv();
  const user = env.DOCKER_USER;
  const repo = env.DOCKER_REPO_DB;
  if (!user || !repo) {
    warn("DOCKER_USER o DOCKER_REPO_DB no están configurados.");
    return;
  }
  const img = `${user}/${repo}:${tag}`;
  info("Iniciando sesión en Docker Hub...");
  run(["docker", "login"]);
  run(["docker", "push", img]);
  ok(`Publicada: ${img}`);
}

async function liberar(tag = "latest") {
  await construir(tag);
  await publicar(tag);
}

async function todo(tag = "latest") {
  await clonar();
  await generar();
  await construir(tag);
  await publicar(tag);
}

function syncOfficialServers() {
  info("Sincronizando official_servers.ts con el .env maestro...");
  run(["npm", "run", "servers:configure"], undefined, false);
}

// ── Punto de Entrada CLI de Node.js ──────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'listar';
  const tagArg = args.find(a => a.startsWith('--tag='));
  const tag = tagArg ? tagArg.split('=')[1] || 'latest' : 'latest';

  switch (cmd) {
    case 'list':
      await listar();
      break;
    case 'clone':
      await clonar();
      break;
    case 'generate':
      await generar();
      syncOfficialServers();
      break;
    case 'add':
      await agregar();
      syncOfficialServers();
      break;
    case 'build':
      await construir(tag);
      break;
    case 'publish':
      await publicar(tag);
      break;
    case 'release':
      await liberar(tag);
      break;
    case 'all':
      await todo(tag);
      syncOfficialServers();
      break;
    case '-h':
    case '--help':
    case '--ayuda':
      console.log(`🐘 Poké Vicio - Gestor de Despliegues Supabase Multi-Servidor (Node.js 26+)

Uso:
  npm run supabase:manage [comando] [--tag=latest]

Comandos:
  list         Muestra los servidores configurados en el .env maestro (por defecto).
  add          Asistente interactivo para configurar un nuevo servidor.
  clone        Descarga Supabase oficial y genera el Dockerfile personalizado.
  generate     Genera los archivos .env y docker-compose.yml para cada servidor.
  build        Construye la imagen Docker personalizada.
  publish      Sube la imagen Docker a Docker Hub.
  release      Atajo para construir y publicar en un paso.
  all          Clona, genera, construye y publica la imagen en un solo paso.`);
      break;
    default:
      console.error(`Comando desconocido: ${cmd}. Usa --help para ver la lista de comandos.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(styleText(['bold', 'red'], `❌ Error fatal: ${err.message}`));
  process.exit(1);
});
