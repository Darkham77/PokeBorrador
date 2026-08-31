// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { handlePoliceResolution } from '@/logic/battle/helpers/battleResolutionHelpers';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useBattleStore } from '@/stores/battle/battle';
import type { BattleState } from '@/types/battle/battle';

describe('policeResolution - handlePoliceResolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createBaseBattleState = (trainerName: string, trainerArchetype: BattleState['trainerArchetype']): BattleState => ({
    player: null,
    enemy: null,
    playerTeamIndex: 0,
    enemyTeamIndex: 0,
    participants: [],
    locationId: 'route1',
    isTrainer: true,
    trainerName,
    trainerArchetype,
    weather: { type: 'clear', turns: -1 },
    turnCount: 1,
    over: false,
    escapeAttempts: 0,
    enemyTeam: []
  });

  it('debe resetear la criminalidad a 0 tras la victoria contra un policía con nombre dinámico (e.g. "Oficial de Policía Roberto")', async () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const battleStore = useBattleStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    gameStore.state.playerClass = 'rocket';
    gameStore.state.classLevel = 5;
    gameStore.state.classData.criminality = 150;
    gameStore.state.money = 50000;

    const activeBattle = createBaseBattleState('Oficial de Policía Roberto', 'policeman');
    const ctx = battleStore.getContext();

    await handlePoliceResolution(ctx, activeBattle, true, false, uiStore);

    expect(gameStore.state.classData.criminality).toBe(0);
    expect(notifySpy).toHaveBeenCalledWith('Tu nivel de criminalidad ha vuelto a cero.', '🚔');
  });

  it('debe cobrar la fianza correctamente y resetear la criminalidad a 0 en caso de derrota', async () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const battleStore = useBattleStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    // classLevel = 5, criminality = 150 -> bail = floor(5^2 * 80 * (150 / 100)) = floor(25 * 80 * 1.5) = 3000
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classLevel = 5;
    gameStore.state.classData.criminality = 150;
    gameStore.state.money = 10000;

    const activeBattle = createBaseBattleState('Oficial de Policía Pedro', 'policeman');
    const ctx = battleStore.getContext();

    await handlePoliceResolution(ctx, activeBattle, false, false, uiStore);

    expect(gameStore.state.money).toBe(7000); // 10000 - 3000
    expect(gameStore.state.classData.criminality).toBe(0);
    expect(notifySpy).toHaveBeenCalledWith('Fianza pagada: ₽3000', '🚨');
    expect(notifySpy).toHaveBeenCalledWith('Tu nivel de criminalidad ha vuelto a cero.', '🚔');
  });

  it('no debe alterar la criminalidad ni cobrar fianza si el oponente no es policía (e.g. trainerArchetype = "default")', async () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const battleStore = useBattleStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    gameStore.state.playerClass = 'rocket';
    gameStore.state.classLevel = 5;
    gameStore.state.classData.criminality = 150;
    gameStore.state.money = 50000;

    const activeBattle = createBaseBattleState('Joven Carlos', 'default');
    const ctx = battleStore.getContext();

    await handlePoliceResolution(ctx, activeBattle, false, false, uiStore);

    expect(gameStore.state.money).toBe(50000); // No cobró fianza
    expect(gameStore.state.classData.criminality).toBe(150); // No reseteó criminalidad
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
