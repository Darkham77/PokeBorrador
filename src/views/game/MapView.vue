<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import MapPokemonCenterBanner from '@/components/map/MapPokemonCenterBanner.vue'
import MapGrid from '@/components/map/MapGrid.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { isMapExtortable, getExtortionConfirmMessage, getOfficialRouteConfirmMessage } from '@/logic/map/mapCardHelper'
import { requireMapRouteId } from '@/data/world/map-assets'
import { EGG_POLLER_INTERVAL_SEC } from '@/logic/constants/gameplay'

const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()
const modalStore = useModalStore()

let expirationTicker: gsap.core.Tween | null = null

const tickExpirations = () => {
  gameStore.checkRouteExpirations()
  expirationTicker = gsap.delayedCall(EGG_POLLER_INTERVAL_SEC, tickExpirations)
}

onMounted(() => {
  tickExpirations()
})

onUnmounted(() => {
  if (expirationTicker) {
    expirationTicker.kill()
  }
})

const navigateToMap = async (loc: MapLocation | string | number) => {
  if (modalStore.isOpen('Confirm')) return
  const id = requireMapRouteId(typeof loc === 'object' ? loc.id : String(loc))
  const maps = pokemonDataProvider.getMaps()
  const targetMap = maps.find(m => m.id === id)
  
  // Lógica de extorsión del Team Rocket
  if (gameStore.state.playerClass === 'rocket' && isMapExtortable(targetMap)) {
    const classData = gameStore.state.classData || {}
    const now = Temporal.Now.instant().epochMilliseconds
    const extTimestamp = Number(classData.extortedRouteTimestamp || 0)
    const isExpired = !extTimestamp || (now - extTimestamp > 24 * 3600 * 1000)

    if (isExpired) {
      modalStore.open('Confirm', {
        title: '🏴‍☠️ RUTA DE EXTORSISÓN',
        message: getExtortionConfirmMessage(targetMap?.name || id),
        confirmText: 'EXTORSIONAR',
        cancelText: 'IGNORAR',
        variant: 'retro',
        onConfirm: async () => {
          if (!gameStore.state.classData) {
            gameStore.state.classData = {
              captureStreak: 0,
              longestStreak: 0,
              reputation: 0,
              blackMarketSales: 0,
              criminality: 0,
              blackMarketDaily: { date: '', items: [], purchased: [] }
            }
          }
          gameStore.state.classData.extortedRouteId = id
          gameStore.state.classData.extortedRouteTimestamp = String(now)
          uiStore.notify(`¡Has tomado control y extorsionado la ${targetMap?.name || id}!`, '💰')
          await gameStore.save(false)
          mapStore.navigate(id)
        },
        onCancel: () => {
          mapStore.navigate(id)
        }
      })
      return
    }
  }

  // Lógica de Ruta Oficial del Entrenador
  if (gameStore.state.playerClass === 'entrenador' && isMapExtortable(targetMap)) {
    const classData = gameStore.state.classData || {}
    const now = Temporal.Now.instant().epochMilliseconds
    const offTimestamp = Number(classData.officialRouteTimestamp || 0)
    const isExpired = !offTimestamp || (now - offTimestamp > 24 * 3600 * 1000)

    if (isExpired) {
      modalStore.open('Confirm', {
        title: '📍 RUTA OFICIAL',
        message: getOfficialRouteConfirmMessage(targetMap?.name || id),
        confirmText: 'ESTABLECER',
        cancelText: 'IGNORAR',
        variant: 'retro',
        onConfirm: async () => {
          if (!gameStore.state.classData) {
            gameStore.state.classData = {
              captureStreak: 0,
              longestStreak: 0,
              reputation: 0,
              blackMarketSales: 0,
              criminality: 0,
              blackMarketDaily: { date: '', items: [], purchased: [] }
            }
          }
          gameStore.state.classData.officialRouteId = id
          gameStore.state.classData.officialRouteTimestamp = String(now)
          uiStore.notify(`¡Estableciste la ${targetMap?.name || id} como tu Ruta Oficial!`, '📍')
          await gameStore.save(false)
          mapStore.navigate(id)
        },
        onCancel: () => {
          mapStore.navigate(id)
        }
      })
      return
    }
  }

  mapStore.navigate(id)
}
</script>

<template>
  <div class="map-view-container legacy-ui">
    <!-- Centro Pokémon Banner -->
    <MapPokemonCenterBanner />

    <!-- Localizaciones (Grilla de Mapas) -->
    <div class="legacy-divider">
      <span class="divider-text">REGIÓN DE KANTO</span>
    </div>

    <MapGrid
      :maps="mapStore.maps"
      :badge-count="gameStore.state.badges || 0"
      :cycle="mapStore.currentCycle"
      :weather="mapStore.globalWeather || undefined"
      :player-class="gameStore.state.playerClass || undefined"
      :class-data="gameStore.state.classData"
      :safari-ticket-secs="gameStore.state.safariTicketSecs || 0"
      :cerulean-ticket-secs="gameStore.state.ceruleanTicketSecs || 0"
      :dominance-data="mapStore.mapWinners"
      :daily-guardian-captures="gameStore.dailyGuardianCaptures"
      @navigate="navigateToMap"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.map-view-container {
  padding: 0 0 40px;
  width: 100%;
  box-sizing: border-box;
}

.legacy-divider {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 16px 0;
}

.legacy-divider::before,
.legacy-divider::after {
  content: '';
  flex: 1;
  height: 4px;
  background: Rgba(255, 255, 255, 0.1);
}

.divider-text {
  @include pixelated;
  font-size: 10px;
  color: var(--gray, #94a3b8);
  letter-spacing: 2px;
}
</style>
