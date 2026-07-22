// fallow-ignore-file security-sink
/**
 * scripts/validation/validate_moves.ts
 * 
 * MOVE INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates learnset moves against Gen 3 Showdown Dex and local Spanish translations.
 * 
 * Usage: npm run validate:moves
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS } from '../../src/data/system/constants.ts';

enableCompileCache();

// Importar bases de datos locales
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';

import { MOVE_TRANSLATIONS_ES } from '../../src/data/battle/moves.ts';

const UTILS_FILE = path.resolve(process.cwd(), 'src/logic/pokemon/pokemonUtils.ts');

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n--- 🛡️  POKEMON MOVE VALIDATOR (OFFLINE - GEN 3) ---'));

  const errors: string[] = [];
  const warnings: string[] = [];

  // Extraer todos los movimientos de los learnsets de especies habilitadas
  const learnsetMoves = new Set<string>();
  for (const [pokeId, poke] of Object.entries(POKEMON_DB)) {
    if (!ENABLED_POKEMON_IDS.has(pokeId)) continue;
    if (poke.learnset && Array.isArray(poke.learnset)) {
      poke.learnset.forEach((m: { id: string }) => {
        if (m.id && m.id !== 'Unknown') {
          learnsetMoves.add(toID(m.id));
        }
      });
    }
  }

  console.log(`📊 Movimientos en learnsets a validar: ${learnsetMoves.size}`);

  const g3 = Dex.forGen(ACTIVE_GENERATION);

  // Validar consistencia estructural contra Gen 3 Dex y traducciones
  learnsetMoves.forEach(moveId => {
    const move = g3.moves.get(moveId);
    const tag = `[${moveId}]`;

    if (!move || !move.exists) {
      errors.push(`${tag} Aparece en un learnset pero NO existe en el Dex de Gen 3 de Showdown.`);
      return;
    }

    // Verificar traducción al español
    const translated = MOVE_TRANSLATIONS_ES[moveId];
    if (!translated) {
      warnings.push(`${tag} No tiene traducción oficial al español en moves.ts.`);
    }
  });

  // Validar descripciones de efectos en UI
  try {
    const utilsContent = await fs.readFile(UTILS_FILE, 'utf8');
    const effectsMatch = utilsContent.match(/const effects:.* = {([\s\S]+?)};/);
    if (effectsMatch) {
      const registeredEffects = new Set<string>();
      const keyRegex = /'([^']+)':/g;
      let k;
      while ((k = keyRegex.exec(effectsMatch[1]!)) !== null) {
        registeredEffects.add(k[1]!);
      }

      // Mapeo simple de efectos especiales para validar
      const SPECIAL_EFFECTS: Record<string, string> = {
        metronome: 'metronome',
        mirror_move: 'mirror_move',
        sandstorm: 'sandstorm',
        rain_dance: 'rain_dance',
        sunny_day: 'sunny_day',
        hail: 'hail',
        spikes: 'spikes',
        destiny_bond: 'destiny_bond',
        grudge: 'grudge',
        yawn: 'yawn',
        rest: 'rest',
        recover: 'heal_50',
        slack_off: 'heal_50',
        soft_boiled: 'heal_50',
        synthesis: 'heal_50',
        milk_drink: 'heal_50',
        heal_bell: 'heal_bell',
        fury_cutter: 'fury_cutter',
        rapid_spin: 'rapid_spin',
        brick_break: 'brick_break',
        focus_punch: 'focus_punch',
        spit_up: 'spit_up',
        stockpile: 'stockpile',
        dream_eater: 'dream_eater',
        teleport: 'teleport',
        covet: 'covet',
        rage: 'rage',
        future_sight: 'future_sight',
        psych_up: 'psych_up',
        charge: 'charge',
        curse: 'curse',
        flail: 'hp_scale',
        reversal: 'hp_scale',
        water_spout: 'hp_scale_high',
        snore: 'flinch_30',
        hyper_beam: 'recharge',
      };

      learnsetMoves.forEach(moveId => {
        const move = g3.moves.get(moveId);
        if (!move || !move.exists) return;

        let effect: string | undefined = SPECIAL_EFFECTS[moveId];

        if (!effect && move.secondaries && move.secondaries.length > 0) {
          const sec = move.secondaries[0];
          if (sec) {
            const chance = sec.chance !== undefined ? `_${sec.chance}` : '';
            if (sec.status) {
              const map: Record<string, string> = { par: 'paralyze', brn: 'burn', frz: 'freeze', psn: 'poison', tox: 'poison', slp: 'sleep' };
              if (map[sec.status]) effect = `${map[sec.status]}${chance}`;
            } else if (sec.volatileStatus === 'flinch') {
              effect = `flinch${chance}`;
            } else if (sec.volatileStatus === 'confusion') {
              effect = `confuse${chance}`;
            } else if (sec.boosts) {
              const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
              const entries = Object.entries(sec.boosts);
              if (entries.length > 0) {
                const [stat, val] = entries[0] as [string, number];
                const localStat = statMap[stat];
                if (localStat) {
                  const dir = val > 0 ? 'up' : 'down';
                  const who = sec.self ? 'self' : 'enemy';
                  const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
                  effect = `stat_${dir}_${who}_${localStat}${stage}${chance}`;
                }
              }
            }
          }
        }

        if (!effect && move.self && move.self.boosts) {
          const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
          const entries = Object.entries(move.self.boosts);
          if (entries.length > 0) {
            const [stat, val] = entries[0] as [string, number];
            const localStat = statMap[stat];
            if (localStat) {
              const dir = val > 0 ? 'up' : 'down';
              const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
              const chance = move.self.chance !== undefined ? `_${move.self.chance}` : '';
              effect = `stat_${dir}_self_${localStat}${stage}${chance}`;
            }
          }
        }

        if (effect) {
          let effectBase = effect;
          if (/_(\d+)$/.test(effect) && !effect.startsWith('heal_') && !effect.includes('self_atk_2')) {
            effectBase = effect.replace(/_\d+$/, '');
          }
          if (!registeredEffects.has(effect) && !registeredEffects.has(effectBase)) {
            errors.push(`[${moveId}] Usa el efecto '${effect}' pero no tiene descripción en pokemonUtils.ts.`);
          }
        }
      });
    }
  } catch (_e) {
    warnings.push(`No se pudo validar pokemonUtils.ts para descripciones de efectos.`);
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`    REPORTE DE INTEGRIDAD DE MOVIMIENTOS`);
  console.log(`════════════════════════════════════`);
  console.log(`📊 Movimientos en learnsets:          ${learnsetMoves.size}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- REPORTE DE INTEGRIDAD DE MOVIMIENTOS ---`,
      `Movimientos en learnsets:          ${learnsetMoves.size}`,
      `\nErrores (${errors.length}):`,
      ...errors.map(e => `  - ${e}`),
      `\nAdvertencias (${warnings.length}):`,
      ...warnings.map(w => `  - ${w}`)
    ];
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }

  if (values.summary) {
    console.log(styleText('cyan', `\n[INFO] Modo resumen activo: ${errors.length} errores, ${warnings.length} advertencias.`));
  } else {
    if (warnings.length) {
      console.log(styleText('yellow', `⚠️  ADVERTENCIAS (${warnings.length}):`));
      const limit = 30;
      warnings.slice(0, limit).forEach(w => console.log(`   ${w}`));
      if (warnings.length > limit) {
        console.log(styleText('cyan', `   ... y ${warnings.length - limit} advertencias más (usa -o para ver todas)`));
      }
      console.log('');
    }

    if (errors.length) {
      console.log(styleText('red', `❌ ERRORES (${errors.length}):`));
      const limit = 30;
      errors.slice(0, limit).forEach(e => console.log(`   ${e}`));
      if (errors.length > limit) {
        console.log(styleText('cyan', `   ... y ${errors.length - limit} errores más (usa -o para ver todos)`));
      }
      console.log('\n' + styleText('red', 'Corrige estos errores en los learnsets de pokemonDB.ts.'));
    } else {
      console.log(styleText('green', '✅ Todos los movimientos pasaron la validación de integridad.'));
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
