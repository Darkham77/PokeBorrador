/**
 * tests/unit/views/test_login_handlers.spec.ts
 *
 * Unit tests for useLoginHandlers composable.
 */

import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useLoginHandlers } from '@/views/auth/useLoginHandlers';

describe('useLoginHandlers', () => {
  it('validates required fields before calling login', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthStore = {
      isOnline: true,
      login: loginMock,
      signup: vi.fn(),
      localLogin: vi.fn(),
    } as any;

    const routerMock = { replace: vi.fn() } as any;
    const email = ref('');
    const password = ref('');
    const username = ref('');
    const gender = ref<'h' | 'm'>('h');
    const selectedServerId = ref('server-1');
    const serverStatus = ref<'checking' | 'online' | 'offline'>('online');
    const serverStatusDetail = ref('');
    const error = ref<string | null>(null);
    const success = ref<string | null>(null);
    const loading = ref(false);
    const authTab = ref('login');
    const getFriendlyErrorMessage = vi.fn((err: unknown) => String(err));

    const handlers = useLoginHandlers({
      authStore: mockAuthStore,
      router: routerMock,
      email,
      password,
      username,
      gender,
      selectedServerId,
      serverStatus,
      serverStatusDetail,
      error,
      success,
      loading,
      authTab,
      getFriendlyErrorMessage,
    });

    await handlers.handleLogin();
    expect(loginMock).not.toHaveBeenCalled();
    expect(error.value).toBeTruthy();

    email.value = 'valid@example.com';
    password.value = 'validpassword123';
    await handlers.handleLogin();
    expect(loginMock).toHaveBeenCalledWith('valid@example.com', 'validpassword123');
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });

  it('validates username for local login', async () => {
    const localLoginMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthStore = {
      isOnline: false,
      login: vi.fn(),
      signup: vi.fn(),
      localLogin: localLoginMock,
    } as any;

    const routerMock = { replace: vi.fn() } as any;
    const email = ref('');
    const password = ref('');
    const username = ref('Ash');
    const gender = ref<'h' | 'm'>('h');
    const selectedServerId = ref('');
    const serverStatus = ref<'checking' | 'online' | 'offline'>('offline');
    const serverStatusDetail = ref('');
    const error = ref<string | null>(null);
    const success = ref<string | null>(null);
    const loading = ref(false);
    const authTab = ref('local');
    const getFriendlyErrorMessage = vi.fn();

    const handlers = useLoginHandlers({
      authStore: mockAuthStore,
      router: routerMock,
      email,
      password,
      username,
      gender,
      selectedServerId,
      serverStatus,
      serverStatusDetail,
      error,
      success,
      loading,
      authTab,
      getFriendlyErrorMessage,
    });

    await handlers.handleLocalLogin();
    expect(localLoginMock).toHaveBeenCalledWith('Ash');
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });
});
