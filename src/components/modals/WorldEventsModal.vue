<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { storeToRefs } from 'pinia'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useWindowListener } from '@/composables/useWindowListener'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const eventStore = useEventStore()
const modalStore = useModalStore()
const { activeEvents, pendingAwards, isLoading } = storeToRefs(eventStore)

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

const now = ref(Temporal.Now.instant().epochMilliseconds)
let timerTween: gsap.core.Tween | null = null

const updateTime = () => {
  now.value = Temporal.Now.instant().epochMilliseconds
  timerTween = gsap.delayedCall(1, updateTime)
}

onMounted(() => {
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
  updateTime()
})

const activeBadgesCtx = ref<gsap.Context | null>(null)

const startBadgeAnimations = () => {
  if (activeBadgesCtx.value) {
    activeBadgesCtx.value.revert()
    activeBadgesCtx.value = null
  }

  // Prevent GSAP warnings if there are no active badges in the DOM
  if (!document.querySelector('.active-badge')) return

  activeBadgesCtx.value = gsap.context(() => {
    gsap.fromTo(".active-badge", 
      { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.4)" },
      { 
        boxShadow: "0 0 0 6px rgba(74, 222, 128, 0)",
        duration: 1.4,
        repeat: -1,
        ease: "sine.out"
      }
    )
  })
}

watch([activeEvents, () => props.show], async () => {
  await nextTick()
  startBadgeAnimations()
}, { immediate: true })

onUnmounted(() => {
  if (timerTween) {
    timerTween.kill()
  }
  if (activeBadgesCtx.value) {
    activeBadgesCtx.value.revert()
  }
})

const formatTime = (isoTime: string) => {
  if (!isoTime) return 'Indefinido'
  try {
    const target = Temporal.Instant.from(isoTime)
    const current = Temporal.Instant.fromEpochMilliseconds(now.value)
    
    if (Temporal.Instant.compare(target, current) <= 0) return 'Terminando...'
    
    const duration = target.since(current, { largestUnit: 'minute' })
    const min = Math.max(0, Math.floor(duration.minutes))
    const sec = Math.max(0, Math.floor(Math.abs(duration.seconds) % 60))
    return `${min}m ${sec}s`
  } catch (_e) {
    return 'Error'
  }
}

const openParticipationModal = (event: GameEvent) => {
  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: `Elige un Pokémon para inscribir en: ${event.name}`,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    onConfirm: async (selectedObjects: Pokemon[]) => {
      const pokemon = selectedObjects[0]
      if (pokemon) {
        await eventStore.submitCompetitionEntry(pokemon, event.id)
      }
    }
  })
}
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

        <div
          v-for="event in activeEvents"
          :key="event.id"
          class="event-card"
          :class="{ 'has-banner': typeof event.config === 'object' && event.config?.banner }"
        >
          <!-- Banner -->
          <div
            v-if="typeof event.config === 'object' && event.config?.banner"
            class="banner-box"
          >
            <img
              :src="getAssetUrl(ASSET_TYPES.BANNER, event.config.banner)"
              @error="(e: any) => (e.target as HTMLImageElement).style.display='none'"
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
                <span class="value">{{ formatTime(event.ends_at || '') }}</span>
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
  transition/* */: all 0.2s;

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

  &.action {
    background: var(--yellow);
    border-color: var(--white);
    color: var(--black);
    text-shadow: none;
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

.event-card {
  background: $card-dark;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition/* */: border-color 0.2s, transform 0.2s;

  &:hover {
    border-color: Rgba(255, 215, 0, 0.5);
    transform: Translatey(-2px);
  }

  .banner-box {
    height: 120px;
    background: var(--black);
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .body-header {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;

    .event-id-icon {
      width: 40px;
      height: 40px;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border: 1px solid Rgba(255, 255, 255, 0.05);
    }

    .event-main-meta {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    h2 {
      font-size: 13px;
      font-weight: bold;
      margin: 0 0 4px 0;
      color: var(--white);
    }

    .type-tag {
      font-size: 7px;
      padding: 2px 6px;
      border-radius: 4px;
      background: Rgba(59, 130, 246, 0.1);
      color: var(--blue-bright);
      font-weight: bold;
      width: fit-content;
    }
  }

  .description {
    font-size: 11px;
    color: var(--gray);
    line-height: 1.4;
    margin-bottom: 16px;
    flex: 1;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    .timer-box {
      .label {
        display: block;
        font-size: 7px;
        color: var(--gray);
        margin-bottom: 3px;
      }
      .value {
        @include pixelated;
        font-size: 8px;
        color: var(--red);
      }
    }
    
    .active-badge {
      @include pixelated;
      font-size: 8px;
      padding: 6px 12px;
      border-radius: 6px;
      background: Rgba(74, 222, 128, 0.1);
      border: 1px solid var(--green-bright);
      color: var(--green-bright);
      text-shadow: 0 0 8px Rgba(74, 222, 128, 0.3);
    }
  }
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
