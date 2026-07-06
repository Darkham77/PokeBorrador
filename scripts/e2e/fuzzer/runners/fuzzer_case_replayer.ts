// scripts/battle-tester/fuzzer-run-tester.ts
import { Battle } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import fs from 'node:fs';
import path from 'node:path';
import type { TestBatch } from '../generators/fuzzer_team_generator.ts';
import { getShowdownFormatId } from '../../../../src/logic/battle/showdownAdapter.ts';

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
  const allCases = JSON.parse(fileContent) as { battle?: TestBatch[]; items?: TestBatch[] };
  const casesList = [
    ...(allCases.battle || []),
    ...(allCases.items || [])
  ];
  match = casesList.find((c) => c.seed && (c.seed.join(',') === caseId || (c as unknown as { id: string }).id === caseId)) || null;
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

const battleSeed = seed.length === 4
  ? `${seed[0]},${seed[1]},${seed[2]},${seed[3]}` as `${number},${string}`
  : undefined;

const battle = new Battle({ formatid: getShowdownFormatId(), seed: battleSeed });
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

if (!match || !match.playerChoices || !match.enemyChoices) {
  console.error('Error: Replay mode requires a certified fuzzer case with playerChoices and enemyChoices.');
  process.exit(1);
}

// Replay choices directly from the certified case
let p1ChoiceIdx = 0;
let p2ChoiceIdx = 0;

console.log('--- STARTING EXACT CERTIFIED CHOICES REPLAY ---');

let turn = 0;
while (!battle.ended && (p1ChoiceIdx < match.playerChoices.length || p2ChoiceIdx < match.enemyChoices.length)) {
  turn++;
  const p1Req = battle.p1.activeRequest;
  const p2Req = battle.p2.activeRequest;

  let p1Choice = 'pass';
  let p2Choice = 'pass';

  if (p1Req && !p1Req.wait) {
    if (p1Req.teamPreview) {
      p1Choice = 'team 1';
    } else {
      p1Choice = match.playerChoices[p1ChoiceIdx++] ?? 'pass';
    }
  }
  if (p2Req && !p2Req.wait) {
    if (p2Req.teamPreview) {
      p2Choice = 'team 1';
    } else {
      p2Choice = match.enemyChoices[p2ChoiceIdx++] ?? 'pass';
    }
  }

  const prevLogLen = battle.log.length;
  
  if (p1Req && p1Req.side) {
    const p1Pokemon = p1Req.side.pokemon as RequestPokemon[];
    const mons = p1Pokemon.map((p) => `${p.ident.split(': ')[1]} (HP: ${p.condition}, Active: ${p.active})`);
    console.log(`\n[Turn ${turn}] P1 side.pokemon:`, JSON.stringify(mons));
  }

  const p1Ok = battle.choose('p1', p1Choice);
  const p2Ok = battle.choose('p2', p2Choice);

  const newLogs = battle.log.slice(prevLogLen);

  const p1ActiveMon = battle.p1.active[0] as unknown as ExtendedPokemon | undefined;
  const p2ActiveMon = battle.p2.active[0] as unknown as ExtendedPokemon | undefined;

  console.log(`[Turn ${turn}] P1 Choice Index: ${p1ChoiceIdx - 1} | Choice: "${p1Choice}" (Valid: ${p1Ok})`);
  console.log(`[Turn ${turn}] P2 Choice Index: ${p2ChoiceIdx - 1} | Choice: "${p2Choice}" (Valid: ${p2Ok})`);
  console.log(`[Turn ${turn}] P1 Active: ${p1ActiveMon?.name} (UID: ${p1ActiveMon?.uid})`);
  console.log(`[Turn ${turn}] P2 Active: ${p2ActiveMon?.name} (UID: ${p2ActiveMon?.uid})`);

  console.log('  Logs:');
  newLogs.forEach(line => console.log(`    ${line}`));

  // Check and apply HP restoration (Infinite Punching Bag) matching the fuzzer's engine behavior
  if (p1ActiveMon && (p1ActiveMon.hp <= p1ActiveMon.maxhp * 0.3 || p1ActiveMon.fainted)) {
    p1ActiveMon.hp = p1ActiveMon.maxhp;
    p1ActiveMon.fainted = false;
    p1ActiveMon.status = '';
    console.log(`  [IPB CHEAT] Restored P1 Active HP to max (${p1ActiveMon.name})`);
  }
  if (p2ActiveMon && (p2ActiveMon.hp <= p2ActiveMon.maxhp * 0.3 || p2ActiveMon.fainted)) {
    p2ActiveMon.hp = p2ActiveMon.maxhp;
    p2ActiveMon.fainted = false;
    p2ActiveMon.status = '';
    console.log(`  [IPB CHEAT] Restored P2 Active HP to max (${p2ActiveMon.name})`);
  }

  // Handle upkeep force switches
  if (battle.p1.activeRequest?.forceSwitch || battle.p2.activeRequest?.forceSwitch) {
    const upReq1 = battle.p1.activeRequest;
    const upReq2 = battle.p2.activeRequest;
    
    if (upReq1 && upReq1.side) {
      const upPokemon = upReq1.side.pokemon as RequestPokemon[];
      const mons = upPokemon.map((p) => `${p.ident.split(': ')[1]} (HP: ${p.condition}, Active: ${p.active})`);
      console.log(`  [Upkeep] P1 side.pokemon:`, JSON.stringify(mons));
    }

    let upChoice1 = 'pass';
    let upChoice2 = 'pass';
    if (upReq1 && upReq1.forceSwitch) {
      upChoice1 = match.playerChoices[p1ChoiceIdx++] ?? 'pass';
    }
    if (upReq2 && upReq2.forceSwitch) {
      upChoice2 = match.enemyChoices[p2ChoiceIdx++] ?? 'pass';
    }
    
    const upP1Ok = battle.choose('p1', upChoice1);
    const upP2Ok = battle.choose('p2', upChoice2);
    
    console.log(`  [Upkeep] P1 Choice Index: ${p1ChoiceIdx - 1} | Choice: "${upChoice1}" (Valid: ${upP1Ok})`);
    console.log(`  [Upkeep] P2 Choice Index: ${p2ChoiceIdx - 1} | Choice: "${upChoice2}" (Valid: ${upP2Ok})`);
  }
}
