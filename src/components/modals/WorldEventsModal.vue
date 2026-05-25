<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EventCard from './EventCard.vue'
import { useEventStore } from '@/stores/events'
import { storeToRefs } from 'pinia'
import { useWindowListener } from '@/composables/useWindowListener'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const eventStore = useEventStore()
const { activeEvents, pendingAwards, isLoading } = storeToRefs(eventStore)

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

onMounted(() => {
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
})
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '650px'"
    :height="isSmallScreen ? '100dvh' : 'auto'"
    variant="retro"
    padding="raw"
    accent-color="var(--yellow)"
    @close="emit('close')"
  >
    <template #header>
      <div class="events-modal-header">
        <div class="events-title-group">
          <span class="title-icon">🏆</span>
          <div class="title-text-wrap">
            <span class="main-title">EVENTOS MUNDIALES</span>
            <span class="sub-title">Compite con entrenadores de todo el mundo</span>
          </div>
        </div>
        <button
          class="retro-btn refresh"
          :disabled="isLoading"
          @click.stop="eventStore.fetchEvents()"
        >
          REFRESCAR
        </button>
      </div>
    </template>

    <div class="events-modal-content-inner custom-scrollbar">
      <!-- PENDING AWARDS BOX (Retro Reward Style) -->
      <div
        v-if="pendingAwards.length > 0"
        class="awards-box"
      >
        <div class="box-inner">
          <h3>🎁 RECOMPENSAS PENDIENTES</h3>
          <div class="awards-list">
            <div
              v-for="award in pendingAwards"
              :key="award.id"
              class="award-item"
            >
              <div class="award-info">
                <span class="award-name">{{ award.event_id }}</span>
                <span class="award-prize">{{ award.prize_summary || 'Premio Reclamable' }}</span>
              </div>
              <button
                class="retro-btn claim"
                @click.stop="eventStore.claimAward(award.id)"
              >
                RECLAMAR
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIVE EVENTS GRID -->
      <div class="events-grid">
        <div
          v-if="activeEvents.length === 0"
          class="no-events"
        >
          {{ isLoading ? 'Cargando eventos...' : 'No hay eventos activos en este momento.' }}
        </div>

        <EventCard
          v-for="event in activeEvents"
          :key="event.id"
          :event="event"
        />
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.events-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 48px; // Leave space for BaseModal close button
}

.events-title-group {
  display: flex;
  align-items: center;
  gap: 12px;

  .title-icon {
    font-size: 24px;
    filter: Drop-Shadow(0 0 8px Rgba(255, 215, 0, 0.4));
  }

  .title-text-wrap {
    display: flex;
    flex-direction: column;
  }

  .main-title {
    @include pixelated;
    font-size: 14px;
    color: var(--yellow);
    text-shadow: 0 2px 0 var(--black);
    line-height: 1.2;
  }

  .sub-title {
    font-size: 10px;
    color: var(--gray);
    margin-top: 2px;
  }
}

.events-modal-content-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 2px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.12);
    transform: Translatey(-2px);
    border-color: Rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.refresh {
    font-size: 8px;
    padding: 6px 10px;
  }

  &.claim {
    background: var(--green);
    border-color: var(--green-bright);
    color: var(--white);
  }
}

/* REWARD BOX */
.awards-box {
  background: Rgba(34, 197, 94, 0.05);
  border: 1px solid Rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;

  .box-inner {
    background: Rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 12px;
  }

  h3 {
    @include pixelated;
    font-size: 9px;
    color: var(--green-bright);
    margin-bottom: 10px;
  }

  .award-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .award-info {
      display: flex;
      flex-direction: column;
    }

    .award-name {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 2px;
    }

    .award-prize {
      font-size: 10px;
      color: var(--gray);
    }
  }
}

/* GRID */
.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.no-events {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  color: var(--gray);
  font-style: italic;
  font-size: 12px;
}
</style>
