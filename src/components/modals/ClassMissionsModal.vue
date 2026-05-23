<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWindowListener } from '@/composables/useWindowListener'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useGameStore } from '@/stores/game'
import { getEloTier } from '@/logic/pvp/rankedEngine'
import BaseModal from '@/components/common/BaseModal.vue'

// Sub-components
import ClassDashboard from './class/ClassDashboard.vue'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

defineOptions({ inheritAttrs: false })
const emit = defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gameStore = useGameStore()

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

const currentClass = computed(() => classStore.currentClassDef)
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1)
const trainerRank = computed(() => getEloTier(gameStore.state.eloRating).name)

const close = () => { emit('close') }

const handleSelect = () => {
  uiStore.open('ClassSelection')
  close()
}
</script>

<template>
  <BaseModal
    :show="show"
    title="GESTIÓN DE CLASE"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :title-color="currentClass?.color || 'var(--yellow)'"
    :header-background="currentClass ? (currentClass.color + '1A') : 'rgba(15, 23, 42, 0.8)'"
    :max-width="isSmallScreen ? '100dvw' : '1000px'"
    :show-close-button="true"
    padding="raw"
    @close="close"
  >
    <div 
      class="class-modal-shell custom-scrollbar-vicio"
      :style="{ '--cls-color': currentClass?.color || '#3b82f6' }"
    >
      <ClassDashboard
        :current-class="currentClass"
        :trainer-level="trainerLevel"
        :trainer-rank="trainerRank"
        @change-class="handleSelect"
        @close="close"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.class-modal-shell {
  min-height: 400px;
  height: 100%;
  background: transparent;
  color: $white;
  display: flex;
  flex-direction: column;

  @media (max-width: 950px) {
    min-height: auto;
    height: 100% !important;
    overflow-y: auto !important;
    @include smooth-scroll;

    // Premium scrollbar fallback for standard browser engines
    scrollbar-width: thin !important;
    scrollbar-color: Rgba(255, 255, 255, 0.3) Rgba(0, 0, 0, 0.1) !important;
  }
}
</style>
