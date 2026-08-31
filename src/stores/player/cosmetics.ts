import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { useAuthStore } from '@/stores/auth.ts'
import { 
  NICK_STYLES, 
  AVATAR_STYLES, 
  NICK_STYLES_BY_ID, 
  AVATAR_STYLES_BY_ID, 
  isNickStyleId,
  isAvatarStyleId
} from '@/data/player/cosmeticsData'
import { COSMETIC_UNLOCK_CLASS_LEVEL } from '@/logic/player/classMath'

export const useCosmeticsStore = defineStore('cosmetics', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()

  // --- STATE ---
  const isLoading = ref(false)
  
  // Getters for available styles from data
  const allNickStyles = computed(() => NICK_STYLES)
  const allAvatarStyles = computed(() => AVATAR_STYLES)

  // Current equipped styles (from profile)
  const equippedNickStyle = computed(() => gameStore.state.nick_style || '')
  const equippedAvatarStyle = computed(() => gameStore.state.avatar_style || '')

  // Check if context is local development
  const isLocal = computed(() => {
    if (import.meta.env.DEV) return true
    if (typeof window !== 'undefined') {
      const hn = window.location.hostname
      return hn === 'localhost' || hn === '127.0.0.1' || hn.endsWith('.local')
    }
    return false
  })

  // Check if user is admin (local development counts as admin)
  const isAdmin = computed(() => {
    return authStore.user?.role === 'admin' || isLocal.value
  })

  // --- REACTIVE SANITIZATION WATCHER ---
  watch(
    [
      computed(() => gameStore.state.playerClass),
      computed(() => authStore.user?.role)
    ],
    () => {
      sanitizeEquippedCosmetics()
    },
    { immediate: true }
  )

  function sanitizeEquippedCosmetics() {
    const userClass = gameStore.state.playerClass || ''
    const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)

    // 1. Sanitizar Nick Style
    const currentNick = gameStore.state.nick_style || ''
    if (currentNick && isNickStyleId(currentNick)) {
      const nickDef = NICK_STYLES_BY_ID[currentNick]
      if (nickDef) {
        let shouldReset = false
        if (nickDef.requiredRole === 'admin' && !isAdmin.value) {
          shouldReset = true
        }
        if (nickDef.requiredClass) {
          const isEligible = nickDef.requiredClass === userClass && currentLevel >= COSMETIC_UNLOCK_CLASS_LEVEL
          if (!isEligible) {
            shouldReset = true
          }
        }
        if (shouldReset) {
          gameStore.state.nick_style = null
          gameStore.save(false)
        }
      }
    }

    // 2. Sanitizar Avatar Style
    const currentAvatar = gameStore.state.avatar_style || ''
    if (currentAvatar && isAvatarStyleId(currentAvatar)) {
      const avatarDef = AVATAR_STYLES_BY_ID[currentAvatar]
      if (avatarDef) {
        let shouldReset = false
        if (avatarDef.requiredRole === 'admin' && !isAdmin.value) {
          shouldReset = true
        }
        if (avatarDef.requiredClass) {
          const isEligible = avatarDef.requiredClass === userClass && currentLevel >= COSMETIC_UNLOCK_CLASS_LEVEL
          if (!isEligible) {
            shouldReset = true
          }
        }
        if (shouldReset) {
          gameStore.state.avatar_style = null
          gameStore.save(false)
        }
      }
    }
  }

  // --- ACTIONS ---
  async function equipNickStyle(styleId: string) {
    if (!authStore.user || !gameStore.db) return
    
    // Validación de seguridad antes de equipar
    if (styleId && isNickStyleId(styleId)) {
      const styleDef = NICK_STYLES_BY_ID[styleId]
      if (styleDef) {
        const userClass = gameStore.state.playerClass || ''
        const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)
        if (styleDef.requiredRole === 'admin' && !isAdmin.value) {
          throw new Error('No tienes permiso para equipar este estilo de nick')
        }
        if (styleDef.requiredClass) {
          const isEligible = styleDef.requiredClass === userClass && currentLevel >= COSMETIC_UNLOCK_CLASS_LEVEL
          if (!isEligible) {
            throw new Error(`Este estilo de nick requiere la profesión activa y nivel ${COSMETIC_UNLOCK_CLASS_LEVEL}`)
          }
        }
      }
    }

    isLoading.value = true
    try {
      const { error } = await gameStore.db
        .from('profiles')
        .update({ nick_style: styleId || null })
        .eq('id', authStore.user.id)

      if (!error) {
        gameStore.state.nick_style = styleId || null
        gameStore.save(false)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function equipAvatarStyle(styleId: string) {
    if (!authStore.user || !gameStore.db) return
    
    // Validación de seguridad antes de equipar
    if (styleId && isAvatarStyleId(styleId)) {
      const styleDef = AVATAR_STYLES_BY_ID[styleId]
      if (styleDef) {
        const userClass = gameStore.state.playerClass || ''
        const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)
        if (styleDef.requiredRole === 'admin' && !isAdmin.value) {
          throw new Error('No tienes permiso para equipar este marco de avatar')
        }
        if (styleDef.requiredClass) {
          const isEligible = styleDef.requiredClass === userClass && currentLevel >= COSMETIC_UNLOCK_CLASS_LEVEL
          if (!isEligible) {
            throw new Error(`Este marco de avatar requiere la profesión activa y nivel ${COSMETIC_UNLOCK_CLASS_LEVEL}`)
          }
        }
      }
    }

    isLoading.value = true
    try {
      const { error } = await gameStore.db
        .from('profiles')
        .update({ avatar_style: styleId || null })
        .eq('id', authStore.user.id)

      if (!error) {
        gameStore.state.avatar_style = styleId || null
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
    equipAvatarStyle,
    sanitizeEquippedCosmetics
  }
})
