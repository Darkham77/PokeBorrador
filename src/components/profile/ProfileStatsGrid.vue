<script setup lang="ts">
import { formatCurrency } from '@/logic/utils/formatters'
import { useStatHover } from '@/composables/ui/useStatHover'

interface Stats {
  wins?: number
  trainersDefeated?: number
}

interface Props {
  stats: Stats
  level: number
  badges: number
  money?: number
  battleCoins?: number
}

defineProps<Props>()

const formatNum = (num: number) => formatCurrency(num)

const { handleStatEnter, handleStatLeave } = useStatHover({
  money: {
    border: 'rgba(107, 203, 119, 0.2)',
    background: 'linear-gradient(135deg, rgba(107, 203, 119, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)'
  },
  bc: {
    border: 'rgba(199, 125, 255, 0.2)',
    background: 'linear-gradient(135deg, rgba(199, 125, 255, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)'
  }
})
</script>

<template>
  <div class="profile-stat-grid-legacy">
    <div 
      class="legacy-stat-item"
      @mouseenter="handleStatEnter"
      @mouseleave="handleStatLeave"
    >
      <span class="legacy-stat-val">{{ level }}</span>
      <span class="legacy-stat-lbl">Nivel</span>
    </div>
    <div 
      class="legacy-stat-item"
      @mouseenter="handleStatEnter"
      @mouseleave="handleStatLeave"
    >
      <span class="legacy-stat-val">{{ badges }}</span>
      <span class="legacy-stat-lbl">Medallas</span>
    </div>
    <div 
      class="legacy-stat-item"
      @mouseenter="handleStatEnter"
      @mouseleave="handleStatLeave"
    >
      <span class="legacy-stat-val">{{ stats?.wins ?? 0 }}</span>
      <span class="legacy-stat-lbl">Vics. Salvaje</span>
    </div>
    <div 
      class="legacy-stat-item"
      @mouseenter="handleStatEnter"
      @mouseleave="handleStatLeave"
    >
      <span class="legacy-stat-val">{{ stats?.trainersDefeated ?? 0 }}</span>
      <span class="legacy-stat-lbl">Entr. Derrotados</span>
    </div>
    <div 
      class="legacy-stat-item highlight money"
      @mouseenter="handleStatEnter"
      @mouseleave="handleStatLeave"
    >
      <span class="legacy-stat-val">
        <span class="currency-icon-money">₽</span>
        {{ formatNum(money ?? 0) }}
      </span>
      <span class="legacy-stat-lbl">Dinero</span>
    </div>
    <div 
      class="legacy-stat-item highlight bc"
      @mouseenter="handleStatEnter"
      @mouseleave="handleStatLeave"
    >
      <span class="legacy-stat-val">
        <i class="fas fa-coins currency-icon-bc" />
        {{ formatNum(battleCoins ?? 0) }}
      </span>
      <span class="legacy-stat-lbl">Battle Coins</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.profile-stat-grid-legacy {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.legacy-stat-item {
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  @include gpu-layer;

  &.highlight {
    &.money {
      background: linear-gradient(135deg, Rgba(107, 203, 119, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
      border-color: Rgba(107, 203, 119, 0.2);
      
      .legacy-stat-val {
        color: $green;
        text-shadow: 0 0 10px Rgba(107, 203, 119, 0.4);
      }
      .currency-icon-money {
        color: $green;
      }
    }
    
    &.bc {
      background: linear-gradient(135deg, Rgba(199, 125, 255, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
      border-color: Rgba(199, 125, 255, 0.2);
      
      .legacy-stat-val {
        color: $purple;
        text-shadow: 0 0 10px Rgba(199, 125, 255, 0.5);
      }
      .currency-icon-bc {
        color: $purple;
      }
    }

    &.reputation {
      background: linear-gradient(135deg, Rgba(74, 222, 128, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
      border-color: Rgba(74, 222, 128, 0.2);
      
      .legacy-stat-val {
        color: #4ade80;
        text-shadow: 0 0 10px Rgba(74, 222, 128, 0.5);
      }
      .currency-icon-rep {
        color: #fbbf24;
      }
    }
  }
}

.legacy-stat-val {
  @include pixelated;
  font-size: 14px;
  color: $white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.legacy-stat-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
