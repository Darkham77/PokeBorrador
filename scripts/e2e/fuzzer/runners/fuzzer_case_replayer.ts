// fallow-ignore-file security-sink
import type { PokemonSet } from '@pkmn/sim';
import fs from 'node:fs';
import path from 'node:path';
import type { CertifiedBattleCase } from '../generators/fuzzer_team_generator.ts';
import { requireCertifiedBattleCaseDocument } from '../core/certifiedBattleCase.ts';
import { statsMap, patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { createShowdownBattle } from '../../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownTeamMapper, type CustomPokemonSet } from '../../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { ShowdownLogEnricher } from '../../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { ShowdownBattleRunner } from '../../../../src/logic/battle/helpers/showdownBattleRunner.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../../src/data/system/constants.ts';

// Aplicar el monkey-patch unificado de Showdown
patchShowdownSpreadModify(() => false);

interface ExtendedPokemon {
  name: string;
  uid?: string;
  hp: number;
  maxhp: number;
  fainted: boolean;
  status: string;
}

interface RequestPokemon {
  ident: string;
  condition: string;
  active: boolean;
  uid?: string;
}

const caseId = process.env.TEST_CASE_ID;
const seedStr = process.env.TEST_SEED;

if (!caseId && !seedStr) {
  console.error('Error: Please specify TEST_CASE_ID or TEST_SEED.');
  console.error('Usage: TEST_CASE_ID=case-944b8c168fc4 npx tsx scripts/e2e/fuzzer/runners/fuzzer_case_replayer.ts');
  process.exit(1);
}

let seed: number[] = [];
let playerTeam: PokemonSet[] = [];
let enemyTeam: PokemonSet[] = [];
let match: CertifiedBattleCase | null = null;

if (caseId) {
  const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (!fs.existsSync(casesPath)) {
    console.error(`Error: Certified cases file not found at ${casesPath}`);
    process.exit(1);
  }
  const fileContent = fs.readFileSync(casesPath, 'utf8');
  const rawCases: unknown = JSON.parse(fileContent);
  const casesList = requireCertifiedBattleCaseDocument(rawCases, casesPath).battle;
  match = casesList.find((c) => 
    (c.seed && c.seed.join(',') === caseId) || 
    c.id === caseId
  ) || null;
  if (!match) {
    console.error(`Error: Case "${caseId}" not found in certified fuzzer cases.`);
    process.exit(1);
  }
  seed = match.seed;
  playerTeam = match.playerTeam;
  enemyTeam = match.enemyTeam;
  console.log(`Running certified case: ${caseId}`);
} else if (seedStr) {
  seed = seedStr.split(',').map(Number);
  console.log(`Running with custom seed: ${JSON.stringify(seed)}`);
}
// Populate statsMap to preserve stats in spreadModify
statsMap.clear();
ShowdownTeamMapper.populateStatsMap(playerTeam as unknown as CustomPokemonSet[]);
ShowdownTeamMapper.populateStatsMap(enemyTeam as unknown as CustomPokemonSet[]);

const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
ShowdownLogEnricher.setupRealtimeEnrichment(battle);

battle.setPlayer('p1', { name: 'Player', team: playerTeam });
battle.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam });

// Map UIDs
playerTeam.forEach((p, idx: number) => {
  const simMon = battle.p1.pokemon[idx];
  if (simMon) {
    const extMon = simMon as unknown as ExtendedPokemon;
    extMon.uid = (p as unknown as { uid?: string }).uid || `P-Poke${idx + 1}-UID`;
  }
});
enemyTeam.forEach((e, idx: number) => {
  const simMon = battle.p2.pokemon[idx];
  if (simMon) {
    const extMon = simMon as unknown as ExtendedPokemon;
    extMon.uid = (e as unknown as { uid?: string }).uid || `E-Poke${idx + 1}-UID`;
  }
});

ShowdownLogEnricher.enrichRetroactiveLeads(battle);

if (!match) {
  console.error('Error: Replay mode requires a certified fuzzer case with playerChoices and enemyChoices.');
  process.exit(1);
}

console.log('--- STARTING EXACT CERTIFIED CHOICES REPLAY ---');

let turn = 0;

