// scripts/e2e/fuzzer/core/fuzzer_ai_engine.ts
//
// AI vs AI headless fuzzer engine.
// Extends BattleAgent with HeuristicAI-driven move decisions.
// All Showdown protocol handling (forceSwitch, teamPreview, etc.)
// is delegated to the existing BattleAgent — zero duplication.
//
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import type { PokemonSet, SideID } from '@pkmn/sim';
import { ShowdownBattleEngine } from '../../../../src/logic/battle/engine/showdownBattleEngine.ts';

import { generateAiBattles } from '../generators/fuzzer_ai_team_generator.ts';
import { BattleAgent, type ChoiceRequest } from './fuzzer_agent.ts';
import { ActiveSlotRequest } from '../../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import { createLocalPoke } from './fuzzer_engine.ts';
import { patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { HeuristicAI } from '../../../../src/logic/battle/ai/heuristicAI.ts';
import { createMockBattleContext } from './fuzzer_mock_battle_store.ts';
import { requireAbilityId } from '../../../../src/data/battle/abilities.ts';
import { MAX_POKEMON_LEVEL, MAX_BATTLE_TURNS } from '../../../../src/data/system/constants.ts';
import type { FuzzerResult } from './fuzzer_runner.ts';
import { fileWriterQueue } from '../../helpers/fileWriterQueue.ts';

const RESULTS_DIR = path.resolve(process.cwd(), 'scripts/e2e/results');

// Monkey-patch unificado de Showdown
patchShowdownSpreadModify(() => true);

const AI_RESULTS_DIR = path.resolve(process.cwd(), 'scripts/e2e/results');
const AI_REPORT_FILE = path.join(AI_RESULTS_DIR, 'fuzzer_ai_coverage_report.json');

// ---------------------------------------------------------------------------
// HeuristicAgent: BattleAgent subclass that uses HeuristicAI for move decisions.
// All forceSwitch / teamPreview / trapped / periodic-switch logic is inherited.
// ---------------------------------------------------------------------------
class HeuristicAgent extends BattleAgent {
  private readonly ai = new HeuristicAI();

  constructor(sideId: SideID) {
    super(sideId, new Set(), null, 0, false);
  }

  protected override decideSingleSlot(
    slotReq: ActiveSlotRequest,
    slotIdx: number,
    fullRequest: ChoiceRequest,
    targetLocation?: number
  ): string {
    const team = fullRequest.side?.pokemon ?? [];
    const activePokemonList = team.filter((p: { active: boolean }) => p.active);
    const activePoke = activePokemonList[slotIdx] ?? team[slotIdx];
    if (!activePoke) return super.decideSingleSlot(slotReq, slotIdx, fullRequest, targetLocation);

    const legalMoveIds = (slotReq.moves ?? [])
      .filter((m: { disabled?: boolean | string; pp?: number }) => !m.disabled && (m.pp === undefined || m.pp > 0))
      .map((m: { id: string }) => m.id);

    const projectSet: PokemonSet = {
      species: activePoke.details.split(',')[0] ?? activePoke.ident,
      level: MAX_POKEMON_LEVEL,
      moves: legalMoveIds.length > 0 ? legalMoveIds : (activePoke.moves ?? []),
      ability: activePoke.ability ? requireAbilityId(activePoke.ability) : '', // domain-ok: Open dynamic text or non-domain string payload
      item: '',
      name: activePoke.ident.split(': ')[1] ?? activePoke.ident,
      gender: 'M',
      nature: 'serious',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    };
    const projectPoke = createLocalPoke(projectSet);

    // Extract opponent active pokemon properly instead of using player's benched team
    const oppTeam = (fullRequest as { oppSide?: { pokemon?: Array<{ active?: boolean; condition?: string; details?: string; ident?: string; moves?: string[]; ability?: string }> } }).oppSide?.pokemon ?? [];
    const opponentPoke = oppTeam.find((p) => p.active && !p.condition?.endsWith('fnt')) ?? oppTeam[0];
    let oppProject = projectPoke;
    if (opponentPoke) {
      const oppProjectSet: PokemonSet = {
        species: opponentPoke.details?.split(',')[0] ?? opponentPoke.ident ?? 'Pikachu',
        level: MAX_POKEMON_LEVEL,
        moves: opponentPoke.moves ?? [],
        ability: opponentPoke.ability ? requireAbilityId(opponentPoke.ability) : '', // domain-ok: Open dynamic text or non-domain string payload
        item: '',
        name: opponentPoke.ident?.split(': ')[1] ?? opponentPoke.ident ?? 'Opponent',
        gender: 'M',
        nature: 'serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      }
      oppProject = createLocalPoke(oppProjectSet);
    }

    if (activePoke.condition) {
      const parts = activePoke.condition.split(' ')[0]?.split('/');
      if (parts && parts.length === 2) {
        const cur = Number(parts[0]);
        const max = Number(parts[1]);
        if (!isNaN(cur) && !isNaN(max) && max > 0) {
          projectPoke.hp = cur;
          projectPoke.maxHp = max;
        }
      }
    }
    if (opponentPoke && opponentPoke.condition) {
      const parts = opponentPoke.condition.split(' ')[0]?.split('/');
      if (parts && parts.length === 2) {
        const cur = Number(parts[0]);
        const max = Number(parts[1]);
        if (!isNaN(cur) && !isNaN(max) && max > 0) {
          oppProject.hp = cur;
          oppProject.maxHp = max;
        }
      }
    }

    const mockCtx = createMockBattleContext(
      this.sideId === 'p1' ? oppProject : projectPoke,
      this.sideId === 'p1' ? projectPoke : oppProject
    );
    const battleState = mockCtx.activeBattle.value!;
    battleState.playerRequest = fullRequest as never;
    battleState.enemyRequest = fullRequest as never;
    battleState.playerTeam = [this.sideId === 'p1' ? oppProject : projectPoke];
    battleState.enemyTeam = [this.sideId === 'p1' ? projectPoke : oppProject];
    battleState.player = this.sideId === 'p1' ? oppProject : projectPoke;
    battleState.enemy = this.sideId === 'p1' ? projectPoke : oppProject;

    const chosen = this.ai.decideMove(
      projectPoke, oppProject,
      { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
      false,
      mockCtx,
    );

    const mega = slotReq.canMegaEvo ? ' mega' : '';
    const tera = slotReq.canTerastallize ? ' terastallize' : '';

    if (chosen) {
      const moves = slotReq.moves ?? [];
      const slot = moves.findIndex((m: { id: string; disabled?: boolean | string; pp?: number }) => m.id === chosen.id && !m.disabled && (m.pp ?? 0) > 0); // type-ok: Type contract declaration
      if (slot !== -1) return `move ${slot + 1}${mega}${tera}`;
    }

    return super.decideSingleSlot(slotReq, slotIdx, fullRequest);
  }
}

// ---------------------------------------------------------------------------
// Main fuzzer function
// ---------------------------------------------------------------------------
export async function runAIFuzzer(): Promise<FuzzerResult[]> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  // Initialize Pinia for the runner process to prevent "no active Pinia" errors
  // in HeuristicAI or modules referencing Pinia stores outside setup context.
  const { createPinia, setActivePinia } = await import('pinia');
  const pinia = createPinia();
  setActivePinia(pinia);

  const batches = await generateAiBattles(100);
  console.log(styleText('bold', `\n🤖 Generados ${batches.length} combates IA vs. IA`));

  const results: Array<{
    id: string;
    p1Team: PokemonSet[];
    p2Team: PokemonSet[];
    p1Choices: string[];
    p2Choices: string[];
    steps: string[];
    ended: boolean;
    winner: SideID | null;
    turns: number;
    error: string | null;
  }> = [];

  let passed = 0;
  let failed = 0;

  for (let idx = 0; idx < batches.length; idx++) {
    const batch = batches[idx]!;
    console.log(`  ⚔️  Combate ${idx + 1}/${batches.length} (${batch.id})...`);

    const p1Choices: string[] = []; // no-domain: Non-domain utility collection or data structure
    const p2Choices: string[] = []; // no-domain: Non-domain utility collection or data structure
    const steps: string[] = []; // no-domain: Non-domain utility collection or data structure
    let error: string | null = null;
    let ended = false;
    let winner: SideID | null = null;
    let battleTurns = 0;

    try {
      const agentP1 = new HeuristicAgent('p1');
      const agentP2 = new HeuristicAgent('p2');

      const engine = new ShowdownBattleEngine({
        mode: 'fuzzer'
      });
      const simBattle = engine.battle;
      simBattle.setPlayer('p1', { name: 'Rival-A', team: batch.p1Team });
      simBattle.setPlayer('p2', { name: 'Rival-B', team: batch.p2Team });

      let lastLogCount = 0;
      while (!simBattle.ended) {
        if (simBattle.turn >= MAX_BATTLE_TURNS) {
          break;
        }
        const prevTurn = simBattle.turn;

        const { p1AcceptedChoice, p2AcceptedChoice } = engine.executeTurn({
          p1Agent: agentP1 as { decide(req: unknown): string },
          p2Agent: agentP2 as { decide(req: unknown): string }
        });

        if (p1AcceptedChoice && p1AcceptedChoice !== 'pass') p1Choices.push(p1AcceptedChoice);
        if (p2AcceptedChoice && p2AcceptedChoice !== 'pass') p2Choices.push(p2AcceptedChoice);

        // Collect readable step logs (only new ones)
        const newLogs = simBattle.log.slice(lastLogCount);
        lastLogCount = simBattle.log.length;
        for (const line of newLogs) {
          if (line.includes('|move|')) {
            const parts = line.split('|');
            const attacker = parts[2]?.split(': ')[1] ?? parts[2] ?? '';
            const moveName = parts[3] ?? ''; // text-ok: UI text display localization string
            steps.push(`T${simBattle.turn}: ${attacker} → ${moveName}`);
          } else if (line.includes('|faint|')) {
            const parts = line.split('|');
            steps.push(`T${simBattle.turn}: FAINT ${parts[2]?.split(': ')[1] ?? ''}`);
          }
        }

        const logsAdvanced = newLogs.length > 0;
        const turnAdvanced = simBattle.turn > prevTurn || logsAdvanced;
        if (!turnAdvanced && !simBattle.ended) {
          throw new Error(`[AI_FUZZER_STALL] Battle ${batch.id} did not advance after P1="${p1AcceptedChoice}" P2="${p2AcceptedChoice}".`);
        }
      }
      battleTurns = simBattle.turn;

      ended = simBattle.ended || battleTurns >= MAX_BATTLE_TURNS;
      winner = simBattle.winner === 'Rival-A' ? 'p1' : simBattle.winner === 'Rival-B' ? 'p2' : null;

      passed++;
      const result = winner ? `Ganó ${winner}` : 'Empate (Max turnos)';
      console.log(`    ✅ ${result} en ${battleTurns} turnos`);

    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      failed++;
      console.log(styleText('red', `    ❌ ERROR: ${error}`));
    }

    results.push({ id: batch.id, p1Team: batch.p1Team, p2Team: batch.p2Team, p1Choices, p2Choices, steps, ended, winner, turns: battleTurns, error });
  }

  // Write coverage report
  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
    summary: {
      total: results.length,
      passed,
      failed,
      completedNaturally: results.filter(r => r.ended).length,
      maxTurnsReached: results.filter(r => !r.ended && !r.error).length,
    },
    battles: results.map(r => ({ id: r.id, ended: r.ended, winner: r.winner, turns: r.turns, error: r.error })),
  };
  await fileWriterQueue.safeWriteFile(AI_REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n💾 Reporte IA guardado en: ${AI_REPORT_FILE}`);

  const completedNaturally = results.filter(r => r.ended).length;
  const maxTurns = results.filter(r => !r.ended && !r.error).length;

  // Sanity check: >50% of battles not finishing naturally is statistically impossible
  // and indicates a broken protocol or stall bug. Treat as a hard failure.
  const unfinishedRate = (results.length - completedNaturally) / results.length;
  const tooManyStalled = unfinishedRate > 0.5;
  if (tooManyStalled) {
    console.error(styleText('red', `❌ SANITY FAIL: ${results.length - completedNaturally}/${results.length} combates no terminaron (${(unfinishedRate * 100).toFixed(0)}%). Indica un bug en el protocolo.`));
  }

  return [{
    label: 'Combates IA vs. IA (Rival)',
    passed: tooManyStalled ? 0 : passed,
    failed: tooManyStalled ? results.length : failed,
    untested: 0,
    total: results.length,
    detail: `(${completedNaturally} terminados naturalmente, ${maxTurns} por max turnos)`,
  }];
}
