<script setup lang="ts">
import { computed } from 'vue'

import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { useBattleVisuals } from '@/composables/battle/useBattleVisuals'
import { useUIStore } from '@/stores/ui'
import { useBreedingStore } from '@/stores/breeding'
import { COMPAT_TEXT } from '@/logic/breeding/breedingData'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

import type { Pokemon } from '@/types/pokemon/pokemon'

const { getHpColor } = useBattleVisuals()
const uiStore = useUIStore()
const breedingStore = useBreedingStore()

interface Props {
  item: {
    pokemon: Pokemon
    _source: 'team' | 'box' | 'market'
    index: number
  }
  isSelected?: boolean
  total: number
  isBattleContext?: boolean
  autoConfirm?: boolean
  isDaycareContext?: boolean
  daycareSlotIdx?: number
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isBattleContext: false,
  autoConfirm: false,
  isDaycareContext: false,
  daycareSlotIdx: 0
})

const emit = defineEmits<{
  (e: 'select', item: { pokemon: Pokemon, _source: 'team' | 'box' | 'market', index: number }): void
  (e: 'openDetail', item: { pokemon: Pokemon, _source: 'team' | 'box' | 'market', index: number }): void
  (e: 'open-detail', item: { pokemon: Pokemon, _source: 'team' | 'box' | 'market', index: number }): void
}>()

const tierData = computed(() => getPokemonTier(props.item.pokemon))
const ivTotal = computed(() => {
  const ivs = props.item.pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
})
const isPremiumTier = computed(() => tierData.value.tier === 'S' || tierData.value.tier === 'S+')
const typesCount = computed(() => {
  return [props.item.pokemon.type, props.item.pokemon.type2].filter(Boolean).length
})

const listCompatibility = computed(() => {
  if (!props.isDaycareContext) return null
  const otherSlotIdx = props.daycareSlotIdx === 1 ? 0 : 1
  const otherSlot = breedingStore.slots.find((s) => s.slotIndex === otherSlotIdx)
  const otherPoke = otherSlot?.pokemon
  if (!otherPoke) return null
  return checkCompatibility(props.item.pokemon, otherPoke)
})

const eggSpeciesName = computed(() => {
  if (!listCompatibility.value?.eggSpecies) return ''
  return pokemonDataProvider.resolveSpeciesName(listCompatibility.value.eggSpecies)
})

function handleOpenDetail() {
  uiStore.openPokemonDetail(props.item.pokemon, props.item.index, props.item._source, { source: 'selection' })
}

function handleClick() {
  if (props.item._source === 'market') {
    handleOpenDetail()
  } else {
    emit('select', props.item)
  }
}
</script>

