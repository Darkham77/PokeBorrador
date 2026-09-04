<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import MapPokemonCenterBanner from '@/components/map/MapPokemonCenterBanner.vue'
import MapGrid from '@/components/map/MapGrid.vue'
import MapLensSwitcher from '@/components/map/adventure/MapLensSwitcher.vue'
import AdventureWorldMap from '@/components/map/adventure/AdventureWorldMap.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { isMapExtortable, getExtortionConfirmMessage, getOfficialRouteConfirmMessage } from '@/logic/map/mapCardHelper'
import { requireMapRouteId } from '@/data/world/map-assets'
import { EGG_POLLER_INTERVAL_SEC } from '@/logic/constants/gameplay'

const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()
const modalStore = useModalStore()

const isAdventureModalOpen = ref(false)

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
  <div
    class="map-view-container legacy-ui"
    :class="{ 'adventure-mode-active': isAdventureModalOpen }"
  >
    <template v-if="!isAdventureModalOpen">
      <!-- Banner de Acceso al Croquis / Mapa de Aventura -->
      <div class="adventure-map-launcher-banner">
        <div class="launcher-content">
          <span class="icon launcher-icon">🗺️</span>
          <div class="launcher-text">
            <span class="launcher-title">CROQUIS DE AVENTURA (GPS)</span>
            <span class="launcher-desc">Explora Kanto en un mapa interactivo con carreteras y navegación GPS</span>
          </div>
        </div>
        <button
          id="open-adventure-map-modal-btn"
          class="launcher-open-btn"
          @click="isAdventureModalOpen = true"
        >
          <span>ABRIR CROQUIS</span>
          <span class="icon btn-arrow">➡️</span>
        </button>
      </div>

      <!-- Centro Pokémon Banner -->
      <MapPokemonCenterBanner />

      <!-- Localizaciones (Grilla de Mapas Clásica) -->
      <div class="legacy-divider">
        <span class="divider-text">REGIÓN DE KANTO</span>
      </div>

      <MapLensSwitcher />

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
    </template>

    <!-- Dedicated Fullscreen Adventure Map Modal -->
    <AdventureWorldMap
      v-else
      @close="isAdventureModalOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.map-view-container {
  padding: 0 0 40px;
  width: 100%;
  box-sizing: border-box;

  &.adventure-mode-active {
    padding: 0;
    margin: 0;
  }
}

.adventure-map-launcher-banner {
  @include pixelated;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, Rgba(15, 23, 42, 0.9), Rgba(30, 41, 59, 0.8));
  border: 1.5px solid Rgba(56, 189, 248, 0.4);
  border-radius: 12px;
  padding: 12px 18px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.5), inset 0 1px 0 Rgba(255, 255, 255, 0.1);

  &:hover {
    border-color: #38bdf8;
    box-shadow: 0 6px 20px Rgba(56, 189, 248, 0.25), inset 0 1px 0 Rgba(255, 255, 255, 0.2);
  }

  .launcher-content {
    display: flex;
    align-items: center;
    gap: 12px;

    .launcher-icon {
      font-size: 24px;
      filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.5));
    }

    .launcher-text {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .launcher-title {
        font-size: 11px;
        font-weight: bold;
        color: #38bdf8;
        letter-spacing: 1px;
      }

      .launcher-desc {
        font-size: 9px;
        color: #94a3b8;
      }
    }
  }

  .launcher-open-btn {
    @include pixelated;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #0284c7, #0369a1);
    border: 1px solid #38bdf8;
    border-radius: 8px;
    padding: 8px 16px;
    color: #ffffff;
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 8px Rgba(2, 132, 199, 0.4);
    white-space: nowrap;

    &:hover {
      background: linear-gradient(135deg, #38bdf8, #0284c7);
      transform: Translatey(-1px);
      box-shadow: 0 4px 12px Rgba(56, 189, 248, 0.5);
    }

    .btn-arrow {
      font-size: 11px;
    }

    &:hover .btn-arrow {
      transform: Translatex(2px);
    }
  }
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
