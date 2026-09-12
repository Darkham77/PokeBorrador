import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvp';
import { useAuthStore } from '@/stores/auth';
import { saveCoordinator } from '@/logic/auth/saveCoordinator';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Passive Defense Logout & Rollback Prevention Suite', () => {
  const createTestPokemon = (uid: string, name: string, level = 50): Pokemon => ({
    uid,
    id: 'pikachu',
    name,
    level,
    hp: 100,
    maxHp: 100,
    moves: ['thunderbolt'],
    ability: 'static',
    stats: { hp: 100, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
    isIllegal: false
  } as unknown as Pokemon);

  let mockDb: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    saveCoordinator.reset();

    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'passive_teams') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } })
              }))
            })),
            upsert: mockUpsert,
            update: mockUpdate
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { elo_rating: 1200 } }),
                maybeSingle: vi.fn().mockResolvedValue({ data: { username: 'angianemar' } })
              }))
            }))
          };
        }
        if (table === 'ranked_rules_config') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    config: {
                      name: 'Temporada Actual',
                      levelCap: 50,
                      maxPokemon: 6,
                      bannedPokemonIds: []
                    }
                  }
                })
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [] })
              })),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              single: vi.fn().mockResolvedValue({ data: null })
            }))
          }))
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: { success: true, last_save_id: 'save-123' }, error: null })
    };
  });

  it('verifies that gameStore provides setRankedTeam which updates pvpTeam6 and schedules a save', () => {
    const gameStore = useGameStore();
    const p1 = createTestPokemon('p-1', 'Pikachu');
    const p2 = createTestPokemon('p-2', 'Raichu');
    gameStore.state.box = [p1, p2];

    expect(typeof gameStore.setRankedTeam).toBe('function');
    gameStore.setRankedTeam('pvp6', ['p-1', 'p-2']);

    expect(gameStore.state.pvpTeam6).toEqual(['p-1', 'p-2']);
    expect(saveCoordinator.hasPendingLocalSave()).toBe(true);
  });

  it('verifies that togglePassiveTeam synchronizes gameStore.state.passiveTeamActive and schedules save', async () => {
    const gameStore = useGameStore();
    const pvpStore = usePvPStore();
    const authStore = useAuthStore();

    authStore.user = { id: 'local_angianemar', email: 'angianemar@local', db_version: 3 } as unknown as typeof authStore.user;
    (gameStore as unknown as { db: typeof mockDb }).db = mockDb;

    const pokes = [
      createTestPokemon('p-1', 'Pikachu'),
      createTestPokemon('p-2', 'Raichu'),
      createTestPokemon('p-3', 'Snorlax'),
      createTestPokemon('p-4', 'Gengar'),
      createTestPokemon('p-5', 'Charizard'),
      createTestPokemon('p-6', 'Blastoise')
    ];
    gameStore.state.team = pokes;
    gameStore.state.pvpTeam6 = pokes.map(p => p.uid);

    expect(gameStore.state.passiveTeamActive).toBe(false);
    expect(pvpStore.passiveTeamActive).toBe(false);

    await pvpStore.togglePassiveTeam();

    expect(pvpStore.passiveTeamActive).toBe(true);
    expect(gameStore.state.passiveTeamActive).toBe(true);
    expect(saveCoordinator.hasPendingLocalSave()).toBe(true);
  });

  it('verifies that authStore.logout executes save with forceRemote: true to prevent 60s throttle rollback', async () => {
    const gameStore = useGameStore();
    const authStore = useAuthStore();

    authStore.user = { id: 'local_angianemar', email: 'angianemar@local', db_version: 3 } as unknown as typeof authStore.user;
    gameStore.isDataLoaded = true;
    gameStore.isEngineReady = true;
    const saveSpy = vi.spyOn(gameStore, 'save').mockResolvedValue({ success: true });

    // Simulate logout
    await authStore.logout(true, false);

    expect(saveSpy).toHaveBeenCalledWith(false, true, true);
  });

  it('verifies that loadPvPData preserves passiveTeamActive when pvpTeam6 is persisted with eligible mons', async () => {
    const gameStore = useGameStore();
    const pvpStore = usePvPStore();
    const authStore = useAuthStore();

    authStore.user = { id: 'local_angianemar', email: 'angianemar@local', db_version: 3 } as unknown as typeof authStore.user;
    (gameStore as unknown as { db: typeof mockDb }).db = mockDb;

    // Adventure team contains an over-level mon (level 70) which would fail season rules if fallen back to!
    const adventureMon = createTestPokemon('adv-1', 'Gyarados', 70);
    gameStore.state.team = [adventureMon];

    // pvpTeam6 contains eligible level 50 Pokémon stored in box
    const eligibleDefenseMons = [
      createTestPokemon('p-1', 'Pikachu', 50),
      createTestPokemon('p-2', 'Raichu', 50),
      createTestPokemon('p-3', 'Snorlax', 50),
      createTestPokemon('p-4', 'Gengar', 50),
      createTestPokemon('p-5', 'Charizard', 50),
      createTestPokemon('p-6', 'Blastoise', 50)
    ];
    gameStore.state.box = eligibleDefenseMons;
    gameStore.state.pvpTeam6 = eligibleDefenseMons.map(p => p.uid);

    await pvpStore.loadPvPData();

    // Defense must remain active because pvpTeam6 is preserved!
    expect(pvpStore.passiveTeamActive).toBe(true);
    expect(gameStore.state.passiveTeamActive).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
