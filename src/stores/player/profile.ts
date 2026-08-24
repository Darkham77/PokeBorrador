import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuthUser } from '@/types/auth/auth'
import type { GameState, NotificationItem, GenderId } from '@/types/system/game'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'


interface ProfileData {
  username: string;
  email: string;
  isAdmin: boolean;
  level: number;
  badges: number;
  money: number;
  battleCoins: number;
  stats: Record<string, number | string>;
  faction: string | null;
  nick_style: string;
  notificationHistory: NotificationItem[];
  lastSave: string;
  last_renamed_at?: string;
  gender: GenderId;
}

export const useProfileStore = defineStore('profile', () => {
  const profileData = ref<ProfileData>({
    username: '—',
    email: '—',
    isAdmin: false,
    level: 1,
    badges: 0,
    money: 0,
    battleCoins: 0,
    stats: {},
    faction: null,
    nick_style: '',
    notificationHistory: [],
    lastSave: 'Sin datos',
    last_renamed_at: undefined,
    gender: 'h'
  })

  function updateProfile(data: Partial<ProfileData>) {
    profileData.value = { ...profileData.value, ...data }
  }

  function syncProfileFromAuth(user: AuthUser, state: GameState) {
    if (!user) return

    let lastSaveStr = 'Sin datos'
    try {
      const lsKey = 'pokemon_local_save_' + user.id
      const lsRaw = localStorage.getItem(lsKey)
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw) as { _last_updated?: string | number };
        if (parsed._last_updated) {
          const temporalInstant = Temporal.Instant.fromEpochMilliseconds(Number(parsed._last_updated))
          const zdt = temporalInstant.toZonedDateTimeISO(GAME_TIMEZONE)
          const day = String(zdt.day).padStart(2, '0')
          const month = String(zdt.month).padStart(2, '0')
          const year = zdt.year
          const hour = String(zdt.hour).padStart(2, '0')
          const minute = String(zdt.minute).padStart(2, '0')
          const second = String(zdt.second).padStart(2, '0')
          lastSaveStr = `${day}/${month}/${year} ${hour}:${minute}:${second}`
        }
      }
    } catch (e) {
      throw new Error(`[ProfileStore] Error reading localStorage save metadata: ${(e as Error).message}`)
    }

    const lastRenamedAt = state.last_renamed_at || (user.user_metadata?.last_renamed_at as string | undefined) || profileData.value.last_renamed_at

    updateProfile({
      username: state.trainer || (user.user_metadata?.username as string) || 'Entrenador',
      email: user.email || '—',
      isAdmin: user.user_metadata?.role === 'admin',
      level: state.trainerLevel || 1,
      money: state.money || 0,
      battleCoins: state.battleCoins || 0,
      badges: state.badges || 0,
      stats: state.stats || {},
      faction: state.faction || null,
      notificationHistory: state.notificationHistory || [],
      lastSave: lastSaveStr,
      last_renamed_at: lastRenamedAt,
      gender: state.gender || 'h'
    })
  }

  return {
    profileData,
    updateProfile,
    syncProfileFromAuth
  }
})
