/**
 * @file admin_supabase_users.ts
 * @description Script automático de administración de usuarios Supabase (Nube o NAS),
 * permitiendo desbanear, cambiar contraseñas, actualizar correos, cambiar nombres de usuario
 * y promover a rol de administrador directamente desde la CLI, sin necesidad de escribir código SQL manual.
 * 
 * UTILIDAD:
 * Reemplaza las consultas manuales de las Secciones 7 y 8 del README mediante comandos limpios:
 * --server=<perfil> --action=<unban|set-password|set-email|set-username|promote> --email=<email> [...]
 * 
 * CUMPLE CON:
 * - Regla de Aislamiento y Parseo Multi-Servidor (env-multi-server-parser).
 * - Estándares Node.js 26+ (Explicit Resource Management con 'using', prefijos node:).
 * - Arquitectura Zero-Warning y Zero-Any.
 */

import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';

const ADMIN_TARGET_NODE_VERSION_LABEL = '26';
import postgres from 'postgres';
import { buildDatabaseUrl, getValidatedServerConfigs } from '../lib/supabaseClient.ts';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

interface AdminParsedArgs {
  serverArg?: string;
  actionArg?: string;
  emailArg?: string;
  passwordArg?: string;
  newEmailArg?: string;
  usernameArg?: string;
  isHelp: boolean;
}

const KNOWN_ADMIN_ACTIONS = ['unban', 'set-password', 'set-email', 'set-username', 'promote'] as const;
export type KnownAdminAction = (typeof KNOWN_ADMIN_ACTIONS)[number];
const KNOWN_ADMIN_ACTIONS_SET: ReadonlySet<string> = new Set(KNOWN_ADMIN_ACTIONS);

function isKnownAdminAction(value: string): value is KnownAdminAction {
  return KNOWN_ADMIN_ACTIONS_SET.has(value);
}

function parseAdminCliArgs(rawArgs: readonly string[], baseProfiles: readonly string[], allAvailable: readonly string[]): AdminParsedArgs {
  const { values, positionals } = parseArgs({
    options: {
      server: { type: 'string', short: 's' },
      action: { type: 'string', short: 'a' },
      email: { type: 'string', short: 'e' },
      password: { type: 'string', short: 'p' },
      'new-email': { type: 'string' },
      username: { type: 'string', short: 'u' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true,
    strict: false
  });

  const isHelp = Boolean(values.help || rawArgs.includes('help') || rawArgs.includes('--help') || rawArgs.includes('-h'));

  const getParam = (key: string, shortKey?: string): string | undefined => {
    if (typeof values[key] === 'string') return values[key] as string;
    if (shortKey && typeof values[shortKey] === 'string') return values[shortKey] as string;
    for (const arg of rawArgs) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        const k = arg.substring(0, eq).replace(/^--?/, '');
        if (k === key || (shortKey && k === shortKey)) return arg.substring(eq + 1);
      }
    }
    return undefined;
  };

  const serverArg = getParam('server', 's') || positionals.find(p => allAvailable.includes(p) || baseProfiles.includes(p));
  const actionArg = getParam('action', 'a') || positionals.find(isKnownAdminAction);
  const nonTarget = positionals.filter(p => p !== serverArg && p !== actionArg && !p.includes('='));
  const emailArg = getParam('email', 'e') || nonTarget.find(p => p.includes('@'));
  const passwordArg = getParam('password', 'p') || (actionArg === 'set-password' ? nonTarget.find(p => !p.includes('@')) : undefined);
  const newEmailArg = getParam('new-email') || (actionArg === 'set-email' ? nonTarget.find(p => p.includes('@') && p !== emailArg) : undefined);
  const usernameArg = getParam('username', 'u') || (actionArg === 'set-username' ? nonTarget[0] : (!emailArg ? nonTarget[0] : undefined));

  return { serverArg, actionArg, emailArg, passwordArg, newEmailArg, usernameArg, isHelp };
}

