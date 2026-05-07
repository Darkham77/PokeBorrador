import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useAuthStore } from './auth'
import { NICK_STYLES, AVATAR_STYLES } from '@/data/cosmeticsData'

export const useCosmeticsStore = defineStore('cosmetics', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()

  // --- STATE ---
  const isLoading = ref(false)
  
  // Getters for available styles from data
  const allNickStyles = computed(() => NICK_STYLES)
  const allAvatarStyles = computed(() => AVATAR_STYLES)

  // Current equipped styles (from profile)
  const equippedNickStyle = computed(() => gameStore.state.nick_style || null)
  const equippedAvatarStyle = computed(() => gameStore.state.avatar_style || null)

  // --- ACTIONS ---
  async function equipNickStyle(styleId: string) {
    if (!authStore.user || !gameStore.db) return
    
    isLoading.value = true
    try {
      const { error } = await gameStore.db
        .from('profiles')
        .update({ nick_style: styleId })
        .eq('id', authStore.user.id)

      if (!error) {
        gameStore.state.nick_style = styleId
        gameStore.save(false)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function equipAvatarStyle(styleId: string) {
    if (!authStore.user || !gameStore.db) return
    
    isLoading.value = true
    try {
      const { error } = await gameStore.db
        .from('profiles')
        .update({ avatar_style: styleId })
        .eq('id', authStore.user.id)

      if (!error) {
        gameStore.state.avatar_style = styleId
        gameStore.save(false)
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    allNickStyles,
    allAvatarStyles,
    equippedNickStyle,
    equippedAvatarStyle,
    isLoading,
    equipNickStyle,
    equipAvatarStyle
  }
})
