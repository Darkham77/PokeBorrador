// scripts/e2e/fuzzer/runners/run_gyms_fuzzer.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { processGymVictory, type Gym } from '../../../../src/logic/gym/gymEngine.ts';
import type { GameState } from '../../../../src/types/system/game.ts';
import type { GymId } from '../../../../src/data/world/gyms.ts';

const REPORT_FILE = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_gyms_coverage_report.json');

async function runGymsFuzzer() {
  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure
  const results: Array<{ gymId: string; diff: string; tmDropped: boolean; extraCoins: number; isFirst: boolean }> = [];

  let passed = 0;
  let failed = 0;

  console.log(`🏟️ Ejecutando fuzzer de Gimnasios sobre 200 simulaciones de victoria...`);

  const mockGyms: Gym[] = [
    { id: 'pewter', leader: 'Brock', rewardTM: 'TM39', level: 14 },
    { id: 'cerulean', leader: 'Misty', rewardTM: 'TM03', level: 21 },
    { id: 'vermilion', leader: 'Lt.Surge', rewardTM: 'TM34', level: 24 },
    { id: 'celadon', leader: 'Erika', rewardTM: 'TM19', level: 29 },
    { id: 'fuchsia', leader: 'Koga', rewardTM: 'TM06', level: 43 },
    { id: 'saffron', leader: 'Sabrina', rewardTM: 'TM04', level: 43 },
    { id: 'cinnabar', leader: 'Blaine', rewardTM: 'TM38', level: 47 },
    { id: 'viridian', leader: 'Giovanni', rewardTM: 'TM26', level: 50 },
  ];

  const createMockGameState = (defeated: string[]): Partial<GameState> => {
    return {
      money: 1000,
      defeatedGyms: defeated as GymId[],
      gymProgress: defeated.reduce((acc, gid) => ({ ...acc, [gid]: 3 }), {}),
      team: [],
      box: [],
      starterChosen: true,
      eggs: [],
      inventory: {},
    };
  };

  const difficulties = ['easy', 'normal', 'hard'] as const;

  for (let i = 0; i < 200; i++) {
    const gym = mockGyms[Math.floor(Math.random() * mockGyms.length)]!;
    const diff = difficulties[Math.floor(Math.random() * difficulties.length)]!;

    // 50% probabilidad de que ya haya derrotado al líder antes (rematch)
    const alreadyDefeated = Math.random() > 0.5 ? [gym.id] : [];
    const state = createMockGameState(alreadyDefeated);

    try {
      const res = processGymVictory(gym, diff, state);

      if (res.isFirstTime && alreadyDefeated.includes(gym.id)) {
        errors.push(`Gimnasio ya derrotado pero reportado como primera vez: ${gym.id}`);
        failed++;
        continue;
      }

      if (res.isFirstTime && !res.tmDropped && gym.rewardTM) {
        errors.push(`Primera victoria no arrojó la MT correspondiente: ${gym.id}`);
        failed++;
        continue;
      }

      if (!res.isFirstTime && res.extraCoins <= 0) {
        errors.push(`Rematch no otorgó monedas extra: ${gym.id}`);
        failed++;
        continue;
      }

      passed++;
      results.push({
        gymId: gym.id,
        diff,
        tmDropped: res.tmDropped,
        extraCoins: res.extraCoins,
        isFirst: res.isFirstTime,
      });

    } catch (err: unknown) {
      errors.push(`Excepción procesando victoria en gimnasio ${gym.id}: ${(err as Error).message}`);
      failed++;
    }
  }

  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
    summary: {
      total: 200,
      passed,
      failed,
      firstTimeCount: results.filter(r => r.isFirst).length,
      rematchCount: results.filter(r => !r.isFirst).length,
    },
    results,
    errors,
    warnings,
  };

  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Reporte de Gimnasios guardado en: ${REPORT_FILE}`);

  return [{
    label: 'Gimnasios (Gyms)',
    passed,
    failed,
    untested: 0,
    total: 200,
  }];
}

await runFuzzerSuite({
  suiteName: 'Fuzzer — Lógica de Gimnasios (Gen 9)',
  run: runGymsFuzzer,
});
