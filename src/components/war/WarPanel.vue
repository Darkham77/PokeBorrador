<script setup>
import { ref, computed, onMounted } from 'vue';
import { useWarStore } from '@/stores/war';
import { useGameStore } from '@/stores/game';
import { WAR_CONFIG } from '@/data/warConfig';

const warStore = useWarStore();
const gameStore = useGameStore();

const activeTab = ref('global'); // 'global' | 'mapas' | 'premios'

onMounted(() => {
  warStore.loadWarData();
});

const factionColor = (f) => f === 'union' ? '#3b82f6' : '#ef4444';
const factionName = (f) => f === 'union' ? 'TEAM UNIÓN' : 'TEAM PODER';

const currentProgress = computed(() => {
  let union = 0, poder = 0;
  Object.values(warStore.mapDominance).forEach(m => {
    union += m.union || 0;
    poder += m.poder || 0;
  });
  const total = union + poder || 1;
  return {
    union: (union / total) * 100,
    poder: (poder / total) * 100,
    uVal: union,
    pVal: poder
  };
});

const rewardTier = computed(() => {
  return WAR_CONFIG.WEEKLY_REWARD_TIERS.find(t => warStore.weeklyPoints >= t.minPt) || { label: 'Ninguno', coins: 0 };
});

const handleFactionChoice = async (f) => {
  const isChange = !!warStore.faction;
  const msg = isChange 
    ? `¿Cambiar al ${factionName(f)}? Costará 🪙${WAR_CONFIG.FACTION_CHANGE_COST.toLocaleString()} y perderás tus puntos de esta semana.`
    : `¿Quieres unirte al ${factionName(f)}? Esta elección definirá tus aliados en Kanto.`;
  
  if (confirm(msg)) {
    await warStore.chooseFaction(f);
  }
};
</script>

<template>
  <div class="war-panel">
    <!-- Header -->
    <header class="war-header">
      <div class="title-group">
        <h2 class="press-start">
          GUERRA DE FACCIONES
        </h2>
        <p class="week-id">
          {{ warStore.currentWeekId }}
        </p>
      </div>
      <div
        class="phase-badge"
        :class="{ dispute: warStore.isDisputePhase }"
      >
        {{ warStore.isDisputePhase ? '⚔️ FASE DE DISPUTA' : '🏆 FASE DE DOMINANCIA' }}
      </div>
    </header>

    <!-- Faction Selection (If none) -->
    <div
      v-if="!warStore.faction"
      class="no-faction-view"
    >
      <h3>ELIGE TU BANDO</h3>
      <p>Determina el destino de Kanto y compite por el control de los mapas.</p>
      
      <div class="faction-cards">
        <div
          class="faction-card union"
          @click="handleFactionChoice('union')"
        >
          <img
            src="@/assets/ui/factions/union.webp"
            alt="Unión"
          >
          <span class="press-start">UNIÓN</span>
          <p>Equilibrio y Sincronía</p>
        </div>
        
        <div
          class="faction-card poder"
          @click="handleFactionChoice('poder')"
        >
          <img
            src="@/assets/ui/factions/poder.webp"
            alt="Poder"
          >
          <span class="press-start">PODER</span>
          <p>Fuerza y Dominio</p>
        </div>
      </div>
    </div>

    <!-- Main Dashboard -->
    <div
      v-else
      class="dashboard"
    >
      <!-- Global Progress Bar -->
      <div class="dominance-bar-container">
        <div class="bar-labels">
          <span class="union-label press-start">UNIÓN: {{ Math.round(currentProgress.union) }}%</span>
          <span class="poder-label press-start">PODER: {{ Math.round(currentProgress.poder) }}%</span>
        </div>
        <div class="progress-track">
          <div
            class="fill union"
            :style="{ width: currentProgress.union + '%' }"
          />
          <div
            class="fill poder"
            :style="{ width: currentProgress.poder + '%' }"
          />
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="war-nav">
        <button
          :class="{ active: activeTab === 'global' }"
          @click="activeTab = 'global'"
        >
          ESTADO
        </button>
        <button
          :class="{ active: activeTab === 'mapas' }"
          @click="activeTab = 'mapas'"
        >
          MAPAS
        </button>
        <button
          :class="{ active: activeTab === 'premios' }"
          @click="activeTab = 'premios'"
        >
          TUS PREMIOS
        </button>
      </nav>

      <!-- Tab Content: Global -->
      <div
        v-if="activeTab === 'global'"
        class="tab-content global-info"
      >
        <div class="stat-grid">
          <div class="stat-card">
            <span class="label">TU EQUIPO</span>
            <div
              class="val"
              :style="{ color: factionColor(warStore.faction) }"
            >
              {{ factionName(warStore.faction) }}
            </div>
          </div>
          <div class="stat-card">
            <span class="label">CONTRIBUCIÓN SEMANAL</span>
            <div class="val gold">
              {{ warStore.weeklyPoints }} PT
            </div>
          </div>
          <div class="stat-card">
            <span class="label">RANGO ACTUAL</span>
            <div class="val">
              {{ rewardTier.label }}
            </div>
          </div>
          <div class="stat-card">
            <span class="label">MONEDAS DE GUERRA</span>
            <div class="val silver">
              ⚡ {{ warStore.warCoins }}
            </div>
          </div>
        </div>

        <div
          v-if="warStore.isDisputePhase"
          class="action-footer"
        >
          <button
            class="change-btn"
            @click="handleFactionChoice(warStore.faction === 'union' ? 'poder' : 'union')"
          >
            CAMBIAR DE BANDO (🪙25K)
          </button>
        </div>
      </div>

      <!-- Tab Content: Maps -->
      <div
        v-if="activeTab === 'mapas'"
        class="tab-content map-list"
      >
        <div
          v-for="(data, mapId) in warStore.mapDominance"
          :key="mapId"
          class="map-row"
        >
          <div class="map-info">
            <span class="map-name">{{ mapId }}</span>
            <div class="map-bar">
              <div
                class="u-fill"
                :style="{ width: (data.union / (data.union + data.poder || 1) * 100) + '%' }"
              />
              <div
                class="p-fill"
                :style="{ width: (data.poder / (data.union + data.poder || 1) * 100) + '%' }"
              />
            </div>
          </div>
          <div
            v-if="data.winner"
            class="map-winner press-start"
            :style="{ color: factionColor(data.winner) }"
          >
            {{ data.winner.toUpperCase() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.war-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  min-height: 500px;
}

.press-start {
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  letter-spacing: 1px;
}

.war-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 15px;

  .week-id {
    font-size: 12px;
    color: #64748b;
    margin-top: 5px;
  }

  .phase-badge {
    padding: 8px 16px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.05);

    &.dispute {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
  }
}

