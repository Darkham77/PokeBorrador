import assert from 'node:assert/strict';
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';

import { requireCertifiedBagItemResponse } from '@/logic/battle/helpers/certifiedBagItemActionResolver';
import { createCertifiedBattleInventory } from '../../../scripts/e2e/fuzzer/core/certifiedBattleInventory.ts';
import { createCertifiedItemBattleCases } from '../../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';
import { generateItemBatches } from '../../../scripts/e2e/fuzzer/generators/fuzzer_item_generator.ts';
import { runMedicineFuzzer } from '../../../scripts/e2e/fuzzer/core/fuzzer_medicine_cases.ts';
import { fuzzerMemoryStore } from '../../../scripts/e2e/fuzzer/core/fuzzerMemoryStore.ts';
import { executeBattleTurn } from '@/logic/battle/helpers/showdownExecutor';
import { patchShowdownSpreadModify } from '@/logic/battle/engine/showdownSpreadModifyHelper';
import { ShowdownBattleAgent } from '@/logic/battle/helpers/showdownBattleAgent';
import { ShowdownTeamResolver } from '@/logic/battle/showdownTeamResolver';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';

patchShowdownSpreadModify(() => true);

const BAG_MEDICINE_HISTORY_TURN = 2;
const ANTIDOTE_ITEM_ID = 'antidote';
const REVIVE_ITEM_ID = 'revive';
const PLAYER_SEAT = 'p1';

