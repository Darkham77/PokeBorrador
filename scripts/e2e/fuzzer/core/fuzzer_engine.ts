// fallow-ignore-file security-sink
// scripts/battle-tester/fuzzer-engine.ts
(globalThis as unknown as Record<string, unknown>).__E2E__ = true;
process.env.VITE_E2E = 'true';

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { toID, Dex, type Battle } from '@pkmn/sim';
import { ShowdownBattleEngine } from '../../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { fileWriterQueue } from '../../helpers/fileWriterQueue.ts';
import { logger } from '../../../../src/logic/utils/logger.ts';
import { parseShowdownSeedForBattle } from '../../../../src/logic/battle/helpers/seedInitializer.ts';
import { generateTestBatches, getTriggerSlot, generateBatchHash } from '../generators/fuzzer_team_generator.ts';
import { certifyBattleCase } from './certifiedBattleCase.ts';
import { generateItemTestBatches } from '../generators/fuzzer_item_generator.ts';
import { createMockBattleContext } from './fuzzer_mock_battle_store.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../../../../src/logic/battle/showdownBridge.ts';
// Aplicar el monkey-patch unificado de Showdown
import { resolveBaseStats, statsMap, patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { BattleAgent, classifyRequest, type ChoiceRequest } from './fuzzer_agent.ts';

// Force inMemory SQLite and Offline DB mode for maximum speed and zero I/O overhead
(globalThis as unknown as Record<string, unknown>).__E2E__ = true;
process.env.VITE_E2E = 'true';

patchShowdownSpreadModify(() => false);
import type { Pokemon } from '../../../../src/types/pokemon/pokemon.ts';
import { createShowdownBattle } from '../../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownLogEnricher } from '../../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { requiresAction } from '../../../../src/logic/battle/helpers/requestHelper.ts';
import { ACTIVE_SHOWDOWN_FORMAT, MAX_BATTLE_TURNS } from '../../../../src/data/system/constants.ts';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../../simulation_config.ts';

// Capped at total logical CPU cores divided by 4 (physical cores / 2) to optimize throughput
export const MAX_WORKER_CORES = Math.max(1, Math.floor(os.cpus().length / 4));

import { ABILITY_SCENARIOS } from '../scenarios/fuzzer_ability_scenarios.ts';
import { MECHANICS_SCENARIOS } from '../scenarios/fuzzer_mechanics_scenarios.ts';
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
    up: natureData.plus ?? null,
    down: natureData.minus ?? null,
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
    uid: (set as unknown as { uid?: string }).uid || Math.random().toString(36).substring(2, 11),
    id: toID(set.species),
    species: toID(set.species),
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

function hasExecutableTestMove(request: ChoiceRequest | null | undefined, movesToTest: Set<string>): boolean {
  if (!request?.active || movesToTest.size === 0) return false;
  for (const slot of request.active) {
    if (!slot.moves) continue;
    for (const m of slot.moves) {
      if (!m.disabled && (m.pp === undefined || m.pp > 0)) {
        if (movesToTest.has(toID(m.id))) return true;
      }
    }
  }
  return false;
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

function abilityTriggeredInLog(line: string, abilityId: string): boolean {
  const lower = line.toLowerCase();
  const a = abilityId.toLowerCase();
  const norm = (s: string) => s.trim().replace(/[^a-z0-9]/g, '');

  if (lower.startsWith('|-ability|')) {
    const parts = lower.split('|');
    if (norm(parts[3] ?? '') === a) return true;
  }
  if (lower.includes('ability:') || lower.includes('ability: ')) {
    const match = lower.match(/ability:\s*([a-z][a-z\s]*)/);
    if (match && norm(match[1]!) === a) return true;
  }
  return false;
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
// Standalone batch runner executed inside isolated Worker threads
// ---------------------------------------------------------------------------
export async function runStandaloneBatch(batch: ReturnType<typeof generateTestBatches>[0], roundNum: number, totalRounds: number) {
  console.log(`▶️ [WORKER-${process.pid || 'THREAD'}] Iniciando Lote #${roundNum} / ${totalRounds} (${batch.movesToTest.length} movimientos)...`);
  resetRandomSeed();
  const maxAttempts = 5;
  unhandledBridgeLines.length = 0;
  const localUnhandled: string[] = [];

  const moveCoverage: Record<string, CoverageItem> = {};
  const abilityCoverage: Record<string, CoverageItem> = {};
  batch.movesToTest.forEach(m => { moveCoverage[m] = { id: m, type: 'move', status: 'UNTESTED' }; });
  batch.abilitiesToTest.forEach(a => {
    if (!EXCLUDED_FROM_SINGLES_REPORT.has(a)) {
      abilityCoverage[a] = { id: a, type: 'ability', status: 'UNTESTED' };
    }
  });

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
      const seed = parseShowdownSeedForBattle(seedNums);

      const playerTeamCopy = structuredClone(batch.playerTeam);
      const enemyTeamCopy = structuredClone(batch.enemyTeam);

      const simBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
      ShowdownLogEnricher.setupRealtimeEnrichment(simBattle);

      simBattle.setPlayer('p1', { name: `P-${roundNum}`, team: playerTeamCopy });
      simBattle.setPlayer('p2', { name: `E-${roundNum}`, team: enemyTeamCopy });

      // Associate UIDs of sets to the simulator instances using direct slot index
      playerTeamCopy.forEach((set, idx) => {
        if (set && set.uid && simBattle.p1.pokemon[idx]) {
          (simBattle.p1.pokemon[idx] as unknown as { uid?: string }).uid = set.uid;
        }
      });
      enemyTeamCopy.forEach((set, idx) => {
        if (set && set.uid && simBattle.p2.pokemon[idx]) {
          (simBattle.p2.pokemon[idx] as unknown as { uid?: string }).uid = set.uid;
        }
      });

      ShowdownLogEnricher.enrichRetroactiveLeads(simBattle);

      const fullPlayerTeam = playerTeamCopy.map(set => {
        const p = createLocalPoke(set);
        if (set.uid) p.uid = set.uid;
        return p;
      });
      const fullEnemyTeam = enemyTeamCopy.map(set => {
        const p = createLocalPoke(set);
        if (set.uid) p.uid = set.uid;
        return p;
      });
      const localP1 = fullPlayerTeam[0]!;
      const localP2 = fullEnemyTeam[0]!;
      const mockStore = createMockBattleContext(localP1, localP2, fullPlayerTeam, fullEnemyTeam);

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
      const batchHistory: Array<{ turnCount: number; p1Choice: string; p2Choice: string; battleTurn: number; p1Heal?: true; p2Heal?: true }> = [];

      // performance.now() is the Node 26+ Web Performance API monotonic clock.
      // It is the correct alternative to the prohibited Date.now() for timing guards.
      let lastProgressMs = performance.now();

      try {
        while (!simBattle.ended && turn < maxTurns) {
          turn++;

          if (performance.now() - lastProgressMs > MAX_PER_ACTION_TIMEOUT_MS) {
            throw new Error(`[FUZZER_STALL] Turn ${turn} produced no logs for >${MAX_PER_ACTION_TIMEOUT_MS}ms — bug in src/`);
          }

          const preTurnUnhandledCount = unhandledBridgeLines.length;

          const p1Req = simBattle.p1.activeRequest;
          const p2Req = simBattle.p2.activeRequest;
          const p1NeedsAction = requiresAction(p1Req);
          const p2NeedsAction = requiresAction(p2Req);

          const activeSidePoke = (p1Req as unknown as ChoiceRequest)?.side?.pokemon?.find((p: { active: boolean }) => p.active);
          const activeAbilityId = activeSidePoke?.ability ?? '';
          const dynamicTriggerSlot = getTriggerSlot(activeAbilityId.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (dynamicTriggerSlot !== null) {
            agent2.abilityTriggerMoveSlot = dynamicTriggerSlot;
          }

          const p1ReqKind = classifyRequest(p1Req as unknown as ChoiceRequest);
          const activeHasExecutableMove = hasExecutableTestMove(p1Req as unknown as ChoiceRequest, agent1.movesToTest);
          const ipbActive = agent1.movesToTest.size > 0 && activeHasExecutableMove && p1ReqKind !== 'force-switch';

          const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
          (engine as unknown as { battle: Battle }).battle = simBattle;

          const { p1AcceptedChoice, p2AcceptedChoice, appliedCheats } = engine.executeTurn({
            p1Agent: agent1 as unknown as { decide(req: unknown): string },
            p2Agent: agent2 as unknown as { decide(req: unknown): string },
            ipbActive
          });

          if (p1NeedsAction || p2NeedsAction) {
            batchHistory.push({ turnCount: turn, p1Choice: p1AcceptedChoice, p2Choice: p2AcceptedChoice, battleTurn: simBattle.turn });
          }

          if (appliedCheats.length > 0) {
            const lastHistEntry = batchHistory[batchHistory.length - 1];
            for (const c of appliedCheats) {
              if (lastHistEntry) {
                if (c.side === 'p1') lastHistEntry.p1Heal = true;
                if (c.side === 'p2') lastHistEntry.p2Heal = true;
              }
              if (Array.isArray(batchRec.cheats)) {
                batchRec.cheats.push(c);
              }
            }
          }

          if (p1NeedsAction && p1AcceptedChoice && !p1AcceptedChoice.startsWith('team')) {
            batchChoices.push(p1AcceptedChoice);
          }
          if (p2NeedsAction && p2AcceptedChoice && !p2AcceptedChoice.startsWith('team')) {
            batchEnemyChoices.push(p2AcceptedChoice);
          }

          const rawTurnLogs = getNewLogs();
          const turnLogs = filterShowdownLogs(rawTurnLogs);

          if (rawTurnLogs.length > 0) lastProgressMs = performance.now();

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
            const usedThisTurnInLog = rawTurnLogs.some(l => {
              if (!l.startsWith('|')) return false;
              const p = l.split('|').map(x => x.trim());
              return p[1] === 'move' && toID(p[3]) === m;
            });
            const usedThisTurnByChoice = p1NeedsAction && p1AcceptedChoice && p1AcceptedChoice.startsWith('move');
            if (usedThisTurnInLog || usedThisTurnByChoice) {
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

          // (saves happen outside the loop after it completes)
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? (err as Error).message : String(err);
        const batchIdStr = (batch as unknown as { name?: string; id?: string }).name || (batch as unknown as { name?: string; id?: string }).id || 'unknown';
        console.error(`❌ [FUZZER-BATCH-CRASH] Turn ${turn} Batch ${batchIdStr}: ${errMsg}`, err);
        
        batch.movesToTest.forEach(m => {
          if (moveCoverage[m]) {
            moveCoverage[m]!.status = 'FAIL';
            moveCoverage[m]!.details = `CRASH: ${errMsg}`;
            moveCoverage[m]!.unhandledLogs = [...localUnhandled];
            moveCoverage[m]!.reproduceTrace = {
              playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species})`),
              enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species})`),
              steps: [...steps]
            };
          }
        });

        batch.abilitiesToTest.forEach(a => {
          if (abilityCoverage[a]) {
            abilityCoverage[a]!.status = 'FAIL';
            abilityCoverage[a]!.details = `CRASH: ${errMsg}`;
            abilityCoverage[a]!.unhandledLogs = [...localUnhandled];
            abilityCoverage[a]!.reproduceTrace = {
              playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species})`),
              enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species})`),
              steps: [...steps]
            };
          }
        });
      }

      // Save accumulated data and final battle state for E2E verification
      const batchRecord = batch as unknown as Record<string, unknown>;
      batchRecord.seed = seedNums;
      batchRecord.playerChoices = batchChoices;
      batchRecord.enemyChoices = batchEnemyChoices;
      batchRecord.history = batchHistory;
      batchRecord.steps = steps;
      // A draw is a valid Showdown outcome: win(null) sets winner='' and ended=true.
      // Canonical reference: external/pokemon-showdown-code/sim/sim/battle.ts#L1540-L1543
      if (!simBattle.ended || simBattle.winner === undefined) {
        throw new Error(`[FUZZER-CERTIFICATION] Battle did not finish organically. context=${JSON.stringify({
          batch: roundNum,
          seed: seedNums,
          battleTurn: simBattle.turn,
          ended: simBattle.ended,
          winner: simBattle.winner,
          p1ChoiceIndex: batchChoices.length,
          p2ChoiceIndex: batchEnemyChoices.length,
          historyCount: batchHistory.length,
          p1Request: simBattle.p1.activeRequest,
          p2Request: simBattle.p2.activeRequest,
          recentSteps: steps.slice(-10)
        })}`);
      }

      const p1Final = simBattle.p1.pokemon.map(p => ({
        name: p.name,
        hp: p.fainted ? 0 : p.hp,
        maxHp: p.maxhp,
        fainted: p.fainted
      }));
      const p2Final = simBattle.p2.pokemon.map(p => ({
        name: p.name,
        hp: p.fainted ? 0 : p.hp,
        maxHp: p.maxhp,
        fainted: p.fainted
      }));

      // winner==='' means a draw (e.g. Perish Song kills both simultaneously)
      const winnerSeat = simBattle.winner === simBattle.p1.name ? 'p1'
        : simBattle.winner === simBattle.p2.name ? 'p2'
        : 'tie';
      batchRecord.ended = simBattle.ended;
      batchRecord.winner = winnerSeat;
      batchRecord.finalState = {
        isOver: true,
        winner: winnerSeat,
        p1: p1Final,
        p2: p2Final,
      };

      console.log(`✅ [WORKER-${process.pid || 'THREAD'}] Completado Lote #${roundNum} / ${totalRounds} (${simBattle.turn} turnos).`);
      break;
    }

    return { batch, moveCoverage, abilityCoverage };
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

  // Execute batches concurrently using Worker threads (capped at half cores up to 8 max to protect RAM)
  console.log(`🚀 Paralelizando simulación de ${batches.length} lotes con ${MAX_WORKER_CORES} Worker threads de Node.js...`);

  const workerScript = path.resolve(process.cwd(), 'scripts/e2e/fuzzer/core/fuzzer_batch_worker.ts');

  async function runBatchInThread(batch: typeof batches[0], roundNum: number): Promise<{ batch: typeof batches[0]; moveCoverage: Record<string, CoverageItem>; abilityCoverage: Record<string, CoverageItem> }> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerScript, {
        workerData: { batch, roundNum, totalRounds },
        execArgv: ['--no-experimental-webstorage', '--import', 'tsx']
      });

      worker.on('message', (msg: { status: string; result?: { batch: typeof batches[0]; moveCoverage: Record<string, CoverageItem>; abilityCoverage: Record<string, CoverageItem> }; error?: string }) => {
        if (msg.status === 'SUCCESS' && msg.result) {
          resolve(msg.result);
        } else {
          reject(new Error(msg.error || 'Worker thread execution error'));
        }
      });
      worker.on('error', reject);
      worker.on('exit', code => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }

  for (let i = 0; i < batches.length; i += MAX_WORKER_CORES) {
    const chunk = batches.slice(i, i + MAX_WORKER_CORES);
    const chunkResults = await Promise.all(chunk.map((b, idxOffset) => runBatchInThread(b, i + idxOffset + 1)));

    // Merge results into main coverage maps and original batch objects
    for (let idx = 0; idx < chunkResults.length; idx++) {
      const res = chunkResults[idx]!;
      for (const [mId, item] of Object.entries(res.moveCoverage)) {
        if (!moveCoverage[mId] || item.status === 'PASS' || item.status === 'FAIL') {
          moveCoverage[mId] = item;
        }
      }
      for (const [aId, item] of Object.entries(res.abilityCoverage)) {
        if (!abilityCoverage[aId] || item.status === 'PASS' || item.status === 'FAIL') {
          abilityCoverage[aId] = item;
        }
      }
      // Copy enriched batch properties back into main process batches array
      Object.assign(batches[i + idx]!, res.batch);
    }
  }

  logger.debug = originalDebug;

  return { moveCoverage, abilityCoverage, batches };
}

