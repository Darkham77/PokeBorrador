<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvp';
import { usePassivePvpStore } from '@/stores/passivePvp';
import { useRankedValidation } from '@/composables/useRankedValidation';
import { useUIStore } from '@/stores/ui';
import Leaderboard from './Leaderboard.vue';
import RewardsTrack from './RewardsTrack.vue';

const gameStore = useGameStore();
const rankedStore = usePvPStore();
const passivePvpStore = usePassivePvpStore();
const uiStore = useUIStore();
const { validateTeam } = useRankedValidation();

const isSearching = ref(false);
const activeTab = ref('overview');

onMounted(() => {
  rankedStore.fetchRules();
  passivePvpStore.loadStatus();
});

const currentTier = computed(() => rankedStore.currentTier(gameStore.state.eloRating));

const startSearch = async () => {
  const team = gameStore.state.team.filter(p => p.hp > 0 && !p.onMission);
  const validation = validateTeam(team);
  
  if (!validation.ok) {
    uiStore.notify(validation.reason, '⚠️');
    return;
  }

  isSearching.value = true;
  uiStore.notify('Buscando rival en el ranking...', '⚔️');
  
  // En un sistema real, aquí llamaríamos a un RPC de Supabase para entrar en la cola
  // window.isRankedSearching = true; // Compatibilidad con legacy
};

const cancelSearch = () => {
  isSearching.value = false;
  uiStore.notify('Búsqueda cancelada.', '⏹️');
};
</script>

<template>
  <div class="ranked-menu">
    <!-- Header: Season Info & Elo -->
    <div class="season-header card-glass">
      <div class="season-info">
        <span class="season-tag press-start">TEMPORADA</span>
        <h2 class="season-name">
          {{ rankedStore.rules.seasonName }}
        </h2>
        <div class="dates">
          {{ rankedStore.rules.seasonStartDate }} - {{ rankedStore.rules.seasonEndDate }}
        </div>
      </div>
      
      <div class="player-stat card-glass">
        <div
          class="ranked-tier-badge"
          :style="{ backgroundColor: currentTier.color + '22', borderColor: currentTier.color }"
        >
          <span class="tier-icon">{{ currentTier.icon }}</span>
          <div class="tier-details">
            <span
              class="tier-name"
              :style="{ color: currentTier.color }"
            >{{ currentTier.name }}</span>
            <span class="elo-val press-start">{{ gameStore.state.eloRating || 1000 }} LP</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Matchmaking Button -->
    <div class="search-section">
      <button 
        v-if="!isSearching"
        class="search-btn press-start"
        @click.stop="startSearch"
      >
        <span class="btn-icon">⚔️</span> BUSCAR COMBATE RANKED
      </button>
      <div
        v-else
        class="searching-state card-glass"
      >
        <div class="spinner" />
        <span class="press-start">BUSCANDO RIVAL...</span>
        <button
          class="cancel-btn"
          @click.stop="cancelSearch"
        >
          CANCELAR
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs-nav">
      <button 
        class="tab-btn press-start" 
        :class="{ active: activeTab === 'overview' }"
        @click.stop="activeTab = 'overview'"
      >
        PROGRESO
      </button>
      <button 
        class="tab-btn press-start" 
        :class="{ active: activeTab === 'ranking' }"
        @click.stop="activeTab = 'ranking'"
      >
        RANKING GLOBAL
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content custom-scrollbar">
      <div
        v-if="activeTab === 'overview'"
        class="overview-tab"
      >
        <RewardsTrack />
        
        <!-- Rules Summary -->
        <div class="rules-card card-glass">
          <h3 class="press-start">
            REGLAS DE TEMPORADA
          </h3>
          <div class="rules-grid">
            <div class="rule-item">
              <span class="label">Máximo Pokémon</span>
              <span class="val">{{ rankedStore.rules.maxPokemon }}</span>
            </div>
            <div class="rule-item">
              <span class="label">Límite Nivel</span>
              <span class="val">{{ rankedStore.rules.levelCap }}</span>
            </div>
            <div
              v-if="rankedStore.rules.allowedTypes.length"
              class="rule-item"
            >
              <span class="label">Tipos Permitidos</span>
              <div class="types-list">
                <span
                  v-for="t in rankedStore.rules.allowedTypes"
                  :key="t"
                  class="type-pill"
                  :class="t"
                >{{ t }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="activeTab === 'ranking'"
        class="ranking-tab"
      >
        <Leaderboard />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.ranked-menu {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  padding: 10px;
}

.press-start {
  @include pixelated;
  font-size: 8px;
}

.card-glass {
  background: Rgba(255, 255, 255, 0.03);
  -webkit-backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  @include gpu-layer;
}

.season-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  background: Linear-Gradient(135deg, Rgba(59, 130, 246, 0.1), Rgba(139, 92, 246, 0.1));
}

.season-tag {
  color: Var(--blue);
  font-size: 7px;
  margin-bottom: 8px;
  display: block;
}

.season-name {
  margin: 0;
  font-size: 20px;
  color: Var(--white);
}

.dates {
  font-size: 11px;
  color: Var(--gray);
  margin-top: 4px;
}

.ranked-tier-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border: 1px solid;
  border-radius: 12px;
}

.tier-icon {
  font-size: 24px;
}

.tier-details {
  display: flex;
  flex-direction: column;
}

.tier-name {
  font-weight: bold;
  font-size: 14px;
}

.elo-val {
  font-size: 8px;
  margin-top: 4px;
}

.search-section {
  width: 100%;
}

.search-btn {
  width: 100%;
  padding: 18px;
  background: Linear-Gradient(90deg, Rgba(59, 130, 246, 1), Rgba(139, 92, 246, 1));
  border: none;
  border-radius: 12px;
  color: Var(--white);
  cursor: pointer;
  box-shadow: 0 4px 15px Rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 10px;

  &:hover {
    transform: TranslateY(-2px);
    box-shadow: 0 6px 20px Rgba(59, 130, 246, 0.4);
    filter: Brightness(1.1);
  }
}

.searching-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-color: Var(--blue);
  animation: pulse 2s infinite;

  .spinner {
    width: 20px;
    height: 20px;
    border: 3px solid Rgba(59, 130, 246, 0.2);
    border-top-color: Rgba(59, 130, 246, 1);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

.cancel-btn {
  background: Rgba(255, 59, 59, 0.1);
  border: 1px solid Rgba(255, 59, 59, 0.2);
  color: Var(--red);
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 10px;
  font-weight: bold;

  &:hover {
    background: Rgba(255, 59, 59, 0.2);
  }
}

.tabs-nav {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: Var(--gray);
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 7px;

  &.active {
    color: Var(--yellow);
    border-bottom: 2px solid Var(--yellow);
  }

  &:hover:Not(.active) {
    color: Var(--white);
  }
}

.tab-content {
  flex: 1;
  min-height: 0;
  @include smooth-scroll;
}

.overview-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rules-card {
  h3 {
    margin: 0 0 16px 0;
    font-size: 8px;
    color: Var(--gray);
  }
}

.rules-grid {
  display: grid;
  grid-template-columns: Repeat(auto-fit, Minmax(150px, 1fr));
  gap: 16px;
}

.rule-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .label {
    font-size: 10px;
    color: Var(--gray);
  }

  .val {
    font-size: 14px;
    font-weight: bold;
    color: Var(--white);
  }
}

.type-pill {
  font-size: 9px;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  font-weight: bold;
  background: Rgba(255, 255, 255, 0.1);
}

@keyframes spin {
  to { transform: Rotate(360deg); }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 Rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 10px Rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 Rgba(59, 130, 246, 0); }
}
</style>