async function resolveUserIdentifiers(
  sql: postgres.Sql,
  emailArg?: string,
  usernameArg?: string
): Promise<{ targetEmail: string | null; targetUsername: string | null }> {
  let targetEmail = emailArg || null;
  let targetUsername = usernameArg || null;

  if (targetUsername && !targetEmail) {
    const existing = await sql<Array<{ email?: string }>>`
      SELECT email FROM public.profiles WHERE username = ${targetUsername} LIMIT 1;
    `;
    if (existing.length > 0 && existing[0]?.email) targetEmail = existing[0].email;
  } else if (targetEmail && !targetUsername) {
    const existing = await sql<Array<{ username?: string }>>`
      SELECT username FROM public.profiles WHERE email = ${targetEmail} LIMIT 1;
    `;
    if (existing.length > 0 && existing[0]?.username) targetUsername = existing[0].username;
  }
  return { targetEmail, targetUsername };
}

async function handleUnban(sql: postgres.Sql, targetEmail: string | null, targetUsername: string | null, displayName: string): Promise<void> {
  const res = await sql`
    UPDATE public.profiles SET is_banned = false, ban_reason = NULL
    WHERE email = ${targetEmail} OR username = ${targetUsername};
  `;
  if (res.count === 0) {
    console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con "${displayName}" en la tabla profiles.`));
  } else {
    console.log(styleText('green', `✔️ Cuenta de "${displayName}" desbaneada exitosamente.`));
  }
}

async function handleSetPassword(sql: postgres.Sql, targetEmail: string | null, passwordArg?: string): Promise<void> {
  if (!targetEmail) throw new Error('La acción set-password requiere un correo electrónico asociado al usuario.');
  if (!passwordArg) throw new Error('La acción set-password requiere el argumento --password=<nueva_pass>');
  const res = await sql`
    UPDATE auth.users SET encrypted_password = crypt(${passwordArg}, gen_salt('bf')) WHERE email = ${targetEmail};
  `;
  if (res.count === 0) {
    console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${targetEmail}" en auth.users.`));
  } else {
    console.log(styleText('green', `✔️ Contraseña de "${targetEmail}" actualizada exitosamente.`));
  }
}

async function handleSetEmail(sql: postgres.Sql, targetEmail: string | null, newEmailArg?: string): Promise<void> {
  if (!targetEmail) throw new Error('La acción set-email requiere un correo actual.');
  if (!newEmailArg) throw new Error('La acción set-email requiere el argumento --new-email=<nuevo_email>');
  await sql.begin(async (tx) => {
    const resAuth = await tx`UPDATE auth.users SET email = ${newEmailArg}, email_confirmed_at = NOW() WHERE email = ${targetEmail};`;
    const resProfile = await tx`UPDATE public.profiles SET email = ${newEmailArg} WHERE email = ${targetEmail};`;
    if (resAuth.count === 0 && resProfile.count === 0) {
      console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${targetEmail}".`));
    } else {
      console.log(styleText('green', `✔️ Correo actualizado exitosamente de "${targetEmail}" a "${newEmailArg}".`));
    }
  });
}

async function handleSetUsername(sql: postgres.Sql, targetEmail: string | null, usernameArg?: string): Promise<void> {
  if (!targetEmail) throw new Error('La acción set-username requiere un correo electrónico asociado al usuario.');
  if (!usernameArg) throw new Error('La acción set-username requiere el argumento --username=<nombre>');
  try {
    const res = await sql`UPDATE public.profiles SET username = ${usernameArg} WHERE email = ${targetEmail};`;
    if (res.count === 0) {
      console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${targetEmail}" en la tabla profiles.`));
    } else {
      console.log(styleText('green', `✔️ Nombre de entrenador de "${targetEmail}" actualizado exitosamente a "${usernameArg}".`));
    }
  } catch (uErr: unknown) {
    if ((uErr as Error).message.includes('unique') || (uErr as Error).message.includes('violates unique constraint')) {
      throw new Error(`El nombre de usuario "${usernameArg}" ya está en uso por otro jugador.`, { cause: uErr });
    }
    throw uErr;
  }
}

