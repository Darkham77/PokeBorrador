/**
 * tests/unit/system/proxy_query_online.spec.ts
 * Verifies that ProxyQuery preserves proper method binding ('this') on chained Postgrest calls in online mode.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { DBRouter } from '@/logic/db/dbRouter';

describe('ProxyQuery Online Mode Method Binding', () => {
  it('should correctly bind methods preserving class instance context', async () => {
    class FakePostgrestFilterBuilder {
      private state = { cloned: false, filters: [] as string[] };

      private cloneRequestState() {
        this.state.cloned = true;
        return this;
      }

      eq(col: string, val: unknown) {
        // Calling cloneRequestState requires 'this' to be defined
        this.cloneRequestState();
        this.state.filters.push(`${col}=${String(val)}`);
        return this;
      }

      async single() {
        this.cloneRequestState();
        return { data: { id: 'test_user', name: 'Ash' }, error: null };
      }

      then(onFulfilled?: (v: unknown) => unknown) {
        const res = { data: { success: true }, error: null };
        return Promise.resolve(onFulfilled ? onFulfilled(res) : res);
      }
    }

    class FakePostgrestQueryBuilder {
      update(_data: unknown) {
        return new FakePostgrestFilterBuilder();
      }
      select(_cols?: string) {
        return new FakePostgrestFilterBuilder();
      }
      upsert(_data: unknown, _opts?: unknown) {
        return Promise.resolve({ data: null, error: null });
      }
    }

    const mockSupabaseClient = {
      from: vi.fn(() => new FakePostgrestQueryBuilder())
    };

    const router = new DBRouter({
      url: 'https://test.supabase.co',
      key: 'test-key'
    });

    router.mode = 'online';
    vi.spyOn(router, 'realClient', 'get').mockReturnValue(mockSupabaseClient as unknown as ReturnType<typeof router._ensureClient>);

    // Test update chaining
    const updateRes = await router.from('profiles').update({ current_session_id: 'sess-123' }).eq('id', 'user-456');
    expect(updateRes).toEqual({ data: { success: true }, error: null });

    // Test select chaining with single()
    const selectRes = await router.from('profiles').select('id, name').eq('id', 'user-456').single();
    expect(selectRes).toEqual({ data: { id: 'test_user', name: 'Ash' }, error: null });
  });
});
