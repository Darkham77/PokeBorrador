<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useBuffsStore, type ActiveBuffItem } from '@/stores/battle/buffs'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { CLASS_MISSIONS_BY_ID, isMissionId } from '@/data/player/playerClasses'
import { getClassMissionDetails } from '@/logic/player/classMissionsData'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGsapTransition } from '@/composables/ui/useGsapTransition'

const buffsStore = useBuffsStore()
const modalStore = useModalStore()
const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const { beforeEnter, enter, leave } = useGsapTransition({ type: 'slide-left', xOffset: -30, duration: 0.25 })

const isVisible = computed(() => 
  uiStore.activeTab === 'map' || 
  uiStore.activeTab === 'home' || 
  uiStore.activeTab === 'gyms'
)

const now = ref(Temporal.Now.instant().epochMilliseconds)
let classMissionTicker: gsap.core.Tween | null = null

onMounted(() => {
  buffsStore.initTick()
  const TICK_INTERVAL_SEC = 1
  const tickNow = () => {
    now.value = Temporal.Now.instant().epochMilliseconds
    classMissionTicker = gsap.delayedCall(TICK_INTERVAL_SEC, tickNow)
  }
  classMissionTicker = gsap.delayedCall(TICK_INTERVAL_SEC, tickNow)
})

onUnmounted(() => {
  if (classMissionTicker) {
    classMissionTicker.kill()
  }
})

const formatTime = (secs: number) => {
  if (secs <= 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

const classMissionBadge = computed(() => {
  const m = classStore.activeMission
  if (!m || !isMissionId(m.id)) return null
  const def = CLASS_MISSIONS_BY_ID[m.id]
  const clsDef = classStore.currentClassDef
  const remainingSecs = Math.max(0, Math.floor((m.endsAt - now.value) / 1000))
  const isDone = remainingSecs <= 0

  const playerClass = classStore.playerClass || 'rocket'
  const details = getClassMissionDetails(playerClass, m.id)

  return {
    icon: clsDef?.icon || '📋',
    name: def?.name || 'Misión de Clase',
    color: clsDef?.color || 'var(--yellow, #ffd93d)',
    title: `${clsDef?.icon || ''} ${clsDef?.name || 'Clase'} · ${def?.name || 'Operación'}`,
    desc: isDone 
      ? '¡Operación finalizada! Haz clic para cobrar el botín.' 
      : details.rulesText,
    timeText: isDone ? '¡LISTO!' : formatTime(remainingSecs),
    isDone
  }
})

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}

const handleBadgeClick = (buff: ActiveBuffItem) => {
  if (buff.isEvent && buff.event) {
    modalStore.open('EventDetail', { event: buff.event })
  }
}

const handleClassMissionClick = () => {
  modalStore.open('EventMissions')
}
</script>

<template>
  <div
    v-if="isVisible"
    class="buffs-overlay"
  >
    <TransitionGroup
      :css="false"
      tag="div"
      class="buffs-list"
      @before-enter="beforeEnter"
      @enter="enter"
      @leave="leave"
    >
      <!-- Class Mission Deployment Badge -->
      <PVTooltip
        v-if="classMissionBadge"
        :key="'class-mission-badge'"
        :title="classMissionBadge.title"
        :description="classMissionBadge.desc"
      >
        <div
          id="buff-badge-class-mission"
          class="buff-badge is-class-mission-badge"
          :style="{ borderColor: classMissionBadge.color }"
          @click.stop="handleClassMissionClick"
        >
          <div class="buff-icon-slot">
            <span class="buff-emoji">{{ classMissionBadge.icon }}</span>
          </div>
          <div class="buff-info">
            <span
              class="buff-time"
              :class="{ 'is-done-text': classMissionBadge.isDone }"
              :style="{ color: classMissionBadge.isDone ? 'var(--green, #22c55e)' : classMissionBadge.color }"
            >
              {{ classMissionBadge.timeText }}
            </span>
          </div>
        </div>
      </PVTooltip>

      <PVTooltip 
        v-for="buff in buffsStore.activeBuffs" 
        :key="buff.id" 
        :title="buff.isEvent ? `📅 ${buff.name}` : buff.name"
        :description="buff.isEvent ? `${buff.desc} (Haz clic para ver detalles)` : buff.desc"
      >
        <div 
          :id="`buff-badge-${buff.id}`"
          :class="['buff-badge', { 'is-event-badge': buff.isEvent }]"
          @click.stop="handleBadgeClick(buff)"
        >
          <div class="buff-icon-slot">
            <span 
              v-if="buff.isEmoji" 
              class="buff-emoji"
            >{{ buff.icon }}</span>
            <img
              v-else
              :src="buff.icon"
              :alt="buff.name"
              class="buff-icon"
              @error="handleImgError"
            >
          </div>
          <div class="buff-info">
            <span class="buff-time">{{ formatTime(buff.secs) }}</span>
          </div>
        </div>
      </PVTooltip>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.buffs-overlay {
  position: fixed;
  top: 160px; /* Below user bar on all resolutions */
  left: 16px;
  z-index: calc(var(--z-hud) + var(--z-low)); /* Above HUD layout using standard variables */
  pointer-events: none; /* Let clicks pass through */
}

.buffs-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.buff-badge {
  @include gpu-layer;
  @include gpu-layer;

  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 10px;
  border: 1.5px solid var(--yellow, #ffd93d);
  border-radius: 12px;
  background: Rgb(0 0 0 / 90%);
  box-sizing: border-box;
  pointer-events: auto; /* Tooltip needs pointer */
  box-shadow: 0 4px 6px Rgb(0 0 0 / 30%);
  cursor: help;

  &:hover {
    background: Rgb(0 0 0 / 80%);
    transform: Translatex(4px);
    border-color: var(--yellow, #ffd93d);
    box-shadow: 0 0 0 1px var(--yellow, #ffd93d);
  }

  &.is-event-badge {
    cursor: pointer;

    &:hover {
      transform: Translatex(4px);
      border-color: #ffe066;
      box-shadow: 0 0 8px Rgb(255 217 61 / 50%);
    }
  }

  &.is-class-mission-badge {
    cursor: pointer;

    &:hover {
      transform: Translatex(4px);
      box-shadow: 0 0 10px Rgb(255 255 255 / 40%);
    }

    .is-done-text {
      color: var(--green, #22c55e);
      font-weight: 800;
    }
  }
}

.buff-icon-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  margin-right: 8px;
  flex-shrink: 0;
  overflow: visible;
}

.buff-emoji {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", sans-serif;
  font-size: 22px;
  line-height: 1;
  text-align: center;
  transform: Translatey(-2px);
  filter: Drop-Shadow(0 2px 3px Rgb(0 0 0 / 60%));
  user-select: none;
}

.buff-icon {
  @include sprite-render;

  width: 24px;
  height: 24px;
  object-fit: contain;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 2px Rgb(0 0 0 / 50%));
}

.buff-info {
  display: flex;
  justify-content: center;
  align-items: center;
}

.buff-time {
  @include pixelated;

  color: var(--yellow, #ffd93d);
  font-size: 12px;
  font-weight: 700;
}
</style>


