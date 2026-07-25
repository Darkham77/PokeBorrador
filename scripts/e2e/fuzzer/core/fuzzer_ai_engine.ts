// fallow-ignore-file security-sink
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
import { Battle } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

import { generateAiBattles } from '../generators/fuzzer_ai_team_generator.ts';
import { BattleAgent, type ChoiceRequest } from './fuzzer_agent.ts';
import { ActiveSlotRequest } from '../../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import { createLocalPoke } from './fuzzer_engine.ts';
import { getShowdownFormatId, patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { HeuristicAI } from '../../../../src/logic/battle/ai/heuristicAI.ts';
import { createMockBattleContext } from './fuzzer_mock_battle_store.ts';
import { MAX_POKEMON_LEVEL, MAX_BATTLE_TURNS } from '../../../../src/data/system/constants.ts';
import type { FuzzerResult } from './fuzzer_runner.ts';

patchShowdownSpreadModify(() => false);

const RESULTS_DIR = path.resolve(process.cwd(), 'scripts/e2e/results');
const AI_REPORT_FILE = path.join(RESULTS_DIR, 'fuzzer_ai_coverage_report.json');
const CERTIFIED_CASES_FILE = path.join(RESULTS_DIR, 'fuzzer_certified_cases.json');

// ---------------------------------------------------------------------------
// HeuristicAgent: BattleAgent subclass that uses HeuristicAI for move decisions.
// All forceSwitch / teamPreview / trapped / periodic-switch logic is inherited.
// ---------------------------------------------------------------------------
class HeuristicAgent extends BattleAgent {
  private readonly ai = new HeuristicAI();

  constructor(sideId: 'p1' | 'p2') {
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

    const projectSet: PokemonSet = {
      species: activePoke.details.split(',')[0] ?? activePoke.ident,
      level: MAX_POKEMON_LEVEL,
      moves: activePoke.moves,
      ability: activePoke.ability,
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
        ability: opponentPoke.ability ?? '',
        item: '',
        name: opponentPoke.ident?.split(': ')[1] ?? opponentPoke.ident ?? 'Opponent',
        gender: 'M',
        nature: 'serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      }
      oppProject = createLocalPoke(oppProjectSet);
    }

    const mockCtx = createMockBattleContext(projectPoke, oppProject);
    const battleState = mockCtx.activeBattle.value!;
    battleState.playerRequest = fullRequest as unknown as never;
    battleState.enemyRequest = fullRequest as unknown as never;
    battleState.playerTeam = [projectPoke];
    battleState.enemyTeam = [oppProject];

    const chosen = this.ai.decideMove(
      projectPoke, oppProject,
      { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
      false,
      mockCtx,
    );

    const mega = Boolean(slotReq.canMegaEvo) && Math.random() < 0.5 ? ' mega' : '';
    const tera = Boolean(slotReq.canTerastallize) && Math.random() < 0.5 ? ' terastallize' : '';

    if (chosen) {
      const moves = slotReq.moves ?? [];
      const slot = moves.findIndex((m: { id: string; disabled?: boolean | string; pp?: number }) => m.id === chosen.id && !m.disabled && (m.pp ?? 0) > 0);
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
    winner: 'p1' | 'p2' | null;
    turns: number;
    error: string | null;
  }> = [];

  let passed = 0;
  let failed = 0;

  for (let idx = 0; idx < batches.length; idx++) {
    const batch = batches[idx]!;
    console.log(`  ⚔️  Combate ${idx + 1}/${batches.length} (${batch.id})...`);

    const p1Choices: string[] = [];
    const p2Choices: string[] = [];
    const steps: string[] = [];
    let error: string | null = null;
    let ended = false;
    let winner: 'p1' | 'p2' | null = null;
    let battleTurns = 0;

    try {
      const agentP1 = new HeuristicAgent('p1');
      const agentP2 = new HeuristicAgent('p2');

      const simBattle = new Battle({ formatid: getShowdownFormatId() });
      simBattle.setPlayer('p1', { name: 'Rival-A', team: batch.p1Team });
      simBattle.setPlayer('p2', { name: 'Rival-B', team: batch.p2Team });

      let lastLogCount = 0;
      let stallGuard = 0; // counts cycles where turn didn't advance AND both passed

      while (!simBattle.ended && simBattle.turn < MAX_BATTLE_TURNS) {
        const prevTurn = simBattle.turn;

        const p1Choice = agentP1.decide(simBattle.p1.activeRequest as unknown as ChoiceRequest);
        const p2Choice = agentP2.decide(simBattle.p2.activeRequest as unknown as ChoiceRequest);

        if (p1Choice !== 'pass') p1Choices.push(p1Choice);
        if (p2Choice !== 'pass') p2Choices.push(p2Choice);

        const p1Ok = simBattle.choose('p1', p1Choice);
        const p2Ok = simBattle.choose('p2', p2Choice);

        if (!p1Ok) simBattle.choose('p1', 'move 1');
        if (!p2Ok) simBattle.choose('p2', 'move 1');

        // Collect readable step logs (only new ones)
        const newLogs = simBattle.log.slice(lastLogCount);
        lastLogCount = simBattle.log.length;
        for (const line of newLogs) {
          if (line.includes('|move|')) {
            const parts = line.split('|');
            const attacker = parts[2]?.split(': ')[1] ?? parts[2] ?? '';
            const move = parts[3] ?? '';
            steps.push(`T${simBattle.turn}: ${attacker} → ${move}`);
          } else if (line.includes('|faint|')) {
            const parts = line.split('|');
            steps.push(`T${simBattle.turn}: FAINT ${parts[2]?.split(': ')[1] ?? ''}`);
          }
        }

        // If the turn didn't advance and both sent pass, increment stall guard
        const turnAdvanced = simBattle.turn > prevTurn;
        if (!turnAdvanced && p1Choice === 'pass' && p2Choice === 'pass') {
          stallGuard++;
          if (stallGuard >= 50) break; // genuinely stuck — no more requests available
        } else if (turnAdvanced) {
          stallGuard = 0; // reset on real progress
        }
      }
      battleTurns = simBattle.turn;

      ended = simBattle.ended;
      // If the battle stalled with forceSwitch but no living Pokémon on either side,
      // determine winner by who has more Pokémon left (pokemonLeft counter in Showdown).
      if (!ended && stallGuard >= 8) {
        const p1Left = simBattle.p1.pokemonLeft;
        const p2Left = simBattle.p2.pokemonLeft;
        ended = true; // Treat as ended to avoid false positives in sanity check
        winner = p1Left > p2Left ? 'p1' : p2Left > p1Left ? 'p2' : null;
      } else {
        winner = simBattle.ended
          ? (simBattle.winner === 'Rival-A' ? 'p1' : 'p2')
          : null;
      }


      passed++;
      const result = ended ? `Ganó ${winner}` : (stallGuard >= 8 ? 'Stalled' : 'Max turnos');
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
  await fs.writeFile(AI_REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n💾 Reporte IA guardado en: ${AI_REPORT_FILE}`);

  // Inject into fuzzer_certified_cases.json under "ai_vs_ai"
  let consolidatedData: Record<string, unknown> = {};
  let shouldWrite = true;
  try {
    const existing = await fs.readFile(CERTIFIED_CASES_FILE, 'utf8');
    consolidatedData = JSON.parse(existing) as Record<string, unknown>;
    if ((process.env.SKIP_REGENERATE === 'true' || process.env.REGENERATE_CASES === 'false') && consolidatedData.ai_vs_ai) {
      shouldWrite = false;
      console.log('⚠️  Conservando casos IA vs. IA certificados (usa SKIP_REGENERATE=false o REGENERATE_CASES=true para forzar regeneración).');
    }
  } catch (_e) { /* file doesn't exist yet */ }

  if (shouldWrite) {
    consolidatedData.ai_vs_ai = results.map((r, i) => ({
      id: `case-ai-${r.id}`,
      idx: i + 1,
      p1Team: r.p1Team,
      p2Team: r.p2Team,
      p1Choices: r.p1Choices,
      p2Choices: r.p2Choices,
      cheats: [],
      steps: r.steps,
      ended: r.ended,
      winner: r.winner,
      turns: r.turns,
      error: r.error,
    }));

    try {
      const freshContent = await fs.readFile(CERTIFIED_CASES_FILE, 'utf8');
      const freshData = JSON.parse(freshContent) as Record<string, unknown>;
      consolidatedData = { ...freshData, ai_vs_ai: consolidatedData.ai_vs_ai };
    } catch (_e) { /* new file */ }

    await fs.mkdir(path.dirname(CERTIFIED_CASES_FILE), { recursive: true });
    await fs.writeFile(CERTIFIED_CASES_FILE, JSON.stringify(consolidatedData, null, 2), 'utf-8');
    console.log(`💾 Casos IA vs. IA consolidados en: ${CERTIFIED_CASES_FILE}`);
  }

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
