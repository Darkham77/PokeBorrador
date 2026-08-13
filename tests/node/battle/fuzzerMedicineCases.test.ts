import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { runMedicineFuzzer } from '../../../scripts/e2e/fuzzer/core/fuzzer_medicine_cases.ts';
import { fuzzerMemoryStore } from '../../../scripts/e2e/fuzzer/core/fuzzerMemoryStore.ts';

const BAG_MEDICINE_HISTORY_TURN = 2;
const ANTIDOTE_ITEM_ID = 'antidote';
const REVIVE_ITEM_ID = 'revive';
const PLAYER_SEAT = 'p1';

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
