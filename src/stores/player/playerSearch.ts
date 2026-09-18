import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import type { SearchResult } from '@/stores/social/social.ts'
import { GameState } from '@/types/system/game'
import type { ProfileRow, GameSaveRow } from '@/types/system/database'
import { PLAYER_SEARCH_MAX_RESULTS } from '@/logic/constants/gameplay.ts'

interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: string
}


const DEFAULT_PLAYER_CLASS = 'entrenador' as const
const DEFAULT_GENDER = 'h' as const
const DEFAULT_TRAINER_LEVEL = 1 as const
const DEFAULT_FRIENDSHIP_STATUS = 'none' as const
const EMPTY_STRING = '' as const
const MIN_SEARCH_QUERY_LENGTH = 2 as const

function resolveSearchField<T>(fallback: T, ...candidates: (T | null | undefined)[]): T {
  for (const c of candidates) {
    if (c !== null && c !== undefined && c !== '') return c
  }
  return fallback
}

function matchesPlayerFilter(
  save: Partial<GameState>,
  profile: ProfileRow,
  filters?: { playerClass?: string; faction?: string }
): boolean {
  if (filters?.playerClass) {
    const currentClass = resolveSearchField(DEFAULT_PLAYER_CLASS, save.playerClass as string, profile.player_class)
    if (currentClass !== filters.playerClass) return false
  }
  if (filters?.faction) {
    const currentFaction = resolveSearchField(EMPTY_STRING, save.faction as string, profile.faction)
    if (currentFaction !== filters.faction) return false
  }
  return true
}

function filterOfflineProfiles(
  profiles: ProfileRow[],
  savesByUserId: Record<string, GameSaveRow>,
  authUserUid: string,
  queryLower: string,
  filters?: { playerClass?: string; faction?: string }
): ProfileRow[] {
  return profiles.filter((p: ProfileRow) => {
    if (p.id === authUserUid) return false

    const save = (savesByUserId[p.id]?.save_data as Partial<GameState>) || {}
    const trainerName = (save.trainer as string) || p.username || EMPTY_STRING
    const originalUsername = p.username || EMPTY_STRING

    const matchesQuery =
      trainerName.toLowerCase().includes(queryLower) ||
      originalUsername.toLowerCase().includes(queryLower)

    if (!matchesQuery) return false

    return matchesPlayerFilter(save, p, filters)
  }).slice(0, PLAYER_SEARCH_MAX_RESULTS)
}

function buildSearchResultsList(
  profiles: ProfileRow[],
  saveRes: { data: GameSaveRow[] | null },
  relRes: { data: FriendshipRow[] | null },
  authUserUid: string
): SearchResult[] {
  const savesMap: Record<string, GameSaveRow> = Object.fromEntries(
    (saveRes.data || []).map(s => [s.user_id, s])
  )
  const relsMap: Record<string, FriendshipRow> = Object.fromEntries(
    (relRes.data || []).map(f => {
      const otherId = f.requester_id === authUserUid ? f.addressee_id : f.requester_id
      return [otherId, f]
    })
  )

  return profiles.map((p: ProfileRow) => {
    const save = (savesMap[p.id]?.save_data as Partial<GameState>) || {}
    const rel = relsMap[p.id]

    return {
      id: p.id,
      username: resolveSearchField(p.username || EMPTY_STRING, save.trainer as string),
      level: resolveSearchField(DEFAULT_TRAINER_LEVEL, save.trainerLevel as number, p.trainer_level),
      playerClass: resolveSearchField(DEFAULT_PLAYER_CLASS, save.playerClass as string, p.player_class),
      faction: (save.faction as string) || p.faction || undefined,
      nick_style: resolveSearchField(EMPTY_STRING, save.nick_style as string, p.nick_style),
      avatar_style: resolveSearchField(EMPTY_STRING, save.avatar_style as string, p.avatar_style),
      gender: resolveSearchField(DEFAULT_GENDER, save.gender as string, p.gender),
      status: rel ? (rel.status as string) : DEFAULT_FRIENDSHIP_STATUS,
      relId: rel ? (rel.id as string) : null,
      isRequester: rel ? rel.requester_id === authUserUid : false
    }
  })
}

