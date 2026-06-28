import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Dex } from '@pkmn/sim';

const BACKUP_FILE = path.resolve(process.cwd(), 'scratch/server_franco_backup_migrated.json');

describe('Migrated Player Saves Compatibility Audit', () => {
  it('debería verificar que el backup migrado use exclusivamente IDs de Showdown y sea 100% compatible nativamente con @pkmn/sim', () => {
    // 1. Cargar archivo de backup migrado
    if (!fs.existsSync(BACKUP_FILE)) {
      console.warn(`[SKIP] Backup file not found: ${BACKUP_FILE}`);
      return;
    }

    const rawBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
    const backupData = JSON.parse(rawBackup);
    const gameSaves = backupData.data?.game_saves || [];
    
    expect(gameSaves.length).toBeGreaterThan(0);

    const errors: string[] = [];
    const warnings: string[] = [];

    const gen = Dex;

    // 2. Auditar cada Pokémon
    for (const saveEntry of gameSaves) {
      const userId = saveEntry.user_id;
      const saveData = saveEntry.save_data;
      if (!saveData) continue;

      const team = saveData.team || [];
      const box = saveData.box || [];
      const allPokes = [...team, ...box].filter(Boolean);

      for (const poke of allPokes) {
        const tag = `[User: ${userId}] Pokémon: ${poke.name || poke.id} (Lvl ${poke.level ?? '?'})`;

        // A. Validar Especie
        if (!poke.species) {
          errors.push(`${tag} - Especie (species) indefinida.`);
          continue;
        }

        const species = gen.species.get(poke.species);
        if (!species.exists) {
          errors.push(`${tag} - Especie '${poke.species}' no existe en el Dex de @pkmn/sim.`);
        }

        // B. Validar Habilidad
        if (poke.ability) {
          const ability = gen.abilities.get(poke.ability);
          if (!ability.exists) {
            errors.push(`${tag} - Habilidad '${poke.ability}' no existe en el Dex de @pkmn/sim.`);
          }
        }

        // C. Validar Naturaleza
        if (poke.nature) {
          const validNatures = ['active', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty', 'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky'];
          if (!validNatures.includes(poke.nature)) {
            errors.push(`${tag} - Naturaleza '${poke.nature}' no existe en el Dex de @pkmn/sim.`);
          }
        }

        // D. Validar Movimientos
        const moves = poke.moves || [];
        for (const m of moves) {
          if (!m || !m.id) {
            errors.push(`${tag} - Movimiento sin ID de Showdown.`);
            continue;
          }

          const move = gen.moves.get(m.id);
          if (!move.exists) {
            errors.push(`${tag} - Movimiento '${m.name}' (ID: ${m.id}) no existe en el Dex de @pkmn/sim.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.warn(`[Save Audit] Encontrados ${errors.length} errores de compatibilidad en el backup migrado:\n` + errors.join('\n'));
    }

    expect(errors.length).toBe(0);
    expect(warnings.length).toBe(0);
  });
});
