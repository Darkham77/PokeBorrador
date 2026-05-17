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

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import postgres from 'postgres';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const ENV_FILE = path.resolve(process.cwd(), '.env');

export async function adminSupabaseUsers() {
  console.log(styleText('bold', '\n--- 🛡️ SUPABASE USER ADMIN MANAGER (Node.js 26+) ---'));

  try {
    await fsPromises.access(ENV_FILE);
  } catch {
    console.error(styleText('red', '❌ Error: Archivo .env maestro no encontrado.'));
    process.exit(1);
  }

  let envContent = '';
  try {
    // Uso de Explicit Resource Management (await using) para la lectura del .env
    await using fileHandle = await fsPromises.open(ENV_FILE, 'r');
    envContent = await fileHandle.readFile({ encoding: 'utf-8' });
  } catch (e: unknown) {
    console.error(styleText('red', `❌ Error al leer el archivo .env: ${(e as Error).message}`));
    process.exit(1);
  }

  const lines = envContent.split('\n');
  const serverConfigs: Record<string, Record<string, string>> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      const fullKey = match[1].trim();
      let value = match[2].trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (fullKey.startsWith('SERVER_')) {
        const parts = fullKey.split('_');
        const profile = parts[1];
        if (parts.length >= 3 && profile !== undefined) {
          const cleanKey = parts.slice(2).join('_');
          if (!serverConfigs[profile]) {
            serverConfigs[profile] = {};
          }
          const targetConf = serverConfigs[profile];
          if (targetConf) {
            targetConf[cleanKey] = value;
          }
        }
      }
    }
  }

  const baseProfiles = Object.keys(serverConfigs);
  if (baseProfiles.length === 0) {
    console.error(styleText('red', '❌ Error: No se encontraron configuraciones de servidor (SERVER_<profile>_*) en el .env.'));
    process.exit(1);
  }

  const allAvailable = Array.from(new Set(baseProfiles.concat(Object.values(serverConfigs).map(c => c.ID).filter(Boolean) as string[])));

  // Parsear argumentos de la línea de comandos
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.findIndex(a => a === flag);
    if (idx !== -1 && args[idx + 1] !== undefined) {
      return args[idx + 1];
    }
    return args.find(a => a.startsWith(`${flag}=`))?.split('=')[1];
  };

  const serverArg = getArg('--server');
  const actionArg = getArg('--action');
  const emailArg = getArg('--email');
  const passwordArg = getArg('--password');
  const newEmailArg = getArg('--new-email');
  const usernameArg = getArg('--username');

  if (!serverArg || !actionArg || !emailArg) {
    console.log(styleText('yellow', '⚠️  Faltan argumentos obligatorios. Uso requerido:'));
    console.log(styleText('cyan', `npm run servers:db:admin -- --server=<perfil> --action=<accion> --email=<email>`));
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
  let dbUrl = conf.DATABASE_URL || conf.POSTGRES_URL || conf.PG_URL || '';
  if (!dbUrl) {
    const pass = conf.POSTGRES_PASSWORD || conf.DB_PASSWORD || '';
    const rawPubUrl = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || conf.SITE_URL || conf.API_EXTERNAL_URL || conf.URL || '';
    if (rawPubUrl && pass) {
      try {
        const u = new URL(rawPubUrl);
        let host = u.hostname;
        let port = '5432';
        if (host.endsWith('.supabase.co')) {
          const ref = conf.TENANT_ID || conf.POOLER_TENANT_ID || host.split('.')[0] || 'postgres';
          host = `db.${host.split('.')[0]}.supabase.co`;
          console.log(styleText('cyan', `🏷️  Tenant ID / Project Ref detectado para [${profile}]: ${ref}`));
          dbUrl = `postgres://postgres:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        } else {
          port = conf.POSTGRES_PORT || conf.DB_PORT || '5432';
          const tenant = conf.TENANT_ID || conf.POOLER_TENANT_ID || 'your-tenant-id';
          console.log(styleText('cyan', `🏷️  Tenant ID detectado para [${profile}]: ${tenant}`));
          dbUrl = `postgres://postgres.${tenant}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        }
      } catch {
        // ignore
      }
    }
  }

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
    console.log(styleText('cyan', `👤 Usuario objetivo: ${emailArg}`));

    if (actionArg === 'unban') {
      const res = await sql`
        UPDATE public.profiles
        SET is_banned = false, ban_reason = NULL
        WHERE email = ${emailArg};
      `;
      if (res.count === 0) {
        console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${emailArg}" en la tabla profiles.`));
      } else {
        console.log(styleText('green', `✔️ Cuenta de "${emailArg}" desbaneada exitosamente.`));
      }

    } else if (actionArg === 'set-password') {
      if (!passwordArg) {
        throw new Error('La acción set-password requiere el argumento --password=<nueva_pass>');
      }
      const res = await sql`
        UPDATE auth.users
        SET encrypted_password = crypt(${passwordArg}, gen_salt('bf'))
        WHERE email = ${emailArg};
      `;
      if (res.count === 0) {
        console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${emailArg}" en auth.users.`));
      } else {
        console.log(styleText('green', `✔️ Contraseña de "${emailArg}" actualizada exitosamente.`));
      }

    } else if (actionArg === 'set-email') {
      if (!newEmailArg) {
        throw new Error('La acción set-email requiere el argumento --new-email=<nuevo_email>');
      }
      await sql.begin(async (tx) => {
        const resAuth = await tx`
          UPDATE auth.users
          SET email = ${newEmailArg}, email_confirmed_at = NOW()
          WHERE email = ${emailArg};
        `;
        const resProfile = await tx`
          UPDATE public.profiles
          SET email = ${newEmailArg}
          WHERE email = ${emailArg};
        `;
        if (resAuth.count === 0 && resProfile.count === 0) {
          console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${emailArg}".`));
        } else {
          console.log(styleText('green', `✔️ Correo actualizado exitosamente de "${emailArg}" a "${newEmailArg}".`));
        }
      });

    } else if (actionArg === 'set-username') {
      if (!usernameArg) {
        throw new Error('La acción set-username requiere el argumento --username=<nombre>');
      }
      try {
        const res = await sql`
          UPDATE public.profiles
          SET username = ${usernameArg}
          WHERE email = ${emailArg};
        `;
        if (res.count === 0) {
          console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${emailArg}" en la tabla profiles.`));
        } else {
          console.log(styleText('green', `✔️ Nombre de entrenador de "${emailArg}" actualizado exitosamente a "${usernameArg}".`));
        }
      } catch (uErr: unknown) {
        if ((uErr as Error).message.includes('unique') || (uErr as Error).message.includes('violates unique constraint')) {
          throw new Error(`El nombre de usuario "${usernameArg}" ya está en uso por otro jugador.`);
        }
        throw uErr;
      }

    } else if (actionArg === 'promote') {
      const res = await sql`
        UPDATE public.profiles
        SET role = 'admin'
        WHERE email = ${emailArg};
      `;
      if (res.count === 0) {
        console.log(styleText('yellow', `⚠️  No se encontró ningún usuario con el correo "${emailArg}" en la tabla profiles.`));
      } else {
        console.log(styleText('green', `✔️ Usuario "${emailArg}" promovido exitosamente a rol de ADMINISTRADOR (admin).`));
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
    console.error(styleText('red', `❌ Error fatal: ${err.message}`));
    process.exit(1);
  });
}
