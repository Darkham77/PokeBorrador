// fallow-ignore-file security-sink
// scripts/e2e/fuzzer/runners/run_missions_fuzzer.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { generateMission, validateMissionPokemon } from '../../../../src/logic/breeding/missionEngine.ts';
import type { Pokemon } from '../../../../src/types/pokemon/pokemon.ts';

const REPORT_FILE = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_missions_coverage_report.json');

async function runMissionsFuzzer() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const results: Array<{ level: number; target: string; text: string; matched: boolean }> = [];

  let passed = 0;
  let failed = 0;

  console.log(`🎯 Ejecutando fuzzer de Misiones sobre 200 misiones aleatorias...`);

  const createMockPoke = (speciesName: string, level: number, ivs: number, nature = 'Serious'): Pokemon => {
    return {
      uid: `mock-${speciesName}-${Math.random().toString(36).substring(2, 7)}`,
      id: speciesName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: speciesName,
      level,
      gender: 'M',
      ability: 'illuminate',
      nature,
      ivs: { hp: ivs, atk: ivs, def: ivs, spa: ivs, spd: ivs, spe: ivs },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
      hp: 100,
      maxHp: 100,
      status: null,
      exp: 0,
      isShiny: false,
    } as unknown as Pokemon;
  };

  const dateStr = Temporal.Now.instant().toString().split('T')[0]!;

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
