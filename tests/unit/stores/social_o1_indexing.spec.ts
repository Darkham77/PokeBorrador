import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSocialStore } from '@/stores/social/social';
import { useAuthStore } from '@/stores/auth';

describe('useSocialStore - O(1) Data Resolution and Indexing', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with empty friends and pending requests lists', () => {
    const socialStore = useSocialStore();
    expect(socialStore.friends).toEqual([]);
    expect(socialStore.pendingRequests).toEqual([]);
  });

  it('should resolve friends without errors when auth user is missing', async () => {
    const socialStore = useSocialStore();
    const authStore = useAuthStore();
    authStore.user = null;

    await socialStore.loadSocialData();
    expect(socialStore.friends).toEqual([]);
    expect(socialStore.pendingRequests).toEqual([]);
  });

  it('should expose notifications reactive counters correctly', () => {
    const socialStore = useSocialStore();
    expect(socialStore.notifications.friends).toBe(0);
    expect(socialStore.notifications.total).toBe(0);
  });
});
