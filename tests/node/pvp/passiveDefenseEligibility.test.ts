import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvp';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { DBRouter } from '@/logic/db/dbRouter';
import {
  resolveDefendingTeam,
  createPassiveTeamSnapshot
} from '@/logic/pvp/pvpTeamHelper';
import { executePassiveMatchmakingFallback } from '@/logic/pvp/passiveMatchmakingHelper';

describe('Passive Defense Eligibility & Matchmaking', () => {
  let mockDb: {
    from: ReturnType<typeof vi.fn>;
  };
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());

    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'passive_teams') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: unknown) => {
                if (col === 'is_active' && val === true) {
                  return Promise.resolve({ data: [] });
                }
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: false } })
                };
              })
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
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { username: 'TestUser' }
    } as any;

    const gameStore = useGameStore();
    gameStore.db = mockDb as unknown as DBRouter;
    Object.assign(gameStore.state, {
      starterChosen: true,
      team: [],
      box: [],
      pvpTeam: [],
      pvpTeam6: []
    });
    gameStore.save = vi.fn().mockResolvedValue(undefined);

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  const createPoke = (id: string, species: string, level: number, type: string = 'electric'): Pokemon => {
    return {
      uid: id,
      id: species,
      species,
      name: species.toUpperCase(),
      level,
      hp: 100,
      maxHp: 100,
      atk: 50,
      def: 50,
      spa: 50,
      spd: 50,
      spe: 50,
      type,
      moves: [{ name: 'Thunderbolt', maxPP: 15 }],
      isIllegal: false,
      isShiny: false
    } as unknown as Pokemon;
  };

  it('resolves defending team prioritizing pvpTeam6 with fallback to team', () => {
    const p1 = createPoke('u1', 'pikachu', 50);
    const p2 = createPoke('u2', 'raichu', 50);
    const p3 = createPoke('u3', 'jolteon', 50);

    const teamResultFallback = resolveDefendingTeam({
      team: [p1, p2],
      box: [p3],
      pvpTeam6: []
    });
    expect(teamResultFallback).toHaveLength(2);
    expect(teamResultFallback[0]?.uid).toBe('u1');

    const teamResultExplicit = resolveDefendingTeam({
      team: [p1],
      box: [p2, p3],
      pvpTeam6: ['u3', 'u2']
    });
    expect(teamResultExplicit).toHaveLength(2);
    expect(teamResultExplicit[0]?.uid).toBe('u3');
    expect(teamResultExplicit[1]?.uid).toBe('u2');
  });

  it('serializes a snapshot correctly with createPassiveTeamSnapshot', () => {
    const p1 = createPoke('u1', 'pikachu', 50);
    const jsonStr = createPassiveTeamSnapshot([p1]);
    const parsed = JSON.parse(jsonStr);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('pikachu');
    expect(parsed[0].level).toBe(50);
    expect(parsed[0].moves[0].name).toBe('Thunderbolt');
  });

  it('prevents activating passive defense if team contains ineligible Pokémon for the season', async () => {
    const pvp = usePvPStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    pvp.currentSeasonRules = {
      name: 'Little Cup Season',
      levelCap: 5,
      maxPokemon: 6,
      bannedPokemonIds: ['mewtwo'] as any
    };

    // Pokémon with level 50 exceeds levelCap 5
    const overLevelMon = createPoke('u1', 'pikachu', 50);
    gameStore.state.team = [overLevelMon];
    gameStore.state.pvpTeam6 = ['u1'];

    await pvp.togglePassiveTeam();

    expect(pvp.passiveTeamActive).toBe(false);
    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('No puedes activar la Defensa Pasiva'),
      '⚠️'
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('allows activating passive defense if all Pokémon meet season criteria', async () => {
    const pvp = usePvPStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    pvp.currentSeasonRules = {
      name: 'Open Flat 50',
      levelCap: 50,
      maxPokemon: 6
    };

    const legalMon = createPoke('u1', 'pikachu', 50);
    gameStore.state.team = [legalMon];
    gameStore.state.pvpTeam6 = ['u1'];

    await pvp.togglePassiveTeam();

    expect(pvp.passiveTeamActive).toBe(true);
    expect(notifySpy).toHaveBeenCalledWith('Equipo de Defensa Pasiva activado.', '🛡️');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true
      })
    );
  });

  it('auto-deactivates passive defense if an invalid Pokémon is detected during loadPvPData', async () => {
    const pvp = usePvPStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    pvp.passiveTeamActive = true;
    pvp.currentSeasonRules = {
      name: 'Little Cup',
      levelCap: 5,
      maxPokemon: 6
    };

    const invalidMon = createPoke('u1', 'pikachu', 50);
    gameStore.state.team = [invalidMon];
    gameStore.state.pvpTeam6 = ['u1'];

    // Mock DB returning passive defense as currently active
    mockDb.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } }),
          single: vi.fn().mockResolvedValue({ data: { elo_rating: 1200 } }),
          order: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }))
        }))
      })),
      update: mockUpdate
    })) as any;

    await pvp.loadPvPData();

    expect(pvp.passiveTeamActive).toBe(false);
    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('Defensa Pasiva desactivada'),
      '⚠️'
    );
  });

  it('triggers login reminder toast when passive defense is disabled and pending flag is present', async () => {
    const pvp = usePvPStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    sessionStorage.setItem('pvp_login_reminder_pending', 'true');

    await pvp.loadPvPData();

    expect(notifySpy).toHaveBeenCalledWith(
      'Recuerda activar tu Defensa Pasiva en el Home para proteger tu ELO.',
      '🛡️'
    );
    expect(sessionStorage.getItem('pvp_login_reminder_pending')).toBeNull();
  });

  it('discards and deactivates candidates in executePassiveMatchmakingFallback if they violate active season rules', async () => {
    const notifyFn = vi.fn();
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const activeRules = {
      levelCap: 50,
      bannedPokemonIds: ['mewtwo']
    };

    // Candidate 1: Has level 100 (violates cap 50)
    const invalidCandidate = {
      user_id: 'candidate-invalid',
      elo_rating: 1200,
      team_data: JSON.stringify([createPoke('u1', 'mewtwo', 100)])
    };

    // Candidate 2: 100% legal
    const validCandidate = {
      user_id: 'candidate-valid',
      elo_rating: 1210,
      team_data: JSON.stringify([createPoke('u2', 'pikachu', 50)])
    };

    const candidateDb = {
      from: vi.fn((table: string) => {
        if (table === 'passive_teams') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [invalidCandidate, validCandidate]
              })
            })),
            update: updateSpy
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { username: 'ValidDefender' } })
              }))
            }))
          };
        }
        return {};
      })
    } as unknown as DBRouter;

    const result = await executePassiveMatchmakingFallback({
      db: candidateDb,
      userUid: 'my-user-id',
      myElo: 1200,
      seasonRules: activeRules as any,
      notify: notifyFn
    });

    expect(result).not.toBeNull();
    expect(result?.opponentId).toBe('candidate-valid');
    // Verify that the invalid candidate was automatically set to is_active = false in the DB
    expect(updateSpy).toHaveBeenCalledWith({ is_active: false });
  });
});
