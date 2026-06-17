import { createClient, type PostgrestError } from '@supabase/supabase-js';
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
  
  let profile: { id: string, username: string } | null = null;
  
  // Buscar por ID primero, luego por nombre actual
  const { data: firstCheck, error: firstError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', targetUser)
    .single();

  const err1 = firstError as PostgrestError | null;
  const data1 = firstCheck as { id: string, username: string } | null;

  if (err1 || !data1) {
    console.log(`No encontrado por ID. Buscando por nombre de usuario...`);
    const { data: profilesByName, error: errByName } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', targetUser);
      
    const err2 = errByName as PostgrestError | null;
    const data2 = profilesByName as { id: string, username: string }[] | null;
      
    if (err2 || !data2 || data2.length === 0) {
      console.error(`❌ Usuario no encontrado.`);
      process.exit(1);
    }
    
    if (data2.length > 1) {
      console.error(`❌ Hay múltiples usuarios con el nombre '${targetUser}'. Usa su ID explícito.`);
      data2.forEach(p => console.log(`   - ID: ${p.id} | Nombre: ${p.username}`));
      process.exit(1);
    }
    
    profile = data2[0] || null;
  } else {
    profile = data1;
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
