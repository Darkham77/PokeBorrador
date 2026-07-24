// fallow-ignore-file security-sink
import type { PokemonSet } from '@pkmn/sim';
import fs from 'node:fs';
import path from 'node:path';
import type { TestBatch } from '../generators/fuzzer_team_generator.ts';
import { statsMap, patchShowdownSpreadModify } from '../../../../src/logic/battle/showdownAdapter.ts';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../../../../src/logic/battle/cheats.ts';
import { requiresAction } from '../../../../src/logic/battle/helpers/requestHelper.ts';
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
let match: TestBatch | null = null;

if (caseId) {
  const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (!fs.existsSync(casesPath)) {
    console.error(`Error: Certified cases file not found at ${casesPath}`);
    process.exit(1);
  }
  const fileContent = fs.readFileSync(casesPath, 'utf8');
  const allCases = JSON.parse(fileContent) as { battle?: TestBatch[]; items?: TestBatch[]; items_consumption?: TestBatch[] };
  const casesList = [
    ...(allCases.battle || []),
    ...(allCases.items || []),
    ...(allCases.items_consumption || [])
  ];
  match = casesList.find((c) => 
    (c.seed && c.seed.join(',') === caseId) || 
    ((c as unknown as { id: string }).id === caseId)
  ) || null;
  if (!match) {
    console.error(`Error: Case "${caseId}" not found in certified fuzzer cases.`);
    process.exit(1);
  }
  seed = match.seed || [];
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

if (!match || !match.playerChoices || !match.enemyChoices) {
  console.error('Error: Replay mode requires a certified fuzzer case with playerChoices and enemyChoices.');
  process.exit(1);
}

// Replay choices directly from the certified case
let p1ChoiceIdx = 0;
let p2ChoiceIdx = 0;

console.log('--- STARTING EXACT CERTIFIED CHOICES REPLAY ---');

let turn = 0;
const runner = new ShowdownBattleRunner(match.playerChoices, match.enemyChoices);

while (!battle.ended && (runner.p1ChoiceIdx < match.playerChoices.length || runner.p2ChoiceIdx < match.enemyChoices.length)) {
  turn++;
  p1ChoiceIdx = runner.p1ChoiceIdx;
  p2ChoiceIdx = runner.p2ChoiceIdx;
  
  const p1Req = battle.p1.activeRequest;
  const p2Req = battle.p2.activeRequest;

  const p1NeedsAction = requiresAction(p1Req);
  const p2NeedsAction = requiresAction(p2Req);

  const p1Choice = runner.resolveAndConsumeNextChoice('p1', p1Req);
  const p2Choice = runner.resolveAndConsumeNextChoice('p2', p2Req);

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
    cheatManager: null,
    isFuzzerSimulation: true,
    currentStep: turn
  });

  p1ChoiceIdx = runner.p1ChoiceIdx;
  p2ChoiceIdx = runner.p2ChoiceIdx;

  const newLogs = battle.log.slice(prevLogLen);

  const p1ActiveMon = battle.p1.active[0] as unknown as ExtendedPokemon | undefined;
  const p2ActiveMon = battle.p2.active[0] as unknown as ExtendedPokemon | undefined;

  console.log(`[Turn ${turn}] P1 Choice Index: ${p1ChoiceIdx - 1} | Choice: "${p1Choice}"`);
  console.log(`[Turn ${turn}] P2 Choice Index: ${p2ChoiceIdx - 1} | Choice: "${p2Choice}"`);
  console.log(`[Turn ${turn}] P1 Active: ${p1ActiveMon?.name} (UID: ${p1ActiveMon?.uid})`);
  console.log(`[Turn ${turn}] P2 Active: ${p2ActiveMon?.name} (UID: ${p2ActiveMon?.uid})`);

  console.log('  Logs:');
  newLogs.forEach(line => console.log(`    ${line}`));

  // Check and apply HP restoration (Infinite Punching Bag) matching the fuzzer's engine behavior
  const cheats = (match as unknown as { cheats?: Array<{ turn: number; side: string; type: string }> }).cheats || [];
  const hasP1HealCheat = cheats.some(c => c.turn === turn && c.side === 'p1' && c.type === 'heal');
  const hasP2HealCheat = cheats.some(c => c.turn === turn && c.side === 'p2' && c.type === 'heal');

  if (hasP1HealCheat && p1ActiveMon) {
    applyHealCheatToSide(battle.p1);
    syncRequestConditionsWithSimulator(battle.p1);
    console.log(`  [IPB CHEAT] Restored P1 Active HP to max (${p1ActiveMon.name})`);
  }
  if (hasP2HealCheat && p2ActiveMon) {
    applyHealCheatToSide(battle.p2);
    syncRequestConditionsWithSimulator(battle.p2);
    console.log(`  [IPB CHEAT] Restored P2 Active HP to max (${p2ActiveMon.name})`);
  }
}

