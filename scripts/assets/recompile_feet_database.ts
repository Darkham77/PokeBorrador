/**
 * scripts/assets/recompile_feet_database.ts
 *
 * Standalone CLI script to recompile static feet databases (pokemonFeetDatabase.json / .ts)
 * without performing expensive image or WebP asset conversions.
 */

import { regenerateFeetDatabase } from './helpers/catalogGenerators.ts';

async function main() {
  console.log('⚡ Iniciando recompilación rápida de base de datos estática de pies y sombras...');
  await regenerateFeetDatabase((progress, message) => {
    console.log(`[${progress}%] ${message}`);
  });
  console.log('✅ Recompilación completada con éxito.');
}

main().catch(err => {
  console.error('❌ Error recompilando base de datos de pies:', err);
  process.exit(1);
});
