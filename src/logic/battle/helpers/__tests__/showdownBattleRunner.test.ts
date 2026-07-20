// src/logic/battle/helpers/__tests__/showdownBattleRunner.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { ShowdownBattleRunner } from '../showdownBattleRunner.ts';

test('ShowdownBattleRunner normal turn choice and index increment', () => {
  const runner = new ShowdownBattleRunner(['move 1', 'switch 2'], ['move 3']);
  
  // 1. P1 request requires action (active move choice request)
  const reqP1 = { active: [{ moves: [{ id: 'tackle' }] }] };
  const choice = runner.resolveAndConsumeNextChoice('p1', reqP1);
  
  assert.strictEqual(choice, 'move 1');
  assert.strictEqual(runner.p1ChoiceIdx, 1);
});

test('ShowdownBattleRunner wait request bypasses choice increment', () => {
  const runner = new ShowdownBattleRunner(['move 1'], []);
  
  // 2. P1 wait request (no action needed)
  const reqP1Wait = { wait: true };
  const choice = runner.resolveAndConsumeNextChoice('p1', reqP1Wait);
  
  assert.strictEqual(choice, 'pass');
  assert.strictEqual(runner.p1ChoiceIdx, 0); // index should not advance
});

test('ShowdownBattleRunner force switch request increments index', () => {
  const runner = new ShowdownBattleRunner(['switch 3'], []);
  
  // 3. P1 force switch request
  const reqP1Force = { forceSwitch: [true] };
  const choice = runner.resolveAndConsumeNextChoice('p1', reqP1Force);
  
  assert.strictEqual(choice, 'switch 3');
  assert.strictEqual(runner.p1ChoiceIdx, 1);
});

test('ShowdownBattleRunner team preview resolves to team 1', () => {
  const runner = new ShowdownBattleRunner([], []);
  
  // 4. P1 team preview request
  const reqP1Team = { teamPreview: true };
  const choice = runner.resolveAndConsumeNextChoice('p1', reqP1Team);
  
  assert.strictEqual(choice, 'team 1');
  assert.strictEqual(runner.p1ChoiceIdx, 0); // index does not advance for team preview
});
