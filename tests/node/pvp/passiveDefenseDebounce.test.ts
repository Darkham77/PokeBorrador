import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvp';
import { useAuthStore } from '@/stores/auth';
import type { DBRouter } from '@/logic/db/dbRouter';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService';

describe('PvP Passive Defense Debounce & Coalescing Suite', () => {
  let mockDb: {
    from: ReturnType<typeof vi.fn>;
  };
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());

    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'passive_teams') {
          return {
            upsert: mockUpsert,
            update: mockUpdate
          };
        }
        return {};
      })
    };

    const gameStore = useGameStore();
    gameStore.db = mockDb as unknown as DBRouter;

    const authStore = useAuthStore();
    authStore.user = {
      id: 'test_user_debounce',
      role: 'user',
      email: 'test@example.com',
      user_metadata: { username: 'DebounceUser' }
    };

    // Setup valid team of 3
    const mon1 = pokemonDebugService.generate({ id: 'pikachu', level: 50 });
    mon1.uid = 'uid_pikachu_1';
    const mon2 = pokemonDebugService.generate({ id: 'charizard', level: 50 });
    mon2.uid = 'uid_charizard_2';
    const mon3 = pokemonDebugService.generate({ id: 'blastoise', level: 50 });
    mon3.uid = 'uid_blastoise_3';

    gameStore.state.team = [mon1, mon2, mon3];
    gameStore.state.pvpTeam6 = [mon1.uid, mon2.uid, mon3.uid];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid defense snapshot sync calls into a single database upsert', async () => {
    const pvp = usePvPStore();
    pvp.passiveTeamActive = true;

    // Trigger 5 rapid snapshot sync schedules within 500ms
    pvp.scheduleDefenseSnapshotSync();
    vi.advanceTimersByTime(200);
    pvp.scheduleDefenseSnapshotSync();
    vi.advanceTimersByTime(200);
    pvp.scheduleDefenseSnapshotSync();
    vi.advanceTimersByTime(100);

    expect(mockUpsert).not.toHaveBeenCalled();

    // Advance 1500ms since last call
    vi.advanceTimersByTime(1500);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'test_user_debounce',
        is_active: true
      })
    );
  });

  it('immediately cancels pending snapshot sync when defense is deactivated', async () => {
    const pvp = usePvPStore();
    pvp.passiveTeamActive = true;

    // Schedule snapshot sync
    pvp.scheduleDefenseSnapshotSync();
    vi.advanceTimersByTime(500);

    expect(mockUpsert).not.toHaveBeenCalled();

    // Ineligible event or manual deactivation occurs:
    await pvp.deactivatePassiveDefense('Charizard superó el nivel máximo permitido');

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(pvp.passiveTeamActive).toBe(false);

    // Advancing timers past 1.5s should NOT trigger upsert!
    vi.advanceTimersByTime(2000);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('flushes pending snapshot sync immediately on flushPendingDefenseSnapshotSync()', async () => {
    const pvp = usePvPStore();
    pvp.passiveTeamActive = true;

    pvp.scheduleDefenseSnapshotSync();
    vi.advanceTimersByTime(300);

    expect(mockUpsert).not.toHaveBeenCalled();

    // Flush immediately (e.g. unmount / beforeunload)
    await pvp.flushPendingDefenseSnapshotSync();

    expect(mockUpsert).toHaveBeenCalledTimes(1);

    // Further timer advance should not execute it again
    vi.advanceTimersByTime(2000);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});
