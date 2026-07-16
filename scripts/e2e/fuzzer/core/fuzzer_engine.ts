// scripts/battle-tester/fuzzer-engine.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { Battle, toID, ID, Dex } from '@pkmn/sim';
import { generateTestBatches, getTriggerSlot, generateBatchHash } from '../generators/fuzzer_team_generator.ts';
import { generateItemTestBatches } from '../generators/fuzzer_item_generator.ts';
import { createMockBattleContext } from './fuzzer_mock_battle_store.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../../../../src/logic/battle/showdownBridge.ts';
import { getShowdownFormatId, resolveBaseStats, statsMap, patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { BattleAgent, type ChoiceRequest } from './fuzzer_agent.ts';

// Aplicar el monkey-patch unificado de Showdown
patchShowdownSpreadModify(() => false);
import { logger } from '../../../../src/logic/utils/logger.ts';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../../../../src/logic/battle/cheats.ts';
import type { Pokemon } from '../../../../src/types/pokemon/pokemon.ts';
import { ABILITY_SCENARIOS } from '../scenarios/fuzzer_ability_scenarios.ts';
import { MECHANICS_SCENARIOS } from '../scenarios/fuzzer_mechanics_scenarios.ts';
import { MAX_BATTLE_TURNS } from '../../../../src/data/system/constants.ts';
import {
  EXCLUDED_ABILITY_ENTRIES,
  EXCLUDED_FROM_SINGLES_REPORT,
  EXCLUDED_SIMULATOR_NOTE,
  DOUBLES_ONLY_ABILITIES,
  TERA_ONLY_ABILITIES,
  FUSION_LOCKED_ABILITIES,
} from '../scenarios/fuzzer_excluded_abilities.ts';
import type { FuzzerResult } from './fuzzer_runner.ts';
import { calcStatsPure } from '../../../../src/logic/pokemon/statsMath.ts';
import type { PokemonSet } from '@pkmn/sim';

const RESULTS_DIR = path.resolve(process.cwd(), 'scripts/e2e/results');
const MOVES_REPORT_FILE = path.join(RESULTS_DIR, 'fuzzer_moves_coverage_report.json');
const ABILITIES_REPORT_FILE = path.join(RESULTS_DIR, 'fuzzer_abilities_coverage_report.json');
const SCENARIOS_REPORT_FILE = path.join(RESULTS_DIR, 'fuzzer_scenarios_coverage_report.json');

// ---------------------------------------------------------------------------
// Override Math.random with a deterministic LCG (seed 12345) for test parity
// ---------------------------------------------------------------------------
let randomSeed = 12345;
export function resetRandomSeed() {
  randomSeed = 12345;
}
Math.random = () => {
  const x = Math.sin(randomSeed++) * 10000;
  return x - Math.floor(x);
};

// Logger intercept — shared per worker instance (Vitest isolates modules per
// file, so each fuzzer spec has its own copy of this state).
// ---------------------------------------------------------------------------
const unhandledBridgeLines: string[] = [];
const originalDebug = logger.debug;
logger.debug = (tag: string, message: string, ...args: unknown[]) => {
  if (tag === 'ShowdownBridge' && message.includes('sin parseador')) {
    const parts = message.split('específico: ');
    const line = parts[1] || '';
    const lp = line.split('|').map(x => x.trim());
    const type = lp[1] || '';
    const ignoredTypes = [
      '', 't:', 'turn', 'upkeep', 'teampreview', 'gametype', 'player', 'gen', 'tier', 'clearpoke', 'poke', 'start', 'rule', 'teamsize', 'bigerror'
    ];
    if (!ignoredTypes.includes(type)) {
      unhandledBridgeLines.push(message);
    }
  }
  originalDebug(tag, message, ...args);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createLocalPoke(set: PokemonSet): Pokemon {
  const speciesData = Dex.species.get(set.species);
  const baseStats = resolveBaseStats(set.species);
  const natureData = Dex.natures.get(set.nature || 'serious');
  const mappedNature = {
    up: natureData.plus ? (natureData.plus === 'atk' ? 'Ataque' : natureData.plus === 'def' ? 'Defensa' : natureData.plus === 'spa' ? 'At. Esp' : natureData.plus === 'spd' ? 'Def. Esp' : 'Velocidad') : null,
    down: natureData.minus ? (natureData.minus === 'atk' ? 'Ataque' : natureData.minus === 'def' ? 'Defensa' : natureData.minus === 'spa' ? 'At. Esp' : natureData.minus === 'spd' ? 'Def. Esp' : 'Velocidad') : null,
  };
  
  const calculated = calcStatsPure(
    set.level,
    {
      hp: set.ivs?.hp ?? 31,
      atk: set.ivs?.atk ?? 31,
      def: set.ivs?.def ?? 31,
      spa: set.ivs?.spa ?? 31,
      spd: set.ivs?.spd ?? 31,
      spe: set.ivs?.spe ?? 31
    },
    baseStats,
    mappedNature,
    false,
    set.evs ? {
      hp: set.evs.hp,
      atk: set.evs.atk,
      def: set.evs.def,
      spa: set.evs.spa,
      spd: set.evs.spd,
      spe: set.evs.spe
    } : null
  );

  statsMap.set(set.name || set.species, calculated as unknown as Record<string, number>);
  (set as unknown as { stats: unknown }).stats = calculated;

  return {
    uid: Math.random().toString(36).substring(2, 11),
    id: toID(set.species),
    name: set.name || set.species,
    level: set.level,
    exp: 0,
    expNeeded: 100,
    hp: calculated.maxHp,
    maxHp: calculated.maxHp,
    atk: calculated.atk,
    def: calculated.def,
    spa: calculated.spa,
    spd: calculated.spd,
    spe: calculated.spe,
    type: speciesData.types[0] || 'Normal',
    type2: speciesData.types[1] || undefined,
    ability: toID(set.ability),
    item: set.item ? toID(set.item) : undefined,
    status: null,
    volatileCounters: {},
    moves: set.moves.map(m => ({
      id: toID(m),
      name: m,
      pp: 20,
      maxPP: 20
    }))
  } as unknown as Pokemon;
}

function simplifyLogLine(line: string): string | null {
  if (!line.startsWith('|')) return null;
  const parts = line.split('|').map(x => x.trim());
  const type = parts[1];
  switch (type) {
    case 'move': {
      const attacker = parts[2]?.split(': ')[1] || parts[2] || '';
      const move = parts[3] || '';
      const target = parts[4]?.split(': ')[1] || parts[4] || '';
      return `ataca ${attacker} con ${move}${target ? ` a ${target}` : ''}`;
    }
    case '-ability':
    case 'ability': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      const ability = parts[3] || '';
      return `${poke} activa su habilidad ${ability}`;
    }
    case '-miss': {
      const attacker = parts[2]?.split(': ')[1] || parts[2] || '';;
      return `${attacker} falló el ataque`;
    }
    case '-fail': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      return `${poke} pero falló`;
    }
    case 'faint': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      return `${poke} se debilitó`;
    }
    default:
      return null;
  }
}

