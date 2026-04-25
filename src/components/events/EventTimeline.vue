<script setup>
import { onMounted } from 'vue';
import { useEventStore } from '@/stores/events';

const eventStore = useEventStore();

onMounted(() => {
  eventStore.fetchEvents();
});

const getBonusColor = (key) => {
  const map = {
    expMult: 'Rgba(167, 139, 250, 1)',
    moneyMult: 'Rgba(251, 191, 36, 1)',
    bcMult: 'Rgba(96, 165, 250, 1)',
    shinyMult: 'Rgba(244, 114, 182, 1)',
    eggShinyMult: 'Rgba(244, 114, 182, 1)',
    hatchMult: 'Rgba(52, 211, 153, 1)'
  };
  return map[key] || 'Rgba(148, 163, 184, 1)';
};

const formatBonus = (key, val) => {
  const map = {
    expMult: 'EXP',
    moneyMult: 'DINERO',
    bcMult: 'BATTLE COINS',
    shinyMult: 'SHINY RATE',
    eggShinyMult: 'SHINY (HUEVOS)',
    hatchMult: 'ECLOSIÓN'
  };
  return `${map[key] || key} x${val}`;
};
</script>

<template>
  <div class="event-timeline">
    <header class="timeline-header">
      <h3 class="press-start">
        EVENTOS ACTIVOS
      </h3>
      <button
        class="refresh-btn"
        :disabled="eventStore.isLoading"
        @click.stop="eventStore.fetchEvents"
      >
        <span v-if="eventStore.isLoading">...</span>
        <span v-else>🔄</span>
      </button>
    </header>

    <div
      v-if="eventStore.activeEvents.length === 0"
      class="empty-state"
    >
      <div class="icon">
        📅
      </div>
      <p>No hay eventos activos en este momento.</p>
    </div>

    <!-- Active Events List -->
    <div class="event-list">
      <div
        v-for="ev in eventStore.activeEvents"
        :key="ev.id"
        class="event-card"
      >
        <div class="ev-header">
          <span class="ev-icon">{{ ev.icon || '🎁' }}</span>
          <div class="ev-title-group">
            <h4 class="press-start">
              {{ ev.name }}
            </h4>
            <p>{{ ev.description }}</p>
          </div>
          <div
            v-if="ev.config?.hasCompetition"
            class="competition-tag"
          >
            <span class="press-start">CONCURSO</span>
          </div>
        </div>

        <!-- Bonuses Section -->
        <div class="bonuses-grid">
          <template
            v-for="(val, key) in ev.config"
            :key="key"
          >
            <div
              v-if="val > 1 && getBonusColor(key) !== 'Rgba(148, 163, 184, 1)'" 
              class="bonus-pill" 
              :style="{ backgroundColor: getBonusColor(key) + '15', borderColor: getBonusColor(key) + '40', color: getBonusColor(key) }"
            >
              {{ formatBonus(key, val) }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Finished Events (Recently) -->
    <div
      v-if="eventStore.finishedEvents.length > 0"
      class="finished-section"
    >
      <h3 class="press-start section-title">
        RECIENTES
      </h3>
      <div class="finished-list">
        <div
          v-for="res in eventStore.finishedEvents"
          :key="res.id"
          class="finished-card"
        >
          <div class="finished-info">
            <span class="res-title press-start">{{ res.event_id.replace(/_/g, ' ').toUpperCase() }}</span>
            <p>Finalizado hace poco</p>
          </div>
          <div
            v-if="res.winners?.first"
            class="winner-preview"
          >
            🥇 {{ res.winners.first.player_name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: Rgba(15, 23, 42, 0.8);
  padding: 24px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: var(--white);
}

.press-start {
  @include pixelated;
  font-size: 8px;
  letter-spacing: 1px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  h3 { color: Rgba(251, 191, 36, 1); }
  .refresh-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    opacity: 0.6;
    transition: opacity 0.2s;
    &:hover { opacity: 1; }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: $muted;
  .icon { font-size: 40px; margin-bottom: 10px; opacity: 0.5; }
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.event-card {
  background: linear-gradient(135deg, Rgba(255, 255, 255, 0.05), Rgba(255, 255, 255, 0.02));
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  transition: transform 0.2s;

  &:hover { transform: Scale(1.01); border-color: Rgba(251, 191, 36, 0.4); }

  .ev-header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 16px;

    .ev-icon { font-size: 32px; }
    .ev-title-group {
      flex: 1;
      h4 { margin-bottom: 6px; color: var(--white); }
      p { font-size: 11px; color: Rgba(148, 163, 184, 1); line-height: 1.4; }
    }

    .competition-tag {
      background: Rgba(251, 191, 36, 0.1);
      color: Rgba(251, 191, 36, 1);
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid Rgba(251, 191, 36, 0.2);
    }
  }

  .bonuses-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .bonus-pill {
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 800;
    border: 1px solid transparent;
  }
}

.finished-section {
  margin-top: 20px;
  border-top: 1px solid Rgba(255, 255, 255, 0.05);
  padding-top: 20px;

  .section-title { color: $muted; margin-bottom: 16px; }

  .finished-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .finished-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: Rgba(0, 0, 0, 0.2);
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid Rgba(255, 255, 255, 0.03);

    .res-title { font-size: 7px; color: Rgba(203, 213, 225, 1); display: block; margin-bottom: 4px; }
    p { font-size: 10px; color: $muted; margin: 0; }

    .winner-preview {
      font-size: 11px;
      color: Rgba(251, 191, 36, 1);
      font-weight: 600;
    }
  }
}
</style>