describe('Battle Certified Inventory & Item Actions Domain Suite', () => {
  describe('certified bag-item action resolver', () => {
    it('uses the recorded enemy response only when the visible item and target match the atomic action', () => {
      const debug = {
        history: [{
          p1Choice: '',
          p2Choice: 'move 2',
          p1GameAction: { kind: 'bag-item' as const, itemId: 'antidote' as const, targetSlot: 2 as const },
        }],
        replayHistoryIdx: 0,
        certifiedReplayWorkerEnded: false,
      };

      assert.equal(requireCertifiedBagItemResponse(debug, 'antidote', 2), 'move 2');
      assert.throws(
        () => requireCertifiedBagItemResponse(debug, 'potion', 2),
        /does not match the certified bag action/,
      );
    });
  });

  describe('createCertifiedBattleInventory', () => {
    it('includes every certified bag action item in the initialized inventory', () => {
      expect(createCertifiedBattleInventory(['antidote', 'revive'], 99)).toEqual({
        antidote: 99,
        revive: 99,
      });
    });
  });

  describe('createCertifiedItemBattleCases', () => {
    it('promotes an organically terminal held-item run to the canonical battle contract', () => {
      const batch = generateItemBatches(['leftovers'], 1)[0];
      if (!batch) throw new Error('Expected a generated Leftovers batch.');
      batch.seed = [1, 2, 3, 4];
      batch.playerChoices = ['move 1'];
      batch.enemyChoices = ['move 1'];
      batch.history = [{ turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 }];
      batch.steps = ['Terminal held-item battle'];
      batch.ended = true;
      batch.winner = 'p1';
      batch.finalState = {
        isOver: true,
        winner: 'p1',
        p1: [{ name: batch.playerTeam[0]!.name, hp: 1, maxHp: 1, fainted: false }],
        p2: [{ name: batch.enemyTeam[0]!.name, hp: 0, maxHp: 1, fainted: true }],
      };

      expect(createCertifiedItemBattleCases([batch])).toHaveLength(1);
    });
  });

  describe('certified bag medicine cases', () => {
    beforeEach(() => {
      fuzzerMemoryStore.clear();
    });

    it('certifies an Antidote replay in which the player survives its poison objective', async () => {
      await runMedicineFuzzer();
      const antidoteCase = fuzzerMemoryStore.getBattleCases().find((battleCase) => {
        const medicineTurn = battleCase.history.find((entry) => entry.turnCount === BAG_MEDICINE_HISTORY_TURN);
        return medicineTurn?.p1GameAction?.kind === 'bag-item'
          && medicineTurn.p1GameAction.itemId === ANTIDOTE_ITEM_ID;
      });
      assert.ok(antidoteCase, 'The fuzzer must emit an immutable certified Antidote case.');
      const player = antidoteCase.finalState[PLAYER_SEAT][0];
      assert.ok(player, 'The certified final state must include the player Pokémon.');
      assert.ok(player.hp > 0, 'The Antidote action must reach Showdown and prevent the poison objective from defeating the player.');
    });

    it('certifies a Revive replay for a fainted bench Pokémon', async () => {
      await runMedicineFuzzer();
      const reviveCase = fuzzerMemoryStore.getBattleCases().find((battleCase) => {
        return battleCase.history.some((entry) => {
          return entry.p1GameAction?.kind === 'bag-item'
            && entry.p1GameAction.itemId === REVIVE_ITEM_ID
            && entry.p1GameAction.targetSlot === 1;
        });
      });
      assert.ok(reviveCase, 'The fuzzer must emit an immutable certified Revive case.');
      const revivedPlayer = reviveCase.finalState[PLAYER_SEAT].find((pokemon) => pokemon.name === 'MedicineFaintTarget');
      assert.ok(revivedPlayer, 'The certified final state must include the revived player Pokémon.');
      assert.ok(revivedPlayer.hp > 0, 'The recorded Revive action must synchronize a fainted Pokémon back into Showdown.');
    });
  });

  describe('Reproduction Test for lote-items-38', () => {
    it('replays lote-items-38 turn-by-turn with exact fidelity', () => {
      const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/battle/case_lote_items_38.json');
      expect(fs.existsSync(fixturePath)).toBe(true);

      const match = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      const battle = new Battle({ formatid: 'gen9customgame' as any, seed: match.seed });
      battle.setPlayer('p1', { name: 'Player', team: match.playerTeam });
      battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam });

      battle.choose('p1', 'default');
      battle.choose('p2', 'default');

      for (let i = 0; i < match.history.length; i++) {
        const step = match.history[i];
        if (battle.ended) break;
        const turn = i + 1;

        executeBattleTurn({
          battle,
          p1Choice: step.p1Choice,
          p2Choice: step.p2Choice,
          history: match.history,
          currentStep: turn,
          certifiedHistoryStep: step
        });
      }

      expect(battle.ended).toBe(true);
    });
  });

  describe('Revival Blessing & Dynamic Forced Switch Resolution', () => {
    it('should select only fainted candidate when reviving flag is true', () => {
      class TestAgent extends ShowdownBattleAgent {
        public testDecideForcedSwitch(req: Parameters<ShowdownBattleAgent['decideForcedSwitch']>[0]) {
          return this.decideForcedSwitch(req);
        }
      }

      const agent = new TestAgent('p1');
      const req = {
        forceSwitch: [true],
        side: {
          id: 'p1',
          name: 'Player',
          pokemon: [
            { ident: 'p1: d04aa40b', details: 'Mew', condition: '342/342', active: true, reviving: true, uid: 'uid-1' },
            { ident: 'p1: ce026eb8', details: 'Mew', condition: '342/342', active: false, reviving: false, uid: 'uid-2' },
            { ident: 'p1: 66f24984', details: 'Mew', condition: '342/342', active: false, reviving: false, uid: 'uid-3' },
            { ident: 'p1: 00dd3e02', details: 'Mew', condition: '0 fnt', active: false, reviving: false, uid: 'uid-4' },
            { ident: 'p1: 0cf1f553', details: 'Mew', condition: '342/342', active: false, reviving: false, uid: 'uid-5' },
          ]
        }
      };

      const choice = agent.testDecideForcedSwitch(req as any);
      expect(choice).toBe('switch 4');
    });

    it('should resolve correct Showdown 1-based slot by UID dynamically', () => {
      const request: ShowdownPlayerRequest = {
        side: {
          pokemon: [
            { ident: 'p2: a2df7e53', details: 'Blissey', condition: '0 fnt', active: true, uid: 'uid-1' },
            { ident: 'p2: cfa419df', details: 'Blissey', condition: '0 fnt', active: false, uid: 'uid-2' },
            { ident: 'p2: 0ba7b97a', details: 'Blissey', condition: '0 fnt', active: false, uid: 'uid-3' },
            { ident: 'p2: 80e7b1f2', details: 'Blissey', condition: '651/651', active: false, uid: 'uid-4' },
          ]
        }
      };

      const slot = ShowdownTeamResolver.getShowdownSlotForUid(request, 'uid-4');
      expect(slot).toBe(4);
    });
  });
});
