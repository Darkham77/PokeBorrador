<script setup lang="ts">

import { useWarStore } from '@/stores/war'
import { computed, onMounted } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { WEEKLY_REWARD_MILESTONES } from '@/logic/war/warEngine'
import MapControlList from './MapControlList.vue'

const warStore = useWarStore()

interface Milestone {
  pt: number
  coins: number
}

const dispute = computed(() => warStore.isDisputeActive)

// Calculate score (Maps controlled)
const globalScore = computed(() => {
  let union = 0
  let poder = 0
  Object.values(warStore.mapDominance).forEach((m) => {
    if (m.winner === 'union') union++
    else if (m.winner === 'poder') poder++
    else if ((m.union ?? 0) > (m.poder ?? 0)) union++
    else if ((m.poder ?? 0) > (m.union ?? 0)) poder++
  })
  return { union, poder }
})

const nextReward = computed(() => {
  const milestones: readonly Milestone[] = WEEKLY_REWARD_MILESTONES
  return milestones.find(m => warStore.weeklyPoints < m.pt) || 
         milestones[milestones.length - 1]
})

const progressPercent = computed(() => {
  const current = warStore.weeklyPoints
  const target = nextReward.value?.pt || 100
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
        <span class="emoji">{{ dispute ? '⚔️' : '🏆' }}</span> {{ dispute ? 'FASE DE DISPUTA' : 'FASE DE DOMINANCIA' }}
      </div>
      <div class="phase-desc">
        {{ dispute ? 'Suma puntos capturando y venciendo en mapas' : 'Gana bonos en mapas dominados' }}
      </div>
    </div>

    <!-- Global Score -->
    <div class="score-card">
      <div class="team union">
        <img
          :src="getAssetUrl(ASSET_TYPES.FACTION, 'union')"
          alt="Union"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
          :src="getAssetUrl(ASSET_TYPES.FACTION, 'poder')"
          alt="Poder"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
        Próximo premio:
        <span class="highlight">
          <span class="emoji">⚡</span>{{ formatCurrency(nextReward?.coins || 0) }} Monedas de Guerra
        </span>
        al llegar a {{ formatCurrency(nextReward?.pt || 0) }} PT
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-item">
        <div class="label">
          Saldo de Guerra
        </div>
        <div class="value">
          <span class="emoji">⚡</span>{{ formatCurrency(warStore.warCoins) }}
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
@use "@/styles/core/_mixins" as *;

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
    background: Rgb(255 136 0 / 10%);
    border-color: Rgb(255 136 0 / 100%);
    .phase-title { color: Rgb(255 136 0 / 100%); }
  }
  
  &.dominance {
    background: Rgb(68 255 68 / 10%);
    border-color: Rgb(68 255 68 / 100%);
    .phase-title { color: Rgb(68 255 68 / 100%); }
  }

  .phase-title {
    @include pixelated;

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
  justify-content: space-around;
  align-items: center;
  padding: 24px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 20px;
  background: Rgb(255 255 255 / 5%);

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
      @include pixelated;

      font-size: 20px;
    }
    
    .label {
      font-size: 9px;
      opacity: 0.5;
      margin-top: 4px;
    }

    &.union { color: Rgb(59 130 246 / 100%); }
    &.poder { color: Rgb(239 68 68 / 100%); }
  }

  .vs {
    @include pixelated;

    color: var(--gray, #666);
    font-size: 12px;
  }
}

.personal-card {
  padding: 20px;
  border: 1px solid Rgb(51 51 51 / 100%);
  border-radius: 20px;
  background: $card2;

  .card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    
    .title {
      @include pixelated;

      color: var(--yellow, #facc15);
      font-size: 10px;
    }
    
    .pts {
      @include pixelated;

      font-size: 10px;
    }
  }
}

.progress-container {
  position: relative;
  padding: 0 10px;
  margin-bottom: 30px;

  .progress-bar {
    height: 12px;
    border-radius: 6px;
    background: $black;
    overflow: hidden;
    
    .fill {
      height: 100%;
      background: Linear-Gradient(90deg, Rgb(59 130 246 / 100%), Rgb(96 165 250 / 100%));
      box-shadow: 0 0 10px Rgb(59 130 246 / 50%);
    }
  }

  .milestones {
    position: absolute;
    top: -4px;
    right: 10px;
    left: 10px;
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
        border: 2px solid var(--black);
        border-radius: 50%;
        background: Rgb(51 51 51 / 100%);
        margin-bottom: 4px;
        
      }
      
      .pt-label {
        @include pixelated;

        color: Rgb(102 102 102 / 100%);
        font-size: 8px;
      }

      &.achieved {
        .dot {
          background: Rgb(59 130 246 / 100%);
          border-color: var(--white);
          box-shadow: 0 0 8px Rgb(59 130 246 / 100%);
        }
        .pt-label { color: white; }
      }
    }
  }
}

.reward-preview {
  padding: 10px;
  border-radius: 8px;
  background: Rgb(0 0 0 / 30%);
  color: Rgb(136 136 136 / 100%);
  font-size: 11px;
  line-height: 1.6; /* Generous spacing between wrapped lines */
  text-align: center;
  
  .highlight {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--yellow, #facc15);
    font-weight: bold;
    vertical-align: middle;

    .emoji {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      line-height: 1;
    }
  }
}

.stats-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;

  .stat-item {
    padding: 16px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: 16px;
    background: Rgb(255 255 255 / 5%);
    text-align: center;

    .label {
      color: Rgb(136 136 136 / 100%);
      font-size: 9px;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    
    .value {
      @include pixelated;

      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
      color: white;
      font-size: 12px;
      vertical-align: middle;

      .emoji {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        line-height: 1;
      }
    }
  }
}
</style>
