// fallow-ignore-file security-sink
/* eslint-disable */
// scripts/e2e/fuzzer/tools/compare_replay_parity.ts
import fs from 'node:fs';
import { createShowdownBattle } from '../../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownTeamMapper } from '../../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { ShowdownBattleRunner } from '../../../../src/logic/battle/helpers/showdownBattleRunner.ts';
import { requiresAction } from '../../../../src/logic/battle/helpers/requestHelper.ts';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../../../../src/logic/battle/cheats.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../../src/data/system/constants.ts';

const caseId = process.env.TEST_CASE_ID;
if (!caseId) {
  console.error('Error: TEST_CASE_ID env variable is required.');
  process.exit(1);
}

const casesPath = 'scripts/e2e/results/fuzzer_certified_cases.json';
if (!fs.existsSync(casesPath)) {
  console.error(`Error: Certified cases file not found at ${casesPath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(casesPath, 'utf8');
const allCases = JSON.parse(fileContent);
const casesList = [
  ...(allCases.battle || []),
  ...(allCases.items || []),
  ...(allCases.items_consumption || [])
];
const match = casesList.find((c) => c.id === caseId);
if (!match) {
  console.error(`Error: Certified case with ID "${caseId}" not found.`);
  process.exit(1);
}

const seed = match.seed;
const playerTeam = match.playerTeam;
const enemyTeam = match.enemyTeam;
const cheats = match.cheats || [];
const p1Choices = match.playerChoices;
const p2Choices = match.enemyChoices;

ShowdownTeamMapper.populateStatsMap(playerTeam);
ShowdownTeamMapper.populateStatsMap(enemyTeam);

console.log(`=== COMPARING REPLAY PARITY FOR CASE: ${caseId} ===`);
console.log(`Seed: ${JSON.stringify(seed)}`);

const sim1States: string[] = [];
const sim2States: string[] = [];

// 1. Emulation (Fuzzer loop style)
try {
  const sim1 = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
  sim1.setPlayer('p1', { name: 'Player', team: playerTeam });
  sim1.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam });

  playerTeam.forEach((p: any, idx: number) => { if (sim1.p1.pokemon[idx]) (sim1.p1.pokemon[idx] as any).uid = p.uid; });
  enemyTeam.forEach((e: any, idx: number) => { if (sim1.p2.pokemon[idx]) (sim1.p2.pokemon[idx] as any).uid = e.uid; });

  let p1Idx = 0;
  let p2Idx = 0;
  let t1 = 0;

  while (!sim1.ended && t1 < 150) {
    t1++;
    const p1Req = sim1.p1.activeRequest;
    const p2Req = sim1.p2.activeRequest;
    const p1Needs = requiresAction(p1Req);
    const p2Needs = requiresAction(p2Req);

    let c1 = 'pass';
    if (p1Needs) {
      c1 = p1Choices[p1Idx] || 'pass';
      if (c1 !== 'pass') p1Idx++;
    }
    let c2 = 'pass';
    if (p2Needs) {
      c2 = p2Choices[p2Idx] || 'pass';
      if (c2 !== 'pass') p2Idx++;
    }

    const p1Active = sim1.p1.active[0];
    const p2Active = sim1.p2.active[0];
    sim1States.push(`Turn ${t1}: P1=${p1Active?.name}[${p1Active?.hp}/${p1Active?.maxhp}] | P2=${p2Active?.name}[${p2Active?.hp}/${p2Active?.maxhp}]`);

    if (p1Needs) sim1.choose('p1', c1);
    if (p2Needs) sim1.choose('p2', c2);

    const hasP1Heal = cheats.some((c: any) => c.turn === t1 && c.side === 'p1' && c.type === 'heal');
    const hasP2Heal = cheats.some((c: any) => c.turn === t1 && c.side === 'p2' && c.type === 'heal');

    if (hasP1Heal) {
      applyHealCheatToSide(sim1.p1);
      syncRequestConditionsWithSimulator(sim1.p1);
    }
    if (hasP2Heal) {
      applyHealCheatToSide(sim1.p2);
      syncRequestConditionsWithSimulator(sim1.p2);
    }
  }
} catch (err: any) {
  console.log(`[Emulation Loop] Crashed at Turn ${sim1States.length + 1}: ${err.message}`);
}

// 2. Replayer (Replayer upkeep style)
try {
  const sim2 = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
  sim2.setPlayer('p1', { name: 'Player', team: playerTeam });
  sim2.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam });

  playerTeam.forEach((p: any, idx: number) => { if (sim2.p1.pokemon[idx]) (sim2.p1.pokemon[idx] as any).uid = p.uid; });
  enemyTeam.forEach((e: any, idx: number) => { if (sim2.p2.pokemon[idx]) (sim2.p2.pokemon[idx] as any).uid = e.uid; });

  const runner = new ShowdownBattleRunner(p1Choices, p2Choices);
  let t2 = 0;

  while (!sim2.ended && t2 < 150) {
    t2++;
    const p1Req = sim2.p1.activeRequest;
    const p2Req = sim2.p2.activeRequest;
    const p1Needs = requiresAction(p1Req);
    const p2Needs = requiresAction(p2Req);

    const c1 = runner.resolveAndConsumeNextChoice('p1', p1Req);
    const c2 = runner.resolveAndConsumeNextChoice('p2', p2Req);

    const p1Active = sim2.p1.active[0];
    const p2Active = sim2.p2.active[0];
    sim2States.push(`Turn ${t2}: P1=${p1Active?.name}[${p1Active?.hp}/${p1Active?.maxhp}] | P2=${p2Active?.name}[${p2Active?.hp}/${p2Active?.maxhp}]`);

    if (p1Needs) sim2.choose('p1', c1);
    if (p2Needs) sim2.choose('p2', c2);

    const hasP1Heal = cheats.some((c: any) => c.turn === t2 && c.side === 'p1' && c.type === 'heal');
    const hasP2Heal = cheats.some((c: any) => c.turn === t2 && c.side === 'p2' && c.type === 'heal');

    if (hasP1Heal) {
      applyHealCheatToSide(sim2.p1);
      syncRequestConditionsWithSimulator(sim2.p1);
    }
    if (hasP2Heal) {
      applyHealCheatToSide(sim2.p2);
      syncRequestConditionsWithSimulator(sim2.p2);
    }

    if (sim2.p1.activeRequest?.forceSwitch || sim2.p2.activeRequest?.forceSwitch) {
      const upReq1 = sim2.p1.activeRequest;
      const upReq2 = sim2.p2.activeRequest;
      const upC1 = runner.resolveAndConsumeNextChoice('p1', upReq1);
      const upC2 = runner.resolveAndConsumeNextChoice('p2', upReq2);
      
      if (requiresAction(upReq1)) sim2.choose('p1', upC1);
      if (requiresAction(upReq2)) sim2.choose('p2', upC2);
    }
  }
} catch (err: any) {
  console.log(`[Replayer Loop] Crashed at Turn ${sim2States.length + 1}: ${err.message}`);
}

// Print comparison
console.log('\n=== SIDE-BY-SIDE STATE SEQUENCE COMPARISON ===');
const maxLen = Math.max(sim1States.length, sim2States.length);
let diverged = false;
for (let i = 0; i < maxLen; i++) {
  const line1 = sim1States[i] || 'ENDED';
  const line2 = sim2States[i] || 'ENDED';
  const isMatch = line1 === line2;
  console.log(`[Step ${i}] ${isMatch ? '✅' : '❌'}`);
  console.log(`  Emulation: ${line1}`);
  console.log(`  Replayer:  ${line2}`);
  if (!isMatch && !diverged) {
    diverged = true;
    console.log(`\n>>> DIVERGENCE DETECTED AT STEP ${i} <<<`);
  }
}

if (!diverged) {
  console.log('\n✅ Replayer and Emulation are in perfect parity!');
}
