import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuthUser } from '@/types/auth'
import type { GameState, NotificationItem } from '@/types/game'

export interface ProfileData {
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
    lastSave: 'Sin datos'
  })

  function updateProfile(data: Partial<ProfileData>) {
    profileData.value = { ...profileData.value, ...data }
  }

  function syncProfileFromAuth(user: AuthUser, state: GameState) {
    if (!user) return
    updateProfile({
      username: state.trainer || user.user_metadata?.username || 'Entrenador',
      email: user.email || '—',
      isAdmin: user.user_metadata?.role === 'admin',
      level: state.trainerLevel || 1,
      money: state.money || 0,
      battleCoins: state.battleCoins || 0,
      badges: state.badges || 0,
      stats: state.stats || {},
      faction: state.faction || null,
      notificationHistory: state.notificationHistory || []
    })
  }

  return {
    profileData,
    updateProfile,
    syncProfileFromAuth
  }
})
