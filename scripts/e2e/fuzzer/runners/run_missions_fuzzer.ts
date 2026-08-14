// fallow-ignore-file security-sink
// scripts/e2e/fuzzer/runners/run_missions_fuzzer.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { generateMission, validateMissionPokemon } from '../../../../src/logic/breeding/missionEngine.ts';
import type { Pokemon } from '../../../../src/types/pokemon/pokemon.ts';
import type { PokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';
import type { NatureId } from '../../../../src/data/battle/natures.ts';
import type { AbilityId } from '../../../../src/data/battle/abilities.ts';
import type { PokemonType } from '../../../../src/data/battle/types.ts';

const REPORT_FILE = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_missions_coverage_report.json');

async function runMissionsFuzzer() {
  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain
  const results: Array<{ level: number; target: string; text: string; matched: boolean }> = [];

  let passed = 0;
  let failed = 0;

  console.log(`🎯 Ejecutando fuzzer de Misiones sobre 200 misiones aleatorias...`);

  const createMockPoke = (speciesName: string, level: number, ivs: number, nature = 'serious'): Pokemon => {
    const sId = Dex.toID(speciesName) as PokemonSpeciesId;
    return {
      uid: `mock-${speciesName}-${Math.random().toString(36).substring(2, 7)}`,
      id: sId,
      species: sId,
      name: speciesName,
      level,
      gender: 'm',
      ability: 'illuminate' as AbilityId,
      nature: nature.toLowerCase() as NatureId,
      ivs: { hp: ivs, atk: ivs, def: ivs, spa: ivs, spd: ivs, spe: ivs },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
      hp: 100,
      maxHp: 100,
      type: 'normal' as PokemonType,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      expNeeded: 1000,
      volatileCounters: {},
      status: '',
      exp: 0,
      isShiny: false,
    };
  };

  const dateStr = Temporal.Now.plainDateISO().toString();

  for (let i = 0; i < 200; i++) {
    const trainerLevel = Math.floor(Math.random() * 50) + 1; // 1 a 50
    try {
      const mission = generateMission(trainerLevel, dateStr);

      if (!mission || !mission.targetId || !mission.requirement) {
        errors.push(`Error al generar misión de nivel ${trainerLevel}`);
        failed++;
        continue;
      }

      // Crear un Pokémon que cumpla 100% el requisito y probarlo
      const req = mission.requirement;
      const targetSpecies = mission.targetId;
      const testPoke = createMockPoke(
        targetSpecies,
        req.minLevel || 10,
        req.minIvTotal ? Math.ceil(req.minIvTotal / 6) : 31,
        req.nature || 'Serious'
      );

      const isValid = validateMissionPokemon(testPoke, mission);
      if (!isValid) {
        errors.push(`El Pokémon de prueba válido falló el validador para: "${mission.reqText}"`);
        failed++;
      } else {
        passed++;
      }

      results.push({
        level: trainerLevel,
        target: mission.targetId,
        text: mission.reqText,
        matched: isValid
      });

    } catch (err: unknown) {
      errors.push(`Excepción procesando misión de nivel ${trainerLevel}: ${(err as Error).message}`);
      failed++;
    }
  }

  const report = {
    generatedAt: Temporal.Now.instant().toString(),
    summary: {
      total: 200,
      passed,
      failed,
    },
    results,
    errors,
    warnings,
  };

  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Reporte de Misiones guardado en: ${REPORT_FILE}`);

  return [{
    label: 'Misiones (Missions)',
    passed,
    failed,
    untested: 0,
    total: 200,
  }];
}

await runFuzzerSuite({
  suiteName: 'Fuzzer — Lógica de Misiones (Gen 9)',
  run: runMissionsFuzzer,
});
