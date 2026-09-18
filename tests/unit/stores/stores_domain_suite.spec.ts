/**
 * tests/unit/stores/stores_domain_suite.spec.ts
 *
 * Consolidated Domain Suite for Pinia Stores & State Management:
 * - Player search & leaderboard indexing and reactive search state.
 * - Social store friends resolution, indexing, and notification counts.
 * - Auth session verifier profile enrichment.
 * - Active player item buffs and event bonus description formatting.
 * - GameStore O(1) reactive lookups (pokemonByUid, getPokemonByUid, pokedex seen/caught).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlayerSearchStore } from '@/stores/player/playerSearch';
import { useLeaderboardStore } from '@/stores/leaderboard';
import { useEventStore } from '@/stores/events';
import { useSocialStore } from '@/stores/social/social';
import { useAuthStore } from '@/stores/auth';
import { enrichAuthUser, type VerifiedProfileData } from '@/stores/auth/authSessionVerifier';
import type { AuthUser } from '@/types/auth/auth';
import { buildActivePlayerItemBuffs, formatEventBonusDescription } from '@/stores/battle/buffsHelper';
import type { GameState } from '@/types/system/game';
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine';
import { useGameStore } from '@/stores/game';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Stores Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Player Search and Leaderboard O(1) Indexing', () => {
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

  describe('useSocialStore - O(1) Data Resolution and Indexing', () => {
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

  describe('authSessionVerifier', () => {
    it('enriches auth user with verified profile metadata, gender and role', () => {
      const rawUser = {
        id: 'test-user-123',
        email: 'ash@kanto.com',
        user_metadata: {},
      } as unknown as AuthUser;

      const profileData: VerifiedProfileData = {
        dbVersion: 42,
        userGender: 'm',
        userRole: 'admin',
        isUserBanned: false,
        banMsg: '',
        sessionValid: true,
      };

      const enriched = enrichAuthUser(rawUser, profileData);

      expect(enriched.db_version).toBe(42);
      expect(enriched.user_metadata?.gender).toBe('m');
      expect(enriched.role).toBe('admin');
    });
  });

  describe('buffsHelper', () => {
    it('builds active player item buffs when timers are active', () => {
      const dummyState = {
        repelSecs: 120,
        fishingRodSecs: 300,
        fishingRodType: 'super',
        shinyBoostSecs: 600,
        amuletCoinSecs: 0,
        luckyEggSecs: 0,
        safariTicketSecs: 0,
        ceruleanTicketSecs: 0,
        articunoTicketSecs: 0,
        mewtwoTicketSecs: 0,
        ivScannerSecs: 0,
        pickaxeSecs: 0,
        brushSecs: 0,
        incenseSecs: 0,
      } as unknown as GameState;

      const buffs = buildActivePlayerItemBuffs(dummyState);
      expect(buffs.length).toBe(3);
      expect(buffs.map(b => b.id)).toEqual(['repel', 'fishing-rod', 'shiny']);
    });

    it('formats event bonus description with multiple multipliers', () => {
      const mockConfig: EventConfig = {
        shinyMult: 2,
        expMult: 1.5,
        moneyMult: 2,
      };
      const mockRow: GameEvent = {
        id: 'test_event',
        name: 'Super Event',
        type: 'general',
        icon: '🎉',
        config: JSON.stringify(mockConfig),
      } as unknown as GameEvent;

      const desc = formatEventBonusDescription(mockConfig, mockRow, null);
      expect(desc).toContain('✨ x2 Shiny');
      expect(desc).toContain('⚡ x1.5 EXP');
      expect(desc).toContain('💰 x2 Dinero');
    });
  });

  describe('GameStore O(1) Reactive Lookups', () => {
    it('should find pokemon by uid in O(1) via pokemonByUid and getPokemonByUid', () => {
      const store = useGameStore();
      const p1 = makePokemon('pikachu', 10) as Pokemon;
      p1.uid = 'pika-unique-uid-01';

      const p2 = makePokemon('charmander', 12) as Pokemon;
      p2.uid = 'char-unique-uid-02';

      store.state.team = [p1];
      store.state.box = [p2];

      expect(store.pokemonByUid.has('pika-unique-uid-01')).toBe(true);
      expect(store.pokemonByUid.has('char-unique-uid-02')).toBe(true);
      expect(store.pokemonByUid.has('non-existent-uid')).toBe(false);

      expect(store.getPokemonByUid('pika-unique-uid-01')).toStrictEqual(p1);
      expect(store.getPokemonByUid('char-unique-uid-02')).toStrictEqual(p2);
      expect(store.getPokemonByUid('non-existent-uid')).toBeNull();
    });

    it('should reactively update pokemonByUid when team or box changes', () => {
      const store = useGameStore();
      const p1 = makePokemon('bulbasaur', 5) as Pokemon;
      p1.uid = 'bulba-uid-99';

      store.state.team = [];
      expect(store.getPokemonByUid('bulba-uid-99')).toBeNull();

      store.state.team.push(p1);
      expect(store.getPokemonByUid('bulba-uid-99')).toStrictEqual(p1);

      store.state.team.splice(0, 1);
      expect(store.getPokemonByUid('bulba-uid-99')).toBeNull();
    });

    it('should check caught and seen pokedex status in O(1)', () => {
      const store = useGameStore();
      store.state.pokedex = ['pikachu', 'charizard'];
      store.state.seenPokedex = ['bulbasaur'];

      expect(store.isSpeciesCaught('pikachu')).toBe(true);
      expect(store.isSpeciesCaught('charizard')).toBe(true);
      expect(store.isSpeciesCaught('bulbasaur')).toBe(false);

      expect(store.isSpeciesSeen('bulbasaur')).toBe(true);
      expect(store.isSpeciesSeen('pikachu')).toBe(true); // Caught implies seen
      expect(store.isSpeciesSeen('squirtle')).toBe(false);
    });
  });
});
