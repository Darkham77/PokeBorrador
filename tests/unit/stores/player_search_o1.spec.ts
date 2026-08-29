import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlayerSearchStore } from '@/stores/player/playerSearch';
import { useLeaderboardStore } from '@/stores/leaderboard';
import { useEventStore } from '@/stores/events';

describe('Player Search and Leaderboard O(1) Indexing', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('usePlayerSearchStore', () => {
    it('should initialize with empty search results and not loading', () => {
      const searchStore = usePlayerSearchStore();
      expect(searchStore.searchResults).toEqual([]);
      expect(searchStore.searchLoading).toBe(false);
    });

    it('should clear search results when search query is empty', async () => {
      const searchStore = usePlayerSearchStore();
      await searchStore.searchPlayers('   ');
      expect(searchStore.searchResults).toEqual([]);
    });
  });

  describe('useLeaderboardStore', () => {
    it('should initialize with empty leaderboard and not loading', () => {
      const leaderboardStore = useLeaderboardStore();
      expect(leaderboardStore.leaderboard).toEqual([]);
      expect(leaderboardStore.leaderboardLoading).toBe(false);
    });
  });

  describe('useEventStore - O(1) Active Set', () => {
    it('should provide activeEventIdsSet for O(1) membership checks', () => {
      const eventStore = useEventStore();
      expect(eventStore.activeEventIdsSet).toBeDefined();
      expect(eventStore.activeEventIdsSet.size).toBe(0);
      expect(eventStore.isEventActive('non_existent')).toBe(false);
    });
  });
});