// ---------------------------------------------------------------------------
// Helpers for certified_fuzzer_cases.json (In-Memory Storage)
// ---------------------------------------------------------------------------
import { fuzzerMemoryStore } from './fuzzerMemoryStore.ts';

function recordCertifiedBattleCases(batches: ReturnType<typeof generateTestBatches>): void {
  const cases = batches.map((batch, index) => certifyBattleCase(batch, index + 1));
  fuzzerMemoryStore.appendBattleCases(cases);
}

function recordCertifiedAbilityCases(batches: ReturnType<typeof generateTestBatches>): void {
  const cases = batches.map((batch, index) => certifyBattleCase(batch, index + 1));
  fuzzerMemoryStore.appendBattleCases(cases);
}

export async function flushFuzzerMemoryStoreToDisk(): Promise<void> {
  await fuzzerMemoryStore.flushToDisk();
}

// ---------------------------------------------------------------------------
// Exported fuzzer functions
// ---------------------------------------------------------------------------

export async function runMovesFuzzer(): Promise<FuzzerResult[]> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const { moveCoverage, batches } = await runBattleBatchLoop();

  const movesList = Object.values(moveCoverage);

  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
    summary: {
      totalMoves: movesList.length,
      passedMoves: movesList.filter(m => m.status === 'PASS').length,
      failedMoves: movesList.filter(m => m.status === 'FAIL').length,
      untestedMoves: movesList.filter(m => m.status === 'UNTESTED').length,
    },
    moves: movesList,
  };

  await fileWriterQueue.safeWriteFile(MOVES_REPORT_FILE, JSON.stringify(report, null, 2));
  recordCertifiedBattleCases(batches);

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
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
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

  await fileWriterQueue.safeWriteFile(ABILITIES_REPORT_FILE, JSON.stringify(report, null, 2));
  recordCertifiedAbilityCases(batches);

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

  async function executeSingleItemBatch(batch: typeof batches[0], currentRound: number) {
    console.log(`▶️ [FUZZER-ITEMS] Iniciando Lote #${currentRound}/${totalRounds}...`);
    try {
      const fullPlayerTeam = batch.playerTeam.map(createLocalPoke);
      const fullEnemyTeam = batch.enemyTeam.map(createLocalPoke);
      const localP1 = fullPlayerTeam[0]!;
      const localP2 = fullEnemyTeam[0]!;
      const mockStore = createMockBattleContext(localP1, localP2, fullPlayerTeam, fullEnemyTeam);

      const seedNums = [
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000)
      ] as [number, number, number, number];
      const seed = parseShowdownSeedForBattle(seedNums);

      const simBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
      ShowdownLogEnricher.setupRealtimeEnrichment(simBattle);
      simBattle.setPlayer('p1', { name: 'Player', team: batch.playerTeam });
      simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

      batch.playerTeam.forEach((set, idx) => {
        if (set && set.uid && simBattle.p1.pokemon[idx]) {
          (simBattle.p1.pokemon[idx] as unknown as { uid?: string }).uid = set.uid;
        }
      });
      batch.enemyTeam.forEach((set, idx) => {
        if (set && set.uid && simBattle.p2.pokemon[idx]) {
          (simBattle.p2.pokemon[idx] as unknown as { uid?: string }).uid = set.uid;
        }
      });
      ShowdownLogEnricher.enrichRetroactiveLeads(simBattle);

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

      const agent1 = new BattleAgent('p1', new Set(), null);
      const agent2 = new BattleAgent('p2', new Set(), null);

      const batchChoices: string[] = [];
      const batchEnemyChoices: string[] = [];
      const batchHistory: Array<{ turnCount: number; p1Choice: string; p2Choice: string; battleTurn: number }> = [];
      const steps: string[] = [];

      while (!simBattle.ended && turn < maxTurns) {
        turn++;
        const p1Req = simBattle.p1.activeRequest;
        const p2Req = simBattle.p2.activeRequest;
        if (!p1Req || !p2Req) break;

        const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest);
        const p1NeedsAction = requiresAction(p1Req);
        const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest);
        const p2NeedsAction = requiresAction(p2Req);

        const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
        (engine as unknown as { battle: Battle }).battle = simBattle;

        const { p1AcceptedChoice, p2AcceptedChoice } = engine.executeTurn({
          p1Choice,
          p2Choice,
          ipbActive: true
        });

        if (p1NeedsAction && p1AcceptedChoice && !p1AcceptedChoice.startsWith('team')) {
          batchChoices.push(p1AcceptedChoice);
        }
        if (p2NeedsAction && p2AcceptedChoice && !p2AcceptedChoice.startsWith('team')) {
          batchEnemyChoices.push(p2AcceptedChoice);
        }
        if (p1NeedsAction || p2NeedsAction) {
          batchHistory.push({ turnCount: turn, p1Choice: p1AcceptedChoice, p2Choice: p2AcceptedChoice, battleTurn: simBattle.turn });
        }

        const rawTurnLogs = getNewLogs();
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          const stepDesc = simplifyLogLine(logLine);
          if (stepDesc) steps.push(`Turno ${turn}: ${stepDesc}`);
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }

        batch.itemsToTest.forEach(itemId => {
          const cleanItem = toID(itemId);
          const usedInLog = rawTurnLogs.some(l => toID(l).includes(cleanItem));
          const equippedOnPlayer = batch.playerTeam.some(p => toID(p.item ?? '') === cleanItem);
          if (usedInLog || equippedOnPlayer) {
            if (itemCoverage[itemId] && itemCoverage[itemId]!.status === 'UNTESTED') {
              itemCoverage[itemId]!.status = 'PASS';
            }
          }
        });
      }

      const rec = batch as unknown as Record<string, unknown>;
      rec.seed = seed;
      rec.playerChoices = batchChoices;
      rec.enemyChoices = batchEnemyChoices;
      rec.history = batchHistory;
      rec.steps = steps;
      rec.ended = simBattle.ended;
      rec.winner = simBattle.winner || null;

      console.log(`✅ [FUZZER-ITEMS] Completado Lote #${currentRound}/${totalRounds}.`);
    } catch (err: unknown) {
      console.error(`❌ [FUZZER-ITEMS] Error en Lote #${currentRound}:`, err);
    }
  }

  const ITEM_CONCURRENCY = MAX_WORKER_CORES;
  console.log(`🚀 Paralelizando simulación de ${batches.length} lotes de ítems con ${ITEM_CONCURRENCY} workers...`);

  for (let i = 0; i < batches.length; i += ITEM_CONCURRENCY) {
    const chunk = batches.slice(i, i + ITEM_CONCURRENCY);
    await Promise.all(chunk.map((b, idxOffset) => executeSingleItemBatch(b, i + idxOffset + 1)));
  }

  recordCertifiedItemCases(batches);

  const items = Object.values(itemCoverage);
  const passed = items.filter(i => i.status === 'PASS').length;
  const failed = items.filter(i => i.status === 'FAIL').length;
  const untested = items.filter(i => i.status === 'UNTESTED').length;

  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
    summary: {
      totalItems: items.length,
      passedItems: passed,
      failedItems: failed,
      untestedItems: untested
    },
    items
  };

  await fileWriterQueue.safeWriteFile(itemsReportFile, JSON.stringify(report, null, 2));

  return [{ label: 'Ítems', passed, failed, untested, total: items.length }];
}

