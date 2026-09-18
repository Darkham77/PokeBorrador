<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  prize: Record<string, unknown>
}

const props = defineProps<Props>()

function formatTierName(tier?: unknown): string {
  if (typeof tier !== 'string' || !tier) return ''
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
}

const prizeType = computed(() => String(props.prize.type || ''))
</script>

<template>
  <div class="reward-prize-item">
    <!-- Pokémon Prize -->
    <template v-if="prizeType === 'pokemon'">
      <span class="emoji prize-icon">🐣</span>
      <div class="prize-info">
        <span class="prize-title">
          {{ String(prize.species || '').toUpperCase() }}
          <template v-if="prize.shiny">
            <span class="emoji">✨</span> SHINY
          </template>
        </span>
        <span class="prize-sub">Nivel {{ prize.level }} • Genética Competitiva</span>
      </div>
    </template>

    <!-- Item / Ticket Prize -->
    <template v-else-if="prizeType === 'item'">
      <span class="emoji prize-icon">🎫</span>
      <div class="prize-info">
        <span class="prize-title">{{ prize.item }}</span>
        <span class="prize-sub">Cantidad: x{{ prize.qty }}</span>
      </div>
    </template>

    <!-- Battle Coins Prize -->
    <template v-else-if="prizeType === 'bc' || prizeType === 'battle_coins'">
      <span class="emoji prize-icon">🪙</span>
      <div class="prize-info">
        <span class="prize-title">{{ prize.amount }} Battle Coins ({{ prize.amount }} Monedas de Batalla)</span>
        <span class="prize-sub">Moneda de Torneo y Tienda BC</span>
      </div>
    </template>

    <!-- Ranked Medal Prize -->
    <template v-else-if="prizeType === 'ranked_medal'">
      <span class="emoji prize-icon">🎖️</span>
      <div class="prize-info">
        <span class="prize-title">Medalla {{ formatTierName(prize.tier) }} (Medalla de Temporada {{ prize.season }})</span>
        <span class="prize-sub">Rango {{ String(prize.tier).toUpperCase() }}</span>
      </div>
    </template>

    <!-- Generic fallback -->
    <template v-else>
      <span class="emoji prize-icon">🎁</span>
      <div class="prize-info">
        <span class="prize-title">Premio Especial</span>
        <span class="prize-sub">{{ JSON.stringify(prize) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.reward-prize-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: Rgba(15, 23, 42, 0.6);
  border: 1px solid Rgba(148, 163, 184, 0.2);
  border-radius: 8px;

  .prize-icon {
    font-size: 1.3rem;
  }

  .prize-info {
    display: flex;
    flex-direction: column;

    .prize-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f8fafc;
      text-transform: uppercase;
    }

    .prize-sub {
      font-size: 0.7rem;
      color: #94a3b8;
    }
  }
}
</style>