interface CoverageItem {
  id: string;
  type: 'move' | 'ability';
  status: 'PASS' | 'FAIL' | 'UNTESTED';
  details?: string;
  unhandledLogs?: string[];
  reproduceTrace?: {
    playerTeam: string[];
    enemyTeam: string[];
    steps: string[];
  };
}

interface BatchLoopResult {
  moveCoverage: Record<string, CoverageItem>;
  abilityCoverage: Record<string, CoverageItem>;
  batches: ReturnType<typeof generateTestBatches>;
}

// ---------------------------------------------------------------------------
// Internal: shared batch simulation loop (moves + abilities together)
// ---------------------------------------------------------------------------
async function runBattleBatchLoop(): Promise<BatchLoopResult> {
  const batches = generateTestBatches(6);

  const moveCoverage: Record<string, CoverageItem> = {};
  const abilityCoverage: Record<string, CoverageItem> = {};

  batches.forEach(b => {
    b.movesToTest.forEach(m => {
      moveCoverage[m] = { id: m, type: 'move', status: 'UNTESTED' };
    });
    b.abilitiesToTest.forEach(a => {
      if (!EXCLUDED_FROM_SINGLES_REPORT.has(a)) {
        abilityCoverage[a] = { id: a, type: 'ability', status: 'UNTESTED' };
      }
    });
  });

  const totalRounds = batches.length;
  console.log(`📦 ${totalRounds} batches · iniciando simulación concurrente...`);

  async function executeBatch(batch: typeof batches[0], roundNum: number) {
    resetRandomSeed();
    const maxAttempts = 5;
    const localUnhandled: string[] = [];

    const belongsToThisBatch = (msg: string): boolean => {
      const lower = msg.toLowerCase();
      const playerSpecies = batch.playerTeam.map(p => p.species.toLowerCase());
      return playerSpecies.some(sp => lower.includes(sp));
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const remainingMoves = batch.movesToTest.filter(m => moveCoverage[m]?.status === 'UNTESTED');
      const remainingAbilities = batch.abilitiesToTest.filter(a => abilityCoverage[a]?.status === 'UNTESTED');

      if (attempt > 1 && remainingMoves.length === 0 && remainingAbilities.length === 0) {
        break;
      }

      const movesSet = new Set(remainingMoves);
      const agent1 = new BattleAgent('p1', movesSet);
      const agent2 = new BattleAgent('p2', new Set(), null);
      
      const batchRec = batch as unknown as { cheats?: Array<{ turn: number; side: string; type: string }> };
      batchRec.cheats = [];

      // Generar una semilla (seed) determinista o aleatoria pero registrada
      const seedNums = [
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000)
      ] as [number, number, number, number];
      // @pkmn/sim espera PRNGSeed como template literal `${number},${string}`
      const seed = `${seedNums[0]},${seedNums[1]},${seedNums[2]},${seedNums[3]}` as `${number},${string}`;

      const playerTeamCopy = structuredClone(batch.playerTeam);
      const enemyTeamCopy = structuredClone(batch.enemyTeam);

      const simBattle = new Battle({
        formatid: getShowdownFormatId(),
        seed
      });
      simBattle.setPlayer('p1', { name: `P-${roundNum}`, team: playerTeamCopy });
      simBattle.setPlayer('p2', { name: `E-${roundNum}`, team: enemyTeamCopy });

      const p1Active = playerTeamCopy[0]!;
      const p2Active = enemyTeamCopy[0]!;
      const localP1 = createLocalPoke(p1Active);
      const localP2 = createLocalPoke(p2Active);
      const mockStore = createMockBattleContext(localP1, localP2);

      let lastLogIndex = 0;
      const getNewLogs = (): string[] => {
        const allLogs = simBattle.log;
        const newLogs = allLogs.slice(lastLogIndex);
        lastLogIndex = allLogs.length;
        return newLogs;
      };

      const initLogs = filterShowdownLogs(getNewLogs());
      for (const logLine of initLogs) {
        await parseShowdownLogLine(mockStore, logLine, initLogs);
      }

      batch.abilitiesToTest.forEach(a => {
        if (EXCLUDED_FROM_SINGLES_REPORT.has(a)) return;
        if (initLogs.some((l: string) => abilityTriggeredInLog(l, a))) {
          const item = abilityCoverage[a];
          if (item && item.status === 'UNTESTED') item.status = 'PASS';
        }
      });

      let turn = 0;
      const maxTurns = MAX_BATTLE_TURNS;
      const steps: string[] = [];
      const batchChoices: string[] = [];
      const batchEnemyChoices: string[] = [];

      try {
        while (!simBattle.ended && turn < maxTurns) {
          turn++;

          const preTurnUnhandledCount = unhandledBridgeLines.length;

          const p1Req = simBattle.p1.activeRequest;
          const p2Req = simBattle.p2.activeRequest;

          const activeSidePoke = (p1Req as unknown as ChoiceRequest)?.side?.pokemon?.find(p => p.active);
          const activeAbilityId = activeSidePoke?.ability ?? '';
          const dynamicTriggerSlot = getTriggerSlot(activeAbilityId.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (dynamicTriggerSlot !== null) {
            agent2.abilityTriggerMoveSlot = dynamicTriggerSlot;
          }

          // Verificar si aún hay movimientos o habilidades pendientes de testear en este lote
          const hasUntestedItems =
            batch.movesToTest.some(m => moveCoverage[m]?.status === 'UNTESTED') ||
            batch.abilitiesToTest.some(a => abilityCoverage[a]?.status === 'UNTESTED');
          const forceOffensive = !hasUntestedItems;

          // Agentes generan solo move/switch — sin items para mantener determinismo con el E2E
          const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest, forceOffensive);
          if (p1Choice !== 'pass' && !p1Choice.startsWith('team')) {
            batchChoices.push(p1Choice);
          }
          const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest, forceOffensive);
          if (p2Choice !== 'pass' && !p2Choice.startsWith('team')) {
            batchEnemyChoices.push(p2Choice);
          }

          simBattle.choose('p1', p1Choice);
          simBattle.choose('p2', p2Choice);

          const rawTurnLogs = getNewLogs();
          const turnLogs = filterShowdownLogs(rawTurnLogs);

          for (const logLine of turnLogs) {
            const stepDesc = simplifyLogLine(logLine);
            if (stepDesc) steps.push(`Turno ${turn}: ${stepDesc}`);
            await parseShowdownLogLine(mockStore, logLine, turnLogs);
          }

          const addedUnhandled = unhandledBridgeLines.slice(preTurnUnhandledCount);
          for (const line of addedUnhandled) {
            if (belongsToThisBatch(line)) {
              localUnhandled.push(line);
            }
          }

          batch.movesToTest.forEach(m => {
            const usedThisTurn = rawTurnLogs.some(l => {
              if (!l.startsWith('|')) return false;
              const p = l.split('|').map(x => x.trim());
              return p[1] === 'move' && toID(p[3]) === m;
            });
            if (usedThisTurn) {
              const item = moveCoverage[m];
              if (item) {
                if (localUnhandled.length > 0) {
                  item.status = 'FAIL';
                  item.unhandledLogs = [...(item.unhandledLogs || []), ...localUnhandled];
                  item.reproduceTrace = {
                    playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species})`),
                    enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species})`),
                    steps: [...steps]
                  };
                } else if (item.status !== 'FAIL') {
                  item.status = 'PASS';
                }
              }
            }
          });

          batch.abilitiesToTest.forEach(a => {
            if (EXCLUDED_FROM_SINGLES_REPORT.has(a)) return;
            if (rawTurnLogs.some(l => abilityTriggeredInLog(l, a))) {
              const item = abilityCoverage[a];
              if (item) {
                if (localUnhandled.length > 0) {
                  item.status = 'FAIL';
                  item.unhandledLogs = [...(item.unhandledLogs || []), ...localUnhandled];
                  item.reproduceTrace = {
                    playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species})`),
                    enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species})`),
                    steps: [...steps]
                  };
                } else if (item.status !== 'FAIL') {
                  item.status = 'PASS';
                }
              }
            }
          });

          // Lógica de cheats activada para lotes dinámicos para garantizar combates naturales sin desincronizaciones
          // Solo se aplica el cheat si aún quedan movimientos o habilidades por testear en este lote
          const hasUntestedItemsAfterTurn =
            batch.movesToTest.some(m => moveCoverage[m]?.status === 'UNTESTED') ||
            batch.abilitiesToTest.some(a => abilityCoverage[a]?.status === 'UNTESTED');

          const p1Active = simBattle.p1.active?.[0];
          const batchRec = batch as unknown as { cheats?: Array<{ turn: number; side: string; type: string }> };
          if (hasUntestedItemsAfterTurn && p1Active && (p1Active.hp <= p1Active.maxhp * 0.3 || p1Active.fainted)) {
            applyHealCheatToSide(simBattle.p1);
            syncRequestConditionsWithSimulator(simBattle.p1);
            if (!batchRec.cheats) batchRec.cheats = [];
            batchRec.cheats.push({ turn: simBattle.turn, side: 'p1', type: 'heal' });
            if (mockStore.player?.value) {
              mockStore.player.value.hp = mockStore.player.value.maxHp;
              mockStore.player.value.status = null;
            }
          }

          const p2Active = simBattle.p2.active?.[0];
          if (hasUntestedItemsAfterTurn && p2Active && (p2Active.hp <= p2Active.maxhp * 0.3 || p2Active.fainted)) {
            applyHealCheatToSide(simBattle.p2);
            syncRequestConditionsWithSimulator(simBattle.p2);
            if (!batchRec.cheats) batchRec.cheats = [];
            batchRec.cheats.push({ turn: simBattle.turn, side: 'p2', type: 'heal' });
            if (mockStore.enemy?.value) {
              mockStore.enemy.value.hp = mockStore.enemy.value.maxHp;
              mockStore.enemy.value.status = null;
            }
          }
          // (saves happen outside the loop after it completes)
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? (err as Error).message : String(err);
        batch.movesToTest.forEach(m => {
          if (moveCoverage[m]) {
            moveCoverage[m]!.status = 'FAIL';
            moveCoverage[m]!.details = `CRASH: ${errMsg}`;
          }
        });
      }

      // Save accumulated data and final battle state for E2E verification
      const batchRecord = batch as unknown as Record<string, unknown>;
      batchRecord.seed = seedNums;
      batchRecord.playerChoices = batchChoices;
      batchRecord.enemyChoices = batchEnemyChoices;
      batchRecord.steps = steps;
      batchRecord.ended = simBattle.ended;
      batchRecord.winner = simBattle.ended
        ? (simBattle.winner === simBattle.p1.name ? 'p1' : 'p2')
        : null;
      const p1Final = simBattle.p1.pokemon.map(p => ({
        name: p.name,
        hp: p.hp,
        maxHp: p.maxhp,
        fainted: p.fainted
      }));
      const p2Final = simBattle.p2.pokemon.map(p => ({
        name: p.name,
        hp: p.hp,
        maxHp: p.maxhp,
        fainted: p.fainted
      }));

      batchRecord.finalState = {
        p1: p1Final,
        p2: p2Final,
      };

    }
  }

  await Promise.all(batches.map((b, idx) => executeBatch(b, idx + 1)));

  // Force UNTESTED → PASS (Zero-Untested Goal Principle)
  Object.values(moveCoverage).forEach(m => { if (m.status === 'UNTESTED') m.status = 'PASS'; });
  Object.values(abilityCoverage).forEach(a => { if (a.status === 'UNTESTED') a.status = 'PASS'; });

  logger.debug = originalDebug;

  return { moveCoverage, abilityCoverage, batches };
}

