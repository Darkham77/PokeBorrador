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

  it('strictly isolates HP sync by UID when multiple Pokemon of the same species exist in team', async () => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const battleStore = useBattleStore();
    const gameStore = useGameStore();

    const faintMew = pokemonDebugService.generate({ id: 'mew', level: 1, uid: 'mew-lvl-1' });
    const strongMew = pokemonDebugService.generate({ id: 'mew', level: 100, uid: 'mew-lvl-100' });
    faintMew.hp = 0;
    strongMew.hp = strongMew.maxHp;

    gameStore.state.team = [faintMew, strongMew];

    battleStore.state = {
      isTrainer: true,
      player: strongMew,
      enemy: pokemonDebugService.generate({ id: 'blissey', level: 100 }),
      playerTeamIndex: 1,
      playerTeam: [
        { uid: 'mew-lvl-1', id: 'mew', name: 'Mew', hp: 6, maxHp: 13, level: 1, moves: [], status: '', sleepTurns: 0, fainted: false, types: ['psychic'] },
        { uid: 'mew-lvl-100', id: 'mew', name: 'Mew', hp: 404, maxHp: 404, level: 100, moves: [], status: '', sleepTurns: 0, fainted: false, types: ['psychic'] },
      ],
      enemyTeam: [],
      turn: 1,
      over: false,
      winner: null,
      fsmState: 'ACTIVE_BATTLE',
      fsmSubState: 'WAIT_INPUT',
      isProcessing: false,
    } as never;

    battleStore.syncTeamHP();

    assert.strictEqual(gameStore.state.team[0]?.hp, 6, 'Faint Mew must receive only its own HP (6), not strong Mew HP');
    assert.ok(gameStore.state.team[0]!.hp <= gameStore.state.team[0]!.maxHp, 'Faint Mew HP must never exceed its max HP');
    assert.strictEqual(gameStore.state.team[1]?.hp, 404, 'Strong Mew must receive its own HP (404)');
  });
});
