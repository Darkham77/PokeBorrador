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
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}

.legacy-stat-item {
  @include gpu-layer;

  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 18px;
  background: Rgb(15 23 42 / 95%);
  text-align: center;
  cursor: default;
  filter: Brightness(1);

  > * {
    pointer-events: none;
  }

  &.highlight {
    &.money {
      background: Linear-Gradient(135deg, Rgb(107 203 119 / 5%) 0%, Rgb(15 23 42 / 40%) 100%);
      border-color: Rgb(107 203 119 / 20%);
      
      .legacy-stat-val {
        color: $green;
        text-shadow: 0 0 10px Rgb(107 203 119 / 40%);
      }
      .currency-icon-money {
        color: $green;
      }
    }
    
    &.bc {
      background: Linear-Gradient(135deg, Rgb(199 125 255 / 5%) 0%, Rgb(15 23 42 / 40%) 100%);
      border-color: Rgb(199 125 255 / 20%);
      
      .legacy-stat-val {
        color: $purple;
        text-shadow: 0 0 10px Rgb(199 125 255 / 50%);
      }
      .currency-icon-bc {
        color: $purple;
      }
    }

    &.reputation {
      background: Linear-Gradient(135deg, Rgb(74 222 128 / 5%) 0%, Rgb(15 23 42 / 40%) 100%);
      border-color: Rgb(74 222 128 / 20%);
      
      .legacy-stat-val {
        color: #4ade80;
        text-shadow: 0 0 10px Rgb(74 222 128 / 50%);
      }
    }
  }
}

.legacy-stat-val {
  @include pixelated;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: $white;
  font-size: 14px;
}

.legacy-stat-lbl {
  @include pixelated;

  color: Rgb(255 255 255 / 30%);
  font-size: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
