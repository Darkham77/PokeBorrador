import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvp';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import type { DBRouter } from '@/logic/db/dbRouter';

describe('PvP Login Reminder Reload Reproduction', () => {
  let mockDb: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'passive_teams') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: false } })
              }))
            }))
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { elo_rating: 1200 } }),
                maybeSingle: vi.fn().mockResolvedValue({ data: { username: 'RivalTest' } })
              }))
            }))
          };
        }
        if (table === 'ranked_rules_config') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null })
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [] })
              }))
            }))
          }))
        };
      })
    };

    const authStore = useAuthStore();
    authStore.user = {
      id: 'test-user-reminder',
      email: 'test@example.com',
      user_metadata: { username: 'TestUserReminder' }
    } as any;

    const gameStore = useGameStore();
    gameStore.db = mockDb as unknown as DBRouter;
    Object.assign(gameStore.state, {
      starterChosen: true,
      team: [],
      pvpTeam6: []
    });

    sessionStorage.clear();
  });

  it('consumes pending login reminder even if loadPvPData was already loaded (cached call)', async () => {
    const pvp = usePvPStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    // 1. First initial load
    await pvp.loadPvPData();
    expect(pvp.passiveTeamActive).toBe(false);

    // 2. Set pending login reminder flag in sessionStorage
    sessionStorage.setItem('pvp_login_reminder_pending', 'true');

    // 3. Call loadPvPData again without force (cached call)
    await pvp.loadPvPData();

    // 4. Assert reminder was dispatched and sessionStorage flag was consumed
    expect(notifySpy).toHaveBeenCalledWith(
      'Recuerda activar tu Defensa Pasiva en el Home para proteger tu ELO.',
      '🛡️'
    );
    expect(sessionStorage.getItem('pvp_login_reminder_pending')).toBeNull();
  });
});
