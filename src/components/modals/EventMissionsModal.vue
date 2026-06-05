<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EventMissions from '@/components/events/EventMissions.vue';
import { useBreedingStore } from '@/stores/breeding';
import { useWindowListener } from '@/composables/useWindowListener';

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: false
});

const breedingStore = useBreedingStore();

const isSmallScreen = ref(window.innerWidth <= 950);
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950; };
useWindowListener('resize', handleResize);

const emit = defineEmits<{
  close: []
}>()

onMounted(() => {
  breedingStore.loadDaycare();
  breedingStore.checkDailyReset();
});
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '850px'"
    :height="isSmallScreen ? '100dvh' : 'auto'"
    variant="retro"
    padding="raw"
    accent-color="var(--pokecenter-pink)"
    @close="emit('close')"
  >
    <!-- Premium Header Slot -->
    <template #header>
      <div class="missions-modal-header">
        <div class="missions-title-group">
          <span class="title-icon">📜</span>
          <div class="title-text-wrap">
            <span class="main-title">MISIONES</span>
            <span class="sub-title">EVENTOS</span>
          </div>
        </div>
        
        <div class="header-stats">
          <div class="stat-node">
            <span class="shop-stat-label">DISPONIBLES</span>
            <span class="value">{{ breedingStore.dailyMissions.filter(m => !m.completed).length }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="missions-modal-content-inner custom-scrollbar">
      <EventMissions />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.missions-modal-header {
  @include shop-header;

  .missions-title-group {
    @include shop-header-title(var(--pokecenter-pink));
  }

  .header-stats {
    display: flex;
    gap: 24px;

    .stat-node {
      @include shop-header-stat(var(--pokecenter-pink));
    }
  }
}

.missions-modal-content-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}
</style>