<template>
  <div 
    class="list-item"
    :class="{ 
      selected: isSelected,
      'is-premium-tier': isPremiumTier 
    }"
    :style="{ 
      '--tier-color': tierData.color,
      '--tier-bg': tierData.bg
    }"
    @click.stop="handleClick"
  >
    <div class="poke-preview-container">
      <PVTooltip
        title="DETALLES"
        description="Ver información completa de este Pokémon."
        position="top"
        class="poke-preview"
      >
        <div 
          class="sprite-click-target" 
          style="cursor: pointer;" 
          @click.stop="handleOpenDetail"
        >
          <PVSpriteFX
            :is-shiny="item.pokemon.isShiny"
            :is-guardian="item.pokemon.isGuardian"
            :sparkle-count="5"
          >
            <img
              :src="getAssetUrl(ASSET_TYPES.POKEMON, item.pokemon.id, { isShiny: item.pokemon.isShiny })"
              alt=""
              class="pixelated"
              @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
            >
          </PVSpriteFX>
        </div>
      </PVTooltip>
    </div>

    <div class="poke-details">
      <div class="top-line">
        <div class="name-group">
          <div class="ps-name-stack">
            <span
              class="name"
              :class="{ 'is-species': !item.pokemon.nickname }"
            >{{ item.pokemon.nickname || item.pokemon.name?.replace(/[♂♀]/g, '').trim() || 'Desconocido' }}</span>
            <span
              v-if="item.pokemon.nickname"
              class="sel-species-subtitle"
            >{{ item.pokemon.name }}</span>
          </div>
          <span
            v-if="item.pokemon.gender"
            :class="['gender-icon', item.pokemon.gender === 'M' ? 'male' : 'female']"
          >
            {{ item.pokemon.gender === 'M' ? '♂' : '♀' }}
          </span>

          <!-- Action badges relocated next to gender -->
          <UnifiedBadgePill 
            :pokemon="item.pokemon" 
            size="sm"
            :vertical="false"
            :inline="true"
            class="header-pill"
          />
        </div>

        <div class="actions-right">
          <PVTooltip
            :title="item._source === 'team' ? 'Equipo' : (item._source === 'box' ? 'Caja de PC' : 'Mercado')"
            :description="item._source === 'team' ? 'Este Pokémon está en tu equipo activo.' : (item._source === 'box' ? 'Este Pokémon está guardado en tu caja.' : 'Este Pokémon está en el mercado.')"
            position="top"
          >
            <span
              class="source-symbol"
              :class="item._source"
            >
              {{ item._source === 'team' ? '⚔️' : (item._source === 'box' ? '📦' : '🛒') }}
            </span>
          </PVTooltip>
          <span class="m-badge-tier">{{ tierData.tier }}</span>
        </div>
      </div>
      <div class="bottom-info">
        <div class="info-row stats-line">
          <div class="sel-types-row">
            <PokemonTypeTag
              v-for="t in [item.pokemon.type, item.pokemon.type2].filter(Boolean)" 
              :key="String(t)"
              :type="String(t)"
              :size="typesCount > 1 ? 'ssm' : 'sm'"
            />
          </div>
          <span class="m-badge-level">Nv. {{ item.pokemon.level ?? 1 }}</span>
          <span
            v-if="item.pokemon.ivs"
            class="m-badge-iv"
          >IVs {{ ivTotal }}</span>
          <span class="m-badge-tot">TOT {{ total }}</span>
        </div>
      </div>

      <!-- Battle HP Status -->
      <div
        v-if="isBattleContext"
        class="battle-hp-status"
      >
        <span class="hp-label">HP</span>
        <div class="hp-bar-container">
          <div 
            class="hp-bar-fill" 
            :style="{ 
              width: (Math.max(0, Math.min(100, (item.pokemon.hp / item.pokemon.maxHp * 100)))) + '%',
              backgroundColor: getHpColor(item.pokemon.hp / item.pokemon.maxHp * 100)
            }"
          />
        </div>
        <span class="hp-text">{{ item.pokemon.hp }} / {{ item.pokemon.maxHp }}</span>
      </div>
      
      <!-- Daycare Info (Compatibility / Vigor) -->
      <div
        v-if="isDaycareContext"
        class="daycare-item-meta"
      >
        <div class="compat-status">
          <template v-if="listCompatibility">
            <span :style="{ color: (COMPAT_TEXT as Record<number, { color: string, label: string }>)[listCompatibility.level]?.color || '#ff668f' }">
              AFINIDAD: {{ (COMPAT_TEXT as Record<number, { color: string, label: string }>)[listCompatibility.level]?.label || 'Desconocida' }}
            </span>
            <span
              v-if="listCompatibility.eggSpecies"
              class="egg-hint"
            >
              🥚 {{ eggSpeciesName }}
            </span>
          </template>
          <template v-else>
            <span class="waiting-status">Esperando pareja</span>
          </template>
        </div>
        
        <div
          v-if="item.pokemon.vigor !== undefined"
          class="vigor-status-mini"
        >
          <span class="label">VIGOR: </span>
          <span :class="['value', { low: item.pokemon.vigor <= 2 }]">⚡ {{ item.pokemon.vigor }}/10</span>
        </div>
      </div>
      
      <slot name="extra" />
    </div>

    <div 
      v-if="!autoConfirm"
      class="selection-indicator"
    >
      <div class="check-circle">
        <svg
          v-if="isSelected"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="checkmark-svg"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/badges" as *;

.source-symbol {
  font-size: 14px;
  line-height: 1 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
  margin-right: 2px;
}

.sel-types-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.list-item {
  @include premium-card-hover(var(--tier-color, $blue), 1.02, -5px);
  position: relative;
  
  &.is-premium-tier {
    @include pokemon-card-premium-tier;
  }
}

.m-badge-level {
  @include badge-level;
}

.m-badge-iv {
  @include badge-iv;
}

.m-badge-tot {
  @include badge-tot;
}

.m-badge-tier {
  @include badge-tier(24px);
  flex-shrink: 0;
}

.battle-hp-status {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
  width: 100%;

  .hp-label {
    font-size: 10px;
    font-weight: 800;
    color: var(--yellow);
    @include pixelated;
    flex-shrink: 0;
  }

  .hp-bar-container {
    flex: 1;
    height: 8px;
    background: Rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid Rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 1px 3px Rgba(0,0,0,0.5);
  }

  .hp-bar-fill {
    height: 100%;
    
    box-shadow: 0 0 10px Rgba(255,255,255,0.2);
  }

  .hp-text {
    font-size: 10px;
    color: $white;
    font-weight: 600;
    @include pixelated;
    flex-shrink: 0;
    min-width: 65px;
    text-align: right;
  }
}

.daycare-item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed Rgba(255, 255, 255, 0.05);
  width: 100%;
}

.compat-status {
  font-size: 8px;
  @include pixelated;
  display: flex;
  gap: 8px;
  align-items: center;
}

.waiting-status { color: Rgba(255, 255, 255, 0.25); }
.egg-hint { color: var(--daycare-pink, #ff3366); }

.vigor-status-mini {
  font-size: 8px;
  @include pixelated;
  
  .label {
    color: var(--gray, #94a3b8);
  }
  
  .value {
    color: #22c55e;
    font-weight: bold;
    &.low {
      color: #ef4444;
    }
  }
}
</style>
