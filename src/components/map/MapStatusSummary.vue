<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { calculatePokemonCenterCooldown } from '@/logic/economy/economyFormulas'

interface Props {
  rivalEventActive?: boolean
  rivalEventText?: string
  rivalEventIcon?: string
  isReady?: boolean
}

withDefaults(defineProps<Props>(), {
  rivalEventActive: true,
  rivalEventText: 'Doble chance de encuentro con El Rival durante todo el día',
  rivalEventIcon: '⚡',
  isReady: false
})

const emit = defineEmits<{
  (e: 'openCenter'): void
  (e: 'openEvent'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()
const cooldownSecondsLeft = ref(0)
let cooldownTween: gsap.core.Tween | null = null

const handleCooldownClick = () => {
  uiStore.notify(`El Centro Pokémon está cerrado por mantenimiento. Reabre en ${cooldownFormatted.value}.`, '🏥')
}

const updateCooldown = () => {
  const lastHeal = gameStore.state.lastPokemonCenterHeal || 0
  const cooldownSecs = calculatePokemonCenterCooldown(gameStore.state.trainerLevel || 1)
  if (cooldownSecs > 0 && lastHeal > 0) {
    const elapsedMs = Temporal.Now.instant().epochMilliseconds - lastHeal
    const remainingMs = (cooldownSecs * 1000) - elapsedMs
    if (remainingMs > 0) {
      cooldownSecondsLeft.value = Math.ceil(remainingMs / 1000)
      return
    }
  }
  cooldownSecondsLeft.value = 0
}

const tickCooldown = () => {
  updateCooldown()
  cooldownTween = gsap.delayedCall(1, tickCooldown)
}

onMounted(() => {
  tickCooldown()
})

onUnmounted(() => {
  if (cooldownTween) {
    cooldownTween.kill()
  }
})

const cooldownFormatted = computed(() => {
  const totalSecs = cooldownSecondsLeft.value
  if (totalSecs <= 0) return ''
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const bannerUrl = computed(() => {
  const assetName = cooldownSecondsLeft.value > 0 ? 'pokecenter_closed_banner' : 'pokecenter_banner'
  return getAssetUrl(ASSET_TYPES.BANNER, assetName)
})

const bannerStyle = computed(() => ({
  backgroundImage: `url('${bannerUrl.value}')`
}))
</script>

<template>
  <div class="pc-split-container">
    <!-- Carta Centro Pokémon (Izq: 50%) -->
    <div class="pc-left">
      <!-- On Cooldown state (Disabled) -->
      <div
        v-if="cooldownSecondsLeft > 0"
        class="pokecenter-banner on-cooldown"
        @click.stop="handleCooldownClick"
      >
        <div 
          class="banner-bg" 
          :style="bannerStyle"
        />
        <div class="banner-overlay">
          <div class="banner-title">
            ⚡ CENTRO POKÉMON
          </div>
          <div class="banner-desc">
            Saná a tu equipo y restaurá todos sus PP al instante.
          </div>
        </div>
        <PVTooltip 
          title="Centro Pokémon en mantenimiento" 
          description="Debes esperar a que termine el tiempo de enfriamiento para volver a curar gratis."
          position="bottom"
          class="banner-tag-tooltip"
        >
          <span class="banner-tag cooldown">
            <span class="cooldown-emoji">⏱️</span> {{ cooldownFormatted }}
          </span>
        </PVTooltip>
      </div>

      <!-- Active state (Enabled) -->
      <div
        v-else
        class="pokecenter-banner"
        @click.stop="emit('openCenter')"
      >
        <div 
          class="banner-bg" 
          :style="bannerStyle"
        />
        <div class="banner-overlay">
          <div class="banner-title">
            ⚡ CENTRO POKÉMON
          </div>
          <div class="banner-desc">
            Saná a tu equipo y restaurá todos sus PP al instante.
          </div>
        </div>
        <span class="banner-tag">⚡ CURACIÓN</span>
      </div>
    </div>

    <!-- Grilla de Status Banners (Der: 50%) -->
    <div class="pc-right">
      <div class="pc-banner-grid">
        <!-- 1. Evento -->
        <div
          class="pc-banner event-banner"
          :class="{ active: rivalEventActive }"
          :style="{ '--card-seed': 0.2 }"
          @click.stop="rivalEventActive && emit('openEvent')"
        >
          <div class="pc-banner-icon">
            {{ rivalEventIcon }}
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              EVENTO
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                <span
                  v-if="rivalEventActive && rivalEventText.includes(':')"
                  class="text-highlight"
                >
                  {{ rivalEventText.split(':')[0] }}
                </span>
                {{ rivalEventActive ? (rivalEventText.includes(':') ? rivalEventText.split(':')[1] : rivalEventText) : 'No hay eventos activos' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- HMR Touch comment to force reload styles v2 -->
<style scoped lang="scss" src="@/styles/components/_map-status-summary.scss"></style>
