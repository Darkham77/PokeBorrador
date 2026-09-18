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
  isAvatarStyleId,
  type NickStyleId,
  type AvatarStyleId
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

interface CosmeticRequirement {
  requiredRole?: string
  requiredClass?: string
}

function checkCosmeticRequirement(
  def: CosmeticRequirement | undefined,
  isAdmin: boolean,
  userClass: string,
  currentLevel: number
): { isEligible: boolean; errorMsg?: string } {
  if (!def) return { isEligible: false, errorMsg: 'Definición no encontrada' }
  if (def.requiredRole === 'admin' && !isAdmin) {
    return { isEligible: false, errorMsg: 'admin' }
  }
  if (def.requiredClass) {
    const isEligible = def.requiredClass === userClass && currentLevel >= COSMETIC_UNLOCK_CLASS_LEVEL
    if (!isEligible) {
      return { isEligible: false, errorMsg: 'class' }
    }
  }
  return { isEligible: true }
}

  function sanitizeEquippedCosmetics() {
    const userClass = gameStore.state.playerClass || ''
    const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)

    // 1. Sanitizar Nick Style
    const currentNick = gameStore.state.nick_style
    if (currentNick && isNickStyleId(currentNick)) {
      const check = checkCosmeticRequirement(NICK_STYLES_BY_ID[currentNick], isAdmin.value, userClass, currentLevel)
      if (!check.isEligible) {
        gameStore.state.nick_style = null
        gameStore.save(false)
      }
    }

    // 2. Sanitizar Avatar Style
    const currentAvatar = gameStore.state.avatar_style
    if (currentAvatar && isAvatarStyleId(currentAvatar)) {
      const check = checkCosmeticRequirement(AVATAR_STYLES_BY_ID[currentAvatar], isAdmin.value, userClass, currentLevel)
      if (!check.isEligible) {
        gameStore.state.avatar_style = null
        gameStore.save(false)
      }
    }
  }

  // --- ACTIONS ---
  async function equipNickStyle(styleId: NickStyleId | null) {
    if (!authStore.user || !gameStore.db) return
    
    // Validación de seguridad antes de equipar
    if (styleId && isNickStyleId(styleId)) {
      const userClass = gameStore.state.playerClass || ''
      const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)
      const check = checkCosmeticRequirement(NICK_STYLES_BY_ID[styleId], isAdmin.value, userClass, currentLevel)
      if (!check.isEligible) {
        if (check.errorMsg === 'admin') {
          throw new Error('No tienes permiso para equipar este estilo de nick')
        }
        throw new Error(`Este estilo de nick requiere la profesión activa y nivel ${COSMETIC_UNLOCK_CLASS_LEVEL}`)
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

  async function equipAvatarStyle(styleId: AvatarStyleId | null) {
    if (!authStore.user || !gameStore.db) return
    
    // Validación de seguridad antes de equipar
    if (styleId && isAvatarStyleId(styleId)) {
      const userClass = gameStore.state.playerClass || ''
      const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)
      const check = checkCosmeticRequirement(AVATAR_STYLES_BY_ID[styleId], isAdmin.value, userClass, currentLevel)
      if (!check.isEligible) {
        if (check.errorMsg === 'admin') {
          throw new Error('No tienes permiso para equipar este marco de avatar')
        }
        throw new Error(`Este marco de avatar requiere la profesión activa y nivel ${COSMETIC_UNLOCK_CLASS_LEVEL}`)
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
    equipNickStyle,
    equipAvatarStyle
  }
})
