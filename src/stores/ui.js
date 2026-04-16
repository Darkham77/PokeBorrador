import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const isProfileOpen = ref(false)
  const isSettingsOpen = ref(false)
  const isHistoryOpen = ref(false)
  const isLibraryOpen = ref(false)
  const activeTab = ref('map')

  const profileData = ref({
    username: '—',
    email: '—',
    isAdmin: false,
    level: 1,
    badges: 0,
    money: 0,
    battleCoins: 0,
    stats: {
      wins: 0,
      trainersDefeated: 0
    },
    faction: null,
    nick_style: '',
    notificationHistory: [],
    lastSave: 'Sin datos'
  })

  function toggleProfile() { isProfileOpen.value = !isProfileOpen.value }
  function toggleSettings() { isSettingsOpen.value = !isSettingsOpen.value }
  function toggleHistory() { isHistoryOpen.value = !isHistoryOpen.value }
  
  function toggleLibrary() {
    isLibraryOpen.value = !isLibraryOpen.value
    if (isLibraryOpen.value && typeof window.switchLibraryTab === 'function') {
      setTimeout(() => {
        const firstTab = document.querySelector('.library-nav-item')
        if (firstTab) window.switchLibraryTab('gimnasios', firstTab)
      }, 50)
    }
  }

  function closeAll() {
    isProfileOpen.value = false
    isSettingsOpen.value = false
    isHistoryOpen.value = false
    isLibraryOpen.value = false
  }

  function updateProfile(data) {
    profileData.value = { ...profileData.value, ...data }
  }

  return {
    isProfileOpen,
    isSettingsOpen,
    isHistoryOpen,
    isLibraryOpen,
    activeTab,
    profileData,
    toggleProfile,
    toggleSettings,
    toggleHistory,
    toggleLibrary,
    closeAll,
    updateProfile
  }
})
