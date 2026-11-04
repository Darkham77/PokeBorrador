/**
 * scripts/assets/recompile_feet_database.ts
 *
 * Standalone CLI script to recompile static feet databases (pokemonFeetDatabase.json / .ts)
 * without performing expensive image or WebP asset conversions.
 */

import { isMainModule } from '@francogp/auditor';
import { defineCommand, runMain } from 'citty';

import { regenerateFeetDatabase } from './helpers/catalogGenerators.ts';

export async function recompileFeetDatabase(): Promise<void> {
  console.log('⚡ Iniciando recompilación rápida de base de datos estática de pies y sombras...');
  await regenerateFeetDatabase((progress, message) => {
    console.log(`[${progress}%] ${message}`);
  });
  console.log('✅ Recompilación completada con éxito.');
}

export const command = defineCommand({
  meta: {
    name: 'recompile-feet-database',
    description: 'Recompila la base de datos estática de pies y sombras'
  },
  async run() {
    await recompileFeetDatabase();
  }
});

if (isMainModule(import.meta.url)) {
  void runMain(command);
}
