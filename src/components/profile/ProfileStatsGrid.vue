<script setup>
defineProps({
  stats: { type: Object, required: true },
  level: { type: Number, required: true },
  badges: { type: Number, required: true },
  money: { type: Number, default: 0 },
  battleCoins: { type: Number, default: 0 }
})

const formatNum = (num) => (num || 0).toLocaleString().replace(/,/g, '.')
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
.profile-stat-grid-legacy {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.legacy-stat-item {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.highlight .legacy-stat-val {
    color: var(--yellow);
  }
}

.legacy-stat-val {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.legacy-stat-lbl {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.currency-icon-money { color: var(--yellow); }
</style>
