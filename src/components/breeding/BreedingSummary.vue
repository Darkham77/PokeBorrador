<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { getGeneticsForecast, type GeneticsForecast } from '@/logic/breeding/breedingEngine'
import { COMPAT_TEXT } from '@/data/breeding/breedingConstants'
import gsap from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getServerTime } from '@/logic/utils/timeUtils'

const breedingStore = useBreedingStore()
const classStore = usePlayerClassStore()

const heartRef = ref<HTMLElement | null>(null)
let pulseTween: gsap.core.Tween | null = null

const startPulse = () => {
  if (pulseTween) return
  if (!heartRef.value) return
  
  // Set initial state
  gsap.set(heartRef.value, {
    scale: 1.0,
    opacity: 1,
    filter: 'grayscale(0%) drop-shadow(0 0 0px rgba(239, 68, 68, 0))'
  })

  // Pulsing animation
  pulseTween = gsap.to(heartRef.value, {
    scale: 1.2,
    filter: 'grayscale(0%) drop-shadow(0 0 15px rgba(239, 68, 68, 0.65))',
    duration: 1.0,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut'
  })
}

const stopPulse = () => {
  if (pulseTween) {
    pulseTween.kill()
    pulseTween = null
  }
  if (heartRef.value) {
    gsap.set(heartRef.value, {
      scale: 1.0,
      opacity: 0.1,
      filter: 'grayscale(100%) drop-shadow(0 0 0px rgba(239, 68, 68, 0))'
    })
  }
}

const isCompatible = computed(() => {
  return (breedingStore.compatibility?.level ?? 0) > 0
})

const hasVigor = computed(() => {
  const pA = breedingStore.slots[0]?.pokemon
  const pB = breedingStore.slots[1]?.pokemon
  if (!pA || !pB) return false
  return (pA.vigor ?? 0) > 0 && (pB.vigor ?? 0) > 0
})

const isActivelyBreeding = computed(() => {
  return breedingStore.isBreeding && isCompatible.value && hasVigor.value
})

watch(isActivelyBreeding, (active) => {
  if (active) {
    startPulse()
  } else {
    stopPulse()
  }
})

const forecast = computed<GeneticsForecast | null>(() => {
  if (!breedingStore.isBreeding || !breedingStore.slots[0]?.pokemon || !breedingStore.slots[1]?.pokemon) return null
  return getGeneticsForecast(
    breedingStore.slots[0].pokemon,
    breedingStore.slots[1].pokemon,
    classStore.playerClass || ''
  )
})

const compatStyle = computed(() => {
  if (!breedingStore.isBreeding) {
    return { label: 'Deposita 2 Pokémon', color: '#94a3b8' }
  }
  const level = (breedingStore.compatibility?.level ?? 0) as number
  return (COMPAT_TEXT as Record<number, { label: string; color: string }>)[level] || { label: 'Desconocido', color: 'gray' }
})

