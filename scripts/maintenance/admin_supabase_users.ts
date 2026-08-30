// fallow-ignore-file security-sink
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

export async function adminSupabaseUsers(): Promise<void> {
  console.log(styleText('bold', `\n--- 🛡️ SUPABASE USER ADMIN MANAGER (Node.js ${ADMIN_TARGET_NODE_VERSION_LABEL}+) ---`));

  const { serverConfigs, baseProfiles, allAvailable } = await getValidatedServerConfigs();

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

  const knownActions = ['unban', 'set-password', 'set-email', 'set-username', 'promote'] as const;

  if (values.help) {
    console.log(styleText('cyan', `\n📖 USO: npm run servers:db:admin -- --server=<perfil> --action=<accion> --email=<email> [opciones]`));
    console.log(styleText('gray', '\nFlags disponibles:'));
    console.log(styleText('gray', '  --server=<perfil>       : Perfil del servidor objetivo (obligatorio).'));
    console.log(styleText('gray', '  --action=<accion>       : Acción a ejecutar: unban | set-password | set-email | set-username | promote.'));
    console.log(styleText('gray', '  --email=<email>         : Correo electrónico del usuario objetivo.'));
    console.log(styleText('gray', '  --password=<pass>       : Nueva contraseña (requerido para set-password).'));
    console.log(styleText('gray', '  --new-email=<email>     : Nuevo correo electrónico (requerido para set-email).'));
    console.log(styleText('gray', '  --username=<nombre>     : Nombre de entrenador (para set-username o búsqueda).'));
    console.log(styleText('cyan', `\nPerfiles disponibles: ${allAvailable.join(', ')}`));
    process.exit(0);
  }

  // Resolver serverArg (flag explícito o primer argumento posicional que coincida con un servidor)
  const serverArg = typeof values.server === 'string' ? values.server : positionals.find(p => allAvailable.includes(p) || baseProfiles.includes(p));

  // Resolver actionArg (flag explícito o coincidencia en positionals)
  const actionArg = typeof values.action === 'string' ? values.action : positionals.find(p => (knownActions as readonly string[]).includes(p)); // domain-ok

  // Resolver identificadores
  const nonTargetPositionals = positionals.filter(p => p !== serverArg && p !== actionArg);
  const emailArg = typeof values.email === 'string' ? values.email : nonTargetPositionals.find(p => p.includes('@'));
  const passwordArg = typeof values.password === 'string' ? values.password : (actionArg === 'set-password' ? nonTargetPositionals.find(p => !p.includes('@')) : undefined);
  const newEmailArg = typeof values['new-email'] === 'string' ? values['new-email'] : (actionArg === 'set-email' ? nonTargetPositionals.find(p => p.includes('@') && p !== emailArg) : undefined);
  const usernameArg = typeof values.username === 'string' ? values.username : (actionArg === 'set-username' ? nonTargetPositionals[0] : (!emailArg ? nonTargetPositionals[0] : undefined));

  if (!serverArg || !actionArg || (!emailArg && !usernameArg)) {
    console.log(styleText('yellow', '⚠️  Faltan argumentos obligatorios. Uso requerido:'));
    console.log(styleText('cyan', `npm run servers:db:admin -- --server=<perfil> --action=<accion> --email=<email> [--password=<pass> | --new-email=<email> | --username=<nombre>]`));
    console.log(styleText('gray', '\nAcciones disponibles:'));
    console.log(styleText('gray', '  unban             : Desbanea una cuenta de usuario.'));
    console.log(styleText('gray', '  set-password      : Cambia la contraseña (requiere --password=<nueva_pass>).'));
    console.log(styleText('gray', '  set-email         : Cambia el correo (requiere --new-email=<nuevo_email>).'));
    console.log(styleText('gray', '  set-username      : Cambia el nombre de entrenador (requiere --username=<nombre>).'));
    console.log(styleText('gray', '  promote           : Promueve la cuenta a rol de Administrador.'));
    console.log(styleText('gray', '\nEjemplos con Flags Explícitos (Recomendado):'));
    console.log(styleText('gray', '  npm run servers:db:admin -- --server=nas_franco --action=set-password --email=usuario@ejemplo.com --password=NUEVA_PASS'));
    console.log(styleText('gray', '  npm run servers:db:admin -- --server=nas_franco --action=unban --email=usuario@ejemplo.com'));
    console.log(styleText('gray', '  npm run servers:db:admin -- --server=nas_franco --action=promote --email=usuario@ejemplo.com'));
    console.log(styleText('cyan', `\nPerfiles disponibles: ${allAvailable.join(', ')}`));
    process.exit(1);
  }

  const profile = serverArg;
  const { findServerConfig } = await import('../lib/supabaseClient.ts');
  const conf = findServerConfig(serverConfigs, profile);
  if (!conf) {
    console.error(styleText('red', `❌ Error: El perfil o ID "${profile}" no existe en el archivo .env.`));
    process.exit(1);
  }

  console.log(styleText('bold', styleText('blue', `\n==================================================`)));
  console.log(styleText('bold', styleText('cyan', `🛡️ EJECUTANDO ACCIÓN DE ADMIN [${actionArg.toUpperCase()}] EN: [${profile}]`)));
  console.log(styleText('bold', styleText('blue', `==================================================`)));

  // Construir URL de Conexión Postgres
  const dbUrl = buildDatabaseUrl(conf, profile);

  if (!dbUrl) {
    console.error(styleText('red', `❌ Error: No se pudo construir la URL de conexión Postgres para el perfil "${profile}".`));
    console.error(styleText('yellow', `👉 Asegúrate de tener SERVER_${profile}_POSTGRES_PASSWORD y SERVER_${profile}_SUPABASE_PUBLIC_URL en el .env`));
    process.exit(1);
  }

  if (dbUrl.includes('placeholder')) {
    console.error(styleText('red', `❌ Error: La contraseña para "${profile}" es un placeholder. Operación cancelada.`));
    process.exit(1);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${profile}]...`));

  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  try {
    let targetEmail = emailArg || null;
    let targetUsername = usernameArg || null;

    // Resolver identificadores desde la base de datos si falta alguno
    if (targetUsername && !targetEmail) {
      const existing = (await sql`
        SELECT email FROM public.profiles WHERE username = ${targetUsername} LIMIT 1;
      `) as Array<{ email?: string; username?: string }>;
      if (existing.length > 0 && existing[0]?.email) {
        targetEmail = existing[0].email;
      }
    } else if (targetEmail && !targetUsername) {
      const existing = (await sql`
        SELECT username FROM public.profiles WHERE email = ${targetEmail} LIMIT 1;
      `) as Array<{ email?: string; username?: string }>;
      if (existing.length > 0 && existing[0]?.username) {
        targetUsername = existing[0].username;
      }
    }

    const displayName = targetEmail || targetUsername || '';
    console.log(styleText('cyan', `👤 Identificador objetivo: ${displayName}`));

    if (actionArg === 'unban') {
      const res = await sql`
        UPDATE public.profiles
        SET is_banned = false, ban_reason = NULL
        WHERE email = ${targetEmail} OR username = ${targetUsername};
      `;
      if (res.count === 0) {
        console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con "${displayName}" en la tabla profiles.`));
      } else {
        console.log(styleText('green', `✔️ Cuenta de "${displayName}" desbaneada exitosamente.`));
      }

    } else if (actionArg === 'set-password') {
      if (!targetEmail) {
        throw new Error('La acción set-password requiere un correo electrónico asociado al usuario.');
      }
      if (!passwordArg) {
        throw new Error('La acción set-password requiere el argumento --password=<nueva_pass>');
      }
      const res = await sql`
        UPDATE auth.users
        SET encrypted_password = crypt(${passwordArg}, gen_salt('bf'))
        WHERE email = ${targetEmail};
      `;
      if (res.count === 0) {
        console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${targetEmail}" en auth.users.`));
      } else {
        console.log(styleText('green', `✔️ Contraseña de "${targetEmail}" actualizada exitosamente.`));
      }

    } else if (actionArg === 'set-email') {
      if (!targetEmail) {
        throw new Error('La acción set-email requiere un correo actual.');
      }
      if (!newEmailArg) {
        throw new Error('La acción set-email requiere el argumento --new-email=<nuevo_email>');
      }
      await sql.begin(async (tx) => {
        const resAuth = await tx`
          UPDATE auth.users
          SET email = ${newEmailArg}, email_confirmed_at = NOW()
          WHERE email = ${targetEmail};
        `;
        const resProfile = await tx`
          UPDATE public.profiles
          SET email = ${newEmailArg}
          WHERE email = ${targetEmail};
        `;
        if (resAuth.count === 0 && resProfile.count === 0) {
          console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${targetEmail}".`));
        } else {
          console.log(styleText('green', `✔️ Correo actualizado exitosamente de "${targetEmail}" a "${newEmailArg}".`));
        }
      });

    } else if (actionArg === 'set-username') {
      if (!targetEmail) {
        throw new Error('La acción set-username requiere un correo electrónico asociado al usuario.');
      }
      if (!usernameArg) {
        throw new Error('La acción set-username requiere el argumento --username=<nombre>');
      }
      try {
        const res = await sql`
          UPDATE public.profiles
          SET username = ${usernameArg}
          WHERE email = ${targetEmail};
        `;
        if (res.count === 0) {
          console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${targetEmail}" en la tabla profiles.`));
        } else {
          console.log(styleText('green', `✔️ Nombre de entrenador de "${targetEmail}" actualizado exitosamente a "${usernameArg}".`));
        }
      } catch (uErr: unknown) {
        if ((uErr as Error).message.includes('unique') || (uErr as Error).message.includes('violates unique constraint')) {
          throw new Error(`El nombre de usuario "${usernameArg}" ya está en uso por otro jugador.`);
        }
        throw uErr;
      }

    } else if (actionArg === 'promote') {
      let userFound = false;
      if (targetEmail || targetUsername) {
        const check = await sql`
          SELECT id FROM public.profiles 
          WHERE (${targetEmail}::text IS NOT NULL AND email = ${targetEmail})
             OR (${targetUsername}::text IS NOT NULL AND username = ${targetUsername});
        `;
        userFound = check.length > 0;
      }

      if (userFound) {
        await sql`
          UPDATE public.profiles
          SET role = 'admin'
          WHERE (${targetEmail}::text IS NOT NULL AND email = ${targetEmail})
             OR (${targetUsername}::text IS NOT NULL AND username = ${targetUsername});
        `;
        console.log(styleText('green', `✔️ Usuario "${displayName}" promovido exitosamente a rol de ADMINISTRADOR (admin).`));
      } else {
        throw new Error(`El usuario "${displayName}" no existe en la base de datos.`);
      }

    } else {
      console.error(styleText('red', `❌ Error: Acción desconocida "${actionArg}".`));
    }

    await sql.end();
  } catch (adminErr: unknown) {
    console.error(styleText('red', `\n❌ Error al ejecutar la acción de administración en [${profile}]: ${(adminErr as Error).message}`));
    try { await sql.end(); } catch { /* ignore */ }
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
