<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useWindowListener } from '@/composables/useWindowListener'
import WarDashboard from '@/components/war/WarDashboard.vue'

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

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => {
  isSmallScreen.value = window.innerWidth <= 950
}
useWindowListener('resize', handleResize)

onMounted(async () => {
  await warStore.loadWarData()
})

// Watch global faction state changes to dynamically update war data
watch(
  () => gameStore.state.faction,
  async (newFaction) => {
    warStore.faction = (newFaction as 'union' | 'poder' | null) || null
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
          <span class="title-icon">⚔️</span>
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
              <span class="shield blue">🛡️</span>
              <span class="vs-text">VS</span>
              <span class="shield red">🛡️</span>
            </div>
            
            <h2>¡ELIGE TU DESTINO!</h2>
            
            <p class="description">
              Kanto se encuentra dividida. El <strong>Team Unión</strong> busca la armonía y compañerismo, mientras el <strong>Team Poder</strong> persigue la máxima eficiencia y fuerza.
            </p>
            
            <p class="benefit">
              Únete a un bando para luchar por el control territorial de los mapas, acumular puntos semanales y conseguir valiosas recompensas.
            </p>

            <button
              class="retro-btn select-faction-btn"
              @click.stop="openFactionChoice"
            >
              ELEGIR BANDO
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Active Faction Dashboard -->
      <div
        v-else
        class="active-dashboard-wrapper"
      >
        <WarDashboard />
      </div>
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
    filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.4));
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

.faction-war-content-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

/* NO FACTION SPLASH CARD */
.no-faction-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
  width: 100%;
}

.welcome-card {
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

  .card-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #3b82f6, var(--yellow), #ef4444);
  }

  .card-inner {
    padding: 32px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .shields-art {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 24px;

    .shield {
      font-size: 36px;
      animation: floatShield 3s ease-in-out infinite;

      &.blue {
        filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.6));
      }

      &.red {
        filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.6));
        animation-delay: 1.5s;
      }
    }

    .vs-text {
      @include pixelated;
      font-size: 14px;
      color: var(--gray);
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
    }
  }

  h2 {
    @include pixelated;
    font-size: 16px;
    color: var(--white);
    margin: 0 0 16px 0;
    letter-spacing: 1px;
  }

  .description {
    font-size: 12px;
    color: var(--white);
    line-height: 1.5;
    margin-bottom: 12px;

    strong {
      color: var(--yellow);
    }
  }

  .benefit {
    font-size: 10px;
    color: var(--gray);
    line-height: 1.4;
    margin-bottom: 32px;
  }

  .retro-btn {
    @include pixelated;
    font-size: 10px;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &.select-faction-btn {
      background: var(--yellow);
      border: 2px solid var(--white);
      color: var(--black);
      box-shadow: 0 4px 12px rgba(250, 204, 21, 0.2);

      &:hover {
        background: var(--white);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(255, 255, 255, 0.3);
      }
    }
  }
}

.active-dashboard-wrapper {
  animation: fadeIn 0.3s ease-out;
}

@keyframes floatShield {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
