import { describe, it, expect } from 'vitest';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownLogEnricher } from '../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';

describe('Reproduce Trapped Bide Switch Rejection', () => {
  it('checks Showdown activeRequest and trapped status when Bide is active', () => {
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, [1, 2, 3, 4]);
    ShowdownLogEnricher.setupRealtimeEnrichment(battle);

    battle.setPlayer('p1', {
      name: 'Player',
      team: [
        {
          name: 'Machop',
          species: 'Machop',
          item: '',
          ability: 'Guts',
          moves: ['bide', 'vitalthrow'],
          nature: 'Hardy',
          gender: 'M',
          level: 50,
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
        },
        {
          name: 'Alakazam',
          species: 'Alakazam',
          item: '',
          ability: 'Synchronize',
          moves: ['psychic', 'recover'],
          nature: 'Hardy',
          gender: 'F',
          level: 50,
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
        }
      ]
    });

    battle.setPlayer('p2', {
      name: 'Enemy',
      team: [
        {
          name: 'Blissey',
          species: 'Blissey',
          item: '',
          ability: 'Natural Cure',
          moves: ['splash'],
          nature: 'Hardy',
          gender: 'F',
          level: 50,
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
        }
      ]
    });

    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Object.defineProperty(engine, 'battle', { value: battle });

    // Turn 1: Machop uses Bide
    engine.executeTurn({
      p1Choice: 'move 1',
      p2Choice: 'move 1'
    });

    // Check battle.p1.activeRequest after Bide turn
    const req = battle.p1.activeRequest as {
      active?: Array<{ moves?: Array<{ move: string; id: string }>; trapped?: boolean }>;
    };
    const activeMon = battle.p1.active[0];

    // Log the actual state in the test
    console.log('Turn 2 activeRequest:', JSON.stringify(req));
    console.log('Turn 2 activeMon.trapped:', activeMon?.trapped);

    expect(req?.active?.[0]?.trapped).toBe(true);

    // Attempting to switch on Turn 2 should fail in Showdown
    expect(() => {
      engine.executeTurn({
        p1Choice: 'switch 2',
        p2Choice: 'move 1'
      });
    }).toThrow(/Can't switch: The active Pokémon is trapped/);
  });

  it('verifies that isPokemonLocked detects trapped and bide states', async () => {
    const { isPokemonLocked } = await import('../../../src/logic/pokemon/pokemonUtils.ts');

    const monWithBide = {
      volatileCounters: { bide: 1 }
    } as any;
    expect(isPokemonLocked(monWithBide)).toBe(true);

    const monTrapped = {
      trapped: true
    } as any;
    expect(isPokemonLocked(monTrapped)).toBe(true);
  });

  it('verifies that syncActiveMovesFromRequest synchronizes trapped state from request', async () => {
    const { syncActiveMovesFromRequest } = await import('../../../src/stores/battle/battleMoveSync.ts');

    const mockActiveState = {
      player: {
        uid: 'p1-machop',
        name: 'Machop',
        moves: [],
        trapped: false
      },
      playerRequest: {
        active: [
          {
            moves: [{ id: 'bide', pp: 10, maxpp: 10 }],
            trapped: true
          }
        ]
      }
    } as any;

    syncActiveMovesFromRequest(mockActiveState, 'player');

    expect(mockActiveState.player.trapped).toBe(true);
  });

  it('verifies that executeBattleSwitch synchronously blocks voluntary switch when player is trapped', async () => {
    const { ref } = await import('vue');
    const { vi } = await import('vitest');
    const { executeBattleSwitch } = await import('../../../src/stores/battle/battleSwitchHelper.ts');

    const notifyMock = vi.fn();
    const mockCtx = {
      isProcessing: ref(false),
      isPvP: ref(false),
      activeBattle: ref({
        player: {
          uid: 'machop',
          trapped: true,
          volatileCounters: { bide: 1 }
        },
        playerRequest: {
          active: [{ trapped: true }]
        }
      }),
      uiStore: {
        notify: notifyMock
      }
    } as any;

    await executeBattleSwitch(mockCtx, 1, false);

    expect(notifyMock).toHaveBeenCalledWith('¡No puedes cambiar de Pokémon ahora! (Atrapado)', '🚫');
    expect(mockCtx.isProcessing.value).toBe(false);
  });

  it('verifies that buildPokemonVolatiles displays the 🪤 (ATRAPADO) emoji and text', async () => {
    const { buildPokemonVolatiles } = await import('../../../src/composables/battle/combatantStatusHelpers.ts');

    const monTrapped = {
      trapped: true
    } as any;
    const volatiles = buildPokemonVolatiles(monTrapped);
    expect(volatiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ icon: '🪤', text: expect.stringContaining('ATRAPADO') })
      ])
    );
  });
});
