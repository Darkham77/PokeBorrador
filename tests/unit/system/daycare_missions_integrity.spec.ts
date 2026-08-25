import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDaycareMissionsStore } from '@/stores/daycareMissions';
import { useGameStore } from '@/stores/game';
import { logger } from '@/logic/utils/logger';
import { INITIAL_STATE } from '@/stores/gameInitialState';
import type { DaycareMission } from '@/types/breeding/breeding';

describe('Daycare Missions Integrity & Self-Repair', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const gameStore = useGameStore();
    gameStore.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    gameStore.state.trainerLevel = 25;
  });

  it('should preserve valid missions', () => {
    const gameStore = useGameStore();
    const missionsStore = useDaycareMissionsStore();

    const validMission: DaycareMission = {
      date: '2026-08-24',
      targetId: 'pikachu',
      requirement: { type: 'level', minLevel: 10 },
      reqText: 'Nv. 10+',
      reward: { id: 'berrybronze', name: 'Baya de Bronce', qty: 2, icon: '🥉' },
      completed: false,
      trainerType: 'caza_bichos',
      trainerName: 'Cazabichos Juan',
      trainerSprite: 'bugcatcher',
      dialogue: '¡Busco un Pikachu!'
    };

    gameStore.state.daycare_missions = [validMission];

    const missions = missionsStore.dailyMissions;
    expect(missions).toHaveLength(1);
    expect(missions[0]?.targetId).toBe('pikachu');
    expect(missions[0]?.trainerSprite).toBe('bugcatcher');
  });

  it('should detect corrupted mission (missing trainerSprite) and auto-repair by regenerating', () => {
    const gameStore = useGameStore();
    const missionsStore = useDaycareMissionsStore();
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    // Corrupted mission from older save format (missing trainerSprite)
    const corruptedMission = {
      date: '2026-08-24',
      targetId: 'pidgey',
      requirement: { type: 'level', minLevel: 15 },
      reqText: 'Nv. 15+',
      reward: { id: 'berrysilver', name: 'Baya de Plata', qty: 2, icon: '🥈' },
      completed: false,
      trainerType: 'cientifico',
      trainerName: 'Científico'
      // trainerSprite is missing!
    } as unknown as DaycareMission;

    gameStore.state.daycare_missions = [corruptedMission];

    // Accessing dailyMissions should trigger auto-repair
    const missions = missionsStore.dailyMissions;

    expect(loggerSpy).toHaveBeenCalledWith(
      'daycareMissions',
      expect.stringContaining('Corrupted daycare mission detected')
    );
    expect(missions).toHaveLength(2);
    expect(missions[0]?.trainerSprite).toBeTruthy();
    expect(missions[1]?.trainerSprite).toBeTruthy();
    expect(missions[0]?.targetId).toBeTruthy();

    loggerSpy.mockRestore();
  });

  it('should regenerate missions on checkDailyReset when corrupted missions exist', () => {
    const gameStore = useGameStore();
    const missionsStore = useDaycareMissionsStore();
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    gameStore.state.daycare_missions = [{
      date: Temporal.Now.plainDateISO().toString(),
      targetId: 'caterpie'
      // Missing all other required fields
    } as unknown as DaycareMission];

    missionsStore.checkDailyReset();

    expect(gameStore.state.daycare_missions).toHaveLength(2);
    expect(gameStore.state.daycare_missions[0]?.trainerSprite).toBeTruthy();

    loggerSpy.mockRestore();
  });
});