for (let historyIndex = 0; historyIndex < match.history.length; historyIndex++) {
  const step = ShowdownBattleRunner.requireHistoryEntry(match.history, historyIndex);
  if (battle.ended) {
    throw new Error(`[REPLAY-CERTIFICATION] Certified history contains a submission after the battle ended. context=${JSON.stringify({ turn, historyLength: match.history.length })}`);
  }
  turn++;
  
  const p1Req = battle.p1.activeRequest;

  const p1Choice = step.p1Choice;
  const p2Choice = step.p2Choice;

  const prevLogLen = battle.log.length;

  if (p1Req && p1Req.side) {
    const p1Pokemon = p1Req.side.pokemon as RequestPokemon[];
    const mons = p1Pokemon.map((p) => `${p.ident.split(': ')[1]} (HP: ${p.condition}, Active: ${p.active})`);
    console.log(`\n[Turn ${turn}] P1 side.pokemon:`, JSON.stringify(mons));
    console.log(`[Turn ${turn}] P1 simulator pokemon:`, JSON.stringify(battle.p1.pokemon.map(p => ({ name: p.name, hp: p.hp, maxhp: p.maxhp, fainted: p.fainted }))));
  }

  const { executeBattleTurn } = await import('../../../../src/logic/battle/helpers/showdownExecutor.ts');
  executeBattleTurn({
    battle,
    p1Choice,
    p2Choice,
    history: match.history,
    currentStep: turn
  });

  const newLogs = battle.log.slice(prevLogLen);

  const p1ActiveMon = battle.p1.active[0] as unknown as ExtendedPokemon | undefined;
  const p2ActiveMon = battle.p2.active[0] as unknown as ExtendedPokemon | undefined;

  console.log(`[Turn ${turn}] Certified history choice: ${JSON.stringify({ p1Choice, p2Choice, battleTurn: step.battleTurn })}`);
  console.log(`[Turn ${turn}] P1 Active: ${p1ActiveMon?.name} (UID: ${p1ActiveMon?.uid})`);
  console.log(`[Turn ${turn}] P2 Active: ${p2ActiveMon?.name} (UID: ${p2ActiveMon?.uid})`);

  console.log('  Logs:');
  newLogs.forEach(line => console.log(`    ${line}`));

}

console.log(`\n========================================`);
console.log(`[REPLAY COMPLETE] Battle ended: ${battle.ended}`);
console.log(`[REPLAY COMPLETE] Total turns executed: ${turn}`);
console.log(`========================================\n`);

if (match.finalState) {
  const finalState = match.finalState;
  const actualEnded = battle.ended;
  if (finalState.isOver !== undefined && actualEnded !== finalState.isOver) {
    throw new Error(`[REPLAY-PARITY-FAILURE] Mismatch in battle end state! Expected isOver=${finalState.isOver}, but replay actual ended=${actualEnded}`);
  }
  if (finalState.winner !== undefined && finalState.winner !== null) {
    const rawExp = String(finalState.winner);
    const expectedSeat = (rawExp === 'p1' || rawExp.startsWith('P-') || rawExp === battle.p1.name)
      ? 'p1'
      : ((rawExp === 'p2' || rawExp.startsWith('E-') || rawExp === battle.p2.name) ? 'p2' : rawExp);
    const actualSeat = battle.winner === battle.p1.name ? 'p1' : (battle.winner === battle.p2.name ? 'p2' : battle.winner);
    if (expectedSeat !== actualSeat) {
      throw new Error(`[REPLAY-PARITY-FAILURE] Mismatch in battle winner! Expected winner=${finalState.winner} (${expectedSeat}), but replay actual winner=${battle.winner} (${actualSeat})`);
    }
  }
  if (Array.isArray(finalState.p1)) {
    (finalState.p1 as Array<{ hp: number; fainted: boolean }>).forEach((expectedMon, idx) => {
      const actualMon = battle.p1.pokemon[idx];
      if (actualMon && (actualMon.hp !== expectedMon.hp || actualMon.fainted !== expectedMon.fainted)) {
        throw new Error(`[REPLAY-PARITY-FAILURE] P1 Slot ${idx} mismatch! Expected HP=${expectedMon.hp}/fnt=${expectedMon.fainted}, Actual HP=${actualMon.hp}/fnt=${actualMon.fainted}`);
      }
    });
  }
  if (Array.isArray(finalState.p2)) {
    (finalState.p2 as Array<{ hp: number; fainted: boolean }>).forEach((expectedMon, idx) => {
      const actualMon = battle.p2.pokemon[idx];
      if (actualMon && (actualMon.hp !== expectedMon.hp || actualMon.fainted !== expectedMon.fainted)) {
        throw new Error(`[REPLAY-PARITY-FAILURE] P2 Slot ${idx} mismatch! Expected HP=${expectedMon.hp}/fnt=${expectedMon.fainted}, Actual HP=${actualMon.hp}/fnt=${actualMon.fainted}`);
      }
    });
  }
  console.log(`[REPLAY PARITY CHECK] Passed successfully for both teams!`);
}
