import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { executeFlee } from '@/logic/battle/battleFlee';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { gameBus } from '@/logic/events/gameBus';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import { ref } from 'vue';

describe('Flee Animation Parity (Player Recall vs Wild Enemy Flee)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('player successful flee executes POKEMON_RECALL (Pokéball) and triggers parallel wild enemy flee animation', async () => {
    const p1 = makePokemon('pidgeot', 31)!;
    p1.uid = 'player-pidgeot-1';
    p1.hp = 92;
    p1.maxHp = 92;

    const e1 = makePokemon('caterpie', 4)!;
    e1.uid = 'wild-caterpie-1';
    e1.hp = 18;
    e1.maxHp = 18;

    const fsmTransitions: string[] = [];
    const busEvents: Array<{ side: string; type?: string }> = [];

    const handleWithdrawSpy = vi.fn().mockResolvedValue(undefined);
    const escapeListener = (e: Event) => {
      const data = (e as CustomEvent).detail as { side: string; type?: string };
      busEvents.push(data);
    };
    gameBus.on('PLAY_ESCAPE_ANIM', escapeListener);

    const fsm = {
      currentState: ref('ACTIVE_BATTLE'),
      currentSubState: ref<string | null>('WAIT_INPUT'),
      transition: vi.fn().mockImplementation((state: string, subState: string | null = null) => {
        fsm.currentState.value = state;
        fsm.currentSubState.value = subState;
        fsmTransitions.push(`${state}:${subState}`);
        return Promise.resolve();
      })
    };

    const activeBattleRef = ref<BattleState | null>({
      player: p1,
      enemy: e1,
      turnCount: 1,
      over: false,
      fled: false,
      playerFled: false,
      cannotEscape: false,
      isTrainer: false,
      isGym: false,
      escapeAttempts: 0
    } as unknown as BattleState);

    const endBattleSpy = vi.fn().mockResolvedValue(undefined);

    let confirmHandler: (() => Promise<void>) | null = null;
    const ctx = {
      fsm,
      activeBattle: activeBattleRef,
      playerStages: ref({ spe: 0 } as unknown as BattleStages),
      enemyStages: ref({ spe: 0 } as unknown as BattleStages),
      isProcessing: ref(false),
      uiStore: {
        openConfirm: (opts: { onConfirm: () => Promise<void> }) => {
          confirmHandler = opts.onConfirm;
        }
      },
      animations: {
        handleWithdrawRequest: handleWithdrawSpy
      },
      addLog: vi.fn(),
      endBattle: endBattleSpy,
      BATTLE_STATES: {
        ACTIVE_BATTLE: 'ACTIVE_BATTLE'
      },
      BATTLE_SUBSTATES: {
        ESCAPE_PROCESS: 'ESCAPE_PROCESS',
        POKEMON_RECALL: 'POKEMON_RECALL',
        VACATE_SEAT: 'VACATE_SEAT'
      }
    } as unknown as BattleContext;

    await executeFlee(ctx);
    expect(confirmHandler).toBeDefined();
    await confirmHandler!();

    gameBus.off('PLAY_ESCAPE_ANIM', escapeListener);

    // Verify FSM states
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:POKEMON_RECALL');
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:VACATE_SEAT');

    // 1. Verify handleWithdrawRequest was called for player (Pokéball recall)
    expect(handleWithdrawSpy).toHaveBeenCalledWith({ side: 'player', pokemon: p1 });

    // 2. Verify PLAY_ESCAPE_ANIM was emitted for the enemy side (wild flee)
    expect(busEvents.some(e => e.side === 'enemy' && e.type === 'flee')).toBe(true);

    // 3. Verify NO wild flee was emitted for player side
    expect(busEvents.some(e => e.side === 'player' && e.type === 'flee')).toBe(false);

    // 4. Verify battle marked as fled and ended
    expect(activeBattleRef.value?.playerFled).toBe(true);
    expect(endBattleSpy).toHaveBeenCalledWith(false, true);
  });

  it('teleport escape maintains teleport type in animation events', () => {
    const busEvents: Array<{ side: string; type?: string }> = [];
    const escapeListener = (e: Event) => {
      const data = (e as CustomEvent).detail;
      busEvents.push(data);
    };
    gameBus.on('TRIGGER_COMBATANT_ESCAPE', escapeListener);

    gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side: 'enemy', type: 'teleport' });

    gameBus.off('TRIGGER_COMBATANT_ESCAPE', escapeListener);

    expect(busEvents.some(e => e.side === 'enemy' && e.type === 'teleport')).toBe(true);
  });
});
