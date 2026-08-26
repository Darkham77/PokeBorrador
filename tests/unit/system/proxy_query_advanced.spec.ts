import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DBRouter, checkAppVersionCompatibility } from '@/logic/db/dbRouter.ts';
import { ProxyQuery } from '@/logic/db/proxyQuery';
import { queryLocal } from '@/logic/db/sqliteEngine';

declare const __APP_VERSION__: string;

vi.mock('@/logic/db/sqliteEngine', () => ({
  initSQLite: vi.fn(async () => ({
    run: vi.fn(),
    exec: vi.fn(() => []),
    prepare: vi.fn(() => ({
      bind: vi.fn(),
      step: vi.fn(() => false),
      getAsObject: vi.fn(() => ({})),
      free: vi.fn()
    }))
  })),
  persistSQLite: vi.fn(async () => {}),
  queryLocal: vi.fn(async () => [])
}));

describe('ProxyQuery & DBRouter Advanced Features', () => {
  let router: DBRouter;

  beforeEach(() => {
    router = new DBRouter(undefined, 'offline', { inMemory: true });
    vi.clearAllMocks();
  });

  it('should build correct chain for match, ilike, and complex or', () => {
    const query = new ProxyQuery(router, 'profiles')
      .match({ status: 'active', rank: 1 })
      .ilike('username', '%test%')
      .or('and(type.eq.admin,level.eq.10),and(type.eq.mod,level.eq.5)');

    expect(query.chain).toHaveLength(3);
    expect(query.chain[0]?.type).toBe('match');
    expect(query.chain[1]?.type).toBe('ilike');
    expect(query.chain[2]?.type).toBe('or');
  });

  it('should auto-parse JSON fields in executeLocal', async () => {
    const mockRows = [
      { id: '1', save_data: '{"trainerLevel": 5}', team_data: '[{"name":"Pikachu"}]', data: '{"active":true}' }
    ];
    vi.mocked(queryLocal).mockResolvedValueOnce(mockRows);

    const query = new ProxyQuery(router, 'game_saves').select('*');
    const res = await query.executeLocal();

    expect(res.error).toBeNull();
    const firstRow = (res.data as Record<string, unknown>[])[0];
    expect(firstRow?.save_data).toEqual({ trainerLevel: 5 });
    expect(firstRow?.team_data).toEqual([{ name: 'Pikachu' }]);
    expect(firstRow?.data).toEqual({ active: true });
  });

  it('should emulate change_username RPC correctly', async () => {
    // Mock current profile
    vi.mocked(queryLocal).mockResolvedValueOnce([{ username: 'OldName', last_renamed_at: null }]);

    const res = await router.rpc('change_username', { new_username: 'NewTrainer' });
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ success: true });
  });

  it('should fail change_username RPC if username is too short', async () => {
    const res = await router.rpc('change_username', { new_username: 'ab' });
    expect(res.error).toBeDefined();
    expect(res.data).toBeNull();
  });

  it('should emulate save_game_trusted RPC correctly', async () => {
    vi.mocked(queryLocal).mockResolvedValueOnce([{ last_save_id: 'old_save_123' }]);

    const res = await router.rpc('save_game_trusted', {
      p_save_data: { trainerLevel: 10 },
      p_expected_id: 'old_save_123'
    });

    expect(res.error).toBeNull();
    expect((res.data as { success: boolean }).success).toBe(true);
  });

  it('should emulate publish_listing_v2 RPC correctly', async () => {
    const validPoke = { id: 'pikachu', uid: 'pk_123', name: 'Pikachu', level: 5, ability: 'static', nature: 'hardy', moves: [{ id: 'thundershock', name: 'Thunder Shock' }] };
    const mockSave = {
      box: [validPoke],
      team: []
    };
    vi.mocked(queryLocal)
      .mockResolvedValueOnce([]) // 0 active listings
      .mockResolvedValueOnce([{ save_data: JSON.stringify(mockSave) }]);

    const res = await router.rpc('publish_listing_v2', {
      p_listing_type: 'pokemon',
      p_asset_data: validPoke,
      p_price: 500
    });

    expect(res.error).toBeNull();
    expect(typeof res.data).toBe('string');
    expect((res.data as string).startsWith('list_')).toBe(true);
  });

  it('should emulate buy_listing_v2 RPC correctly', async () => {
    const mockListing = [{
      id: 'list_123',
      seller_id: 'other_user',
      listing_type: 'pokemon',
      price: 200,
      status: 'active',
      data: JSON.stringify({ id: 'pikachu', uid: 'pk_123', name: 'Pikachu', level: 5, ability: 'static', nature: 'hardy', moves: [{ id: 'thundershock', name: 'Thunder Shock' }] })
    }];
    const mockBuyerSave = { money: 1000 };

    vi.mocked(queryLocal)
      .mockResolvedValueOnce(mockListing)
      .mockResolvedValueOnce([{ save_data: JSON.stringify(mockBuyerSave) }]);

    const res = await router.rpc('buy_listing_v2', { p_listing_id: 'list_123' });
    expect(res.error).toBeNull();
    expect((res.data as { money: number }).money).toBe(800);
  });

  it('should verify checkAppVersionCompatibility offline fallback with older client', async () => {
    const serverVer = 'v2027.01.01.0000'; // definitely newer
    vi.mocked(queryLocal).mockResolvedValueOnce([{ value: JSON.stringify({ app_version: serverVer }) }]);
    const res = await checkAppVersionCompatibility(router);
    expect(res.compatible).toBe(false);
    expect(res.error).toBe('OUTDATED_CLIENT');
  });

  it('should verify checkAppVersionCompatibility matching versions', async () => {
    const clientVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v0.5.0';
    vi.mocked(queryLocal).mockResolvedValueOnce([{ value: JSON.stringify({ app_version: clientVer }) }]);
    const res = await checkAppVersionCompatibility(router);
    expect(res.compatible).toBe(true);
    expect(res.client).toBe(clientVer);
    expect(res.server).toBe(clientVer);
  });
});
