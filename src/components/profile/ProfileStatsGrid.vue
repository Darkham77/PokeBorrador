<script setup lang="ts">
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

import { formatCurrency } from '@/logic/utils/formatters'

withDefaults(defineProps<Props>(), {
  money: 0,
  battleCoins: 0
})

const formatNum = (num: number) => formatCurrency(num)
</script>

<template>
  <div class="profile-stat-grid-legacy">
    <div class="legacy-stat-item">
      <span class="legacy-stat-val">{{ level }}</span>
      <span class="legacy-stat-lbl">Nivel</span>
    </div>
    <div class="legacy-stat-item">
      <span class="legacy-stat-val">{{ badges }}</span>
      <span class="legacy-stat-lbl">Medallas</span>
    </div>
    <div class="legacy-stat-item">
      <span class="legacy-stat-val">{{ stats.wins }}</span>
      <span class="legacy-stat-lbl">Vics. Salvaje</span>
    </div>
    <div class="legacy-stat-item">
      <span class="legacy-stat-val">{{ stats.trainersDefeated }}</span>
      <span class="legacy-stat-lbl">Entr. Derrotados</span>
    </div>
    <div class="legacy-stat-item highlight">
      <span class="legacy-stat-val">
        <span class="currency-icon-money">₱</span>
        {{ formatNum(money) }}
      </span>
      <span class="legacy-stat-lbl">Dinero</span>
    </div>
    <div class="legacy-stat-item highlight">
      <span class="legacy-stat-val">
        <i class="fas fa-coins currency-icon-bc" />
        {{ formatNum(battleCoins) }}
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
  margin-bottom: 24px;
}

.legacy-stat-item {
  background: Rgba(15, 23, 42, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(8px);
  backdrop-filter: Blur(8px);
  @include gpu-layer;

  &:hover {
    background: Rgba(30, 41, 59, 0.5);
    border-color: Rgba(255, 214, 10, 0.2);
    box-shadow: 0 0 0 1px Rgba(255, 214, 10, 0.2);
    transform: Translatey(-2px);
  }

  &.highlight {
    background: Linear-Gradient(135deg, Rgba(255, 214, 10, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(255, 214, 10, 0.1);
    
    .legacy-stat-val {
      color: $yellow;
      text-shadow: 0 0 10px Rgba(255, 214, 10, 0.3);
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
  @include pixelated;
}

.legacy-stat-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
  @include pixelated;
}

.currency-icon-money { color: $yellow; }
.currency-icon-bc { color: $purple; }
</style>
