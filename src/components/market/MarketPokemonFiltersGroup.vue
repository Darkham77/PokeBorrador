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
          :title="t === 'all' ? 'Todos' : t"
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.group-label {
  color: var(--gray);
  font-size: 10px;
  margin-bottom: 8px;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-btn {
  padding: 6px 10px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
  color: var(--gray);
  font-size: 8px;
  cursor: pointer;
  text-transform: capitalize;

  &.active {
    background: rgb(10 132 255 / 20%);
    color: $white;
    border-color: var(--blue);
  }
}

.types-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.type-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: 10px;
  background: rgb(0 0 0 / 20%);
  font-size: 16px;
  cursor: pointer;

  &.active {
    background: rgb(0 122 255 / 20%);
    border-color: var(--blue);
  }
}
</style>
