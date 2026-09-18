<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import { POKEMON_TYPES } from '@/data/battle/types'

const _MARKET_TYPE_FILTERS = ['all', ...POKEMON_TYPES] as const
type MarketTypeFilter = (typeof _MARKET_TYPE_FILTERS)[number]

const types = ['all', ...POKEMON_TYPES] as const satisfies readonly MarketTypeFilter[]
const tiers = ['all', 'S+', 'S', 'A', 'B', 'C', 'D', 'F'] as const

defineProps<{
  currentTier: string
  currentType: string
}>()

const emit = defineEmits<{
  (e: 'change-tier', val: string): void
  (e: 'change-type', val: string): void
}>()

const getTypeEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮',
    normal: '🔘', rock: '🪨', ground: '🏜️', poison: '☣️', bug: '🐛',
    flying: '🦅', ghost: '👻', ice: '❄️', dragon: '🐲', fighting: '🥊',
    dark: '🌑', steel: '⚙️', all: '📂'
  }
  return emojis[type] || '❓'
}
</script>

<template>
  <div class="pokemon-filters-group">
    <div class="filter-group">
      <div class="group-label">
        Tier
      </div>
      <div class="tags-grid">
        <button
          v-for="t in tiers"
          :id="`market-filters-tier-${t}`"
          :key="t"
          class="tag-btn"
          :class="{ active: currentTier === t }"
          @click.stop="emit('change-tier', t)"
        >
          {{ t === 'all' ? 'X' : t }}
        </button>
      </div>
    </div>

    <div class="filter-group">
      <div class="group-label">
        Tipo
      </div>
      <div class="types-grid">
        <PVTooltip
          v-for="t in types"
          :key="t"
          :title="t.toUpperCase()"
        >
          <button
            :id="`market-filters-type-${t}`"
            class="type-btn"
            :class="{ active: currentType === t }"
            @click.stop="emit('change-type', t)"
          >
            <span class="emoji">{{ getTypeEmoji(t) }}</span>
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokemon-filters-group {
  display: flex;
  flex-direction: column;
}

.filter-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  font-size: 10px;
  color: var(--gray);
  margin-bottom: 8px;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-btn {
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.04);
  color: var(--gray);
  font-size: 8px;
  cursor: pointer;
  text-transform: capitalize;

  &.active {
    border-color: var(--blue);
    background: Rgba(10, 132, 255, 0.2);
    color: $white;
  }
}

.types-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.type-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.06);
  background: Rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;

  &.active {
    border-color: var(--blue);
    background: Rgba(0, 122, 255, 0.2);
  }
}
</style>
