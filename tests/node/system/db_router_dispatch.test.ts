import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DBRouter } from '@/logic/db/dbRouter';

describe('DBRouter Dispatch and Isolation Suite (Tier 1)', () => {
  let router: DBRouter;

  beforeEach(() => {
    router = new DBRouter({ url: '', key: '' }, 'offline');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes in offline mode by default when requested', () => {
    expect(router.isLocal).toBe(true);
    expect(router.mode).toBe('offline');
    expect(router.realClient).toBeNull();
  });

  it('manages time offsets correctly', () => {
    expect(router.getTimeOffset()).toBe(0);

    router.setTimeOffset(5000);
    expect(router.getTimeOffset()).toBe(5000);

    router.resetTime();
    expect(router.getTimeOffset()).toBe(0);
  });

  it('parses valid ISO and timestamp formats in setMockTime', () => {
    router.setMockTime('2026-10-05T12:00:00Z');
    expect(typeof router.getTimeOffset()).toBe('number');

    router.setMockTime('1760000000000');
    expect(typeof router.getTimeOffset()).toBe('number');
  });

  it('throws on invalid mock time format', () => {
    expect(() => router.setMockTime('invalid-time-string')).toThrow();
  });

  it('throws error when online mode is accessed without URL or key', () => {
    const onlineRouter = new DBRouter({ url: '', key: '' }, 'online');
    expect(() => onlineRouter.realClient).toThrow(/Missing Supabase configuration/);
  });

  it('switches modes cleanly via setMode', () => {
    router.setMode('offline'); // no-op if same
    expect(router.mode).toBe('offline');

    router.setMode('online');
    expect(router.mode).toBe('online');
    expect(router.isLocal).toBe(false);
  });

  it('provides offline auth mock methods', async () => {
    const auth = router.auth;
    expect(auth).toBeDefined();

    const userRes = await auth.getUser();
    expect(userRes.data.user?.id).toBe('local_user');

    const sessionRes = await auth.getSession();
    expect(sessionRes.data.session?.user.id).toBe('local_user');

    const signoutRes = await auth.signOut();
    expect(signoutRes.error).toBeNull();
  });

  it('emulates offline RPC calls correctly', async () => {
    const res = await router.rpc('fn_get_server_time');
    expect(res).toBeDefined();
    expect(res.error).toBeNull();
  });

  it('creates query proxy from router.from()', () => {
    const query = router.from('profiles');
    expect(query).toBeDefined();
    expect(typeof query.select).toBe('function');
  });

  it('returns timestamp with offset in getServerTime when offline', async () => {
    router.resetTime();
    const t1 = await router.getServerTime();
    expect(typeof t1).toBe('number');
    expect(t1).toBeGreaterThan(0);

    router.setTimeOffset(10000);
    const t2 = await router.getServerTime();
    expect(t2).toBeGreaterThanOrEqual(t1 + 9900);
  });
});
