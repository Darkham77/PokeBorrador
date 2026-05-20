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
    :max-width="isSmallScreen ? '100dvw' : '650px'"
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
        
        <div class="header-stats-clean">
          <span class="stat-label">DISPONIBLES:</span>
          <span class="value">{{ breedingStore.dailyMissions.filter(m => !m.completed).length }}</span>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
  height: 100%;
}

.missions-title-group {
  display: flex;
  align-items: center;
  gap: 12px;

  .title-icon {
    font-size: 24px;
    filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.2));
  }

  .title-text-wrap {
    display: flex;
    flex-direction: column;
    
    .main-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 1.25rem;
      letter-spacing: 0.5px;
      color: #fff;
      text-shadow: 0 2px 4px Rgba(0, 0, 0, 0.3);
    }

    .sub-title {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--pokecenter-pink);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
  }
}

.header-stats-clean {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  padding: 0;

  .stat-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.7);
  }

  .value {
    @include pixelated;
    font-size: 16px;
    font-weight: 900;
    color: var(--yellow);
  }
}

.missions-modal-content-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}
</style>
