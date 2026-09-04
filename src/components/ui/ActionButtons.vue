<script setup lang="ts">
import { onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import PVHUDButton from '@/components/common/PVHUDButton.vue'

const uiStore = useUIStore()
const modalStore = useModalStore()

const preloadHudModals = () => {
  import('@/components/modals/ProfileModal.vue').catch(() => { /* optional prefetch */ })
  import('@/components/modals/SettingsModal.vue').catch(() => { /* optional prefetch */ })
  import('@/components/modals/LibraryModal.vue').catch(() => { /* optional prefetch */ })
}

onMounted(() => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(preloadHudModals)
  } else {
    preloadHudModals()
  }
})
</script>

<template>
  <div
    class="action-buttons"
    v-bind="$attrs"
    @mouseenter="preloadHudModals"
  >
    <PVHUDButton
      id="hud-profile-btn"
      :active="modalStore.isOpen('Profile')"
      @click.stop="uiStore.toggleProfile()"
    >
      <template #icon>
        <span class="emoji">👤</span>
      </template>
      Perfil
    </PVHUDButton>

    <PVHUDButton
      id="hud-settings-btn"
      :active="modalStore.isOpen('Settings')"
      @click.stop="uiStore.toggleSettings()"
    >
      <template #icon>
        <span class="emoji">⚙️</span>
      </template>
      Ajustes
    </PVHUDButton>

    <PVHUDButton
      id="hud-library-btn"
      :active="modalStore.isOpen('Library')"
      @click.stop="uiStore.toggleLibrary()"
    >
      <template #icon>
        <span class="emoji">📖</span>
      </template>
      Libro
    </PVHUDButton>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
