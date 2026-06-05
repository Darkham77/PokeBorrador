<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import EggSprite from '@/components/common/EggSprite.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { calculatePokemonCenterCooldown } from '@/logic/economy/economyFormulas'

interface Props {
  missionsRemaining?: number
  missionSprites?: string[]
  gymRematches?: number
  gymSprites?: string[]
  eggCount?: number
  rivalEventActive?: boolean
  rivalEventText?: string
  rivalEventIcon?: string
  isReady?: boolean
}

withDefaults(defineProps<Props>(), {
  missionsRemaining: 0,
  missionSprites: () => [],
  gymRematches: 0,
  gymSprites: () => [],
  eggCount: 0,
  rivalEventActive: true,
  rivalEventText: 'Doble chance de encuentro con El Rival durante todo el día',
  rivalEventIcon: '⚡',
  isReady: false
})

const emit = defineEmits<{
  (e: 'openTab', tab: string): void
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
        v-gsap-hover="{ scale: 1.02, y: -6, duration: 0.25 }"
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
          v-gsap-hover="{ scale: 1.02, y: -4, duration: 0.25 }"
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

        <!-- 2. Misiones -->
        <div
          v-gsap-hover="{ scale: 1.02, y: -4, duration: 0.25 }"
          class="pc-banner"
          @click.stop="emit('openTab', 'daycare-missions')"
        >
          <div class="pc-banner-icon">
            📜
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              MISIONES DIARIAS
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                ¡Tenés <span>{{ missionsRemaining }}</span> misiones por hacer!
              </div>
              <div
                v-if="missionSprites.length"
                class="pc-banner-spawns"
              >
                <!-- Limit to 3 sprites + counter if more -->
                <div
                  v-for="(spriteId, i) in missionSprites.slice(0, 3)"
                  :key="i"
                  class="sprite-container"
                >
                  <img
                    :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'avatar' })"
                    class="pixelated"
                    @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none'; ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex' }"
                  >
                  <div
                    class="sprite-fallback"
                    style="display: none;"
                  >
                    👤
                  </div>
                </div>
                <div 
                  v-if="missionSprites.length > 3" 
                  class="sprite-counter"
                >
                  +{{ missionSprites.length - 3 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Gimnasios -->
        <div
          v-gsap-hover="{ scale: 1.02, y: -4, duration: 0.25 }"
          class="pc-banner"
          @click.stop="emit('openTab', 'gyms')"
        >
          <div class="pc-banner-icon">
            🏆
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              GIMNASIOS
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                Tenés <span>{{ gymRematches }}</span> gimnasios por derrotar
              </div>
              <div
                v-if="gymSprites.length"
                class="pc-banner-spawns"
              >
                <!-- Limit to 4 sprites + counter -->
                <img
                  v-for="(spriteId, i) in gymSprites.slice(0, 4)"
                  :key="i"
                  :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'avatar' })"
                  class="pixelated"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
                <div 
                  v-if="gymSprites.length > 4" 
                  class="sprite-counter"
                >
                  +{{ gymSprites.length - 4 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Crianza -->
        <div
          v-gsap-hover="{ scale: 1.02, y: -4, duration: 0.25 }"
          class="pc-banner"
          @click.stop="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-icon">
            <EggSprite
              size="28"
              style="image-rendering: pixelated; display: inline-flex; justify-content: center; align-items: center;"
            />
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              CRIANZA
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                Tenés <span>{{ eggCount }}</span> huevos esperando
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_map-status-summary.scss"></style>
