<script setup lang="ts">
import { computed } from 'vue';

import BaseModal from '@/components/common/BaseModal.vue';
import { getEloTier } from '@/logic/pvp/rankedEngine';
import { useGameStore } from '@/stores/game';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { useUIStore } from '@/stores/ui';

// Sub-components
import ClassDashboard from './class/ClassDashboard.vue';

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: false
});

defineOptions({ inheritAttrs: false });
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUIStore();
const classStore = usePlayerClassStore();
const gameStore = useGameStore();

const ui = useUIStore();
const isSmallScreen = computed(() => ui.isSmallScreen);

const currentClass = computed(() => classStore.currentClassDef);
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);
const classLevel = computed(() => classStore.classLevel);
const trainerRank = computed(() => getEloTier(gameStore.state.eloRating).name);

const close = (): void => {
  emit('close');
};

const handleSelect = (): void => {
  uiStore.open('ClassSelection');
  close();
};
</script>

<template>
  <BaseModal
    :show="show"
    title="GESTIÓN DE CLASE"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :title-color="currentClass?.color || 'var(--yellow)'"
    :header-background="currentClass ? currentClass.color + '1A' : 'rgba(15, 23, 42, 0.8)'"
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
        id="class-missions-modal-classdashboard-1"
        :current-class="currentClass"
        :trainer-level="trainerLevel"
        :class-level="classLevel"
        :trainer-rank="trainerRank"
        @change-class="handleSelect"
        @close="close"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.class-modal-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
  background: transparent;
  color: $white;

  @media (width <= 950px) {
    @include smooth-scroll;

    height: 100% !important;
    min-height: auto;
    overflow-y: auto !important;

    // Premium scrollbar fallback for standard browser engines
    scrollbar-width: thin !important;
    scrollbar-color: Rgb(255 255 255 / 30%) Rgb(0 0 0 / 10%) !important;
  }
}
</style>
