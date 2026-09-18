/**
 * src/loaders/socialDataLoader.ts
 *
 * Declarative Vue Router 5 Data Loader for Social Module.
 * Leverages `defineBasicLoader` from `vue-router/experimental` to preload
 * friends and presence asynchronously on navigation.
 */

import { defineBasicLoader } from 'vue-router/experimental';
import { useSocialStore } from '@/stores/social/social';

interface SocialLoaderData {
  readonly friendsCount: number;
  readonly incomingRequestsCount: number;
  readonly loadedAt: number;
}

export const useSocialDataLoader = defineBasicLoader('/social', async (): Promise<SocialLoaderData> => {
  const socialStore = useSocialStore();
  await Promise.all([
    socialStore.loadSocialData(),
    socialStore.refreshFriendsPresence()
  ]);

  return {
    friendsCount: socialStore.friends.length,
    incomingRequestsCount: socialStore.pendingRequests.length,
    loadedAt: Temporal.Now.instant().epochMilliseconds
  };
});