export const usePlayerSearchStore = defineStore('playerSearch', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()

  const searchResults = ref<SearchResult[]>([])
  const searchLoading = ref(false)
  const lastSearchQuery = ref('')

interface SearchPayload {
  profiles: ProfileRow[] | null;
  saveRes: { data: GameSaveRow[] | null };
  relRes: { data: FriendshipRow[] | null };
}

async function fetchOfflineSearchData(
  db: NonNullable<ReturnType<typeof useGameStore>['db']>,
  query: string,
  authUserUid: string,
  filters?: { playerClass?: string; faction?: string }
): Promise<SearchPayload> {
  const [profRes, allSavesRes, allRelsRes] = await Promise.all([
    db.from('profiles').select('*'),
    db.from('game_saves').select('*'),
    db.from('friendships')
      .select('*')
      .or(`requester_id.eq.${authUserUid},addressee_id.eq.${authUserUid}`)
  ]) as [
    { data: ProfileRow[] | null },
    { data: GameSaveRow[] | null },
    { data: FriendshipRow[] | null }
  ];

  const savesByUserId: Record<string, GameSaveRow> = Object.fromEntries(
    (allSavesRes.data || []).map(s => [s.user_id, s])
  );

  const queryLower = query.toLowerCase();
  const profiles = filterOfflineProfiles(profRes.data || [], savesByUserId, authUserUid, queryLower, filters);

  return {
    profiles,
    saveRes: { data: allSavesRes.data },
    relRes: { data: allRelsRes.data }
  };
}

async function fetchOnlineSearchData(
  db: NonNullable<ReturnType<typeof useGameStore>['db']>,
  query: string,
  authUserUid: string,
  filters?: { playerClass?: string; faction?: string }
): Promise<SearchPayload> {
  let builder = db
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .neq('id', authUserUid);

  if (filters?.playerClass) {
    builder = builder.eq('player_class', filters.playerClass);
  }
  if (filters?.faction) {
    builder = builder.eq('faction', filters.faction);
  }

  const { data: profiles } = await builder.limit(PLAYER_SEARCH_MAX_RESULTS) as { data: ProfileRow[] | null };
  if (!profiles || profiles.length === 0) {
    return { profiles: [], saveRes: { data: null }, relRes: { data: null } };
  }

  const ids = profiles.map((p: ProfileRow) => p.id);
  const [savesData, relsData] = await Promise.all([
    db.from('game_saves').select('user_id,save_data').in('user_id', ids),
    db.from('friendships')
      .select('*')
      .or(`requester_id.eq.${authUserUid},addressee_id.eq.${authUserUid}`)
  ]) as [
    { data: GameSaveRow[] | null },
    { data: FriendshipRow[] | null }
  ];

  return { profiles, saveRes: savesData, relRes: relsData };
}

  async function searchPlayers(query: string, filters?: { playerClass?: string; faction?: string }) {
    if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) {
      searchResults.value = [];
      return;
    }

    if (!authStore.user?.id) {
      searchResults.value = [];
      return;
    }

    lastSearchQuery.value = query;
    searchLoading.value = true;
    const db = gameStore.db;
    if (!db) { searchLoading.value = false; return; }

    try {
      const payload = db.mode === 'offline'
        ? await fetchOfflineSearchData(db, query, authStore.user.id, filters)
        : await fetchOnlineSearchData(db, query, authStore.user.id, filters);

      if (lastSearchQuery.value !== query) return;

      if (payload.profiles && payload.profiles.length > 0) {
        searchResults.value = buildSearchResultsList(payload.profiles, payload.saveRes, payload.relRes, authStore.user.id);
      } else {
        searchResults.value = [];
      }
    } finally {
      if (lastSearchQuery.value === query) {
        searchLoading.value = false;
      }
    }
  }

  return {
    searchResults,
    searchLoading,
    searchPlayers
  }
})
