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
      username: state.trainer || user.user_metadata?.username || 'Entrenador',
      email: user.email || '—',
      isAdmin: user.user_metadata?.role === 'admin',
      level: state.trainerLevel || 1,
      money: state.money || 0,
      battleCoins: state.battleCoins || 0,
      badges: state.badges || 0,
      stats: state.stats || { wins: 0, trainersDefeated: 0 },
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
