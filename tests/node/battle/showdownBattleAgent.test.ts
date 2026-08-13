/**
 * tests/node/battle/showdownBattleAgent.test.ts
 *
 * Unit tests for ShowdownBattleAgent:
 * - No duplicate switch target slots in forced switch
 * - No "undefined" modifier string coercion when canMegaEvo is undefined
 */
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ShowdownBattleAgent } from '../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import type { ChoiceRequest } from '../../../src/logic/battle/helpers/requestHelper.ts';

class TestAgent extends ShowdownBattleAgent {
  public testDecide(request: ChoiceRequest): string {
    return this.decide(request);
  }
}

describe('ShowdownBattleAgent & Bridge integrity tests', () => {
  it('prevents duplicate switch target slots in forced switch', () => {
    const agent = new TestAgent('p1');
    const request: ChoiceRequest = {
      forceSwitch: [true, true],
      side: {
        pokemon: [
          { ident: 'p1a: Mon1', details: 'Charizard', condition: '0 fnt', active: true, stats: { hp: 100 }, moves: [], ability: '' },
          { ident: 'p1b: Mon2', details: 'Blastoise', condition: '0 fnt', active: true, stats: { hp: 100 }, moves: [], ability: '' },
          { ident: 'p1: Mon3', details: 'Venusaur', condition: '100/100', active: false, stats: { hp: 100 }, moves: [], ability: '' },
          { ident: 'p1: Mon4', details: 'Pikachu', condition: '100/100', active: false, stats: { hp: 100 }, moves: [], ability: '' },
        ],
      },
    };

    const choice = agent.testDecide(request);
    assert.equal(choice, 'switch 3, switch 4');
  });

  it('selects a fainted party member for Showdown Revival Blessing target requests', () => {
    const agent = new TestAgent('p1');
    const request: ChoiceRequest = {
      forceSwitch: [true],
      side: {
        pokemon: [
          { ident: 'p1a: Reviver', details: 'Pawmot', condition: '100/100', active: true, reviving: true, stats: { hp: 100 }, moves: [], ability: '' },
          { ident: 'p1: FaintedTarget', details: 'Pikachu', condition: '0 fnt', active: false, stats: { hp: 100 }, moves: [], ability: '' },
          { ident: 'p1: HealthyBench', details: 'Raichu', condition: '100/100', active: false, stats: { hp: 100 }, moves: [], ability: '' },
        ],
      },
    };

    assert.equal(agent.testDecide(request), 'switch 2');
  });

  it('avoids "undefined" modifier string coercion when canMegaEvo is not defined', () => {
    const agent = new TestAgent('p1');
    const request: ChoiceRequest = {
      active: [
        {
          moves: [
            { id: 'flamethrower', disabled: false, pp: 15 },
          ],
        },
      ],
    };

    const choice = agent.testDecide(request);
    assert.doesNotMatch(choice, /undefined/);
    assert.match(choice, /^move 1/);
  });

  it('correctly classifies request with forceSwitch: [false] and active moves as "move"', async () => {
    const { classifyRequest } = await import('../../../src/logic/battle/helpers/requestHelper.ts');
    const request: ChoiceRequest = {
      forceSwitch: [false],
      active: [{ moves: [{ id: 'tackle', pp: 35 }] }],
      side: { pokemon: [] }
    };
    assert.equal(classifyRequest(request), 'move');
  });

  it('correctly identifies fainted target objects across all fainted indicators in isFainted', () => {
    const agent = new TestAgent('p1');
    const isFainted = (agent as any).isFainted.bind(agent);

    assert.equal(isFainted({ condition: '0 fnt' }), true);
    assert.equal(isFainted({ condition: '100/100' }), false);
    assert.equal(isFainted({ fainted: true }), true);
    assert.equal(isFainted({ hp: 0 }), true);
    assert.equal(isFainted({ hp: '0' }), true);
    assert.equal(isFainted('0 fnt'), true);
    assert.equal(isFainted('fnt'), true);
  });
});
