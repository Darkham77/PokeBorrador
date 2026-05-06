<script setup lang="ts">
import { onMounted } from 'vue'
import { useEventStore } from '@/stores/events'
import { storeToRefs } from 'pinia'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const eventStore = useEventStore() as any
const { activeEvents, pendingAwards, isLoading } = storeToRefs(eventStore) as any

onMounted(() => {
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
})

const formatTime = (isoTime: string) => {
  if (!isoTime) return 'Indefinido'
  const diff = new Date(isoTime).getTime() - new Date().getTime()
  if (diff <= 0) return 'Terminando...'
  const min = Math.floor(diff / 60000)
  const sec = Math.floor((diff % 60000) / 1000)
  return `${min}m ${sec}s`
}

const openParticipationModal = (event: any) => {
  (window as any)._openPokemonSelectionModal({
    title: 'SELECCIONAR POKÉMON',
    subtitle: `Elige un Pokémon para inscribir en: ${event.name}`,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    onConfirm: async (selectedObjects: any[]) => {
      const pokemon = selectedObjects[0];
      if (pokemon) {
        await eventStore.submitCompetitionEntry(pokemon, event.id);
      }
    }
  })
}
</script>

<template>
  <div class="events-view">
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
        @click.stop="eventStore.fetchEvents()"
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
            :src="getAssetUrl(ASSET_TYPES.BANNER, event.config.banner)"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display='none'"
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
            
            <button 
              v-if="event.type === 'competition'" 
              class="retro-btn action"
              @click.stop="openParticipationModal(event)"
            >
              PARTICIPAR
            </button>
            <div 
              v-else 
              class="active-badge"
            >
              ✨ ACTIVO
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.events-view {
  padding: 0 0 40px;
  background: var(--bg-dark);
  color: var(--white);
}

/* 1:1 LEGACY COMPONENT STYLES */

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .icon { font-size: 32px; filter: Drop-Shadow(0 0 10px Rgba(255, 215, 0, 0.4)); }

  h1 {
    @include pixelated;
    font-size: 14px;
    color: var(--yellow);
    margin: 0 0 8px 0;
    text-shadow: 0 2px 0 var(--black);
  }
  p { font-size: 10px; color: var(--gray); margin: 0; }
}

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 2px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.12);
    transform: TranslateY(-2px);
    border-color: Rgba(255, 255, 255, 0.2);
  }

  &.claim { background: var(--green); border-color: var(--green-bright); color: var(--white); }
  &.action { background: var(--yellow); border-color: var(--white); color: var(--black); text-shadow: none; }
}

/* REWARD BOX */

.awards-box {
  background: Rgba(34, 197, 94, 0.05);
  border: 1px solid Rgba(34, 197, 94, 0.2);
  border-radius: 16px;
  padding: 4px;
  margin-bottom: 30px;

  .box-inner {
    background: Rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 15px;
  }

  h3 {
    @include pixelated;
    font-size: 9px;
    color: var(--green-bright);
    margin-bottom: 15px;
  }

  .award-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    padding: 12px 18px;
    border-radius: 12px;
    margin-bottom: 10px;

    .award-name { display: block; font-weight: bold; font-size: 13px; margin-bottom: 4px; }
    .award-prize { font-size: 11px; color: var(--gray); }
  }
}

/* GRID */

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.event-card {
  background: $card-dark;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &:hover { border-color: Rgba(255, 215, 0, 0.5); transform: TranslateY(-3px); }

  .banner-box {
    height: 150px;
    background: var(--black);
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  .card-body { padding: 20px; }

  .body-header {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;

    .event-id-icon {
      width: 50px; height: 50px;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      border: 1px solid Rgba(255, 255, 255, 0.05);
    }

    h2 { font-size: 15px; font-weight: bold; margin: 0 0 6px 0; }
    .type-tag {
      font-size: 8px;
      padding: 3px 8px;
      border-radius: 6px;
      background: Rgba(59, 130, 246, 0.1);
      color: var(--blue-bright);
      font-weight: bold;
    }
  }

  .description { font-size: 12px; color: var(--gray); line-height: 1.5; margin-bottom: 20px; flex: 1; }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    .timer-box {
      .label { display: block; font-size: 8px; color: var(--gray); margin-bottom: 5px; }
      .value { @include pixelated; font-size: 9px; color: var(--red); }
    }
    
    .active-badge {
      @include pixelated;
      font-size: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      background: Rgba(74, 222, 128, 0.1);
      border: 1px solid var(--green-bright);
      color: var(--green-bright);
      text-shadow: 0 0 10px Rgba(74, 222, 128, 0.3);
      animation: pulseActive 2s infinite;
    }
  }
}

@keyframes pulseActive {
  0% { box-shadow: 0 0 0 0 Rgba(74, 222, 128, 0.4); }
  70% { box-shadow: 0 0 0 6px Rgba(74, 222, 128, 0); }
  100% { box-shadow: 0 0 0 0 Rgba(74, 222, 128, 0); }
}

.no-events {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  color: var(--gray);
  font-style: italic;
}
</style>
