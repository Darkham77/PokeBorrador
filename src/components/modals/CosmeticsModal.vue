<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCosmeticsStore } from '@/stores/player/cosmetics'
import { useProfileStore } from '@/stores/player/profile'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import AvatarFrameSelector from '@/components/modals/AvatarFrameSelector.vue'
import CosmeticsNickStyleCard from './CosmeticsNickStyleCard.vue'


interface Props {
  id?: string
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  id: 'cosmetics-modal',
  show: true
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUIStore()
const cosmeticsStore = useCosmeticsStore()
const profileStore = useProfileStore()
const gameStore = useGameStore()
const authStore = useAuthStore()

const previewUsername = computed(() => {
  const pName = profileStore.profileData.username
  if (pName && pName !== '—' && pName.trim().length > 0) return pName
  return gameStore.state.trainer || (authStore.user?.user_metadata?.username as string) || 'Entrenador'
})

const closeCosmetics = () => {
  emit('close')
}

import {
  isCosmeticStyleLocked,
  resolveCosmeticLockNotification,
  checkIsLocalEnvironment,
  type LockableCosmeticStyle,
  type CosmeticPlayerContext
} from './cosmeticsFilterHelper'

const isLocal = computed(() => {
  const hn = typeof window !== 'undefined' ? window.location.hostname : undefined
  return checkIsLocalEnvironment(import.meta.env.DEV, hn)
})

const isAdmin = computed(() => {
  return authStore.user?.role === 'admin' || isLocal.value
})

const playerContext = computed<CosmeticPlayerContext>(() => ({
  playerClass: gameStore.state.playerClass,
  classLevel: gameStore.state.classLevel,
  trainerLevel: gameStore.state.trainerLevel,
  faction: gameStore.state.faction,
  isAdmin: isAdmin.value
}))

const isNickLocked = (style: LockableCosmeticStyle) => {
  return isCosmeticStyleLocked(style, playerContext.value)
}

const selectNick = (style: LockableCosmeticStyle) => {
  const lockNotice = resolveCosmeticLockNotification(style, 'estilo', playerContext.value)
  if (lockNotice) {
    uiStore.notify(lockNotice, '🔒')
    return
  }
  cosmeticsStore.equipNickStyle(style.id)
}
</script>

<template>
  <BaseModal
    :id="id"
    :show="show"
    title="VESTIDOR COSMÉTICO"
    max-width="650px"
    :z-index="12000"
    variant="retro"
    @close="closeCosmetics"
  >
    <div class="cosmetics-modal-internal">
      <!-- Nick Styles -->
      <section class="style-section">
        <div class="section-header">
          <h3>Estilos de Nick</h3>
          <span class="badge">CHAT &amp; PERFIL</span>
        </div>
        <p class="section-desc">
          Personalizá cómo los demás ven tu nombre.
        </p>

        <div class="styles-grid">
          <CosmeticsNickStyleCard
            v-for="style in cosmeticsStore.allNickStyles"
            :key="style.id"
            :style-data="style"
            :preview-username="previewUsername"
            :is-active="cosmeticsStore.equippedNickStyle === style.id"
            :is-locked="isNickLocked(style)"
            @select="selectNick(style)"
          />
        </div>
      </section>

      <!-- Avatar Styles -->
      <AvatarFrameSelector />
    </div>

    <template #footer>
      <div class="modal-footer-internal">
        <p>Los cambios se guardan instantáneamente en tu perfil de entrenador.</p>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/_cosmetics-shared";

.cosmetics-modal-internal {
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 10px;
}

.style-card {
  .preview-area {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 44px;
  }

  .preview-nick {
    font-size: 16px;
    font-weight: 800;
    text-align: center;
    white-space: nowrap;
  }
}

.modal-footer-internal {
  text-align: center;
  p { color: rgb(71 85 105 / 100%); font-size: 11px; }
}
</style>
