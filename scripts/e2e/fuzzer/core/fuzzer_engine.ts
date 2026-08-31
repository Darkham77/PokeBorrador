// scripts/battle-tester/fuzzer-engine.ts
Reflect.set(globalThis, '__E2E__', true);
process.env.VITE_E2E = 'true';

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { toID, Dex, type SideID } from '@pkmn/sim';
import { ShowdownBattleEngine } from '../../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { fileWriterQueue } from '../../helpers/fileWriterQueue.ts';
import { logger } from '../../../../src/logic/utils/logger.ts';
import { parseShowdownSeedForBattle, resetDeterministicMathRandom } from '../../../../src/logic/battle/helpers/seedInitializer.ts';
import { generateTestBatches, getTriggerSlot } from '../generators/fuzzer_team_generator.ts';
import type { TestBatch, CertifiedBattleHistoryEntry } from '../generators/fuzzer_team_generator.ts';
import { certifyBattleCase } from './certifiedBattleCase.ts';
import { generateItemTestBatches, ITEM_FUZZER_ACTIVE_HOLDER_COUNT, type ItemTestBatch } from '../generators/fuzzer_item_generator.ts';
import { createMockBattleContext } from './fuzzer_mock_battle_store.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../../../../src/logic/battle/showdownBridge.ts';
import { fuzzerMemoryStore } from './fuzzerMemoryStore.ts';
// Aplicar el monkey-patch unificado de Showdown
import { resolveBaseStats, statsMap, patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { BattleAgent, classifyRequest, type ChoiceRequest } from './fuzzer_agent.ts';
import { syncRequestConditionsWithSimulator } from '../../../../src/logic/battle/cheats.ts';
import { PokemonLegalityValidator } from '../../../../src/logic/battle/helpers/pokemonLegalityValidator.ts';

// Force inMemory SQLite and Offline DB mode for maximum speed and zero I/O overhead
Reflect.set(globalThis, '__E2E__', true);
process.env.VITE_E2E = 'true';

patchShowdownSpreadModify(() => true);
import type { Pokemon, PokemonMoveId } from '../../../../src/types/pokemon/pokemon.ts';
import type { PokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';
import type { NatureId } from '../../../../src/data/battle/natures.ts';
import type { AbilityId } from '../../../../src/data/battle/abilities.ts';
import type { ItemId } from '../../../../src/data/inventory/items.ts';
import type { PokemonType } from '../../../../src/data/battle/types.ts';
import type { MoveCategory } from '../../../../src/data/battle/moves.ts';
import { createShowdownBattle } from '../../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownTeamMapper, type CustomPokemonSet } from '../../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { ShowdownLogEnricher } from '../../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { requiresAction } from '../../../../src/logic/battle/helpers/requestHelper.ts';
import { ACTIVE_SHOWDOWN_FORMAT, MAX_BATTLE_TURNS } from '../../../../src/data/system/constants.ts';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../../simulation_config.ts';

// Capped at total logical CPU cores divided by 4 (physical cores / 2) to optimize throughput
export const MAX_WORKER_CORES = Math.max(1, Math.floor(os.cpus().length / 4));

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
export function resetRandomSeed() {
  resetDeterministicMathRandom(12345);
}

// Logger intercept — shared per worker instance (Vitest isolates modules per
// file, so each fuzzer spec has its own copy of this state).
// ---------------------------------------------------------------------------
const unhandledBridgeLines: string[] = []; // no-domain
const originalDebug = logger.debug;
logger.debug = (tag: string, message: string, ...args: unknown[]) => {
  if (tag === 'ShowdownBridge' && message.includes('sin parseador')) {
    const parts = message.split('específico: ');
    const line = parts[1] || '';
    const lp = line.split('|').map(x => x.trim());
    const type = lp[1] || '';
    const ignoredTypes = [ // no-domain
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

  statsMap.set(set.name, { ...calculated }); // no-domain
  Reflect.set(set, 'stats', calculated);

  const mainType = (speciesData.types[0] || 'normal').toLowerCase() as PokemonType;
  const subType = speciesData.types[1] ? speciesData.types[1].toLowerCase() as PokemonType : undefined;

  const poke: Pokemon = {
    uid: (Reflect.get(set, 'uid') as string | undefined) || `uid-${toID(set.species)}`,
    id: toID(set.species) as PokemonSpeciesId,
    species: toID(set.species) as PokemonSpeciesId,
    name: set.name, // no-domain
    level: set.level,
    isShiny: false,
    exp: 0,
    expNeeded: 100,
    hp: calculated.maxHp,
    maxHp: calculated.maxHp,
    atk: calculated.atk,
    def: calculated.def,
    spa: calculated.spa,
    spd: calculated.spd,
    spe: calculated.spe,
    ivs: (Reflect.get(set, 'ivs') as { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } | undefined) || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    nature: ((Reflect.get(set, 'nature') as string | undefined) || 'serious').toLowerCase() as NatureId,
    type: mainType,
    type2: subType,
    ability: toID(set.ability) as AbilityId,
    item: set.item ? toID(set.item) as ItemId : undefined,
    status: '',
    volatileCounters: {},
    moves: set.moves.map(m => {
      const d = Dex.moves.get(m);
      return {
        id: toID(m) as PokemonMoveId,
        name: d?.name || m,
        power: d?.basePower ?? 0,
        acc: typeof d?.accuracy === 'number' ? d.accuracy : 100,
        type: (d?.type || 'normal').toLowerCase() as PokemonType,
        cat: (d?.category || 'physical').toLowerCase() as MoveCategory,
        pp: d?.pp ?? 20,
        maxPP: d?.pp ?? 20
      };
    })
  };
  return poke;
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
      const moveToken = parts[3] || ''; // text-ok
      const target = parts[4]?.split(': ')[1] || parts[4] || '';
      return `ataca ${attacker} con ${moveToken}${target ? ` a ${target}` : ''}`;
    }
    case '-ability':
    case 'ability': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      const abilityToken = parts[3] || ''; // text-ok
      return `${poke} activa su habilidad ${abilityToken}`;
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

export function abilityTriggeredInLog(line: string, abilityId: string): boolean {
  const lower = line.toLowerCase(); // string-ok
  const a = abilityId.toLowerCase(); // string-ok
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

export const FUZZER_TEST_OUTCOMES = ['PASS', 'FAIL', 'UNTESTED'] as const;
export type FuzzerTestOutcome = (typeof FUZZER_TEST_OUTCOMES)[number];

interface CoverageItem {
  id: string;
  type: 'move' | 'ability';
  status: FuzzerTestOutcome;
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
  const maxAttempts = 5; // no-domain
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

  const belongsToThisBatch = (msg: string): boolean => { // string-ok
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
      const agent1 = new BattleAgent('p1', movesSet, null, 4, true, false, new Set(remainingAbilities));
      const agent2 = new BattleAgent('p2', new Set(), null);

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

      statsMap.clear();
      ShowdownTeamMapper.populateStatsMap(playerTeamCopy as CustomPokemonSet[]);
      ShowdownTeamMapper.populateStatsMap(enemyTeamCopy as CustomPokemonSet[]);

      PokemonLegalityValidator.assertTeamLegality(playerTeamCopy, `Batch ${roundNum} Player Team`);
      PokemonLegalityValidator.assertTeamLegality(enemyTeamCopy, `Batch ${roundNum} Enemy Team`);

      resetRandomSeed();
      const simBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
      ShowdownLogEnricher.setupRealtimeEnrichment(simBattle);

      simBattle.setPlayer('p1', { name: `P-${roundNum}`, team: playerTeamCopy });
      simBattle.setPlayer('p2', { name: `E-${roundNum}`, team: enemyTeamCopy });

      // Associate UIDs of sets to the simulator instances using direct slot index
      playerTeamCopy.forEach((set, idx) => {
        if (set && set.uid && simBattle.p1.pokemon[idx]) {
          Reflect.set(simBattle.p1.pokemon[idx], 'uid', set.uid);
        }
      });
      enemyTeamCopy.forEach((set, idx) => {
        if (set && set.uid && simBattle.p2.pokemon[idx]) {
          Reflect.set(simBattle.p2.pokemon[idx], 'uid', set.uid);
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
          if (item && item.status === 'UNTESTED') {
            item.status = 'PASS';
            agent1.abilityObjectives.delete(a);
          }
        }
      });

      let turn = 0; // no-domain
      const maxTurns = MAX_BATTLE_TURNS; // no-domain
      const steps: string[] = []; // no-domain
      const batchChoices: string[] = [];
      const batchEnemyChoices: string[] = [];
      const batchHistory: CertifiedBattleHistoryEntry[] = [];

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

          syncRequestConditionsWithSimulator(simBattle.p1);
          syncRequestConditionsWithSimulator(simBattle.p2);

          const p1Req = simBattle.p1.activeRequest;
          const p2Req = simBattle.p2.activeRequest;
          const p1NeedsAction = requiresAction(p1Req) || simBattle.p1.requestState === 'switch' || simBattle.p1.requestState === 'move';
          const p2NeedsAction = requiresAction(p2Req) || simBattle.p2.requestState === 'switch' || simBattle.p2.requestState === 'move';
          const anySeatNeedsAction = simBattle.sides.some(side => requiresAction(side.activeRequest) || side.requestState === 'switch' || side.requestState === 'move');

          const preTurnForceSwitches: Partial<Record<string, boolean>> = {};
          for (const side of simBattle.sides) {
            const reqKind = classifyRequest(side.activeRequest as ChoiceRequest);
            if (reqKind === 'force-switch' || side.requestState === 'switch') {
              preTurnForceSwitches[side.id] = true;
            }
          }

          const activeSidePoke = (p1Req as ChoiceRequest)?.side?.pokemon?.find((p: { active: boolean }) => p.active); // string-ok
          const activeAbilityId = activeSidePoke?.ability ?? '';
          const dynamicTriggerSlot = getTriggerSlot(activeAbilityId.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (dynamicTriggerSlot !== null) {
            agent2.abilityTriggerMoveSlot = dynamicTriggerSlot;
          }

          const p1ReqKind = classifyRequest(p1Req as ChoiceRequest);
          const activeHasExecutableMove = hasExecutableTestMove(p1Req as ChoiceRequest, agent1.movesToTest);
          const ipbActive = agent1.movesToTest.size > 0 && activeHasExecutableMove && p1ReqKind !== 'force-switch' && simBattle.p1.requestState !== 'switch';

          const preTurnHeals: Partial<Record<string, boolean>> = {};
          const preTurnPpRefills: Partial<Record<string, boolean>> = {};

          const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
          Reflect.set(engine, 'battle', simBattle);

          const { p1AcceptedChoice, p2AcceptedChoice, appliedCheats } = engine.executeTurn({
            p1Agent: agent1 as { decide(req: unknown): string },
            p2Agent: agent2 as { decide(req: unknown): string },
            ipbActive
          });

          const hasPreTurnHeals = Object.keys(preTurnHeals).length > 0;
          const hasPreTurnPpRefills = Object.keys(preTurnPpRefills).length > 0;
          const hasPostTurnCheats = appliedCheats && appliedCheats.length > 0;
          const hasAnyForceSwitch = Object.values(preTurnForceSwitches).some(Boolean);

          if (anySeatNeedsAction || hasPreTurnHeals || hasPreTurnPpRefills || hasPostTurnCheats) {
            const safeP1Choice = hasAnyForceSwitch
              ? (preTurnForceSwitches['p1'] && p1AcceptedChoice !== 'pass' ? p1AcceptedChoice : '')
              : (p1NeedsAction && p1AcceptedChoice !== 'pass' ? p1AcceptedChoice : '');
            const safeP2Choice = hasAnyForceSwitch
              ? (preTurnForceSwitches['p2'] && p2AcceptedChoice !== 'pass' ? p2AcceptedChoice : '')
              : (p2NeedsAction && p2AcceptedChoice !== 'pass' ? p2AcceptedChoice : '');
            const p1Active = simBattle.p1.pokemon.find(p => p.isActive);
            const p2Active = simBattle.p2.pokemon.find(p => p.isActive);
            const p1ReqActive = (p1Req as ChoiceRequest)?.active?.[0];
            const p2ReqActive = (p2Req as ChoiceRequest)?.active?.[0];

            const p1LockedMove = (p1ReqActive?.moves?.length === 1 && p1ReqActive.moves[0]?.id)
              ? p1ReqActive.moves[0].id
              : undefined;
            const p2LockedMove = (p2ReqActive?.moves?.length === 1 && p2ReqActive.moves[0]?.id)
              ? p2ReqActive.moves[0].id
              : undefined;

            const p1MoveIdx = safeP1Choice.startsWith('move ') ? parseInt(safeP1Choice.slice(5), 10) - 1 : -1;
            const p2MoveIdx = safeP2Choice.startsWith('move ') ? parseInt(safeP2Choice.slice(5), 10) - 1 : -1;
            const p1MoveId = p1MoveIdx >= 0 && p1ReqActive?.moves?.[p1MoveIdx]?.id ? p1ReqActive.moves[p1MoveIdx].id : undefined;
            const p2MoveId = p2MoveIdx >= 0 && p2ReqActive?.moves?.[p2MoveIdx]?.id ? p2ReqActive.moves[p2MoveIdx].id : undefined;
            const p1MovePp = p1MoveIdx >= 0 && typeof p1ReqActive?.moves?.[p1MoveIdx]?.pp === 'number' ? p1ReqActive.moves[p1MoveIdx].pp : undefined;
            const p2MovePp = p2MoveIdx >= 0 && typeof p2ReqActive?.moves?.[p2MoveIdx]?.pp === 'number' ? p2ReqActive.moves[p2MoveIdx].pp : undefined;

            const p1Trapped = Boolean((p1Req as ChoiceRequest)?.active?.[0]?.trapped || (p1Req as ChoiceRequest)?.active?.[0]?.maybeTrapped);
            const p2Trapped = Boolean((p2Req as ChoiceRequest)?.active?.[0]?.trapped || (p2Req as ChoiceRequest)?.active?.[0]?.maybeTrapped);
            const p1Volatiles = p1Active?.volatiles && Object.keys(p1Active.volatiles).length > 0 ? Object.keys(p1Active.volatiles) : undefined;
            const p2Volatiles = p2Active?.volatiles && Object.keys(p2Active.volatiles).length > 0 ? Object.keys(p2Active.volatiles) : undefined;
            const p1StatStages = p1Active?.boosts ? { ...p1Active.boosts } : undefined;
            const p2StatStages = p2Active?.boosts ? { ...p2Active.boosts } : undefined;
            const p1Status = p1Active?.status || undefined;
            const p2Status = p2Active?.status || undefined;
            const p1Hp = p1Active?.hp;
            const p2Hp = p2Active?.hp;
            const weather = simBattle.field.weather || undefined;
            const terrain = simBattle.field.terrain || undefined;
            const p1SideConditions = simBattle.p1.sideConditions && Object.keys(simBattle.p1.sideConditions).length > 0 ? Object.keys(simBattle.p1.sideConditions) : undefined;
            const p2SideConditions = simBattle.p2.sideConditions && Object.keys(simBattle.p2.sideConditions).length > 0 ? Object.keys(simBattle.p2.sideConditions) : undefined;

            const p1SwitchedSlot = safeP1Choice.startsWith('switch ') ? parseInt(safeP1Choice.slice(7), 10) - 1 : -1;
            const p2SwitchedSlot = safeP2Choice.startsWith('switch ') ? parseInt(safeP2Choice.slice(7), 10) - 1 : -1;
            const p1SwitchedUid = p1SwitchedSlot >= 0 && simBattle.p1.pokemon[p1SwitchedSlot] ? (Reflect.get(simBattle.p1.pokemon[p1SwitchedSlot], 'uid') as string | undefined) : undefined;
            const p2SwitchedUid = p2SwitchedSlot >= 0 && simBattle.p2.pokemon[p2SwitchedSlot] ? (Reflect.get(simBattle.p2.pokemon[p2SwitchedSlot], 'uid') as string | undefined) : undefined;

            const histEntry: CertifiedBattleHistoryEntry = {
              turnCount: turn,
              p1Choice: safeP1Choice,
              p2Choice: safeP2Choice,
              battleTurn: simBattle.turn,
              p1ActiveUid: p1Active ? (Reflect.get(p1Active, 'uid') as string | undefined) : p1SwitchedUid,
              p2ActiveUid: p2Active ? (Reflect.get(p2Active, 'uid') as string | undefined) : p2SwitchedUid,
              p1MoveId,
              p2MoveId,
              p1MovePp,
              p2MovePp,
              p1LockedMoveId: p1LockedMove,
              p2LockedMoveId: p2LockedMove,
              p1Trapped: p1Trapped || undefined,
              p2Trapped: p2Trapped || undefined,
              p1Volatiles,
              p2Volatiles,
              p1StatStages,
              p2StatStages,
              p1Status,
              p2Status,
              p1Hp,
              p2Hp,
              weather,
              terrain,
              p1SideConditions,
              p2SideConditions,
            };

            for (const side of simBattle.sides) {
              const seatId = side.id as SideID;
              if (preTurnForceSwitches[seatId]) {
                const key = `${seatId}ForceSwitch` as keyof CertifiedBattleHistoryEntry;
                Reflect.set(histEntry, key, true);
              }
              if (preTurnHeals[seatId]) {
                const key = `${seatId}PreHeal` as keyof CertifiedBattleHistoryEntry;
                Reflect.set(histEntry, key, true);
              }
              if (preTurnPpRefills[seatId]) {
                const key = `${seatId}PpRefill` as keyof CertifiedBattleHistoryEntry;
                Reflect.set(histEntry, key, true);
              }
            }

            if (hasPostTurnCheats) {
              appliedCheats.forEach(c => {
                const seatId = c.side as SideID;
                const key = `${seatId}Heal` as keyof CertifiedBattleHistoryEntry;
                Reflect.set(histEntry, key, true);
              });
            }
            batchHistory.push(histEntry);
          }

          if (hasAnyForceSwitch) {
            if (preTurnForceSwitches['p1'] && p1AcceptedChoice && p1AcceptedChoice !== 'pass' && !p1AcceptedChoice.startsWith('team')) {
              batchChoices.push(p1AcceptedChoice);
            }
            if (preTurnForceSwitches['p2'] && p2AcceptedChoice && p2AcceptedChoice !== 'pass' && !p2AcceptedChoice.startsWith('team')) {
              batchEnemyChoices.push(p2AcceptedChoice);
            }
          } else {
            if (p1AcceptedChoice && p1AcceptedChoice !== 'pass' && !p1AcceptedChoice.startsWith('team')) {
              batchChoices.push(p1AcceptedChoice);
            }
            if (p2AcceptedChoice && p2AcceptedChoice !== 'pass' && !p2AcceptedChoice.startsWith('team')) {
              batchEnemyChoices.push(p2AcceptedChoice);
            }
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
                  agent1.abilityObjectives.delete(a);
                }
              }
            }
          });

          // (saves happen outside the loop after it completes)
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? (err as Error).message : String(err);
        const batchIdStr = (batch as { id?: string }).id ?? 'unknown'; // no-domain
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
      Reflect.set(batch, 'seed', seedNums);
      Reflect.set(batch, 'playerChoices', batchChoices);
      Reflect.set(batch, 'enemyChoices', batchEnemyChoices);
      Reflect.set(batch, 'history', batchHistory);
      Reflect.set(batch, 'steps', steps);
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
      Reflect.set(batch, 'ended', simBattle.ended);
      Reflect.set(batch, 'winner', winnerSeat);
      Reflect.set(batch, 'finalState', {
        isOver: true,
        winner: winnerSeat,
        p1: p1Final,
        p2: p2Final,
      });

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
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

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
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

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
  id: ItemId;
  status: FuzzerTestOutcome;
  evidence?: ItemCoverageEvidence;
  unhandledLogs?: string[];
}

const _ITEM_COVERAGE_EVIDENCE_TYPES = ['showdown-log', 'same-seed-control'] as const;
type ItemCoverageEvidence = (typeof _ITEM_COVERAGE_EVIDENCE_TYPES)[number];

interface ItemFuzzerHistoryEntry {
  turnCount: number;
  p1Choice: string;
  p2Choice: string;
  battleTurn: number;
}

function replayItemControlBattle(
  batch: ItemTestBatch,
  seed: ReturnType<typeof parseShowdownSeedForBattle>,
  history: readonly ItemFuzzerHistoryEntry[],
  certifiedLogs: readonly string[],
  certifiedLogLengths: readonly number[]
): string[] {
  if (!seed) {
    throw new Error('[FUZZER-ITEMS] The certified item battle is missing its Showdown seed.');
  }

  const controlBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
  const controlPlayerTeam: PokemonSet[] = batch.playerTeam.map(({ uid: _uid, ...set }) => ({ ...set, item: '' }));
  controlBattle.setPlayer('p1', { name: 'Player', team: controlPlayerTeam });
  controlBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

  let logIndex = controlBattle.log.length;
  const controlLogs: string[] = [...controlBattle.log];
  for (const [historyIndex, entry] of history.entries()) {
    if (controlBattle.ended) break;
    if (!controlBattle.p1.activeRequest || !controlBattle.p2.activeRequest) {
      throw new Error(`[FUZZER-ITEMS] Same-seed control lost an actionable request at certified turn ${entry.turnCount}.`);
    }
    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', controlBattle);
    try {
      engine.executeTurn({ p1Choice: entry.p1Choice, p2Choice: entry.p2Choice, ipbActive: !batch.disableIpbHealing });
    } catch (error: unknown) {
      if (isControlChoiceRejection(error)) return controlLogs;
      throw error;
    }
    controlLogs.push(...controlBattle.log.slice(logIndex));
    logIndex = controlBattle.log.length;
    const certifiedLogLength = certifiedLogLengths[historyIndex];
    if (certifiedLogLength === undefined) {
      throw new Error(`[FUZZER-ITEMS] Missing certified log boundary at turn ${entry.turnCount}.`);
    }
    if (hasControlDivergedBeforeNextCertifiedDecision(certifiedLogs, controlLogs, certifiedLogLength)) {
      return controlLogs;
    }
  }
  return controlLogs;
}

function hasSameSeedControlDifference(certifiedLogs: readonly string[], controlLogs: readonly string[]): boolean {
  const normalize = (line: string): string => line
    .replace(/\|\[uids\][^|]*/g, '')
    .replace(/^\|t:\|.+$/, '|t:|');
  return certifiedLogs.length !== controlLogs.length || certifiedLogs.some((line, index) => normalize(line) !== normalize(controlLogs[index] ?? ''));
}

export function isControlChoiceRejection(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('[ShowdownBattleEngine] Elección ');
}

export function hasControlDivergedBeforeNextCertifiedDecision(
  certifiedLogs: readonly string[],
  controlLogs: readonly string[],
  certifiedLogLength: number
): boolean {
  return hasSameSeedControlDifference(certifiedLogs.slice(0, certifiedLogLength), controlLogs.slice(0, certifiedLogLength));
}

export function hasCertifiedItemProtocolEvidence(itemId: ItemId, certifiedLogs: readonly string[]): boolean {
  return certifiedLogs.some(line => toID(line).includes(toID(itemId)));
}

export async function runItemsFuzzer(): Promise<FuzzerResult[]> {
  const itemsReportFile = path.join(RESULTS_DIR, 'fuzzer_items_coverage_report.json');
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  let batches = generateItemTestBatches(ITEM_FUZZER_ACTIVE_HOLDER_COUNT);
  const filterEnv = process.env.FILTER_ITEMS ?? process.env.FILTER_ITEM ?? process.env.FILTER;
  if (filterEnv) {
    const filters = filterEnv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (filters.length > 0) {
      batches = batches.filter(b => b.itemsToTest.some(id => filters.includes(id.toLowerCase())));
      console.log(`🎯 [FUZZER-ITEMS] Filtrado activado para: ${filters.join(', ')}. Lotes a ejecutar: ${batches.length}`);
    }
  }
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
    resetRandomSeed();
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

      resetRandomSeed();
      const simBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
      ShowdownLogEnricher.setupRealtimeEnrichment(simBattle);
      simBattle.setPlayer('p1', { name: 'Player', team: batch.playerTeam });
      simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

      batch.playerTeam.forEach((set, idx) => {
        if (set && set.uid && simBattle.p1.pokemon[idx]) {
          Reflect.set(simBattle.p1.pokemon[idx], 'uid', set.uid);
          if (set.item === 'aspearberry') {
            simBattle.p1.pokemon[idx].setStatus('frz');
          }
        }
      });
      batch.enemyTeam.forEach((set, idx) => {
        if (set && set.uid && simBattle.p2.pokemon[idx]) {
          Reflect.set(simBattle.p2.pokemon[idx], 'uid', set.uid);
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

      const certifiedRawLogs = getNewLogs();
      const initLogs = filterShowdownLogs(certifiedRawLogs);
      for (const logLine of initLogs) {
        await parseShowdownLogLine(mockStore, logLine, initLogs);
      }

      let turn = 0;

      const playerLead = batch.playerTeam[0];
      const enemyLead = batch.enemyTeam[0];
      if (!playerLead || !enemyLead) {
        throw new Error('[FUZZER-ITEMS] Each certified item batch requires an active player and enemy lead.');
      }
      const agent1 = new BattleAgent(
        'p1',
        new Set(playerLead.moves),
        batch.playerPriorityMove ? 1 : null,
        batch.playerPeriodicSwitchEvery,
        true,
        batch.playerVoluntarySwitchObjective
      );
      const agent2 = new BattleAgent('p2', new Set(enemyLead.moves), batch.enemyPriorityMove ? 1 : null); // no-domain

      const batchChoices: string[] = [];
      const batchEnemyChoices: string[] = [];
      const batchHistory: ItemFuzzerHistoryEntry[] = []; // no-domain
      const certifiedLogLengths: number[] = [];
      const steps: string[] = [];

      while (!simBattle.ended) {
        turn++;
        const p1Req = simBattle.p1.activeRequest;
        const p2Req = simBattle.p2.activeRequest;
        if (!p1Req || !p2Req) break;

        const p1Choice = agent1.decide(p1Req as ChoiceRequest);
        const p2Choice = agent2.decide(p2Req as ChoiceRequest);
        const anySeatNeedsAction = simBattle.sides.some(side => requiresAction(side.activeRequest) || side.requestState === 'switch' || side.requestState === 'move');

        const preTurnP1ForceSwitch = classifyRequest(p1Req as ChoiceRequest) === 'force-switch' || simBattle.p1.requestState === 'switch';
        const preTurnP2ForceSwitch = classifyRequest(p2Req as ChoiceRequest) === 'force-switch' || simBattle.p2.requestState === 'switch';

        const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
        Reflect.set(engine, 'battle', simBattle);

        const testedItemId = batch.itemsToTest[0] ?? '';
        const itemHasEvidence = testedItemId ? hasCertifiedItemProtocolEvidence(testedItemId as ItemId, certifiedRawLogs) : false;
        const ipbActive = !batch.disableIpbHealing && !itemHasEvidence && turn <= 6;

        const preTurnP1Heal = false;
        const { p1AcceptedChoice, p2AcceptedChoice, appliedCheats } = engine.executeTurn({
          p1Choice,
          p2Choice,
          ipbActive
        });

        const p1NeedsAction = requiresAction(p1Req) || simBattle.p1.requestState === 'switch' || simBattle.p1.requestState === 'move';
        const p2NeedsAction = requiresAction(p2Req) || simBattle.p2.requestState === 'switch' || simBattle.p2.requestState === 'move';

        if (p1NeedsAction && p1AcceptedChoice && !p1AcceptedChoice.startsWith('team')) {
          batchChoices.push(p1AcceptedChoice);
        }
        if (p2NeedsAction && p2AcceptedChoice && !p2AcceptedChoice.startsWith('team')) {
          batchEnemyChoices.push(p2AcceptedChoice);
        }
        const hasPostTurnCheats = appliedCheats && appliedCheats.length > 0;
        if (anySeatNeedsAction || preTurnP1Heal || hasPostTurnCheats) {
          const safeP1Choice = (p1NeedsAction && p1AcceptedChoice !== 'pass') ? p1AcceptedChoice : '';
          const safeP2Choice = (p2NeedsAction && p2AcceptedChoice !== 'pass') ? p2AcceptedChoice : '';
          const p1Active = simBattle.p1.pokemon.find(p => p.isActive);
          const p2Active = simBattle.p2.pokemon.find(p => p.isActive);
          const p1SwitchedSlot = safeP1Choice.startsWith('switch ') ? parseInt(safeP1Choice.slice(7), 10) - 1 : -1;
          const p2SwitchedSlot = safeP2Choice.startsWith('switch ') ? parseInt(safeP2Choice.slice(7), 10) - 1 : -1;
          const p1SwitchedUid = p1SwitchedSlot >= 0 && simBattle.p1.pokemon[p1SwitchedSlot] ? (Reflect.get(simBattle.p1.pokemon[p1SwitchedSlot], 'uid') as string | undefined) : undefined;
          const p2SwitchedUid = p2SwitchedSlot >= 0 && simBattle.p2.pokemon[p2SwitchedSlot] ? (Reflect.get(simBattle.p2.pokemon[p2SwitchedSlot], 'uid') as string | undefined) : undefined;

          const histEntry: CertifiedBattleHistoryEntry = {
            turnCount: turn,
            p1Choice: safeP1Choice,
            p2Choice: safeP2Choice,
            battleTurn: simBattle.turn,
            p1ActiveUid: p1Active ? (Reflect.get(p1Active, 'uid') as string | undefined) : p1SwitchedUid,
            p2ActiveUid: p2Active ? (Reflect.get(p2Active, 'uid') as string | undefined) : p2SwitchedUid,
          };
          if (preTurnP1ForceSwitch) histEntry.p1ForceSwitch = true;
          if (preTurnP2ForceSwitch) histEntry.p2ForceSwitch = true;
          if (preTurnP1Heal) histEntry.p1Heal = true;
          if (hasPostTurnCheats && appliedCheats.some(c => c.side === 'p1')) histEntry.p1Heal = true;
          if (hasPostTurnCheats && appliedCheats.some(c => c.side === 'p2')) histEntry.p2Heal = true;
          batchHistory.push(histEntry);
        }

        const rawTurnLogs = getNewLogs();
        certifiedRawLogs.push(...rawTurnLogs);
        if (anySeatNeedsAction) {
          certifiedLogLengths.push(certifiedRawLogs.length);
        }
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          const stepDesc = simplifyLogLine(logLine);
          if (stepDesc) steps.push(`Turno ${turn}: ${stepDesc}`);
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }

      }

      if (batch.itemsToTest.length !== ITEM_FUZZER_ACTIVE_HOLDER_COUNT) {
        throw new Error('[FUZZER-ITEMS] Item evidence requires exactly one active holder per certified battle.');
      }
      const itemId = batch.itemsToTest[0];
      if (!itemId) {
        throw new Error('[FUZZER-ITEMS] Missing item ID in certified item batch.');
      }
      const coverage = itemCoverage[itemId];
      if (!coverage) {
        throw new Error(`[FUZZER-ITEMS] Missing coverage entry for item "${itemId}".`);
      }
      const itemLogObserved = hasCertifiedItemProtocolEvidence(itemId, certifiedRawLogs);
      if (itemLogObserved) {
        coverage.status = 'PASS';
        coverage.evidence = 'showdown-log';
      } else {
        const controlLogs = replayItemControlBattle(batch, seed, batchHistory, certifiedRawLogs, certifiedLogLengths);
        const controlDifference = hasSameSeedControlDifference(certifiedRawLogs, controlLogs);
        if (controlDifference) {
          coverage.status = 'PASS';
          coverage.evidence = 'same-seed-control';
        }
      }

      Reflect.set(batch, 'seed', seed);
      Reflect.set(batch, 'playerChoices', batchChoices);
      Reflect.set(batch, 'enemyChoices', batchEnemyChoices);
      Reflect.set(batch, 'history', batchHistory);
      Reflect.set(batch, 'steps', steps);
      if (!simBattle.ended || simBattle.winner === undefined) {
        throw new Error(`[FUZZER-ITEMS] Item battle did not finish organically. context=${JSON.stringify({
          round: currentRound,
          seed,
          battleTurn: simBattle.turn,
          ended: simBattle.ended,
          winner: simBattle.winner,
          historyCount: batchHistory.length,
        })}`);
      }
      const winner = simBattle.winner === simBattle.p1.name
        ? 'p1'
        : simBattle.winner === simBattle.p2.name
          ? 'p2'
          : 'tie';
      const snapshotSide = (side: typeof simBattle.p1) => side.pokemon.map((pokemon) => ({
        name: pokemon.name,
        hp: pokemon.fainted ? 0 : pokemon.hp,
        maxHp: pokemon.maxhp,
        fainted: pokemon.fainted,
      }));
      Reflect.set(batch, 'ended', true);
      Reflect.set(batch, 'winner', winner);
      Reflect.set(batch, 'finalState', {
        isOver: true,
        winner,
        p1: snapshotSide(simBattle.p1),
        p2: snapshotSide(simBattle.p2),
      });

      console.log(`✅ [FUZZER-ITEMS] Completado Lote #${currentRound}/${totalRounds}.`);
    } catch (err: unknown) {
      console.error(`❌ [FUZZER-ITEMS] Error en Lote #${currentRound}:`, err);
    }
  }

  console.log(`🚀 Paralelizando simulación de ${batches.length} lotes de ítems con ${MAX_WORKER_CORES} workers...`);

  for (let i = 0; i < batches.length; i += MAX_WORKER_CORES) {
    const chunk = batches.slice(i, i + MAX_WORKER_CORES);
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

export function createCertifiedItemBattleCases(batches: readonly ItemTestBatch[]) {
  const certificationBatches: TestBatch[] = batches.map((batch) => ({
    playerTeam: batch.playerTeam,
    enemyTeam: batch.enemyTeam,
    movesToTest: [],
    abilitiesToTest: [],
    seed: batch.seed,
    playerChoices: batch.playerChoices,
    enemyChoices: batch.enemyChoices,
    history: batch.history,
    steps: batch.steps,
    ended: batch.ended,
    winner: batch.winner,
    finalState: batch.finalState,
  }));
  return certificationBatches.map((batch, index) => certifyBattleCase(batch, index + 1));
}

function recordCertifiedItemCases(batches: ReturnType<typeof generateItemTestBatches>): void {
  fuzzerMemoryStore.appendBattleCases(createCertifiedItemBattleCases(batches));
  fuzzerMemoryStore.setAuxiliarySection('items', batches);
}

/**
 * Motor del Fuzzer de Escenarios
 */
export async function runScenariosFuzzer(): Promise<Array<{ label: string; passed: number; failed: number; untested: number; total: number }>> {
  console.log(`🎯 [FUZZER-SCENARIOS] Iniciando fuzzer de escenarios de combate...`);

  const scenariosFile = 'scripts/e2e/fuzzer/fixtures/fuzzer_scenarios.json';

  if (!fs.existsSync(scenariosFile)) {
    console.log(`ℹ️ [FUZZER-SCENARIOS] No existe el archivo de escenarios '${scenariosFile}'. Omitiendo.`);
    return [{ label: 'Escenarios', passed: 0, failed: 0, untested: 0, total: 0 }];
  }

  const rawJson = fs.readFileSync(scenariosFile, 'utf-8');
  const scenariosData = JSON.parse(rawJson) as { scenarios?: Array<{ id: string; playerTeam: PokemonSet[]; enemyTeam: PokemonSet[]; actions: Array<{ p1: string; p2: string }> }> };
  const scenarios = scenariosData.scenarios || [];

  if (scenarios.length === 0) {
    console.log(`ℹ️ [FUZZER-SCENARIOS] No se encontraron escenarios en '${scenariosFile}'. Omitiendo.`);
    return [{ label: 'Escenarios', passed: 0, failed: 0, untested: 0, total: 0 }];
  }

  let passed = 0;
  let failed = 0;

  for (let idx = 0; idx < scenarios.length; idx++) { // no-domain
    const scenario = scenarios[idx]!;
    const unhandledBridgeLines: string[] = [];

    const mockStore = {
      state: {
        player: null,
        enemy: null,
        playerTeam: scenario.playerTeam,
        enemyTeam: scenario.enemyTeam
      },
      addLog: (_msg: string) => {},
      addUnhandledLog: (line: string) => {
        unhandledBridgeLines.push(line);
      }
    };

    try {
      const seedNums: [number, number, number, number] = [1234, 5678, 9012, 3456];
      const seed = parseShowdownSeedForBattle(seedNums);

      const simBattle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
      ShowdownLogEnricher.setupRealtimeEnrichment(simBattle);
      simBattle.setPlayer('p1', { name: 'Player', team: scenario.playerTeam });
      simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: scenario.enemyTeam });

      scenario.playerTeam.forEach((set, idx) => {
        const uid = (set as { uid?: string })?.uid;
        if (uid && simBattle.p1.pokemon[idx]) {
          Reflect.set(simBattle.p1.pokemon[idx], 'uid', uid);
        }
      });
      scenario.enemyTeam.forEach((set, idx) => {
        const uid = (set as { uid?: string })?.uid;
        if (uid && simBattle.p2.pokemon[idx]) {
          Reflect.set(simBattle.p2.pokemon[idx], 'uid', uid);
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

      let actionIdx = 0;

      while (!simBattle.ended && actionIdx < scenario.actions.length) {
        const actionPair = scenario.actions[actionIdx]!;
        actionIdx++;

        const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
        Reflect.set(engine, 'battle', simBattle);

        engine.executeTurn({
          p1Choice: actionPair.p1,
          p2Choice: actionPair.p2,
          ipbActive: false
        });

        const turnLogs = filterShowdownLogs(getNewLogs());

        for (const logLine of turnLogs) {
          await parseShowdownLogLine(mockStore as never, logLine, turnLogs);
        }
      }

      if (unhandledBridgeLines.length > 0) {
        failed++;
        console.error(`❌ [FUZZER-SCENARIOS] Escenario ${scenario.id} falló con ${unhandledBridgeLines.length} líneas no manejadas.`);
      } else {
        passed++;
        console.log(`✅ [FUZZER-SCENARIOS] Escenario ${scenario.id} completado con éxito.`);
      }
    } catch (err: unknown) {
      failed++;
      console.error(`❌ [FUZZER-SCENARIOS] Error en escenario ${scenario.id}:`, err);
    }
  }

  return [{ label: 'Escenarios', passed, failed, untested: 0, total: scenarios.length }];
}
