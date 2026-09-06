/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLivePvPStore } from '@/stores/livePvP';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { useModalStore } from '@/stores/modals';
import { ShowdownPerspectiveAdapter } from '@/logic/battle/helpers/showdownPerspectiveAdapter';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleInvite, PvpChallengeConfig } from '@/types/battle/pvp';

describe('PvP Invite Lifecycle & Safety Integration', () => {
  let dbInvites: Record<string, BattleInvite>;
  let dbSaves: Record<string, { updated_at: string }>;

  const createFakePoke = (uid: string, name: string): Pokemon => {
    return {
      uid,
      id: 25,
      name,
      level: 50,
      hp: 100,
      maxHp: 100,
      moves: ['thunderbolt'],
      stats: { hp: 100, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
      isIllegal: false
    } as unknown as Pokemon;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    dbInvites = {};
    dbSaves = {};

    const authStore = useAuthStore();
    authStore.user = { id: 'user-player-1', email: 'player1@pvp.com' } as unknown as typeof authStore.user;

    const gameStore = useGameStore();
    const advPoke = createFakePoke('adv-1', 'AdventureCharizard');
    const pvp1 = createFakePoke('pvp-1', 'PvpPikachu');
    const pvp2 = createFakePoke('pvp-2', 'PvpBulbasaur');
    const pvp3 = createFakePoke('pvp-3', 'PvpSquirtle');

    Object.assign(gameStore.state, {
      starterChosen: true,
      team: [advPoke],
      box: [pvp1, pvp2, pvp3],
      pvpTeam: ['pvp-1', 'pvp-2', 'pvp-3'],
      pvpTeam6: []
    });
    gameStore.save = vi.fn().mockResolvedValue(true);

    gameStore.db = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'battle_invites') {
          return {
            insert: vi.fn().mockImplementation((payload: Partial<BattleInvite>) => {
              const id = 'invite-' + Math.random().toString(36).substring(2, 9);
              const record: BattleInvite = {
                id,
                challenger_id: payload.challenger_id || payload.sender_id || '',
                sender_id: payload.sender_id || payload.challenger_id || '',
                opponent_id: payload.opponent_id || '',
                status: payload.status || 'pending',
                created_at: Temporal.Now.instant().toString(),
                config: payload.config
              };
              dbInvites[id] = record;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: record, error: null })
                })
              };
            }),
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'id') {
                  const record = dbInvites[val] || null;
                  return {
                    single: vi.fn().mockResolvedValue({ data: record, error: null })
                  };
                }
                return {
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: Object.values(dbInvites), error: null })
                    })
                  })
                };
              })
            })),
            update: vi.fn().mockImplementation((updates: Partial<BattleInvite>) => ({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'id' && dbInvites[val]) {
                  Object.assign(dbInvites[val], updates);
                }
                return Promise.resolve({ error: null });
              })
            }))
          };
        }

        if (table === 'game_saves') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'user_id') {
                  const save = dbSaves[val] || null;
                  return {
                    single: vi.fn().mockResolvedValue({ data: save, error: null })
                  };
                }
                return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
              })
            })
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        };
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
          cb('SUBSCRIBED');
          return this;
        }),
        send: vi.fn(),
        unsubscribe: vi.fn()
      })
    } as unknown as typeof gameStore.db;
  });

  it('should create an invite with custom PvP config and send it', async () => {
    const livePvPStore = useLivePvPStore();
    const config: PvpChallengeConfig = {
      format: '3v3',
      levelRule: 'real',
      arena: { gymId: 'celadon' }
    };

    await livePvPStore.sendInvite('user-opponent-2', 'OpponentName', config);

    const invites = Object.values(dbInvites);
    expect(invites).toHaveLength(1);
    const inv = invites[0];
    expect(inv?.opponent_id).toBe('user-opponent-2');
    expect(inv?.status).toBe('pending');
    expect(inv?.config?.format).toBe('3v3');
    expect(inv?.config?.arena.gymId).toBe('celadon');
  });

  it('Disconnection Guard: cancels invite and displays PvPOpponentOffline modal when challenger goes offline', async () => {
    const livePvPStore = useLivePvPStore();
    const modalStore = useModalStore();
    const openModalSpy = vi.spyOn(modalStore, 'open');

    // Setup an incoming invite from 'challenger-offline'
    const inviteId = 'inv-offline-1';
    dbInvites[inviteId] = {
      id: inviteId,
      sender_id: 'challenger-offline',
      challenger_id: 'challenger-offline',
      opponent_id: 'user-player-1',
      status: 'pending',
      created_at: Temporal.Now.instant().toString(),
      config: { format: '3v3', levelRule: 'real', arena: { gymId: 'celadon' } }
    };

    // Challenger was last seen 15 minutes ago (offline)
    const oldTimestamp = Temporal.Now.instant().subtract({ minutes: 15 }).toString();
    dbSaves['challenger-offline'] = { updated_at: oldTimestamp };

    await livePvPStore.acceptInvite(inviteId);

    expect(dbInvites[inviteId]?.status).toBe('cancelled_offline');
    expect(openModalSpy).toHaveBeenCalledWith('PvPOpponentOffline', expect.any(Object));
    expect(livePvPStore.activeInvite).toBeNull();
  });

  it('accepts invite when online, starts combat with dedicated PvP team without modifying adventure team', async () => {
    const livePvPStore = useLivePvPStore();
    const gameStore = useGameStore();

    const inviteId = 'inv-online-1';
    dbInvites[inviteId] = {
      id: inviteId,
      sender_id: 'challenger-online',
      challenger_id: 'challenger-online',
      opponent_id: 'user-player-1',
      status: 'pending',
      created_at: Temporal.Now.instant().toString(),
      config: { format: '3v3', levelRule: 'real', arena: { gymId: 'celadon' } }
    };

    // Challenger is online (updated 10 seconds ago)
    const freshTimestamp = Temporal.Now.instant().subtract({ seconds: 10 }).toString();
    dbSaves['challenger-online'] = { updated_at: freshTimestamp };

    await livePvPStore.acceptInvite(inviteId);

    expect(dbInvites[inviteId]?.status).toBe('accepted');
    expect(livePvPStore.battleState.active).toBe(true);
    expect(livePvPStore.battleState.myTeam).toHaveLength(3);
    expect(livePvPStore.battleState.myTeam[0]?.name).toBe('PvpPikachu');
    // Ensure adventure team is strictly intact
    expect(gameStore.state.team[0]?.name).toBe('AdventureCharizard');
  });

  it('declines invite properly', async () => {
    const livePvPStore = useLivePvPStore();

    const inviteId = 'inv-decline-1';
    dbInvites[inviteId] = {
      id: inviteId,
      sender_id: 'challenger-abc',
      challenger_id: 'challenger-abc',
      opponent_id: 'user-player-1',
      status: 'pending',
      created_at: Temporal.Now.instant().toString()
    };

    await livePvPStore.declineInvite(inviteId);

    expect(dbInvites[inviteId]?.status).toBe('declined');
    expect(livePvPStore.activeInvite).toBeNull();
  });

  it('inverts Showdown stream perspective for Guest client', () => {
    const stream = [
      '|switch|p1a: Pikachu|Pikachu, L50, M|100/100',
      '|switch|p2a: Gengar|Gengar, L50, F|100/100',
      '|move|p1a: Pikachu|Thunderbolt|p2a: Gengar',
      '|-damage|p2a: Gengar|45/100'
    ];

    const inverted = ShowdownPerspectiveAdapter.invertStream(stream);

    expect(inverted[0]).toBe('|switch|p2a: Pikachu|Pikachu, L50, M|100/100');
    expect(inverted[1]).toBe('|switch|p1a: Gengar|Gengar, L50, F|100/100');
    expect(inverted[2]).toBe('|move|p2a: Pikachu|Thunderbolt|p1a: Gengar');
    expect(inverted[3]).toBe('|-damage|p1a: Gengar|45/100');
  });
});
