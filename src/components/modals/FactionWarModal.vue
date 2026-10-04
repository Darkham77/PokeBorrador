<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { computed, onMounted, watch } from 'vue'
import gsap from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import WarDashboard from '@/components/war/WarDashboard.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { isFactionId } from '@/types/system/game'

// Expose to template
const getAssetUrlLocal = getAssetUrl

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const warStore = useWarStore()
const gameStore = useGameStore()
const modalStore = useModalStore()

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

onMounted(async () => {
  await warStore.loadWarData()
})

// Watch global faction state changes to dynamically update war data
watch(
  () => gameStore.state.faction,
  async (newFaction) => {
    warStore.faction = isFactionId(newFaction) ? newFaction : null
    await warStore.loadWarData()
  }
)

// Dynamic accent color based on user's active faction
const accentColor = computed(() => {
  if (warStore.faction === 'union') return '#3b82f6'
  if (warStore.faction === 'poder') return '#ef4444'
  return 'var(--yellow)'
})

const openFactionChoice = () => {
  modalStore.open('FactionChoice')
}

function onDashboardEnter(el: Element, done: () => void): void {
  gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, onComplete: done })
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
    :accent-color="accentColor"
    @close="emit('close')"
  >
    <template #header>
      <div class="faction-war-modal-header">
        <div class="faction-war-title-group">
          <span class="emoji">⚔️</span>
          <div class="title-text-wrap">
            <span class="main-title">DOMINANCIA DE KANTO</span>
            <span class="sub-title">Guerra de Facciones - Temporada {{ warStore.currentWeekId }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="faction-war-content-inner custom-scrollbar">
      <!-- 1. Screen for players with no faction selected -->
      <div
        v-if="!warStore.faction"
        class="no-faction-container"
      >
        <div class="welcome-card">
          <div class="card-glow" />
          <div class="card-inner">
            <div class="shields-art">
              <img
                v-gsap-loop="{ effect: 'bounce', y: -8, duration: 3 }"
                :src="getAssetUrlLocal(ASSET_TYPES.FACTION, 'union')"
                class="faction-logo union-logo"
                alt="Team Unión"
                @error="handleImgError"
              >
              <span class="vs-text">VS</span>
              <img
                v-gsap-loop="{ effect: 'bounce', y: -8, duration: 3, delay: 1.5 }"
                :src="getAssetUrlLocal(ASSET_TYPES.FACTION, 'poder')"
                class="faction-logo poder-logo"
                alt="Team Poder"
                @error="handleImgError"
              >
            </div>

            <h2>¡ELIGE TU DESTINO!</h2>

            <p class="description">
              Kanto se encuentra dividida. El <strong>Team Unión</strong> busca la armonía y compañerismo, mientras el <strong>Team Poder</strong> persigue la máxima eficiencia y fuerza.
            </p>

            <p class="benefit">
              Únete a un bando para luchar por el control territorial de los mapas, acumular puntos semanales y conseguir valiosas recompensas.
            </p>

            <button
              class="select-faction-btn"
              @click.stop="openFactionChoice"
            >
              ELEGIR BANDO
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Active Faction Dashboard -->
      <Transition
        :css="false"
        @enter="onDashboardEnter"
      >
        <div
          v-if="warStore.faction"
          class="active-dashboard-wrapper"
        >
          <WarDashboard />
        </div>
      </Transition>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.faction-war-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 48px; // Space for BaseModal close button
}

.faction-war-title-group {
  display: flex;
  align-items: center;
  gap: 12px;

  .title-icon {
    font-size: 24px;
    filter: Drop-Shadow(0 0 8px Rgb(250 204 21 / 40%));
  }

  .title-text-wrap {
    display: flex;
    flex-direction: column;
  }

  .main-title {
    @include pixelated;

    color: var(--yellow);
    font-size: 14px;
    line-height: 1.2;
    text-shadow: 0 2px 0 var(--black);
  }

  .sub-title {
    color: var(--gray);
    font-size: 10px;
    margin-top: 2px;
  }
}

.faction-war-content-inner {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* NO FACTION SPLASH CARD */
.no-faction-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px 0;
}

.welcome-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 16px;
  background: Rgb(0 0 0 / 40%);
  overflow: hidden;
  box-shadow: 0 10px 30px Rgb(0 0 0 / 50%);

  .card-glow {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 4px;
    background: Linear-Gradient(90deg, #3b82f6, var(--yellow), #ef4444);
  }

  .card-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px;
    text-align: center;
  }

  .shields-art {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;

    .faction-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      will-change: transform, filter;

      &.union-logo {
        filter: Drop-Shadow(0 0 12px Rgb(59 130 246 / 60%));
      }

      &.poder-logo {
        filter: Drop-Shadow(0 0 12px Rgb(239 68 68 / 60%));
      }
    }

    .vs-text {
      @include pixelated;

      color: var(--gray);
      font-size: 14px;
      text-shadow: 0 0 8px Rgb(255 255 255 / 20%);
    }
  }

  h2 {
    @include pixelated;

    margin: 0 0 16px;
    color: var(--white);
    font-size: 16px;
    letter-spacing: 1px;
  }

  .description {
    color: var(--white);
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 12px;

    strong {
      color: var(--yellow);
    }
  }

  .benefit {
    color: var(--gray);
    font-size: 10px;
    line-height: 1.4;
    margin-bottom: 32px;
  }

  .select-faction-btn {
    @include btn-vicio('primary', 'md');
  }
}

</style>

