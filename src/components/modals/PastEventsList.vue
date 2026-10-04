<script setup lang="ts">
import { useEventStore } from '@/stores/events'
import type { PastEventHistoryItem } from '@/types/system/stores'
import PastEventCard from './PastEventCard.vue'

interface Props {
  pastEvents: PastEventHistoryItem[]
  isLoading?: boolean
}

defineProps<Props>()

const eventStore = useEventStore()

const handleClaim = async (awardId: string) => {
  await eventStore.claimAward(awardId)
}
</script>

<template>
  <div
    id="past-events-history-section"
    class="past-events-section"
  >
    <div class="section-header">
      <div class="section-title-wrap">
        <span class="emoji section-icon">📜</span>
        <h3 class="section-title">
          ÚLTIMOS CONCURSOS Y GANADORES
        </h3>
      </div>
      <span class="section-subtitle">Últimos 20 eventos con recompensa</span>
    </div>

    <div class="past-events-scrollable custom-scrollbar">
      <div
        v-if="isLoading"
        class="empty-history"
      >
        Cargando historial de eventos...
      </div>

      <div
        v-else-if="pastEvents.length === 0"
        class="empty-history"
      >
        No hay concursos concluidos recientemente.
      </div>

      <div
        v-else
        class="past-events-list"
      >
        <PastEventCard
          v-for="item in pastEvents"
          :key="item.id"
          :item="item"
          @claim="handleClaim"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.past-events-section {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 12px;
  background: rgb(0 0 0 / 25%);
  margin-top: 24px;
}

.section-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px 12px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgb(255 255 255 / 6%);

  .section-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .section-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }

  .section-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow);
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .section-subtitle {
    color: var(--gray);
    font-size: 9px;
    white-space: nowrap;
  }
}

.past-events-scrollable {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.past-events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-history {
  padding: 24px;
  color: var(--gray);
  font-size: 11px;
  text-align: center;
  font-style: italic;
}

@media (width <= 480px) {
  .past-events-section {
    padding: 10px 8px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;

    .section-subtitle {
      padding-left: 24px;
    }
  }
}
</style>
