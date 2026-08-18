const DEFAULT_ELO_RATING_BASE = 1000;
const SECONDS_PER_HOUR_FACTOR = 3600;

import { ref, computed, onMounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/social/chat'
import { useSocialStore, type Friend } from '@/stores/social/social'
import { getXPNeededForClassLevel } from '@/logic/player/classMath'

interface ProfileRow {
  id: string
  username?: string | null
  email?: string | null
  faction?: string | null
  player_class?: string | null
  trainer_level?: number | null
  avatar_style?: string | null
  nick_style?: string | null
  pvp_wins?: number | null
  pvp_losses?: number | null
  elo_rating?: number | null
  created_at?: string | null
  gender?: string | null
  playtime?: number | null
  last_played_at?: string | null
  ranked_max_elo?: number | null
  class_level?: number | null
  class_xp?: number | null
  box_count?: number | null
  pvp_draws?: number | null
  longest_streak?: number | null
  shiny_count?: number | null
  max_damage?: number | null
  total_battles?: number | null
  trade_volume?: number | null
  capture_attempts?: number | null
  capture_successes?: number | null
}

interface SaveStateData {
  trainer?: string
  playtime?: number
  classLevel?: number
  classXP?: number
  rankedMaxElo?: number
  box?: unknown[]
  team?: unknown[]
  faction?: string | null
  playerClass?: string | null
  trainerLevel?: number
  trainerExp?: number
  trainerExpNeeded?: number
  avatar_style?: string
  nick_style?: string
  badges?: number
  gender?: string
  defeatedGyms?: string[]
  pokedex?: unknown[]
  seenPokedex?: string[]
  stats?: {
    trainersDefeated?: number
    wins?: number
    losses?: number
    maxDamage?: number
    totalBattles?: number
    tradeVolume?: number
    captureAttempts?: number
    captureSuccesses?: number
  }
  pvpStats?: {
    wins?: number
    losses?: number
    draws?: number
  }
  eloRating?: number
  warCoins?: number
  money?: number
  battleCoins?: number
  classData?: {
    criminality?: number
    reputation?: number
    longestStreak?: number
  }
  warMyPtsLocal?: Record<string, number>
}

const FACTION_LABELS: Record<string, string> = {
  union: 'Equipo Unión',
  poder: 'Equipo Poder'
}

const FACTION_COLORS: Record<string, string> = {
  union: 'rgba(59, 130, 246, 1)',
  poder: 'rgba(239, 68, 68, 1)'
}

function resolveFactionLabel(f: string | null | undefined): string {
  if (!f) return 'Sin Bando'
  const clean = f.trim().toLowerCase()
  if (!clean || clean === 'null' || clean === 'undefined') return 'Sin Bando'
  return FACTION_LABELS[clean] || clean.toUpperCase()
}

function resolveFactionColor(f: string | null | undefined): string {
  if (!f) return 'rgba(148, 163, 184, 0.5)'
  const clean = f.trim().toLowerCase()
  if (!clean || clean === 'null' || clean === 'undefined') return 'rgba(148, 163, 184, 0.5)'
  return FACTION_COLORS[clean] || 'rgba(148, 163, 184, 1)'
}

export function useTrainerProfile(getUserId: () => string | null | undefined) {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const socialStore = useSocialStore()

  const loading = ref(true)
  const profile = ref<ProfileRow | null>(null)
  const saveState = ref<SaveStateData | null>(null)
  const error = ref<string | null>(null)

  const userId = computed(getUserId)

  const isOwnProfile = computed(() => {
    return authStore.user?.id === userId.value
  })

  const fetchData = async () => {
    const id = userId.value
    if (!id) {
      error.value = 'ID de usuario no proporcionado'
      loading.value = false
      return
    }

    loading.value = true
    error.value = null
    profile.value = null
    saveState.value = null

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

  const trainerName = computed(() => {
    const id = userId.value
    if (isOwnProfile.value) {
      return gameStore.state.trainer || profile.value?.username || authStore.user?.user_metadata?.username || 'Entrenador'
    }
    const cached = id ? chatStore.profileCosmetics[id] : null
    if (cached?.username) return cached.username
    const friend = id ? socialStore.friends.find((f: Friend) => f.id === id) : null
    if (friend?.username) return friend.username
    return saveState.value?.trainer || profile.value?.username || 'Entrenador'
  })

  const faction = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.faction || null
    }
    return profile.value?.faction || saveState.value?.faction || null
  })

  const playerClass = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.playerClass || null
    }
    const id = userId.value
    const cached = id ? chatStore.profileCosmetics[id] : null
    if (cached?.player_class !== undefined) return cached.player_class
    const friend = id ? socialStore.friends.find((f: Friend) => f.id === id) : null
    if (friend?.playerClass !== undefined) return friend.playerClass
    return profile.value?.player_class || saveState.value?.playerClass || null
  })

  const classDef = computed(() => {
    if (!playerClass.value) return null
    return (PLAYER_CLASSES as Record<string, { id: string; name: string; color: string; description: string }>)[playerClass.value] || null // open-record
  })

  const trainerLevel = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.trainerLevel ?? 1
    }
    const id = userId.value
    const cached = id ? chatStore.profileCosmetics[id] : null
    if (cached?.trainer_level !== undefined) return cached.trainer_level
    const friend = id ? socialStore.friends.find((f: Friend) => f.id === id) : null
    if (friend?.level !== undefined) return friend.level
    return profile.value?.trainer_level ?? saveState.value?.trainerLevel ?? 1
  })

  const avatarStyle = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.avatar_style ?? ''
    }
    const id = userId.value
    const cached = id ? chatStore.profileCosmetics[id] : null
    if (cached?.avatar_style !== undefined) return cached.avatar_style
    const friend = id ? socialStore.friends.find((f: Friend) => f.id === id) : null
    if (friend?.avatar_style !== undefined) return friend.avatar_style
    return profile.value?.avatar_style ?? saveState.value?.avatar_style ?? ''
  })

  const nickStyle = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.nick_style ?? ''
    }
    const id = userId.value
    const cached = id ? chatStore.profileCosmetics[id] : null
    if (cached?.nick_style !== undefined) return cached.nick_style
    const friend = id ? socialStore.friends.find((f: Friend) => f.id === id) : null
    if (friend?.nick_style !== undefined) return friend.nick_style
    return profile.value?.nick_style ?? saveState.value?.nick_style ?? ''
  })

  const gender = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.gender ?? 'h'
    }
    const id = userId.value
    const cached = id ? chatStore.profileCosmetics[id] : null
    if (cached?.gender !== undefined) return cached.gender
    const friend = id ? socialStore.friends.find((f: Friend) => f.id === id) : null
    if (friend?.gender !== undefined) return friend.gender
    return profile.value?.gender ?? saveState.value?.gender ?? 'h'
  })

  const badgesCount = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.badges ?? gameStore.state.defeatedGyms?.length ?? 0
    }
    return saveState.value?.badges ?? saveState.value?.defeatedGyms?.length ?? 0
  })

  const pokedexCaught = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.pokedex?.length ?? 0
    }
    return saveState.value?.pokedex?.length ?? 0
  })

  const pokedexSeen = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.seenPokedex?.length ?? 0
    }
    return saveState.value?.seenPokedex?.length ?? 0
  })

  const trainersDefeated = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.stats?.trainersDefeated ?? 0
    }
    return saveState.value?.stats?.trainersDefeated ?? 0
  })

  const wildWins = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.stats?.wins ?? 0
    }
    return saveState.value?.stats?.wins ?? 0
  })

  const pvpWins = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.pvp_wins ?? gameStore.state.pvpStats?.wins ?? 0
    }
    return profile.value?.pvp_wins ?? saveState.value?.pvpStats?.wins ?? 0
  })

  const pvpLosses = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.pvp_losses ?? gameStore.state.pvpStats?.losses ?? 0
    }
    return profile.value?.pvp_losses ?? saveState.value?.pvpStats?.losses ?? 0
  })

  const eloRating = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.elo_rating ?? gameStore.state.eloRating ?? DEFAULT_ELO_RATING_BASE
    }
    return profile.value?.elo_rating ?? saveState.value?.eloRating ?? DEFAULT_ELO_RATING_BASE
  })

  const warCoins = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.warCoins ?? 0
    }
    return saveState.value?.warCoins ?? 0
  })

  const criminality = computed(() => {
    if (isOwnProfile.value) {
      return (gameStore.state.classData as { criminality?: number } | undefined)?.criminality ?? 0
    }
    return saveState.value?.classData?.criminality ?? 0
  })

  const reputation = computed(() => {
    if (isOwnProfile.value) {
      return (gameStore.state.classData as { reputation?: number } | undefined)?.reputation ?? 0
    }
    return saveState.value?.classData?.reputation ?? 0
  })

  const captureStreak = computed(() => {
    if (isOwnProfile.value) {
      return (gameStore.state.classData as { longestStreak?: number } | undefined)?.longestStreak ?? 0
    }
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

  const createdAt = computed(() => {
    return profile.value?.created_at || (isOwnProfile.value ? Temporal.Now.instant().toString() : null)
  })

  const lastPlayedAt = computed(() => {
    return isOwnProfile.value ? Temporal.Now.instant().toString() : (profile.value?.last_played_at || null)
  })

  const rankedMaxElo = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.ranked_max_elo ?? gameStore.state.rankedMaxElo ?? DEFAULT_ELO_RATING_BASE
    }
    return profile.value?.ranked_max_elo ?? saveState.value?.rankedMaxElo ?? DEFAULT_ELO_RATING_BASE
  })

  const classLevel = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.classLevel ?? 1
    }
    return profile.value?.class_level ?? saveState.value?.classLevel ?? 1
  })

  const classXP = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.classXP ?? 0
    }
    return profile.value?.class_xp ?? saveState.value?.classXP ?? 0
  })

  const classXPNeeded = computed(() => {
    return getXPNeededForClassLevel(classLevel.value)
  })

  const boxCount = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.box?.length ?? 0
    }
    return profile.value?.box_count ?? saveState.value?.box?.length ?? 0
  })

  const pvpDraws = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.pvp_draws ?? gameStore.state.pvpStats?.draws ?? 0
    }
    return profile.value?.pvp_draws ?? saveState.value?.pvpStats?.draws ?? 0
  })

  const longestStreak = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.longest_streak ?? (gameStore.state.classData as { longestStreak?: number } | undefined)?.longestStreak ?? 0
    }
    return profile.value?.longest_streak ?? saveState.value?.classData?.longestStreak ?? 0
  })

  const shinyCount = computed(() => {
    if (isOwnProfile.value) {
      const teamShinies = (gameStore.state.team || []).filter(p => Boolean(p?.isShiny)).length
      const boxShinies = (gameStore.state.box || []).filter(p => Boolean(p?.isShiny)).length
      return teamShinies + boxShinies
    }
    if (profile.value?.shiny_count !== undefined && profile.value?.shiny_count !== null) {
      return profile.value.shiny_count
    }
    const teamShinies = ((saveState.value?.team || []) as ({ isShiny?: boolean } | null)[]).filter(p => Boolean(p?.isShiny)).length
    const boxShinies = ((saveState.value?.box || []) as ({ isShiny?: boolean } | null)[]).filter(p => Boolean(p?.isShiny)).length
    return teamShinies + boxShinies
  })

  const maxDamage = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.max_damage ?? gameStore.state.stats?.maxDamage ?? 0
    }
    return profile.value?.max_damage ?? saveState.value?.stats?.maxDamage ?? 0
  })

  const totalBattles = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.total_battles ?? gameStore.state.stats?.totalBattles ?? 0
    }
    return profile.value?.total_battles ?? saveState.value?.stats?.totalBattles ?? 0
  })

  const tradeVolume = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.trade_volume ?? gameStore.state.stats?.tradeVolume ?? 0
    }
    return profile.value?.trade_volume ?? saveState.value?.stats?.tradeVolume ?? 0
  })

  const captureAttempts = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.capture_attempts ?? gameStore.state.stats?.captureAttempts ?? 0
    }
    return profile.value?.capture_attempts ?? saveState.value?.stats?.captureAttempts ?? 0
  })

  const captureSuccesses = computed(() => {
    if (isOwnProfile.value) {
      return profile.value?.capture_successes ?? gameStore.state.stats?.captureSuccesses ?? 0
    }
    return profile.value?.capture_successes ?? saveState.value?.stats?.captureSuccesses ?? 0
  })

  const captureEfficiency = computed(() => {
    const attempts = captureAttempts.value
    const successes = captureSuccesses.value
    if (attempts <= 0) return 0
    return Math.round((successes / attempts) * 100)
  })

  const money = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.money ?? 0
    }
    return saveState.value?.money ?? 0
  })

  const battleCoinsCount = computed(() => {
    if (isOwnProfile.value) {
      return gameStore.state.battleCoins ?? 0
    }
    return saveState.value?.battleCoins ?? 0
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
    fetchData
  }
}
