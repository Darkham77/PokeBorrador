<script setup>
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted } from 'vue'
import { WEEKLY_REWARD_MILESTONES } from '@/logic/war/warEngine'
import MapControlList from './MapControlList.vue'

const warStore = useWarStore()
const gameStore = useGameStore()
const authStore = useAuthStore()

const dispute = computed(() => warStore.isDisputeActive)

// Calculate score (Maps controlled)
const globalScore = computed(() => {
  let union = 0
  let poder = 0
  Object.values(warStore.mapDominance).forEach(m => {
    if (m.winner === 'union') union++
    else if (m.winner === 'poder') poder++
    else if (m.union > m.poder) union++
    else if (m.poder > m.union) poder++
  })
  return { union, poder }
})

const nextReward = computed(() => {
  return WEEKLY_REWARD_MILESTONES.find(m => warStore.weeklyPoints < m.pt) || 
         WEEKLY_REWARD_MILESTONES[WEEKLY_REWARD_MILESTONES.length - 1]
})

const progressPercent = computed(() => {
  const current = warStore.weeklyPoints
  const target = nextReward.value.pt
  return Math.min(100, (current / target) * 100)
})

onMounted(async () => {
  await warStore.loadWarData()
})
</script>

<template>
  <div class="war-dashboard">
    <!-- Faction Banner -->
    <div
      class="phase-banner"
      :class="dispute ? 'dispute' : 'dominance'"
    >
      <div class="phase-title">
        {{ dispute ? '⚔️ FASE DE DISPUTA' : '🏆 FASE DE DOMINANCIA' }}
      </div>
      <div class="phase-desc">
        {{ dispute ? 'Suma puntos capturando y venciendo en mapas' : 'Gana bonos en mapas dominados' }}
      </div>
    </div>

    <!-- Global Score -->
    <div class="score-card">
      <div class="team union">
        <img
          src="@/assets/factions/union.png"
          alt="Union"
        >
        <div class="count">
          {{ globalScore.union }}
        </div>
        <div class="label">
          MAPAS
        </div>
      </div>
      <div class="vs">
        VS
      </div>
      <div class="team poder">
        <img
          src="@/assets/factions/poder.png"
          alt="Poder"
        >
        <div class="count">
          {{ globalScore.poder }}
        </div>
        <div class="label">
          MAPAS
        </div>
      </div>
    </div>

    <!-- Personal Progress -->
    <div class="personal-card">
      <div class="card-header">
        <span class="title">MI PROGRESO</span>
        <span class="pts">{{ warStore.weeklyPoints }} PT</span>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class="fill"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
        <div class="milestones">
          <div 
            v-for="m in WEEKLY_REWARD_MILESTONES" 
            :key="m.pt"
            class="milestone"
            :class="{ achieved: warStore.weeklyPoints >= m.pt }"
          >
            <div class="dot" />
            <span class="pt-label">{{ m.pt }}</span>
          </div>
        </div>
      </div>

      <div class="reward-preview">
        Próximo premio: <span class="highlight">🪙{{ nextReward.coins }} Monedas</span> al llegar a {{ nextReward.pt }} PT
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-item">
        <div class="label">
          Saldo de Guerra
        </div>
        <div class="value">
          ⚡{{ warStore.warCoins }}
        </div>
      </div>
      <div class="stat-item">
        <div class="label">
          Capturas de Guardianes
        </div>
        <div class="value">
          {{ warStore.dailyGuardianCaptures.length }}/5
        </div>
      </div>
    </div>

    <!-- Territorial Control List -->
    <MapControlList />
  </div>
</template>

<style scoped lang="scss">
.war-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: white;
}

.phase-banner {
  padding: 16px;
  border-radius: 16px;
  text-align: center;
  border-width: 2px;
  border-style: solid;
  
  &.dispute {
    background: rgba(255, 136, 0, 0.1);
    border-color: #ff8800;
    .phase-title { color: #ff8800; }
  }
  
  &.dominance {
    background: rgba(68, 255, 68, 0.1);
    border-color: #44ff44;
    .phase-title { color: #44ff44; }
  }

  .phase-title {
    font-family: 'Press Start 2P', cursive;
    font-size: 11px;
    margin-bottom: 8px;
  }
  
  .phase-desc {
    font-size: 10px;
    opacity: 0.8;
  }
}

.score-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.05);
  padding: 24px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .team {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    img {
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
    
    .count {
      font-family: 'Press Start 2P', cursive;
      font-size: 20px;
    }
    
    .label {
      font-size: 9px;
      opacity: 0.5;
      margin-top: 4px;
    }

    &.union { color: #3b82f6; }
    &.poder { color: #ef4444; }
  }

  .vs {
    font-family: 'Press Start 2P', cursive;
    font-size: 12px;
    color: var(--gray, #666);
  }
}

.personal-card {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid #333;

  .card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    
    .title {
      font-family: 'Press Start 2P', cursive;
      font-size: 10px;
      color: var(--yellow, #facc15);
    }
    
    .pts {
      font-family: 'Press Start 2P', cursive;
      font-size: 10px;
    }
  }
}

.progress-container {
  position: relative;
  margin-bottom: 30px;
  padding: 0 10px;

  .progress-bar {
    height: 12px;
    background: #000;
    border-radius: 6px;
    overflow: hidden;
    
    .fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      transition: width 0.5s ease-out;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    }
  }

  .milestones {
    position: absolute;
    top: -4px;
    left: 10px;
    right: 10px;
    display: flex;
    justify-content: space-between;
    pointer-events: none;

    .milestone {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .dot {
        width: 20px;
        height: 20px;
        background: #333;
        border: 2px solid #000;
        border-radius: 50%;
        margin-bottom: 4px;
        transition: all 0.3s;
      }
      
      .pt-label {
        font-size: 8px;
        color: #666;
        font-family: 'Press Start 2P', cursive;
      }

      &.achieved {
        .dot {
          background: #3b82f6;
          border-color: #fff;
          box-shadow: 0 0 8px #3b82f6;
        }
        .pt-label { color: white; }
      }
    }
  }
}

.reward-preview {
  font-size: 11px;
  color: #888;
  text-align: center;
  background: rgba(0,0,0,0.3);
  padding: 10px;
  border-radius: 8px;
  
  .highlight {
    color: var(--yellow, #facc15);
    font-weight: bold;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  .stat-item {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 16px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .label {
      font-size: 9px;
      color: #888;
      margin-bottom: 8px;
    }
    
    .value {
      font-family: 'Press Start 2P', cursive;
      font-size: 12px;
      color: white;
    }
  }
}
</style>
