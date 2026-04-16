<script setup>
import { onMounted } from 'vue'
import { useEventStore } from '@/stores/events'
import { storeToRefs } from 'pinia'

const eventStore = useEventStore()
const { activeEvents, pendingAwards, isLoading } = storeToRefs(eventStore)

onMounted(() => {
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
})

const formatTime = (isoTime) => {
  const diff = new Date(isoTime) - new Date()
  if (diff <= 0) return 'Terminando...'
  const min = Math.floor(diff / 60000)
  const sec = Math.floor((diff % 60000) / 1000)
  return `${min}m ${sec}s`
}
</script>

<template>
  <div class="events-view custom-scrollbar">
    <!-- LEGACY HEADER -->
    <header class="events-header">
      <div class="header-left">
        <span class="icon">🏆</span>
        <div class="title-group">
          <h1>EVENTOS MUNDIALES</h1>
          <p>Compite con entrenadores de todo el mundo</p>
        </div>
      </div>
      <button
        class="retro-btn refresh"
        :disabled="isLoading"
        @click="eventStore.fetchEvents()"
      >
        {{ isLoading ? '...' : 'REFRESCAR' }}
      </button>
    </header>

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
              @click="eventStore.claimAward(award.id)"
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
        v-if="activeEvents.length === 0 && !isLoading"
        class="no-events"
      >
        No hay eventos activos en este momento.
      </div>

      <div
        v-for="event in activeEvents"
        :key="event.id"
        class="event-card"
        :class="{ 'has-banner': event.config?.banner }"
      >
        <!-- Banner with Pixel border overlay if needed, but legacy used simple borders -->
        <div
          v-if="event.config?.banner"
          class="banner-box"
        >
          <img
            :src="`assets/eventos/${event.config.banner}`"
            @error="e => e.target.style.display='none'"
          >
        </div>
        
        <div class="card-body">
          <div class="body-header">
            <div class="event-id-icon">
              {{ event.icon }}
            </div>
            <div class="event-main-meta">
              <h2>{{ event.name }}</h2>
              <span
                class="type-tag"
                :class="event.type"
              >{{ event.type === 'competition' ? 'COMPETICIÓN' : 'EVENTO' }}</span>
            </div>
          </div>

          <p class="description">
            {{ event.description }}
          </p>

          <footer class="card-footer">
            <div class="timer-box">
              <span class="label">FINALIZA EN:</span>
              <span class="value">{{ formatTime(event.ends_at) }}</span>
            </div>
            <button class="retro-btn action">
              PARTICIPAR
            </button>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.events-view {
  height: 100%;
  padding: 25px;
  background: #0d1117;
  color: #fff;
  overflow-y: auto;
}

/* 1:1 LEGACY COMPONENT STYLES */

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.05);

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .icon { font-size: 32px; filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.4)); }

  h1 {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    color: #ffd700;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 0 #000;
  }
  p { font-size: 10px; color: #888; margin: 0; }
}

.retro-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.12);
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.2);
  }

  &.claim { background: #22c55e; border-color: #4ade80; color: #fff; }
  &.action { background: #ffd700; border-color: #fff; color: #000; text-shadow: none; }
}

/* REWARD BOX */

.awards-box {
  background: #22c55e11;
  border: 1px solid #22c55e44;
  border-radius: 16px;
  padding: 4px;
  margin-bottom: 30px;

  .box-inner {
    background: rgba(0,0,0,0.3);
    border-radius: 12px;
    padding: 15px;
  }

  h3 {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    color: #4ade80;
    margin-bottom: 15px;
  }

  .award-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 12px 18px;
    border-radius: 12px;
    margin-bottom: 10px;

    .award-name { display: block; font-weight: bold; font-size: 13px; margin-bottom: 4px; }
    .award-prize { font-size: 11px; color: #94a3b8; }
  }
}

/* GRID */

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.event-card {
  background: #1c2128;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &:hover { border-color: #ffd70088; transform: translateY(-3px); }

  .banner-box {
    height: 150px;
    background: #000;
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  .card-body { padding: 20px; }

  .body-header {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;

    .event-id-icon {
      width: 50px; height: 50px;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      border: 1px solid rgba(255,255,255,0.05);
    }

    h2 { font-size: 15px; font-weight: bold; margin: 0 0 6px 0; }
    .type-tag {
      font-size: 8px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #3b82f622;
      color: #60a5fa;
      font-weight: bold;
    }
  }

  .description { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; flex: 1; }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    .timer-box {
      .label { display: block; font-size: 8px; color: #64748b; margin-bottom: 5px; }
      .value { font-family: 'Press Start 2P', monospace; font-size: 9px; color: #f87171; }
    }
  }
}

.no-events {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
  border: 1px dashed rgba(255,255,255,0.1);
  color: #555;
  font-style: italic;
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
