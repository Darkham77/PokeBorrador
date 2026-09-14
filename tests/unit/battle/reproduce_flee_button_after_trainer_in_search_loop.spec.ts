import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBattleStore } from '@/stores/battle/battle';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

describe('Reproduce Flee Button Disappearance After Trainer in Search Loop (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('restores cannotEscape as false for wild battles on F5 reload even if stale cannotEscape was saved', async () => {
    const battleStore = useBattleStore();

    const mockPlayer = { uid: 'p1', id: 'gengar', hp: 34, maxHp: 162, moves: [] } as unknown as Pokemon;
    const mockEnemy = { uid: 'pidgeotto-1', id: 'pidgeotto', hp: 15, maxHp: 15, moves: [] } as unknown as Pokemon;

    const staleSavedData = {
      locationId: 'route1',
      wasSearching: true,
      isTrainer: false,
      isGym: false,
      isPvP: false,
      isGuardian: false,
      cannotEscape: true, // Stale saved value from previous trainer fight
      enemy: mockEnemy,
      player: mockPlayer,
      playerTeam: [mockPlayer],
      enemyTeam: [mockEnemy]
    };

    const mockCtx: Partial<BattleContext> = {
      activeBattle: { value: null } as any,
      isProcessing: { value: false } as any,
      fsm: {
        transition: vi.fn().mockResolvedValue(undefined),
        currentSubState: { value: 'WAIT_INPUT' }
      } as any,
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE', ACTIVE_BATTLE: 'ACTIVE_BATTLE' } as any,
      BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT', FIRST_INTRO: 'FIRST_INTRO' } as any,
      gs: {
        state: { team: [mockPlayer], activeBattle: null },
        registerPokedex: vi.fn(),
        save: vi.fn()
      } as any,
      addLog: vi.fn(),
      playerStages: { value: {} } as any,
      enemyStages: { value: {} } as any,
      battleLogs: { value: [] } as any,
      isIntroAnimating: { value: false } as any,
      attackerSide: { value: null } as any,
      activeMove: { value: null } as any,
      persistBattle: vi.fn()
    };

    await restoreBattleState(mockCtx as BattleContext, staleSavedData);

    expect(mockCtx.activeBattle?.value).toBeDefined();
    expect(mockCtx.activeBattle?.value?.cannotEscape).toBe(false);

    battleStore.state = mockCtx.activeBattle!.value;
    expect(battleStore.uiConfig.allowFlee).toBe(true);
    expect(battleStore.uiConfig.allowCatch).toBe(true);
  });

  it('restores cannotEscape as false for ongoing wild combat with turnCount > 0', async () => {
    const battleStore = useBattleStore();

    const mockPlayer = { uid: 'p1', id: 'gengar', hp: 34, maxHp: 162, moves: [] } as unknown as Pokemon;
    const mockEnemy = { uid: 'pidgeotto-1', id: 'pidgeotto', hp: 15, maxHp: 15, moves: [] } as unknown as Pokemon;

    const staleSavedData = {
      locationId: 'route1',
      wasSearching: true,
      turnCount: 2,
      battleHistory: [{ turn: 1, action: 'attack' }],
      isTrainer: false,
      isGym: false,
      isPvP: false,
      isGuardian: false,
      cannotEscape: true, // Stale saved value
      enemy: mockEnemy,
      player: mockPlayer,
      playerTeam: [mockPlayer],
      enemyTeam: [mockEnemy]
    };

    const mockCtx: Partial<BattleContext> = {
      activeBattle: { value: null } as any,
      isProcessing: { value: false } as any,
      fsm: {
        transition: vi.fn().mockResolvedValue(undefined),
        currentSubState: { value: 'WAIT_INPUT' }
      } as any,
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE', ACTIVE_BATTLE: 'ACTIVE_BATTLE' } as any,
      BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT', FIRST_INTRO: 'FIRST_INTRO' } as any,
      gs: {
        state: { team: [mockPlayer], activeBattle: null },
        registerPokedex: vi.fn(),
        save: vi.fn()
      } as any,
      addLog: vi.fn(),
      playerStages: { value: {} } as any,
      enemyStages: { value: {} } as any,
      battleLogs: { value: [] } as any,
      isIntroAnimating: { value: false } as any,
      attackerSide: { value: null } as any,
      activeMove: { value: null } as any,
      persistBattle: vi.fn()
    };

    await restoreBattleState(mockCtx as BattleContext, staleSavedData);

    expect(mockCtx.activeBattle?.value).toBeDefined();
    expect(mockCtx.activeBattle?.value?.cannotEscape).toBe(false);

    battleStore.state = mockCtx.activeBattle!.value;
    expect(battleStore.uiConfig.allowFlee).toBe(true);
  });

  it('keeps allowFlee as false strictly for trainer, gym, and pvp battles', () => {
    const battleStore = useBattleStore();

    // Wild battle
    battleStore.state = { isTrainer: false, isGym: false, isPvP: false, isGuardian: false } as any;
    expect(battleStore.uiConfig.allowFlee).toBe(true);

    // Trainer battle
    battleStore.state = { isTrainer: true, isGym: false, isPvP: false } as any;
    expect(battleStore.uiConfig.allowFlee).toBe(false);

    // Gym battle
    battleStore.state = { isTrainer: false, isGym: true, isPvP: false } as any;
    expect(battleStore.uiConfig.allowFlee).toBe(false);

    // PvP battle
    battleStore.state = { isTrainer: false, isGym: false, isPvP: true } as any;
    expect(battleStore.uiConfig.allowFlee).toBe(false);

    // Guardian battle
    battleStore.state = { isTrainer: false, isGym: false, isPvP: false, isGuardian: true } as any;
    expect(battleStore.uiConfig.allowFlee).toBe(false);
  });
});