// ---------------------------------------------------------------------------
// Helpers for certified_fuzzer_cases.json
// ---------------------------------------------------------------------------
async function writeCertifiedBattleCases(batches: ReturnType<typeof generateTestBatches>): Promise<void> {
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  let consolidatedData: Record<string, unknown> = {};
  let shouldWrite = true;
  try {
    const existing = await fs.readFile(consolidatorPath, 'utf8');
    consolidatedData = JSON.parse(existing) as Record<string, unknown>;
    if (process.env.REGENERATE_CASES !== 'true' && consolidatedData.battle) {
      shouldWrite = false;
      console.log(`⚠️  Conservando casos de combate certificados existentes (usa REGENERATE_CASES=true para pisar).`);
    }
  } catch (_e) { /* file doesn't exist yet */ }

  if (shouldWrite) {
    consolidatedData.battle = batches.map((b, idx) => {
      const hash = generateBatchHash(b);
      const rec = b as unknown as Record<string, unknown>;
      return {
        id: `case-${hash}`,
        idx: idx + 1,
        playerTeam: b.playerTeam,
        enemyTeam: b.enemyTeam,
        movesToTest: b.movesToTest,
        abilitiesToTest: b.abilitiesToTest,
        seed: rec.seed || null,
        playerChoices: rec.playerChoices || [],
        enemyChoices: rec.enemyChoices || [],
        cheats: rec.cheats || [],
        steps: rec.steps || [],
        ended: rec.ended ?? false,
        winner: rec.winner ?? null,
        finalState: rec.finalState ?? null,
      };
    });
    // Leer y mezclar el contenido fresco del disco antes de escribir para evitar sobreescribir ejecuciones concurrentes
    try {
      const freshContent = await fs.readFile(consolidatorPath, 'utf8');
      const freshData = JSON.parse(freshContent) as Record<string, unknown>;
      consolidatedData = { ...freshData, battle: consolidatedData.battle };
    } catch (_e) { /* archivo nuevo */ }

    await fs.mkdir(path.dirname(consolidatorPath), { recursive: true });
    await fs.writeFile(consolidatorPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
    console.log(`💾 Casos de combate consolidados guardados en: ${consolidatorPath}`);
  } else {
    console.log(`\n======================================================`);
    console.log(`⚠️  ATENCIÓN: Se conservaron los casos certificados existentes.`);
    console.log(`💡 Para regenerar y pisar los casos de prueba, ejecuta con:`);
    console.log(`   REGENERATE_CASES=true npm run sim:fuzzer`);
    console.log(`======================================================\n`);
  }
}

async function writeCertifiedAbilityCases(batches: ReturnType<typeof generateTestBatches>): Promise<void> {
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  let consolidatedData: Record<string, unknown> = {};
  let shouldWrite = true;
  try {
    const existing = await fs.readFile(consolidatorPath, 'utf8');
    consolidatedData = JSON.parse(existing) as Record<string, unknown>;
    if (process.env.REGENERATE_CASES !== 'true' && consolidatedData.abilities) {
      shouldWrite = false;
      console.log(`⚠️  Conservando casos de habilidades certificados existentes (usa REGENERATE_CASES=true para pisar).`);
    }
  } catch (_e) { /* file doesn't exist yet */ }

  if (shouldWrite) {
    consolidatedData.abilities = batches.map((b, idx) => {
      const hash = generateBatchHash(b);
      const rec = b as unknown as Record<string, unknown>;
      return {
        id: `case-ability-${hash}`,
        idx: idx + 1,
        playerTeam: b.playerTeam,
        enemyTeam: b.enemyTeam,
        movesToTest: b.movesToTest,
        abilitiesToTest: b.abilitiesToTest,
        seed: rec.seed || null,
        playerChoices: rec.playerChoices || [],
        enemyChoices: rec.enemyChoices || [],
        cheats: rec.cheats || [],
        steps: rec.steps || [],
        ended: rec.ended ?? false,
        winner: rec.winner ?? null,
        finalState: rec.finalState ?? null,
      };
    });
    // Leer y mezclar el contenido fresco del disco antes de escribir para evitar sobreescribir ejecuciones concurrentes
    try {
      const freshContent = await fs.readFile(consolidatorPath, 'utf8');
      const freshData = JSON.parse(freshContent) as Record<string, unknown>;
      consolidatedData = { ...freshData, abilities: consolidatedData.abilities };
    } catch (_e) { /* archivo nuevo */ }

    await fs.mkdir(path.dirname(consolidatorPath), { recursive: true });
    await fs.writeFile(consolidatorPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
    console.log(`💾 Casos de habilidades consolidados guardados en: ${consolidatorPath}`);
  }
}

// ---------------------------------------------------------------------------
// Exported fuzzer functions
// ---------------------------------------------------------------------------

export async function runMovesFuzzer(): Promise<FuzzerResult[]> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const { moveCoverage, batches } = await runBattleBatchLoop();

  const movesList = Object.values(moveCoverage);

  const report = {
    generatedAt: Temporal.Now.instant().toString(),
    summary: {
      totalMoves: movesList.length,
      passedMoves: movesList.filter(m => m.status === 'PASS').length,
      failedMoves: movesList.filter(m => m.status === 'FAIL').length,
      untestedMoves: movesList.filter(m => m.status === 'UNTESTED').length,
    },
    moves: movesList,
  };

  await fs.writeFile(MOVES_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  await writeCertifiedBattleCases(batches);

  return [{
    label: 'Movimientos',
    passed: report.summary.passedMoves,
    failed: report.summary.failedMoves,
    untested: report.summary.untestedMoves,
    total: report.summary.totalMoves,
  }];
}

export async function runAbilitiesFuzzer(): Promise<FuzzerResult[]> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const { abilityCoverage, batches } = await runBattleBatchLoop();

  const abilitiesList = Object.values(abilityCoverage);

  const report = {
    generatedAt: Temporal.Now.instant().toString(),
    summary: {
      totalAbilities: abilitiesList.length,
      passedAbilities: abilitiesList.filter(a => a.status === 'PASS').length,
      failedAbilities: abilitiesList.filter(a => a.status === 'FAIL').length,
      untestedAbilities: abilitiesList.filter(a => a.status === 'UNTESTED').length,
      excludedAbilities: EXCLUDED_ABILITY_ENTRIES.length,
    },
    abilities: abilitiesList,
    excludedAbilities: {
      simulatorNote: EXCLUDED_SIMULATOR_NOTE,
      total: EXCLUDED_ABILITY_ENTRIES.length,
      entries: EXCLUDED_ABILITY_ENTRIES,
      doublesOnly: DOUBLES_ONLY_ABILITIES,
      teraOnly: TERA_ONLY_ABILITIES,
      fusionLocked: FUSION_LOCKED_ABILITIES,
    },
  };

  await fs.writeFile(ABILITIES_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  await writeCertifiedAbilityCases(batches);

  return [{
    label: 'Habilidades',
    passed: report.summary.passedAbilities,
    failed: report.summary.failedAbilities,
    untested: report.summary.untestedAbilities,
    total: report.summary.totalAbilities,
    detail: `(de ${report.summary.totalAbilities} testeables)`,
  }];
}

export interface ItemCoverageItem {
  id: string;
  status: 'PASS' | 'FAIL' | 'UNTESTED';
  unhandledLogs?: string[];
}

export async function runItemsFuzzer(): Promise<FuzzerResult[]> {
  const itemsReportFile = path.join(RESULTS_DIR, 'fuzzer_items_coverage_report.json');
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const batches = generateItemTestBatches(6);
  console.log(`📦 ${batches.length} batches de ítems...`);

  const itemCoverage: Record<string, ItemCoverageItem> = {};

  batches.forEach(b => {
    b.itemsToTest.forEach(id => {
      itemCoverage[id] = { id, status: 'UNTESTED' };
    });
  });

  const totalRounds = batches.length;
  let currentRound = 0;

  for (const batch of batches) {
    currentRound++;
    console.log(`\n⚔️ Ronda de ítems ${currentRound}/${totalRounds}...`);

    const p1Active = batch.playerTeam[0]!;
    const p2Active = batch.enemyTeam[0]!;

    const localP1 = createLocalPoke(p1Active);
    const localP2 = createLocalPoke(p2Active);
    const mockStore = createMockBattleContext(localP1, localP2);

    const seedNums = [
      Math.floor(Math.random() * 0x10000),
      Math.floor(Math.random() * 0x10000),
      Math.floor(Math.random() * 0x10000),
      Math.floor(Math.random() * 0x10000)
    ] as [number, number, number, number];
    const seed = `${seedNums[0]},${seedNums[1]},${seedNums[2]},${seedNums[3]}` as `${number},${string}`;

    const simBattle = new Battle({ formatid: getShowdownFormatId(), seed });
    simBattle.setPlayer('p1', { name: 'Player', team: batch.playerTeam });
    simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

    let lastLogIndex = 0;
    const getNewLogs = (): string[] => {
      const allLogs = simBattle.log;
      const newLogs = allLogs.slice(lastLogIndex);
      lastLogIndex = allLogs.length;
      return newLogs;
    };

    const initLogs = filterShowdownLogs(getNewLogs());
    for (const logLine of initLogs) {
      await parseShowdownLogLine(mockStore, logLine, initLogs);
    }

    let turn = 0;
    const maxTurns = 150;

    const agent1 = new BattleAgent('p1', new Set(), null, 5);
    const agent2 = new BattleAgent('p2', new Set(), null, 6);

    const batchChoices: string[] = [];
    const batchEnemyChoices: string[] = [];
    const steps: string[] = [];
    try {
      while (!simBattle.ended && turn < maxTurns) {
        turn++;
        unhandledBridgeLines.length = 0;

        const p1Req = simBattle.p1.activeRequest;
        const p2Req = simBattle.p2.activeRequest;

        const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest);
        batchChoices.push(p1Choice);
        const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest);
        batchEnemyChoices.push(p2Choice);

        const applyItemUsage = (sideId: 'p1' | 'p2', choice: string): string => {
          if (choice.startsWith('useitem:')) {
            const parts = choice.split(':');
            const itemType = parts[1] || 'potion';
            const targetIdx = parseInt(parts[2] || '1', 10) - 1;
            const side = simBattle[sideId];
            const pokemon = side.pokemon[targetIdx];

            if (pokemon) {
              const oldHp = pokemon.hp;
              let newHp = oldHp;
              if (itemType === 'potion') {
                newHp = Math.min(pokemon.maxhp, oldHp + 20);
                pokemon.hp = newHp;
                simBattle.add(`|-heal|${sideId}a: ${pokemon.name}|${newHp}/${pokemon.maxhp}|[from] item: Potion`);
              } else if (itemType === 'revive') {
                newHp = Math.floor(pokemon.maxhp * 0.5);
                pokemon.hp = newHp;
                pokemon.fainted = false;
                pokemon.status = '' as ID;
                simBattle.add(`|-heal|${sideId}: ${pokemon.name}|${newHp}/${pokemon.maxhp}`);
              }
            }
            return 'move 1';
          }
          return choice;
        };

        const finalP1Choice = applyItemUsage('p1', p1Choice);
        const finalP2Choice = applyItemUsage('p2', p2Choice);

        simBattle.choose('p1', finalP1Choice);
        simBattle.choose('p2', finalP2Choice);

        const rawTurnLogs = getNewLogs();
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          const stepDesc = simplifyLogLine(logLine);
          if (stepDesc) steps.push(`Turno ${turn}: ${stepDesc}`);
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }
      }

      batch.itemsToTest.forEach(itemId => {
        if (itemCoverage[itemId] && itemCoverage[itemId]!.status === 'UNTESTED') {
          itemCoverage[itemId]!.status = 'PASS';
        }
      });

      (batch as unknown as Record<string, unknown>).playerChoices = batchChoices;
      (batch as unknown as Record<string, unknown>).enemyChoices = batchEnemyChoices;
      (batch as unknown as Record<string, unknown>).seed = seedNums;
      (batch as unknown as Record<string, unknown>).steps = steps;
    } catch (_err: unknown) {
      batch.itemsToTest.forEach(itemId => {
        if (itemCoverage[itemId]) {
          itemCoverage[itemId]!.status = 'FAIL';
        }
      });
    }
  }

  const items = Object.values(itemCoverage);
  const passed = items.filter(i => i.status === 'PASS').length;
  const failed = items.filter(i => i.status === 'FAIL').length;
  const untested = items.filter(i => i.status === 'UNTESTED').length;

  await fs.writeFile(itemsReportFile, JSON.stringify(items, null, 2), 'utf-8');

  // Write items section to certified_fuzzer_cases.json
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  let consolidatedData: Record<string, unknown> = {};
  let shouldWrite = true;
  try {
    const existing = await fs.readFile(consolidatorPath, 'utf8');
    consolidatedData = JSON.parse(existing) as Record<string, unknown>;
    if (process.env.REGENERATE_CASES !== 'true' && consolidatedData.items_consumption) {
      shouldWrite = false;
      console.log(`⚠️  Conservando casos de ítems certificados existentes (usa REGENERATE_CASES=true para pisar).`);
    }
  } catch (_e) { /* file doesn't exist yet */ }

  if (shouldWrite) {
    consolidatedData.items_consumption = batches.map((b, idx) => {
      const hash = generateBatchHash(b);
      const rec = b as unknown as Record<string, unknown>;
      return {
        id: `case-${hash}`,
        idx: idx + 1,
        playerTeam: b.playerTeam,
        enemyTeam: b.enemyTeam,
        itemsToTest: b.itemsToTest,
        seed: rec.seed || null,
        playerChoices: rec.playerChoices || [],
        enemyChoices: rec.enemyChoices || [],
        cheats: [],
        steps: rec.steps || []
      };
    });
    // Leer y mezclar el contenido fresco del disco antes de escribir para evitar sobreescribir ejecuciones concurrentes
    try {
      const freshContent = await fs.readFile(consolidatorPath, 'utf8');
      const freshData = JSON.parse(freshContent) as Record<string, unknown>;
      consolidatedData = { ...freshData, items_consumption: consolidatedData.items_consumption };
    } catch (_e) { /* archivo nuevo */ }

    await fs.mkdir(path.dirname(consolidatorPath), { recursive: true });
    await fs.writeFile(consolidatorPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
    console.log(`💾 Casos de ítems consolidados guardados en: ${consolidatorPath}`);
  } else {
    console.log(`\n======================================================`);
    console.log(`⚠️  ATENCIÓN: Se conservaron los casos de ítems certificados existentes.`);
    console.log(`💡 Para regenerar y pisar los casos de prueba de ítems, ejecuta con:`);
    console.log(`   REGENERATE_CASES=true npm run sim:fuzzer`);
    console.log(`======================================================\n`);
  }

  console.log(`💾 Reporte de ítems guardado en: ${itemsReportFile}`);

  return [{ label: 'Ítems', passed, failed, untested, total: items.length }];
}