.no-faction-view {
  text-align: center;
  margin: auto;

  h3 { font-size: 20px; color: #fbbf24; margin-bottom: 10px; }
  p { color: #94a3b8; font-size: 14px; margin-bottom: 30px; }

  .faction-cards {
    display: flex;
    gap: 20px;
    justify-content: center;

    .faction-card {
      width: 160px;
      padding: 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      img { width: 48px; height: 48px; margin-bottom: 16px; transition: transform 0.3s; }
      span { display: block; margin-bottom: 8px; font-size: 12px; }
      p { font-size: 11px; margin: 0; }

      &:hover {
        background: rgba(255, 255, 255, 0.07);
        transform: translateY(-5px);
        img { transform: scale(#{1.1}); }
      }

      &.union {
        &:hover { border-color: #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2); }
        span { color: #3b82f6; }
      }

      &.poder {
        &:hover { border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
        span { color: #ef4444; }
      }
    }
  }
}

.dominance-bar-container {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 12px;

  .bar-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 8px;
    .union-label { color: #3b82f6; }
    .poder-label { color: #ef4444; }
  }

  .progress-track {
    height: 12px;
    background: #334155;
    border-radius: 6px;
    display: flex;
    overflow: hidden;

    .fill {
      height: 100%;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      &.union { background: #3b82f6; }
      &.poder { background: #ef4444; }
    }
  }
}

.war-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;

  button {
    flex: 1;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: rgba(255, 255, 255, 0.07); }
    &.active {
      background: rgba(251, 191, 36, 0.1);
      border-color: #fbbf24;
      color: #fbbf24;
    }
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .stat-card {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .label { font-size: 9px; color: #64748b; font-weight: 700; margin-bottom: 8px; display: block; }
    .val { 
      font-size: 14px; font-weight: 700; 
      &.gold { color: #fbbf24; }
      &.silver { color: #94a3b8; }
    }
  }
}

.map-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;

  .map-row {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.02);
    padding: 12px;
    border-radius: 12px;

    .map-info {
      flex: 1;
      .map-name { font-size: 12px; margin-bottom: 6px; display: block; opacity: 0.8; }
      .map-bar {
        height: 6px; background: #1e293b; border-radius: 3px; display: flex; overflow: hidden;
        .u-fill { background: #3b82f6; }
        .p-fill { background: #ef4444; }
      }
    }
    .map-winner { font-size: 8px; width: 60px; text-align: right; }
  }
}

.action-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;

  .change-btn {
    padding: 12px 24px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    color: #94a3b8;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }
  }
}
</style>
