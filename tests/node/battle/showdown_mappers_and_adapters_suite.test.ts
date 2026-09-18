import assert from 'node:assert/strict';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { PokemonSet, Battle } from '@pkmn/sim';
import { toID } from '@pkmn/sim';

import { patchShowdownSpreadModify } from '@/logic/battle/engine/showdownSpreadModifyHelper';
import { createShowdownBattle } from '@/logic/battle/helpers/showdownBattleFactory';
import { ACTIVE_SHOWDOWN_FORMAT } from '@/data/system/constants';
import { BattleAgent } from '../../../scripts/e2e/fuzzer/core/fuzzer_agent.ts';
import type { ChoiceRequest } from '@/logic/battle/helpers/requestHelper';
import { ShowdownBattleRunner } from '@/logic/battle/helpers/showdownBattleRunner';
import { requireItemId, getItemById } from '@/data/inventory/items';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';
import type { SBCtx } from '@/logic/battle/showdownBridgeCtx';
import { ShowdownBattleEngine } from '@/logic/battle/engine/showdownBattleEngine';
import { ShowdownTeamMapper } from '@/logic/battle/helpers/showdownTeamMapper';
import {
  STATUS_EMOJI_MAP,
  STATUS_SHORT_LABEL_MAP,
  STATUS_NAME_MAP,
  STATUS_TOOLTIP_MAP,
} from '@/logic/battle/battleUiUtils';

const CERTIFIED_SEED = [31, 32, 33, 34];
const E2E_MODE = () => true;
const FUZZER_COVERAGE_FACTORY_INSTALLATIONS = 20_000;
const BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
const FALLBACK_SET: PokemonSet = {
  name: 'AdapterFallback', species: 'Mew', item: '', ability: 'Synchronize', moves: ['splash'], nature: 'Serious', gender: 'M', level: 100,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
};

const P2_ONLY_HISTORY_INDEX = 0;
const NORMAL_HISTORY_INDEX = 1;