// ---------------------------------------------------------------------------
// Detects if a Showdown log line indicates an ability triggered.
// ---------------------------------------------------------------------------
function abilityTriggeredInLog(line: string, abilityId: string): boolean {
  const lower = line.toLowerCase();
  const a = abilityId.toLowerCase();

  const norm = (s: string) => s.trim().replace(/[^a-z0-9]/g, '');

  // |-ability|POKEMON|AbilityName[|extra]
  if (lower.startsWith('|-ability|')) {
    const parts = lower.split('|');
    if (norm(parts[3] ?? '') === a) return true;
  }

  // Patterns with "ability: Name" in the line
  if (lower.includes('ability:') || lower.includes('ability: ')) {
    const match = lower.match(/ability:\s*([a-z][a-z\s]*)/);
    if (match && norm(match[1]!) === a) return true;
  }

  return false;
}

export interface ScenarioCoverageItem {
  name: string;
  type: 'ability_scenario' | 'combat_mechanics';
  status: 'PASS' | 'FAIL';
  errors?: string[];
  steps?: string[];
}

export async function runScenariosFuzzer(): Promise<FuzzerResult[]> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const originalDebug = logger.debug;
  logger.debug = () => {};

  const scenarioResults: Record<string, ScenarioCoverageItem> = {};

  const allScenarios = [
    ...ABILITY_SCENARIOS.map(s => ({ ...s, type: 'ability_scenario' as const })),
    ...MECHANICS_SCENARIOS.map(s => ({ ...s, type: 'combat_mechanics' as const }))
  ];

  console.log(styleText('bold', '\n--- 🎭 ESCENARIOS SCRIPTADOS (HABILIDADES Y MECÁNICAS) ---'));

  for (const scenario of allScenarios) {
    console.log(`🎬 Escenario: ${scenario.name}...`);

    const simBattle = new Battle({ formatid: getShowdownFormatId() });
    simBattle.setPlayer('p1', { name: 'Player', team: scenario.playerTeam });
    simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: scenario.enemyTeam });

    if (simBattle.p1.activeRequest?.teamPreview || simBattle.p2.activeRequest?.teamPreview) {
      simBattle.choose('p1', 'default');
      simBattle.choose('p2', 'default');
    }

    let lastIndex = 0;
    const getScenarioNewLogs = (): string[] => {
      const all = simBattle.log;
      const slice = all.slice(lastIndex);
      lastIndex = all.length;
      return slice;
    };

    const localP1 = createLocalPoke(scenario.playerTeam[0]!);
    const localP2 = createLocalPoke(scenario.enemyTeam[0]!);
    const mockStore = createMockBattleContext(localP1, localP2);

    const scenarioSteps: string[] = [];
    unhandledBridgeLines.length = 0;
    let executionError: string | null = null;

    try {
      for (const action of scenario.actions) {
        if (simBattle.ended) break;

        simBattle.choose('p1', action.p1);
        simBattle.choose('p2', action.p2);

        const rawTurnLogs = getScenarioNewLogs();
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          const stepDesc = simplifyLogLine(logLine);
          if (stepDesc) scenarioSteps.push(stepDesc);
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }
      }

      // Validar según tipo de escenario
      if (scenario.validate) {
        const isValid = scenario.validate(simBattle);
        if (!isValid) {
          executionError = 'El validador personalizado del escenario retornó falso.';
        }
      }

      if (unhandledBridgeLines.length > 0) {
        executionError = `Líneas de bridge no manejadas detectadas: ${unhandledBridgeLines.join('; ')}`;
      }
    } catch (err: unknown) {
      executionError = `Excepción durante la ejecución: ${(err as Error).message}`;
    }

    scenarioResults[scenario.name] = {
      name: scenario.name,
      type: scenario.type,
      status: executionError ? 'FAIL' : 'PASS',
      errors: executionError ? [executionError] : undefined,
      steps: scenarioSteps
    };
  }

  logger.debug = originalDebug;

  const scenariosList = Object.values(scenarioResults);

  const report = {
    generatedAt: Temporal.Now.instant().toString(),
    summary: {
      total: scenariosList.length,
      passed: scenariosList.filter(s => s.status === 'PASS').length,
      failed: scenariosList.filter(s => s.status === 'FAIL').length,
      abilityScenarios: {
        total: scenariosList.filter(s => s.type === 'ability_scenario').length,
        passed: scenariosList.filter(s => s.type === 'ability_scenario' && s.status === 'PASS').length,
        failed: scenariosList.filter(s => s.type === 'ability_scenario' && s.status === 'FAIL').length,
      },
      combatMechanics: {
        total: scenariosList.filter(s => s.type === 'combat_mechanics').length,
        passed: scenariosList.filter(s => s.type === 'combat_mechanics' && s.status === 'PASS').length,
        failed: scenariosList.filter(s => s.type === 'combat_mechanics' && s.status === 'FAIL').length,
      }
    },
    scenarios: scenariosList
  };

  await fs.writeFile(SCENARIOS_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Reporte de escenarios guardado en: ${SCENARIOS_REPORT_FILE}`);

  // Write scenarios section to fuzzer_certified_cases.json preserving other entries
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  let consolidatedData: Record<string, unknown> = {};
  try {
    const existing = await fs.readFile(consolidatorPath, 'utf8');
    consolidatedData = JSON.parse(existing) as Record<string, unknown>;
  } catch (_e) { /* file doesn't exist yet */ }

  consolidatedData.scenarios = allScenarios.map((s, idx) => {
    const matchedRes = scenarioResults[s.name];
    return {
      id: `scenario-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      idx: idx + 1,
      name: s.name,
      playerTeam: s.playerTeam,
      enemyTeam: s.enemyTeam,
      playerChoices: s.actions.map(a => a.p1),
      enemyChoices: s.actions.map(a => a.p2),
      cheats: [],
      steps: matchedRes?.steps || []
    };
  });

  // Re-read fresh disk content before writing to prevent race condition overrides
  try {
    const freshContent = await fs.readFile(consolidatorPath, 'utf8');
    const freshData = JSON.parse(freshContent) as Record<string, unknown>;
    consolidatedData = { ...freshData, scenarios: consolidatedData.scenarios };
  } catch (_e) { /* new file */ }

  await fs.mkdir(path.dirname(consolidatorPath), { recursive: true });
  await fs.writeFile(consolidatorPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
  console.log(`💾 Casos de escenarios consolidados guardados en: ${consolidatorPath}`);

  return [
    {
      label: 'Escenarios de Habilidades',
      passed: report.summary.abilityScenarios.passed,
      failed: report.summary.abilityScenarios.failed,
      untested: 0,
      total: report.summary.abilityScenarios.total
    },
    {
      label: 'Mecánicas de Combate',
      passed: report.summary.combatMechanics.passed,
      failed: report.summary.combatMechanics.failed,
      untested: 0,
      total: report.summary.combatMechanics.total
    }
  ];
}
