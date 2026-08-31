const DEFAULT_ELO_RATING_BASE = 1000;
const SECONDS_PER_HOUR_FACTOR = 3600;

import { ref, computed, onMounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/social/chat'
import { useSocialStore, type Friend } from '@/stores/social/social'
import { getXPNeededForClassLevel } from '@/logic/player/classMath'
import type { GameStatKey } from '@/types/system/game'
import {
  resolveCosmeticField,
  resolveStatField,
  computeShiniesCount,
  computeEventTrophyCounts,
  resolveFactionLabel,
  resolveFactionColor,
  type ProfileRow,
  type SaveStateData
} from './trainerProfileResolver.ts'

export function useTrainerProfile(getUserId: () => string | null | undefined) {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const socialStore = useSocialStore()

  const userId = computed(getUserId)

  const isOwnProfile = computed(() => {
    return authStore.user?.id === userId.value
  })

  const loading = ref(!isOwnProfile.value)
  const profile = ref<ProfileRow | null>(null)
  const saveState = ref<SaveStateData | null>(null)
  const error = ref<string | null>(null)
  const eventParticipationsDb = ref(0)
  const eventMedalsFirstDb = ref(0)
  const eventMedalsSecondDb = ref(0)
  const eventMedalsThirdDb = ref(0)

  const fetchData = async () => {
    const id = userId.value
    if (!id) {
      error.value = 'ID de usuario no proporcionado'
      loading.value = false
      return
    }

    if (isOwnProfile.value) {
      // For the authenticated user, all state is already present in gameStore.state
      loading.value = false
      error.value = null

      const db = gameStore.db
      if (!db) return

      try {
        const [profRes, awardsRes, compEntryRes] = await Promise.all([
          db.from('profiles').select('*').eq('id', id).maybeSingle(),
          db.from('awards').select('prize, event_id').eq('winner_id', id),
          db.from('competition_entries').select('event_id').eq('player_id', id)
        ])

        if (profRes.data) {
          profile.value = profRes.data as ProfileRow
        }

        if (awardsRes.data && Array.isArray(awardsRes.data)) {
          let firstCount = 0
          let secondCount = 0
          let thirdCount = 0
          for (const a of awardsRes.data as { prize?: unknown }[]) {
            let p = a.prize
            if (typeof p === 'string') {
              try { p = JSON.parse(p) } catch { p = null }
            }
            if (p && typeof p === 'object' && 'rank' in p) {
              const r = (p as { rank?: string }).rank
              if (r === 'first') firstCount++
              else if (r === 'second') secondCount++
              else if (r === 'third') thirdCount++
            }
          }
          eventMedalsFirstDb.value = firstCount
          eventMedalsSecondDb.value = secondCount
          eventMedalsThirdDb.value = thirdCount
        }

        if (compEntryRes.data && Array.isArray(compEntryRes.data)) {
          const distinctEvents = new Set((compEntryRes.data as { event_id?: string }[]).map(e => e.event_id).filter(Boolean))
          eventParticipationsDb.value = distinctEvents.size
        }
      } catch (_e) {
        // Non-fatal background fetch
      }
      return
    }

    loading.value = true
    error.value = null
    profile.value = null
    saveState.value = null
    eventParticipationsDb.value = 0
    eventMedalsFirstDb.value = 0
    eventMedalsSecondDb.value = 0
    eventMedalsThirdDb.value = 0

    try {
      const db = gameStore.db
      if (!db) {
        error.value = 'Base de datos no disponible'
        return
      }

      // 1. Fetch profile
      const { data: prof, error: pErr } = await db
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (pErr) throw pErr
      profile.value = (prof as ProfileRow) || null

      // 2. Fetch game save
      const { data: saveRow, error: sErr } = (await db
        .from('game_saves')
        .select('save_data')
        .eq('user_id', id)
        .maybeSingle()) as { data: { save_data: unknown } | null, error: Error | null }

      if (sErr) throw sErr

      if (!profile.value && !saveRow?.save_data) {
        error.value = 'Perfil de entrenador no encontrado'
        return
      }

      if (saveRow?.save_data) {
        let rawSave: unknown = saveRow.save_data
        if (typeof rawSave === 'string') {
          try {
            rawSave = JSON.parse(rawSave)
          } catch (_) {
            rawSave = null
          }
        }
        saveState.value = rawSave as SaveStateData
      }

      // 3. Fetch awards & event participations for this user from DB
      try {
        const { data: awardsRows } = await db
          .from('awards')
          .select('prize, event_id')
          .eq('winner_id', id)

        if (awardsRows && Array.isArray(awardsRows)) {
          let firstCount = 0
          let secondCount = 0
          let thirdCount = 0
          for (const a of awardsRows as { prize?: unknown }[]) {
            let p = a.prize
            if (typeof p === 'string') {
              try { p = JSON.parse(p) } catch { p = null }
            }
            if (p && typeof p === 'object' && 'rank' in p) {
              const r = (p as { rank?: string }).rank
              if (r === 'first') firstCount++
              else if (r === 'second') secondCount++
              else if (r === 'third') thirdCount++
            }
          }
          eventMedalsFirstDb.value = firstCount
          eventMedalsSecondDb.value = secondCount
          eventMedalsThirdDb.value = thirdCount
        }

        const { data: compEntryRows } = await db
          .from('competition_entries')
          .select('event_id')
          .eq('player_id', id)

        if (compEntryRows && Array.isArray(compEntryRows)) {
          const distinctEvents = new Set((compEntryRows as { event_id?: string }[]).map(e => e.event_id).filter(Boolean))
          eventParticipationsDb.value = distinctEvents.size
        }
      } catch (_e) {
        // Non-fatal if offline/no tables
      }
    } catch (e: unknown) {
      const err = e as Error
      error.value = `Error: ${err.message || 'No se pudieron recuperar los datos'}`
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchData()
  })

  watch(userId, () => {
    fetchData()
  })

  const cachedCosmetic = computed(() => (userId.value ? chatStore.profileCosmetics[userId.value] : null))
  const friendProfile = computed(() => (userId.value ? socialStore.friends.find((f: Friend) => f.id === userId.value) : null))

  const trainerName = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.trainer,
      cachedCosmetic.value?.username,
      friendProfile.value?.username,
      profile.value?.username || authStore.user?.user_metadata?.username,
      saveState.value?.trainer,
      'Entrenador'
    )
  )

  const faction = computed(() => {
    if (isOwnProfile.value) return gameStore.state.faction || null
    return profile.value?.faction || saveState.value?.faction || null
  })

  const playerClass = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.playerClass,
      cachedCosmetic.value?.player_class,
      friendProfile.value?.playerClass,
      profile.value?.player_class,
      saveState.value?.playerClass,
      null
    )
  )

  const classDef = computed(() => {
    if (!playerClass.value) return null
    return (PLAYER_CLASSES as Record<string, { id: string; name: string; color: string; description: string }>)[playerClass.value] || null // open-record
  })

  const trainerLevel = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.trainerLevel,
      cachedCosmetic.value?.trainer_level,
      friendProfile.value?.level,
      profile.value?.trainer_level,
      saveState.value?.trainerLevel,
      1
    )
  )

  const avatarStyle = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.avatar_style,
      cachedCosmetic.value?.avatar_style,
      friendProfile.value?.avatar_style,
      profile.value?.avatar_style,
      saveState.value?.avatar_style,
      ''
    )
  )

  const nickStyle = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.nick_style,
      cachedCosmetic.value?.nick_style,
      friendProfile.value?.nick_style,
      profile.value?.nick_style,
      saveState.value?.nick_style,
      ''
    )
  )

  const gender = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.gender,
      cachedCosmetic.value?.gender,
      friendProfile.value?.gender,
      profile.value?.gender,
      saveState.value?.gender,
      'h'
    )
  )

  const badgesCount = computed(() => {
    if (isOwnProfile.value) return gameStore.state.badges ?? gameStore.state.defeatedGyms?.length ?? 0
    return saveState.value?.badges ?? saveState.value?.defeatedGyms?.length ?? 0
  })

  const pokedexCaught = computed(() => {
    if (isOwnProfile.value) return gameStore.state.pokedex?.length ?? 0
    return saveState.value?.pokedex?.length ?? 0
  })

  const pokedexSeen = computed(() => {
    if (isOwnProfile.value) return gameStore.state.seenPokedex?.length ?? 0
    return saveState.value?.seenPokedex?.length ?? 0
  })

  const trainersDefeated = computed(() => {
    if (isOwnProfile.value) return gameStore.state.stats?.trainersDefeated ?? 0
    return saveState.value?.stats?.trainersDefeated ?? 0
  })

  const wildWins = computed(() => {
    if (isOwnProfile.value) return gameStore.state.stats?.wins ?? 0
    return saveState.value?.stats?.wins ?? 0
  })

  const pvpWins = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.wins, profile.value?.pvp_wins, saveState.value?.pvpStats?.wins, 0)
  )

  const pvpLosses = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.losses, profile.value?.pvp_losses, saveState.value?.pvpStats?.losses, 0)
  )

  const eloRating = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.eloRating, profile.value?.elo_rating, saveState.value?.eloRating, DEFAULT_ELO_RATING_BASE)
  )

  const warCoins = computed(() => (isOwnProfile.value ? gameStore.state.warCoins ?? 0 : saveState.value?.warCoins ?? 0))

  const criminality = computed(() => {
    if (isOwnProfile.value) return (gameStore.state.classData as { criminality?: number } | undefined)?.criminality ?? 0
    return saveState.value?.classData?.criminality ?? 0
  })

  const reputation = computed(() => {
    if (isOwnProfile.value) return (gameStore.state.classData as { reputation?: number } | undefined)?.reputation ?? 0
    return saveState.value?.classData?.reputation ?? 0
  })

  const captureStreak = computed(() => {
    if (isOwnProfile.value) return (gameStore.state.classData as { longestStreak?: number } | undefined)?.longestStreak ?? 0
    return saveState.value?.classData?.longestStreak ?? 0
  })

  const totalWarPoints = computed<number>(() => {
    const warMap = isOwnProfile.value ? gameStore.state.warMyPtsLocal : saveState.value?.warMyPtsLocal
    if (!warMap) return 0
    const points = Object.values(warMap) as number[]
    return points.reduce((a: number, b: number) => Number(a) + Number(b), 0)
  })

  const isGymDefeated = (gymId: string) => {
    const list = isOwnProfile.value ? (gameStore.state.defeatedGyms || []) : (saveState.value?.defeatedGyms || [])
    return list.includes(gymId)
  }

  const factionLabel = computed(() => resolveFactionLabel(faction.value))
  const factionColor = computed(() => resolveFactionColor(faction.value))

  const playtimeHours = computed(() => {
    const secs = isOwnProfile.value ? (gameStore.state.playtime ?? 0) : (profile.value?.playtime ?? saveState.value?.playtime ?? 0)
    return Math.floor(secs / SECONDS_PER_HOUR_FACTOR)
  })

  const createdAt = computed(() => profile.value?.created_at || (isOwnProfile.value ? Temporal.Now.instant().toString() : null))
  const lastPlayedAt = computed(() => (isOwnProfile.value ? Temporal.Now.instant().toString() : (profile.value?.last_played_at || null)))

  const rankedMaxElo = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.rankedMaxElo, profile.value?.ranked_max_elo, saveState.value?.rankedMaxElo, DEFAULT_ELO_RATING_BASE)
  )

  const classLevel = computed(() => (isOwnProfile.value ? gameStore.state.classLevel ?? 1 : profile.value?.class_level ?? saveState.value?.classLevel ?? 1))
  const classXP = computed(() => (isOwnProfile.value ? gameStore.state.classXP ?? 0 : profile.value?.class_xp ?? saveState.value?.classXP ?? 0))
  const classXPNeeded = computed(() => getXPNeededForClassLevel(classLevel.value))

  const boxCount = computed(() => (isOwnProfile.value ? gameStore.state.box?.length ?? 0 : profile.value?.box_count ?? saveState.value?.box?.length ?? 0))

  const pvpDraws = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.draws, profile.value?.pvp_draws, saveState.value?.pvpStats?.draws, 0)
  )

  const longestStreak = computed(() => {
    if (isOwnProfile.value) return profile.value?.longest_streak ?? (gameStore.state.classData as { longestStreak?: number } | undefined)?.longestStreak ?? 0
    return profile.value?.longest_streak ?? saveState.value?.classData?.longestStreak ?? 0
  })

  const shinyCount = computed(() =>
    computeShiniesCount(
      isOwnProfile.value,
      isOwnProfile.value ? gameStore.state.team : saveState.value?.team,
      isOwnProfile.value ? gameStore.state.box : saveState.value?.box,
      profile.value?.shiny_count
    )
  )

  const maxDamage = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.maxDamage, profile.value?.max_damage, saveState.value?.stats?.maxDamage, 0)
  )

  const totalBattles = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.totalBattles, profile.value?.total_battles, saveState.value?.stats?.totalBattles, 0)
  )

  const tradeVolume = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.tradeVolume, profile.value?.trade_volume, saveState.value?.stats?.tradeVolume, 0)
  )

  const captureAttempts = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.captureAttempts, profile.value?.capture_attempts, saveState.value?.stats?.captureAttempts, 0)
  )

  const captureSuccesses = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.captureSuccesses, profile.value?.capture_successes, saveState.value?.stats?.captureSuccesses, 0)
  )

  const captureEfficiency = computed(() => {
    const attempts = captureAttempts.value
    const successes = captureSuccesses.value
    if (attempts <= 0) return 0
    return Math.round((successes / attempts) * 100)
  })

  const money = computed(() => (isOwnProfile.value ? gameStore.state.money ?? 0 : saveState.value?.money ?? 0))
  const battleCoinsCount = computed(() => (isOwnProfile.value ? gameStore.state.battleCoins ?? 0 : saveState.value?.battleCoins ?? 0))

  const eventMedalCounts = computed(() => {
    const team = isOwnProfile.value ? gameStore.state.team : saveState.value?.team
    const box = isOwnProfile.value ? gameStore.state.box : saveState.value?.box
    const savedStats = (isOwnProfile.value ? gameStore.state.stats : saveState.value?.stats) as Partial<Record<GameStatKey, number>> | undefined
    return computeEventTrophyCounts(
      team,
      box,
      eventMedalsFirstDb.value,
      eventMedalsSecondDb.value,
      eventMedalsThirdDb.value,
      savedStats?.eventMedalsFirst || 0,
      savedStats?.eventMedalsSecond || 0,
      savedStats?.eventMedalsThird || 0
    )
  })

  const eventMedalsFirst = computed(() => eventMedalCounts.value.first)
  const eventMedalsSecond = computed(() => eventMedalCounts.value.second)
  const eventMedalsThird = computed(() => eventMedalCounts.value.third)
  const eventMedalsTotal = computed(() => eventMedalCounts.value.total)

  const eventParticipations = computed(() => {
    const savedStats = (isOwnProfile.value ? gameStore.state.stats : saveState.value?.stats) as Partial<Record<GameStatKey, number>> | undefined
    const fromSaved = savedStats?.eventParticipations ?? 0
    return Math.max(eventParticipationsDb.value, fromSaved, eventMedalsTotal.value)
  })

  return {
    loading,
    profile,
    saveState,
    error,
    isOwnProfile,
    trainerName,
    faction,
    playerClass,
    classDef,
    trainerLevel,
    avatarStyle,
    nickStyle,
    gender,
    badgesCount,
    pokedexCaught,
    pokedexSeen,
    trainersDefeated,
    wildWins,
    pvpWins,
    pvpLosses,
    eloRating,
    warCoins,
    criminality,
    reputation,
    captureStreak,
    totalWarPoints,
    isGymDefeated,
    factionLabel,
    factionColor,
    playtimeHours,
    createdAt,
    lastPlayedAt,
    rankedMaxElo,
    classLevel,
    classXP,
    classXPNeeded,
    boxCount,
    pvpDraws,
    longestStreak,
    shinyCount,
    maxDamage,
    totalBattles,
    tradeVolume,
    captureAttempts,
    captureSuccesses,
    captureEfficiency,
    money,
    battleCoinsCount,
    eventParticipations,
    eventMedalsTotal,
    eventMedalsFirst,
    eventMedalsSecond,
    eventMedalsThird,
    fetchData
  }
}

