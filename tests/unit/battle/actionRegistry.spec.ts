import { describe, it, expect } from 'vitest';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { dispatchMoveEffect } from '@/logic/battle/actions/actionRegistry';
import type { Move, Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { MoveBaseData } from '@/types/system/database';
import { requirePokemonMoveId } from '@/data/battle/moves';

function toMove(moveData: MoveBaseData): Move {
  return {
    ...moveData,
    maxPP: moveData.pp,
  };
}

function createDispatchFixture() {
  const logs: string[] = [];
  const dummySrc = { uid: 'src-uid', name: 'Bulbasaur' } as Pokemon;
  const dummyTgt = { uid: 'tgt-uid', name: 'Pikachu' } as Pokemon;
  const srcStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as BattleStages;
  const tgtStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as BattleStages;
  const addLogFn = (msg: string) => { logs.push(msg); };
  const dummyCtx = {
    activeBattle: {
      value: {
        player: dummySrc,
        enemy: dummyTgt,
        playerTeam: [dummySrc],
        enemyTeam: [dummyTgt],
        playerSideConditions: {},
        enemySideConditions: {},
        weather: { type: 'clear', visual: 'clear', turns: 5 }
      }
    },
    player: { value: dummySrc },
    enemy: { value: dummyTgt },
    playerStages: { value: srcStages },
    enemyStages: { value: tgtStages },
    exitingPlayer: { value: null },
    exitingEnemy: { value: null },
    fsm: { transition: async () => {} },
    uiStore: { notify: () => {}, isBattleSwitchForced: false },
    gs: { state: { money: 1000 } }
  } as unknown as BattleContext;
  return { dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx };
}

describe('ActionRegistry & Move Effect Mapping Coverage', () => {
  it('dispatches common Showdown move effects without throwing', async () => {
    const movesToTest = [
      'growl',
      'tailwhip',
      'thunderwave',
      'recover',
      'aurorabeam',
      'acidarmor',
      'sunnyday'
    ];

    const { dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx } = createDispatchFixture();

    for (const moveId of movesToTest) {
      const moveData = pokemonDataProvider.getMoveData(moveId);
      expect(moveData).not.toBeNull();

      await expect(
        dispatchMoveEffect(toMove(moveData!), dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx)
      ).resolves.not.toThrow();
    }
  });

  it('does not assign legacy string effects to simple damage moves', () => {
    const tackle = pokemonDataProvider.getMoveData('tackle');
    expect(tackle).not.toBeNull();
    expect(tackle?.effect).toBeUndefined();

    const scratch = pokemonDataProvider.getMoveData('scratch');
    expect(scratch).not.toBeNull();
    expect(scratch?.effect).toBeUndefined();
  });

  it('dispatches real enabled learnset moves without throwing', async () => {
    const { POKEMON_DB } = await import('@/data/pokemon/pokemonDB');
    const { toID } = await import('@pkmn/sim');

    const { ENABLED_POKEMON_IDS } = await import('@/data/system/constants');
    const { dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx } = createDispatchFixture();

    const learnsetMoves = new Set<ReturnType<typeof requirePokemonMoveId>>();
    for (const [speciesId, poke] of Object.entries(POKEMON_DB)) {
      if (!(ENABLED_POKEMON_IDS as readonly string[]).includes(speciesId)) continue;
      if (poke.learnset && Array.isArray(poke.learnset)) {
        poke.learnset.forEach((m: { id: string }) => {
          if (m.id && m.id !== 'Unknown') {
            learnsetMoves.add(requirePokemonMoveId(toID(m.id)));
          }
        });
      }
    }

    const dispatchErrors: string[] = [];

    for (const moveId of learnsetMoves) {
      const moveData = pokemonDataProvider.getMoveData(moveId);
      if (!moveData) continue;
      try {
        await dispatchMoveEffect(toMove(moveData), dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx);
      } catch (error) {
        dispatchErrors.push(`Move: ${moveData.name} (${moveId}) -> ${(error as Error).message}`);
      }
    }

    expect(dispatchErrors).toEqual([]);
  });
});