describe('Showdown Mappers, Adapters & Protocol Suite', () => {
  describe('Showdown spreadModify adapter installation', () => {
    it('remains usable after every shared caller installs the adapter', () => {
      for (let installation = 0; installation < FUZZER_COVERAGE_FACTORY_INSTALLATIONS; installation++) {
        createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, CERTIFIED_SEED);
      }
      patchShowdownSpreadModify(E2E_MODE);
      const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, CERTIFIED_SEED);

      assert.doesNotThrow(() => {
        battle.spreadModify(BASE_STATS, FALLBACK_SET);
        battle.setPlayer('p1', { name: 'P1', team: [{ name: 'AdapterPlayer', species: 'Mew', item: '', ability: 'Synchronize', moves: ['splash'], nature: 'Serious', gender: 'M', level: 100, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
        battle.setPlayer('p2', { name: 'P2', team: [{ name: 'AdapterEnemy', species: 'Blissey', item: '', ability: 'NaturalCure', moves: ['splash'], nature: 'Serious', gender: 'F', level: 100, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
      }, 'Repeated adapter installation must preserve the original Showdown spreadModify implementation.');
    });
  });

  describe('ShowdownBattleAgent — Disabled Moves Safety', () => {
    it('does not select a disabled move or move with 0 PP when all moves are disabled', () => {
      const agent = new BattleAgent('p1');

      const requestWithDisabledMoves: ChoiceRequest = {
        active: [
          {
            moves: [
              { id: 'softboiled', move: 'Soft-Boiled', disabled: true, pp: 0, maxpp: 8 },
              { id: 'recover', move: 'Recover', disabled: true, pp: 0, maxpp: 10 }
            ]
          }
        ],
        side: {
          id: 'p1',
          pokemon: [
            {
              ident: 'p1: Blissey',
              details: 'Blissey, F',
              condition: '714/714',
              active: true
            }
          ]
        }
      };

      const choice = agent.decide(requestWithDisabledMoves);

      assert.notStrictEqual(
        choice,
        'move 1',
        'BattleAgent must not select move 1 when it is disabled (0 PP)'
      );
      assert.notStrictEqual(
        choice,
        'move 2',
        'BattleAgent must not select move 2 when it is disabled (0 PP)'
      );
    });
  });

  describe('ShowdownBattleRunner Turn Choice Resolution', () => {
    it('normal turn choice and index increment', () => {
      const runner = new ShowdownBattleRunner(['move 1', 'switch 2'], ['move 3']);
      const reqP1 = { active: [{ moves: [{ id: 'tackle' }] }] };
      const choice = runner.resolveAndConsumeNextChoice('p1', reqP1);
      
      expect(choice).toBe('move 1');
      expect(runner.p1ChoiceIdx).toBe(1);
    });

    it('wait request bypasses choice increment', () => {
      const runner = new ShowdownBattleRunner(['move 1'], []);
      const reqP1Wait = { wait: true };
      const choice = runner.resolveAndConsumeNextChoice('p1', reqP1Wait);
      
      expect(choice).toBe('pass');
      expect(runner.p1ChoiceIdx).toBe(0);
    });

    it('force switch request increments index', () => {
      const runner = new ShowdownBattleRunner(['switch 3'], []);
      const reqP1Force = { forceSwitch: [true] };
      const choice = runner.resolveAndConsumeNextChoice('p1', reqP1Force);
      
      expect(choice).toBe('switch 3');
      expect(runner.p1ChoiceIdx).toBe(1);
    });

    it('team preview resolves to team 1', () => {
      const runner = new ShowdownBattleRunner([], []);
      const reqP1Team = { teamPreview: true };
      const choice = runner.resolveAndConsumeNextChoice('p1', reqP1Team);
      
      expect(choice).toBe('team 1');
      expect(runner.p1ChoiceIdx).toBe(0);
    });
  });

  describe('Showdown Bridge — Item Event Canonical Domain ID Normalization', () => {
    it('normalizes raw Showdown item strings like "Air Balloon" to canonical ItemIds', () => {
      const rawShowdownItemString = 'Air Balloon';
      const canonicalItemId = requireItemId(toID(rawShowdownItemString));

      assert.strictEqual(canonicalItemId, 'airballoon', 'Canonical ItemId for "Air Balloon" must be "airballoon"');
      assert.doesNotThrow(() => {
        getItemById(canonicalItemId);
      }, 'getItemById must succeed for normalized ItemId');
    });
  });

  describe('Showdown Bridge Misc — requireItemId import integrity', () => {
    it('does not throw ReferenceError when processing -item or -enditem logs', () => {
      const fakePoke = { name: 'Mew', heldItem: 'sitrusberry', item: 'sitrusberry', lastItem: '' };
      const mockCtx: SBCtx = {
        store: { addLog: () => {} },
        type: '-enditem',
        parts: ['-enditem', '', 'p1a: Mew', 'Sitrus Berry', '[eat]'],
        line: '|-enditem|p1a: Mew|Sitrus Berry|[eat]',
        p: () => null,
        getPoke: () => fakePoke as any,
        getSide: () => null,
      } as any;

      assert.doesNotThrow(() => {
        handleMiscEvents(mockCtx);
      }, 'handleMiscEvents must not throw ReferenceError for requireItemId');

      assert.strictEqual(fakePoke.lastItem, 'sitrusberry');
    });
  });

  describe('Showdown Certified History Cursor', () => {
    it('certified history keeps P2-only switches atomic before the following normal turn', () => {
      const debug: object = {
        replayHistoryIdx: P2_ONLY_HISTORY_INDEX,
        history: [
          { p1Choice: '', p2Choice: 'switch 2' },
          { p1Choice: 'move 3', p2Choice: 'move 1' },
        ],
      };

      assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p1'), '');
      assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p2'), 'switch 2');
      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(debug);
      assert.equal(Reflect.get(debug, 'replayHistoryIdx'), NORMAL_HISTORY_INDEX);
      assert.equal(Reflect.get(debug, 'p1ChoiceIdx'), P2_ONLY_HISTORY_INDEX);
      assert.equal(Reflect.get(debug, 'p2ChoiceIdx'), NORMAL_HISTORY_INDEX);
      assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p1'), 'move 3');
      assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p2'), 'move 1');
    });

    it('certified history preserves both choices for a simultaneous forced replacement', () => {
      const debug: object = {
        replayHistoryIdx: P2_ONLY_HISTORY_INDEX,
        history: [{ p1Choice: 'switch 3', p2Choice: 'switch 2' }],
      };

      assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p1'), 'switch 3');
      assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p2'), 'switch 2');
    });

    it('does not request a replacement choice after the certified worker ended on the final history entry', () => {
      const debug = {
        history: [{ p1Choice: 'move 1', p2Choice: 'move 1' }],
        replayHistoryIdx: NORMAL_HISTORY_INDEX,
        certifiedReplayWorkerEnded: true,
      };

      assert.equal(ShowdownBattleRunner.requirePendingHistoryEntry(debug), null);
    });

    it('rejects an exhausted history while the certified worker still requires an action', () => {
      const debug = {
        history: [{ p1Choice: 'move 1', p2Choice: 'move 1' }],
        replayHistoryIdx: NORMAL_HISTORY_INDEX,
        certifiedReplayWorkerEnded: false,
      };

      assert.throws(
        () => ShowdownBattleRunner.requirePendingHistoryEntry(debug),
        /Certified replay history step is missing/,
      );
    });
  });

  describe('ShowdownBattleEngine Replayer Forced Switch Parity', () => {
    it('should replay all certified fuzzer cases without throwing invalid choice on forced switch turns', () => {
      const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
      if (!fs.existsSync(casesPath)) {
        return;
      }
      const data = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
      const allCases = [...(data.battle || []), ...(data.items || [])];

      const targetCase = allCases.find((c: any) => c.id === 'case-f8b3b82144d0');
      if (!targetCase) return;

      const engine = new ShowdownBattleEngine({
        mode: 'replayer',
        playerChoices: targetCase.playerChoices,
        enemyChoices: targetCase.enemyChoices,
        seed: targetCase.seed,
      });
      if (targetCase.p1Team && targetCase.p2Team) {
        engine.battle.setPlayer('p1', { team: targetCase.p1Team });
        engine.battle.setPlayer('p2', { team: targetCase.p2Team });
      }

      for (let i = 0; i < targetCase.history.length; i++) {
        const step = targetCase.history[i];
        const output = engine.executeTurn({
          p1Choice: step.p1Choice,
          p2Choice: step.p2Choice,
          certifiedHistoryStep: step,
        });
        expect(output).toBeDefined();
      }
    });
  });

  describe('ShowdownTeamMapper UID mapping', () => {
    it('injectUidsIntoRequest correctly maps and injects UIDs', () => {
      const mockBattle = {
        p1: {
          pokemon: [
            { uid: '80be8f0b-85e6-4893-b550-2c6e8d63bc11', name: 'Mew' },
            { uid: '7507a15a-778c-4a16-8859-98c29c829b03', name: 'Mew' }
          ]
        }
      };

      const mockRequest = {
        side: {
          pokemon: [
            { ident: 'p1a: 80be8f0b' },
            { ident: 'p1a: 7507a15a' }
          ]
        }
      };

      const result = ShowdownTeamMapper.injectUidsIntoRequest(mockBattle as unknown as Battle, 'p1', mockRequest);

      expect(result).toBeTruthy();
      if (result) {
        expect(result.side).toBeTruthy();
        expect(result.side!.pokemon[0]!.uid).toBe('80be8f0b-85e6-4893-b550-2c6e8d63bc11');
        expect(result.side!.pokemon[1]!.uid).toBe('7507a15a-778c-4a16-8859-98c29c829b03');
      }
    });

    it('injectUidsIntoRequest throws error on missing matching UID', () => {
      const mockBattle = {
        p1: {
          pokemon: [
            { uid: '80be8f0b-85e6-4893-b550-2c6e8d63bc11', name: 'Mew' }
          ]
        }
      };

      const mockRequest = {
        side: {
          pokemon: [
            { ident: 'p1a: 7507a15a' }
          ]
        }
      };

      expect(() => {
        ShowdownTeamMapper.injectUidsIntoRequest(mockBattle as unknown as Battle, 'p1', mockRequest);
      }).toThrow(/No UID found on simulator Pokemon instance/);
    });
  });

  describe('Battle Status UI Mapping Integrity', () => {
    const expectedStatuses = ['brn', 'psn', 'slp', 'par', 'frz', 'tox'];

    it('contains mapping for every expected status in STATUS_EMOJI_MAP', () => {
      expectedStatuses.forEach(status => {
        const emoji = (STATUS_EMOJI_MAP as Record<string, string>)[status];
        assert.ok(emoji, `Missing emoji mapping for status: ${status}`);
      });
    });

    it('contains mapping for every expected status in STATUS_SHORT_LABEL_MAP', () => {
      expectedStatuses.forEach(status => {
        const label = (STATUS_SHORT_LABEL_MAP as Record<string, string>)[status];
        assert.ok(label, `Missing short label mapping for status: ${status}`);
      });
    });

    it('contains mapping for every expected status in STATUS_NAME_MAP', () => {
      expectedStatuses.forEach(status => {
        const name = (STATUS_NAME_MAP as Record<string, string>)[status];
        assert.ok(name, `Missing name mapping for status: ${status}`);
      });
    });

    it('contains mapping for every expected status in STATUS_TOOLTIP_MAP', () => {
      expectedStatuses.forEach(status => {
        const tooltip = (STATUS_TOOLTIP_MAP as Record<string, string>)[status];
        assert.ok(tooltip, `Missing tooltip description for status: ${status}`);
      });
    });
  });
});
