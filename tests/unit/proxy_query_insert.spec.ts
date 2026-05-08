
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DBRouter } from '@/logic/db/dbRouter';
import { ProxyQuery } from '@/logic/db/proxyQuery';

// Mock sqliteEngine to avoid WASM initialization issues in unit tests
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

describe('ProxyQuery Insert', () => {
  let router;

  beforeEach(() => {
    router = new DBRouter(null, 'offline', { inMemory: true });
    vi.clearAllMocks();
  });

  it('should set action to insert and store data', () => {
    const table = 'test_table';
    const data = { id: 1, name: 'Test' };
    const query = new ProxyQuery(router, table).insert(data);

    expect(query.action).toBe('insert');
    expect(query.actionData).toEqual(data);
  });

  it('should call executeLocal when executing in offline mode', async () => {
    const table = 'test_table';
    const data = { id: 1, name: 'Test' };
    const query = new ProxyQuery(router, table).insert(data);
    
    const executeLocalSpy = vi.spyOn(query, 'executeLocal');
    await query.execute();
    
    expect(executeLocalSpy).toHaveBeenCalled();
  });
  
  it('should catch errors and return error object in executeLocal', async () => {
    const table = 'test_table';
    const data = { id: 1, name: 'Test' };
    const query = new ProxyQuery(router, table).insert(data);
    
    // Force an error in _executeLocalUpsert
    vi.spyOn(query, '_executeLocalUpsert').mockRejectedValueOnce(new Error('DB Error'));
    
    const result = await query.executeLocal();
    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});