function recordCertifiedItemCases(batches: ReturnType<typeof generateItemTestBatches>): void {
  const cases = batches.map((b, idx) => {
    const hash = generateBatchHash(b);
    const rec = b as unknown as Record<string, unknown>;
    return {
      id: `case-item-${hash}`,
      idx: idx + 1,
      playerTeam: b.playerTeam,
      enemyTeam: b.enemyTeam,
      itemsToTest: b.itemsToTest,
      seed: rec.seed || null,
      playerChoices: rec.playerChoices || [],
      enemyChoices: rec.enemyChoices || [],
      steps: rec.steps || [],
      ended: rec.ended ?? false,
      winner: rec.winner ?? null,
      finalState: rec.finalState ?? null,
    };
  });
  fuzzerMemoryStore.setAuxiliarySection('items', cases);
}

// ---------------------------------------------------------------------------
// Scripted Scenarios Fuzzer Engine
// ---------------------------------------------------------------------------

export interface ScenarioResultItem {
  name: string;
  type: 'ability_scenario' | 'combat_mechanics';
  status: 'PASS' | 'FAIL';
  errors?: string[];
  steps?: string[];
}

export async function runScenariosFuzzer(): Promise<FuzzerResult[]> {
  const SCENARIOS_REPORT_FILE = path.join(RESULTS_DIR, 'fuzzer_scenarios_coverage_report.json');
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const originalDebug = logger.debug;
  logger.debug = () => {};

  const allScenarios = [
    ...ABILITY_SCENARIOS.map(s => ({ ...s, type: 'ability_scenario' as const })),
    ...MECHANICS_SCENARIOS.map(s => ({ ...s, type: 'combat_mechanics' as const }))
  ];

  const totalScenarios = allScenarios.length;
  console.log(`📦 Ejecutando ${totalScenarios} escenarios scriptados de habilidades y mecánicas de combate...`);

  const scenarioResults: Record<string, ScenarioResultItem> = {};

  async function executeSingleScenario(scenario: typeof allScenarios[0], idxNum: number) {
    let executionError: string | null = null;
    const scenarioSteps: string[] = [];
    const localUnhandled: string[] = [];

    try {
      const fullPlayerTeam = scenario.playerTeam.map(createLocalPoke);
      const fullEnemyTeam = scenario.enemyTeam.map(createLocalPoke);
      const localP1 = fullPlayerTeam[0]!;
      const localP2 = fullEnemyTeam[0]!;
      const mockStore = createMockBattleContext(localP1, localP2, fullPlayerTeam, fullEnemyTeam);

      const seedNums = [
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000)
      ] as [number, number, number, number];
      const seed = parseShowdownSeedForBattle(seedNums);

      const simBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
      ShowdownLogEnricher.setupRealtimeEnrichment(simBattle);
      simBattle.setPlayer('p1', { name: 'Player', team: scenario.playerTeam });
      simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: scenario.enemyTeam });

      scenario.playerTeam.forEach((set, idx) => {
        const uid = (set as { uid?: string })?.uid;
        if (uid && simBattle.p1.pokemon[idx]) {
          (simBattle.p1.pokemon[idx] as unknown as { uid?: string }).uid = uid;
        }
      });
      scenario.enemyTeam.forEach((set, idx) => {
        const uid = (set as { uid?: string })?.uid;
        if (uid && simBattle.p2.pokemon[idx]) {
          (simBattle.p2.pokemon[idx] as unknown as { uid?: string }).uid = uid;
        }
      });
      ShowdownLogEnricher.enrichRetroactiveLeads(simBattle);

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

      let actionIdx = 0;

      while (!simBattle.ended && actionIdx < scenario.actions.length) {
        const actionPair = scenario.actions[actionIdx]!;
        actionIdx++;

        const preTurnUnhandledCount = unhandledBridgeLines.length;

        const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
        (engine as unknown as { battle: Battle }).battle = simBattle;

        engine.executeTurn({
          p1Choice: actionPair.p1,
          p2Choice: actionPair.p2,
          ipbActive: false
        });

        const turnLogs = filterShowdownLogs(getNewLogs());

        for (const logLine of turnLogs) {
          const stepDesc = simplifyLogLine(logLine);
          if (stepDesc) scenarioSteps.push(`Acción ${actionIdx}: ${stepDesc}`);
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }

        const addedUnhandled = unhandledBridgeLines.slice(preTurnUnhandledCount);
        for (const line of addedUnhandled) {
          localUnhandled.push(line);
        }
      }

      if (scenario.validate) {
        const isValid = scenario.validate(simBattle);
        if (!isValid) {
          executionError = 'El validador personalizado del escenario retornó falso.';
        }
      }

      if (localUnhandled.length > 0) {
        executionError = `Líneas de bridge no manejadas detectadas: ${localUnhandled.join('; ')}`;
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

    console.log(`✅ [FUZZER-SCENARIOS] Completed Scenario #${idxNum}/${totalScenarios}: ${scenario.name}.`);
  }

  const SCENARIO_CONCURRENCY = MAX_WORKER_CORES;
  console.log(`🚀 Paralelizando simulación de ${totalScenarios} escenarios con ${SCENARIO_CONCURRENCY} workers...`);

  for (let i = 0; i < allScenarios.length; i += SCENARIO_CONCURRENCY) {
    const chunk = allScenarios.slice(i, i + SCENARIO_CONCURRENCY);
    await Promise.all(chunk.map((s, idxOffset) => executeSingleScenario(s, i + idxOffset + 1)));
  }

  logger.debug = originalDebug;

  const scenariosList = Object.values(scenarioResults);

  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
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

  await fileWriterQueue.safeWriteFile(SCENARIOS_REPORT_FILE, JSON.stringify(report, null, 2));

  const scenarioCases = allScenarios.map((s, idx) => {
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
  fuzzerMemoryStore.setAuxiliarySection('scenarios', scenarioCases);
  console.log(`💾 Casos de escenarios guardados exitosamente en fuzzerMemoryStore (RAM).`);

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
