import { describe, it, expect, vi } from 'vitest';
import { processPlayerFaintSequence } from '../../../src/logic/battle/battleFaintSequence.ts';
import type { BattleContext } from '../../../src/types/battle/battleContext.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '../../../src/logic/battle/battleStateMachine.ts';

describe('processPlayerFaintSequence - Final Turn Double Faint Fix', () => {
  it('does NOT open SWITCH_MENU when the last enemy has already fainted and player wins', async () => {
    const transitions: Array<{ state: string; subState?: string }> = [];
    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
      currentSubState: { value: BATTLE_SUBSTATES.PLAYER_FAINT_SEQ },
      transition: vi.fn(async (state: string, subState?: string) => {
        transitions.push({ state, subState });
      })
    };

    const poke1 = { uid: 'p1', name: 'Mewtwo', hp: 0, maxHp: 300, fainted: true } as unknown as Pokemon;
    const poke2 = { uid: 'p2', name: 'Mewtwo #2', hp: 300, maxHp: 300, fainted: false } as unknown as Pokemon;
    const enemy1 = { uid: 'e1', name: 'Exeggcute', hp: 0, maxHp: 200, fainted: true } as unknown as Pokemon;

    const terminateBattleMock = vi.fn(async () => {});

    const ctx = {
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      fsm,
      activeBattle: {
        value: {
          over: false,
          isTrainer: true,
          player: poke1,
          enemy: null, // Enemy already fainted and cleared in processEnemyFaintSequence
          enemyTeam: [enemy1], // All enemy Pokémon are at 0 HP
          playerTeam: [poke1, poke2],
          _lastActivePlayer: null
        }
      },
      gs: {
        state: {
          team: [poke1, poke2]
        }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn(),
      faintedSides: {
        value: new Set(['player', 'enemy'])
      },
      uiStore: {
        isBattleSwitchForced: false
      },
      isProcessing: { value: false },
      isIntroAnimating: { value: false },
      animations: {
        handleFaintAnim: vi.fn(async () => {}),
        playBallFadeOut: vi.fn(async () => {})
      }
    } as unknown as BattleContext;

    await processPlayerFaintSequence(ctx, poke1, { terminateBattle: terminateBattleMock });

    // Assert that SWITCH_MENU was NEVER transitioned to
    const reachedSwitchMenu = transitions.some(t => t.subState === BATTLE_SUBSTATES.SWITCH_MENU);
    expect(reachedSwitchMenu).toBe(false);
    expect(ctx.uiStore.isBattleSwitchForced).toBe(false);

    // Assert that terminateBattle was called with win = true
    expect(terminateBattleMock).toHaveBeenCalledWith(ctx, true);
  });
});