const formatMs = (ms: number | null): string => {
  if (!ms) return '--:--'
  const left = Math.max(0, Math.floor((ms - getServerTime()) / 1000))
  const h = Math.floor(left / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Ticker GSAP: actualiza el display del timer cada frame sin setInterval
const displayTime = ref(formatMs(breedingStore.nextEggTime))

const tickerFn = () => {
  displayTime.value = formatMs(breedingStore.nextEggTime)
  
  // Capa 3: Check in real-time if timer hit zero while active
  if (breedingStore.isBreeding && breedingStore.nextEggTime) {
    const nowMs = getServerTime()
    if (nowMs >= breedingStore.nextEggTime) {
      breedingStore.checkAndGenerateEgg()
    }
  }
}

onMounted(() => {
  if (isActivelyBreeding.value) {
    startPulse()
  } else {
    stopPulse()
  }
  gsap.ticker.add(tickerFn)
})

onUnmounted(() => {
  stopPulse()
  gsap.ticker.remove(tickerFn)
})

const getCompatEmoji = (label: string) => {
  if (!label) return ''
  const emojiRegex = /^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/
  const match = label.match(emojiRegex)
  return match ? match[0] : ''
}

const getCompatText = (label: string) => {
  if (!label) return ''
  const emoji = getCompatEmoji(label)
  return emoji ? label.replace(emoji, '').trim() : label
}
</script>

<template>
  <div class="breeding-summary">
    <div class="compat-section">
      <div
        class="compat-indicator"
        :style="{ color: compatStyle.color }"
      >
        <div class="compat-label">
          <span
            v-if="getCompatEmoji(compatStyle.label)"
            class="compat-emoji"
          >{{ getCompatEmoji(compatStyle.label) }}</span>
          <span class="compat-text">{{ getCompatText(compatStyle.label) }}</span>
        </div>
        <div
          v-if="breedingStore.isBreeding"
          class="timer"
        >
          <template v-if="!isCompatible">
            <span class="timer-icon">⏳</span>
            {{ displayTime }}
          </template>
          <template v-else-if="!hasVigor">
            <span class="timer-icon font-large">💤</span>
            <span style="color: #ef4444; font-weight: bold; text-shadow: 0 0 5px rgba(239, 68, 68, 0.4);">CANSADOS (SIN VIGOR)</span>
          </template>
          <template v-else>
            <span class="timer-icon">⏳</span>
            {{ displayTime }}
          </template>
        </div>
      </div>
      <div
        ref="heartRef"
        class="heart-fx"
      >
        ❤️
      </div>
    </div>

    <div
      v-if="breedingStore.isBreeding && forecast"
      class="forecast-card"
    >
      <div class="forecast-header">
        <span class="icon">🧬</span>
        <h4>Pronóstico de Herencia</h4>
      </div>
      
      <div class="forecast-grid">
        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ positive: forecast.ivsInherited >= 5 }"
          title="IVs HEREDADOS"
          description="Cantidad de valores individuales (IVs) que la cría heredará de sus padres. Equipar Lazo Destino a un padre aumenta los IVs heredados de 3 a 5 de 6."
        >
          <span class="label">IVs heredados:</span>
          <span class="value">{{ forecast.ivsInherited }} de 6</span>
        </PVTooltip>
        
        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ active: forecast.natureGuaranteed }"
          title="HERENCIA DE NATURALEZA"
          description="Por defecto, la naturaleza de la cría es aleatoria. Equipar una Piedra Eterna a uno de los padres garantiza transmitir su naturaleza al 100%."
        >
          <span class="label">Naturaleza:</span>
          <span class="value">{{ forecast.natureGuaranteed ? 'GARANTIZADA' : 'Aleatoria' }}</span>
        </PVTooltip>

        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ active: forecast.masudaActive }"
          title="MÉTODO MASUDA"
          description="Se activa si los padres son de distintas nacionalidades (por ej. un Ditto extranjero). Multiplica por 6 la probabilidad de que la cría sea Shiny."
        >
          <span class="label">Método Masuda:</span>
          <span class="value">{{ forecast.masudaActive ? `ACTIVO (x${forecast.shinyMultiplier})` : 'Inactivo' }}</span>
        </PVTooltip>

        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ positive: forecast.eggMovesCount > 0 }"
          title="MOVIMIENTOS HUEVO"
          description="Movimientos especiales que el bebé puede aprender al nacer si alguno de los padres conoce un movimiento compatible en su lista de movimientos huevo."
        >
          <span class="label">Movimientos Huevo:</span>
          <span class="value">{{ forecast.eggMovesCount > 0 ? 'DETECTADOS ✨' : 'Ninguno' }}</span>
        </PVTooltip>
      </div>

      <div class="forecast-help">
        <p>ℹ️ Usa Piedra Eterna para la Naturaleza y Lazo Destino para heredar más IVs.</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.breeding-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.compat-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.compat-indicator {
  text-align: center;
  
  .compat-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;

    .compat-emoji {
      font-size: 26px;
      line-height: 1;
    }
  }

  .timer {
    @include pixelated;
    font-size: 10px;
    color: $white;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    .timer-icon {
      font-size: 26px;
      line-height: 1;
      
      &.font-large {
        font-size: 26px;
      }
    }
  }
}

.heart-fx {
  font-size: 32px;
  opacity: 0.1;
  will-change: transform, filter, opacity;
  filter: Grayscale(100%);
}

.forecast-card {
  background: Rgba(30, 41, 59, 0.85);
  border-radius: 16px;
  padding: 12px;
  border: 1px solid Rgba(255, 51, 102, 0.25);
  box-shadow: 0 10px 30px Rgba(0,0,0,0.3);
  width: 100%;
  box-sizing: border-box;
  
  .forecast-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid Rgba(255,255,255,0.05);
    
    .icon { font-size: 16px; }
    h4 {
      font-size: 11px;
      font-weight: 800;
      color: $white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.5;
    }
  }
}

.forecast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.forecast-item {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  width: 100% !important;
  box-sizing: border-box;
  gap: 6px;
  padding: 8px !important;
  background: Rgba(0,0,0,0.2);
  border-radius: 10px;
  border: 1px solid transparent;
  
  cursor: help;
  
  .label {
    font-size: 8px;
    color: $muted;
    font-weight: 600;
    text-align: left;
    line-height: 1.4;
  }
  
  .value {
    font-size: 10px;
    color: $white;
    font-weight: 700;
    text-align: left;
    line-height: 1.4;
  }
  
  &.active {
    border-color: Rgba(255, 51, 102, 0.35);
    background: Rgba(255, 51, 102, 0.04);
    .value { color: #ff668f; }
  }
  
  &.positive {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.05);
    .value { color: Rgba(74, 222, 128, 1); }
  }
}

.forecast-help {
  padding-top: 10px;
  border-top: 1px dashed Rgba(51, 65, 85, 1);
  p {
    font-size: 9px;
    color: Rgba(148, 163, 184, 1);
    line-height: 1.6;
  }
}
</style>
