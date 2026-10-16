<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  prize: Record<string, unknown>;
}

const props = defineProps<Props>();

function formatTierName(tier?: unknown): string {
  if (typeof tier !== 'string' || !tier) return '';
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

const prizeType = computed(() => String(props.prize.type || ''));
</script>

<template>
  <div class="reward-prize-item">
    <!-- Pokémon Prize -->
    <template v-if="prizeType === 'pokemon'">
      <span class="emoji prize-icon">🐣</span>
      <div class="prize-info">
        <span class="prize-title">
          {{ String(prize.species || '').toUpperCase() }}
          <template v-if="prize.shiny"> <span class="emoji">✨</span> SHINY </template>
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
        <span class="prize-title"
          >{{ prize.amount }} Battle Coins ({{ prize.amount }} Monedas de Batalla)</span
        >
        <span class="prize-sub">Moneda de Torneo y Tienda BC</span>
      </div>
    </template>

    <!-- Ranked Medal Prize -->
    <template v-else-if="prizeType === 'ranked_medal'">
      <span class="emoji prize-icon">🎖️</span>
      <div class="prize-info">
        <span class="prize-title"
          >Medalla {{ formatTierName(prize.tier) }} (Medalla de Temporada {{ prize.season }})</span
        >
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
  gap: $spacing-md-alt;
  padding: 8px 12px;
  border: 1px solid Rgb(148 163 184 / 20%);
  border-radius: $radius-lg;
  background: Rgb(15 23 42 / 60%);

  .prize-icon {
    font-size: var(--font-20);
  }

  .prize-info {
    display: flex;
    flex-direction: column;

    .prize-title {
      color: var(--slate-50);
      font-size: var(--font-13);
      font-weight: 700;
      text-transform: uppercase;
    }

    .prize-sub {
      color: var(--slate-400);
      font-size: var(--font-11);
    }
  }
}
</style>
