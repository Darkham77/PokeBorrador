<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  event: GameEvent
}

const props = defineProps<Props>()

const eventStore = useEventStore()
const modalStore = useModalStore()

const now = ref(Temporal.Now.instant().epochMilliseconds)
let timerTween: gsap.core.Tween | null = null
const badgeRef = ref<HTMLElement | null>(null)
let badgeCtx: gsap.Context | null = null

const updateTime = () => {
  now.value = Temporal.Now.instant().epochMilliseconds
  timerTween = gsap.delayedCall(1, updateTime)
}

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

const openParticipationModal = () => {
  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: `Elige un Pokémon para inscribir en: ${props.event.name}`,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    onConfirm: async (selectedObjects: Pokemon[]) => {
      const pokemon = selectedObjects[0]
      if (pokemon) {
        await eventStore.submitCompetitionEntry(pokemon, props.event.id)
      }
    }
  })
}

const onCardHover = (event: MouseEvent, isEntering: boolean) => {
  const card = event.currentTarget as HTMLElement
  if (!card) return
  if (isEntering) {
    gsap.to(card, {
      borderColor: 'rgba(255, 215, 0, 0.5)',
      y: -2,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(card, {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'borderColor,transform'
    })
  }
}

const onBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  const isAction = btn.classList.contains('action')
  if (isEntering) {
    gsap.to(btn, {
      background: isAction ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.12)',
      y: -2,
      borderColor: isAction ? 'var(--white)' : 'rgba(255, 255, 255, 0.2)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: isAction ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.05)',
      y: 0,
      borderColor: isAction ? 'var(--white)' : 'rgba(255, 255, 255, 0.1)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,background,borderColor'
    })
  }
}

onMounted(() => {
  updateTime()
  
  if (badgeRef.value) {
    badgeCtx = gsap.context(() => {
      gsap.fromTo(badgeRef.value, 
        { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.4)" },
        { 
          boxShadow: "0 0 0 6px rgba(74, 222, 128, 0)",
          duration: 1.4,
          repeat: -1,
          ease: "sine.out"
        }
      )
    }, badgeRef.value)
  }
})

onUnmounted(() => {
  if (timerTween) {
    timerTween.kill()
  }
  if (badgeCtx) {
    badgeCtx.revert()
  }
})
</script>

<template>
  <div
    class="event-card"
    :class="{ 'has-banner': typeof event.config === 'object' && event.config?.banner }"
    @mouseenter="onCardHover($event, true)"
    @mouseleave="onCardHover($event, false)"
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
          <span class="value">{{ formatTime(event.end_at || '') }}</span>
        </div>
        
        <button 
          v-if="event.type === 'competition'" 
          class="retro-btn action"
          @mouseenter="onBtnHover($event, true)"
          @mouseleave="onBtnHover($event, false)"
          @click.stop="openParticipationModal"
        >
          PARTICIPAR
        </button>
        <div 
          v-else 
          ref="badgeRef"
          class="active-badge"
        >
          ✨ ACTIVO
        </div>
      </footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 2px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.action {
    background: var(--yellow);
    border-color: var(--white);
    color: var(--black);
    text-shadow: none;
  }
}

.event-card {
  background: $card-dark;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

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
</style>
