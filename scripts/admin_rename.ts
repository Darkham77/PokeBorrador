import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Falta configuración de Supabase. Revisa VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { positionals } = parseArgs({
    allowPositionals: true,
  });

  if (positionals.length < 2) {
    console.log("Uso: npm run admin:rename <user_id_o_nombre_actual> <nuevo_nombre>");
    console.log("Ejemplo: npm run admin:rename franco_id Ash");
    process.exit(1);
  }

  const [targetUserArg, newNameArg] = positionals;
  const targetUser = String(targetUserArg);
  const newName = String(newNameArg);

  console.log(`Buscando usuario: ${targetUser}...`);
  
  // Buscar por ID primero, luego por nombre actual
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', targetUser)
    .single() as { data: { id: string, username: string } | null, error: any };

  if (error || !profile) {
    console.log(`No encontrado por ID. Buscando por nombre de usuario...`);
    const { data: profilesByName, error: errByName } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', targetUser) as { data: { id: string, username: string }[] | null, error: any };
      
    if (errByName || !profilesByName || profilesByName.length === 0) {
      console.error(`❌ Usuario no encontrado.`);
      process.exit(1);
    }
    
    if (profilesByName.length > 1) {
      console.error(`❌ Hay múltiples usuarios con el nombre '${targetUser}'. Usa su ID explícito.`);
      profilesByName.forEach(p => console.log(`   - ID: ${p.id} | Nombre: ${p.username}`));
      process.exit(1);
    }
    
    profile = profilesByName[0] as { id: string, username: string };
  }

  console.log(`✅ Perfil encontrado: ID ${profile!.id} (Nombre actual: ${profile!.username})`);
  console.log(`⏳ Cambiando nombre a '${newName}'...`);

  // Ignorar el límite de 30 días estableciendo la fecha en null (o simplemente dejándola)
  // ya que este script es de administrador.
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      username: newName,
      last_renamed_at: null // Reseteamos el cooldown por ser cambio de admin
    })
    .eq('id', profile!.id);

  if (updateError) {
    console.error(`❌ Error al actualizar el nombre:`, updateError);
    process.exit(1);
  }

  console.log(`✅ ¡Nombre cambiado con éxito a '${newName}' para el usuario ${profile!.id}!`);
}

main().catch(console.error);