async function handlePromote(sql: postgres.Sql, targetEmail: string | null, targetUsername: string | null, displayName: string): Promise<void> {
  const check = await sql`
    SELECT id FROM public.profiles 
    WHERE (${targetEmail}::text IS NOT NULL AND email = ${targetEmail})
       OR (${targetUsername}::text IS NOT NULL AND username = ${targetUsername});
  `;
  if (check.length === 0) throw new Error(`El usuario "${displayName}" no existe en la base de datos.`);
  await sql`
    UPDATE public.profiles SET role = 'admin'
    WHERE (${targetEmail}::text IS NOT NULL AND email = ${targetEmail})
       OR (${targetUsername}::text IS NOT NULL AND username = ${targetUsername});
  `;
  console.log(styleText('green', `✔️ Usuario "${displayName}" promovido exitosamente a rol de ADMINISTRADOR (admin).`));
}

async function dispatchAdminAction(
  action: string,
  sql: postgres.Sql,
  targetEmail: string | null,
  targetUsername: string | null,
  displayName: string,
  args: AdminParsedArgs
): Promise<void> {
  switch (action) {
    case 'unban':
      return handleUnban(sql, targetEmail, targetUsername, displayName);
    case 'set-password':
      return handleSetPassword(sql, targetEmail, args.passwordArg);
    case 'set-email':
      return handleSetEmail(sql, targetEmail, args.newEmailArg);
    case 'set-username':
      return handleSetUsername(sql, targetEmail, args.usernameArg);
    case 'promote':
      return handlePromote(sql, targetEmail, targetUsername, displayName);
    default:
      console.error(styleText('red', `❌ Error: Acción desconocida "${action}".`));
  }
}

export async function adminSupabaseUsers(): Promise<void> {
  console.log(styleText('bold', `\n--- 🛡️ SUPABASE USER ADMIN MANAGER (Node.js ${ADMIN_TARGET_NODE_VERSION_LABEL}+) ---`));

  const { serverConfigs, baseProfiles, allAvailable } = await getValidatedServerConfigs();
  const rawArgs = process.argv.slice(2);
  const parsed = parseAdminCliArgs(rawArgs, baseProfiles, allAvailable);

  if (parsed.isHelp) {
    console.log(styleText('cyan', `\n📖 USO: npm run database:admin [server=<perfil>] [action=<accion>] [email=<email>] [password=<pass>]`));
    console.log(styleText('gray', '\nOpciones disponibles:\n  server=<perfil>\n  action=<unban|set-password|set-email|set-username|promote>\n  email=<email>\n  password=<pass>\n  new-email=<email>\n  username=<nombre>'));
    process.exit(0);
  }

  const { serverArg, actionArg, emailArg, usernameArg } = parsed;
  if (!serverArg || !actionArg || (!emailArg && !usernameArg)) {
    console.log(styleText('yellow', '⚠️  Faltan argumentos obligatorios.'));
    console.log(styleText('cyan', `npm run database:admin server=<perfil> action=<accion> email=<email>`));
    process.exit(1);
  }

  const { findServerConfig } = await import('../lib/supabaseClient.ts');
  const conf = findServerConfig(serverConfigs, serverArg);
  if (!conf) {
    console.error(styleText('red', `❌ Error: El perfil "${serverArg}" no existe en el archivo .env.`));
    process.exit(1);
  }

  const dbUrl = buildDatabaseUrl(conf, serverArg);
  if (!dbUrl || dbUrl.includes('placeholder')) {
    console.error(styleText('red', `❌ Error: URL de Postgres inválida para "${serverArg}".`));
    process.exit(1);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${serverArg}]...`));
  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  try {
    const { targetEmail, targetUsername } = await resolveUserIdentifiers(sql, emailArg, usernameArg);
    const displayName = targetEmail || targetUsername || '';
    console.log(styleText('cyan', `👤 Identificador objetivo: ${displayName}`));

    await dispatchAdminAction(actionArg, sql, targetEmail, targetUsername, displayName, parsed);
    await sql.end();
  } catch (adminErr: unknown) {
    console.error(styleText('red', `\n❌ Error al ejecutar la acción de administración en [${serverArg}]: ${(adminErr as Error).message}`));
    try {
      await sql.end();
    } catch {
      // catch-ok: Best-effort closing of postgres connection during failure
    }
    process.exit(1);
  }
}

// Permitir ejecución directa
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('admin_supabase_users.ts') ||
  process.argv[1].includes('admin_supabase_users.ts')
);

if (isDirectRun) {
  adminSupabaseUsers().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${(err as Error).message}`));
    process.exit(1);
  });
}
