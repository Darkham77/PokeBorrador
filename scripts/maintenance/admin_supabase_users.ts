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

import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

const ADMIN_TARGET_NODE_VERSION_LABEL = '26';
import postgres from 'postgres';
import { buildDatabaseUrl, getValidatedServerConfigs } from '../lib/supabaseClient.ts';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

export async function adminSupabaseUsers(): Promise<void> {
  console.log(styleText('bold', `\n--- 🛡️ SUPABASE USER ADMIN MANAGER (Node.js ${ADMIN_TARGET_NODE_VERSION_LABEL}+) ---`));

  const { serverConfigs, baseProfiles } = await getValidatedServerConfigs();

  const allAvailable = Array.from(new Set(baseProfiles.concat(Object.values(serverConfigs).map(c => c.ID).filter(Boolean) as string[])));

  const args = process.argv.slice(2);
  const { parseServerArguments } = await import('../database/backup_supabase_db.ts');
  const targetProfiles = parseServerArguments(args, baseProfiles, allAvailable);
  const serverArg = targetProfiles[0];
  const getArg = (flag: string): string | undefined => {
    const idx = args.findIndex(a => a === flag);
    if (idx !== -1 && args[idx + 1] !== undefined) {
      return args[idx + 1];
    }
    return args.find(a => a.startsWith(`${flag}=`))?.split('=')[1];
  };

  const actionArg = getArg('--action');
  const emailArg = getArg('--email');
  const passwordArg = getArg('--password');
  const newEmailArg = getArg('--new-email');
  const usernameArg = getArg('--username');

  if (!serverArg || !actionArg || (!emailArg && !usernameArg)) {
    console.log(styleText('yellow', '⚠️  Faltan argumentos obligatorios. Uso requerido:'));
    console.log(styleText('cyan', `npm run servers:db:admin -- --server=<perfil> --action=<accion> [--email=<email> | --username=<username>]`));
    console.log(styleText('gray', '\nAcciones disponibles:'));
    console.log(styleText('gray', '  --action=unban             : Desbanea una cuenta de usuario.'));
    console.log(styleText('gray', '  --action=set-password      : Cambia la contraseña (requiere --password=<nueva_pass>).'));
    console.log(styleText('gray', '  --action=set-email         : Cambia el correo (requiere --new-email=<nuevo_email>).'));
    console.log(styleText('gray', '  --action=set-username      : Cambia el nombre de entrenador (requiere --username=<nombre>).'));
    console.log(styleText('gray', '  --action=promote           : Otorga rol de administrador (ADMIN) al usuario.'));
    console.log(styleText('cyan', `\nPerfiles disponibles: ${allAvailable.join(', ')}`));
    process.exit(1);
  }

  const profile = serverArg;
  let conf = serverConfigs[profile];
  if (!conf) {
    const found = Object.keys(serverConfigs).find(p => serverConfigs[p]?.ID === profile);
    if (found) conf = serverConfigs[found];
  }
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
