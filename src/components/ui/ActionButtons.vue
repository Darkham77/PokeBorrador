<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import PVHUDButton from '@/components/common/PVHUDButton.vue'
const uiStore = useUIStore()
const modalStore = useModalStore()
</script>

<template>
  <div
    class="action-buttons"
    v-bind="$attrs"
  >
    <PVHUDButton
      id="hud-profile-btn"
      :active="modalStore.isOpen('Profile')"
      @click.stop="uiStore.toggleProfile()"
    >
      <template #icon>
        👤
      </template>
      Perfil
    </PVHUDButton>

    <PVHUDButton
      id="hud-settings-btn"
      :active="modalStore.isOpen('Settings')"
      @click.stop="uiStore.toggleSettings()"
    >
      <template #icon>
        ⚙️
      </template>
      Ajustes
    </PVHUDButton>

    <PVHUDButton
      id="hud-library-btn"
      :active="modalStore.isOpen('Library')"
      @click.stop="uiStore.toggleLibrary()"
    >
      <template #icon>
        📖
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
