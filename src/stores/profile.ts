import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProfileStore = defineStore('profile', () => {
  const profileData = ref({
    username: '—',
    email: '—',
    isAdmin: false,
    level: 1,
    badges: 0,
    money: 0,
    battleCoins: 0,
    stats: { wins: 0, trainersDefeated: 0 },
    faction: null,
    nick_style: '',
    notificationHistory: [],
    lastSave: 'Sin datos'
  })

  function updateProfile(data) {
    profileData.value = { ...profileData.value, ...data }
  }

  function syncProfileFromAuth(user, state = {}) {
    if (!user) return
    updateProfile({
      username: (state as any).trainer || user.user_metadata?.username || 'Entrenador',
      email: user.email || '—',
      isAdmin: user.user_metadata?.role === 'admin',
      level: (state as any).trainerLevel || 1,
      money: (state as any).money || 0,
      battleCoins: (state as any).battleCoins || 0,
      badges: (state as any).badges || 0,
      stats: (state as any).stats || { wins: 0, trainersDefeated: 0 },
      faction: (state as any).faction || null,
      notificationHistory: (state as any).notificationHistory || []
    })
  }

  return {
    profileData,
    updateProfile,
    syncProfileFromAuth
  }
})
