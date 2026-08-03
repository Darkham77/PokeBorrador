import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { handleItemUsage } from '../../../src/logic/battle/battleItems.ts';
import { pokemonDebugService } from '../../../src/logic/debug/pokemonDebugService.ts';

describe('Revive Item Usage Unit Test', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should restore HP to a fainted bench Pokemon when revive is used', async () => {
    const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 5 });
    const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
    charmander.hp = 0; // Fainted bench mon

    const mockOptions = {
      eventStore: {} as never,
      addLog: () => {},
      audio: { play: () => {} } as never,
      consumeItem: () => {}
    };

    const res = await handleItemUsage('revive', charmander, bulbasaur, mockOptions);

    assert.strictEqual(res.action, 'heal');
    assert.strictEqual(res.pokemon?.hp, Math.floor(charmander.maxHp / 2));
    assert.ok(charmander.hp > 0, `Charmander HP should be > 0, got ${charmander.hp}`);
  });
});
