<script setup lang="ts">
import { computed } from 'vue'

import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { useBattleVisuals } from '@/composables/battle/useBattleVisuals'
import { useUIStore } from '@/stores/ui'
import { useBreedingStore } from '@/stores/breeding'
import { COMPAT_TEXT } from '@/logic/breeding/breedingData'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import { getVigor, getMaxVigor } from '@/logic/pokemon/pokemonUtils'

const { getHpColor } = useBattleVisuals()
const uiStore = useUIStore()
const breedingStore = useBreedingStore()

interface Props {
  item: {
    pokemon: Pokemon
    _source: PokemonSelectionSource
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
  (e: 'select', item: { pokemon: Pokemon, _source: PokemonSelectionSource, index: number }): void
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
const pokemonTypes = computed<PokemonType[]>(() => {
  const p = props.item.pokemon
  const types: PokemonType[] = [toPokemonType(p.type)]
  if (p.type2) types.push(toPokemonType(p.type2))
  return types
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
  emit('select', props.item)
}
</script>

<template>
  <div 
    :id="'pokemon-select-' + item.pokemon.uid"
    class="list-item"
    :data-pokemon-uid="item.pokemon.uid"
    :class="{ 
      'is-selected': isSelected, 
      'is-active-battle': isBattleContext && item.pokemon.hp > 0,
      'is-fainted': item.pokemon.hp <= 0,
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
        class="info-tooltip-wrapper"
      >
        <button
          :id="'pokemon-detail-btn-' + item.pokemon.uid"
          v-gsap-hover="{ scale: 1.05, y: 0 }"
          type="button"
          class="btn-info-detail-trigger"
          @click.stop="handleOpenDetail"
        >
          ?
        </button>
      </PVTooltip>

      <div class="poke-preview sprite-click-target">
        <div
          v-if="item.pokemon.isIllegal"
          class="sel-illegal-danger-badge"
          :title="item.pokemon.illegalReasons?.join('\n') || 'Pokémon Ilegal'"
        >
          <span class="emoji danger-icon">⚠️</span>
          <span class="danger-label">ILEGAL</span>
        </div>
        <PVSpriteFX
          v-else
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
            class="emoji gender-icon"
            :class="item.pokemon.gender === 'm' ? 'male' : 'female'"
          >
            {{ item.pokemon.gender === 'm' ? '♂' : '♀' }}
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
              class="emoji source-symbol"
              :class="item._source"
            >
              {{ item._source === 'team' ? '⚔️' : (item._source === 'box' ? '📦' : '🛒') }}
            </span>
          </PVTooltip>
          <FriendshipSealBadge
            :friendship="item.pokemon.friendship"
            size="sm"
          />
          <span class="m-badge-tier">{{ tierData.tier }}</span>
        </div>
      </div>
      <div class="bottom-info">
        <div class="info-row stats-line">
          <div class="sel-types-row">
            <PokemonTypeTag
              v-for="t in pokemonTypes" 
              :key="t"
              :type="t"
              :size="typesCount > 1 ? 'ssm' : 'sm'"
            />
          </div>
          <span class="m-badge-level">Nv. {{ item.pokemon.level ?? 1 }}</span>
          <span
            v-if="item.pokemon.ivs"
            class="m-badge-iv"
          >IVs {{ ivTotal }}</span>
          <PVTooltip
            title="PODER TOTAL"
            description="Suma de estadísticas base, IVs genéticos y bonificación de EVs (4 EVs = 1 IV)."
            position="top"
          >
            <span class="m-badge-tot">TOT {{ total }}</span>
          </PVTooltip>
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
        <div class="daycare-meta-top">
          <div class="compat-status">
            <template v-if="listCompatibility">
              <span :style="{ color: (COMPAT_TEXT as Record<number, { color: string, label: string }>)[listCompatibility.level]?.color || '#ff668f' }">
                AFINIDAD: {{ (COMPAT_TEXT as Record<number, { color: string, label: string }>)[listCompatibility.level]?.label || 'Desconocida' }}
              </span>
              <span
                v-if="listCompatibility.eggSpecies"
                class="egg-hint"
              >
                <span class="emoji">🥚</span> {{ eggSpeciesName }}
              </span>
            </template>
            <template v-else>
              <span class="waiting-status">Esperando pareja</span>
            </template>
          </div>
          
          <div
            v-if="getVigor(item.pokemon) !== undefined"
            class="vigor-status-mini"
          >
            <span class="label">VIGOR: </span>
            <span :class="['value', { low: getVigor(item.pokemon) <= 2 }]"><span class="emoji">⚡</span> {{ getVigor(item.pokemon) }}/{{ getMaxVigor(item.pokemon) }}</span>
          </div>
        </div>

        <!-- Individual IVs List -->
        <div
          v-if="item.pokemon.ivs"
          class="ivs-list-row pixelated"
        >
          <span>HP: {{ item.pokemon.ivs.hp }}</span>
          <span>ATK: {{ item.pokemon.ivs.atk }}</span>
          <span>DEF: {{ item.pokemon.ivs.def }}</span>
          <span>SPA: {{ item.pokemon.ivs.spa }}</span>
          <span>SPD: {{ item.pokemon.ivs.spd }}</span>
          <span>SPE: {{ item.pokemon.ivs.spe }}</span>
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
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed Rgba(255, 255, 255, 0.05);
  width: 100%;
}

.daycare-meta-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
  .label {
    color: var(--gray, #94a3b8);
  }
  
  .value {
    color: #22c55e;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    &.low {
      color: #ef4444;
    }
  }
}

.ivs-list-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px 4px;
  font-size: 7px;
  color: #a7f3d0;
  @include pixelated;
  width: 100%;
}

.info-tooltip-wrapper {
  position: absolute;
  top: -23px;
  left: -23px;
  z-index: var(--z-map-ui);
}

.btn-info-detail-trigger {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0f172a; /* Slate 900 background matching standard panels */
  border: 2px solid var(--tier-color, #ffd700);
  color: var(--tier-color, #ffd700);
  font-family: 'Pokemon FireRed LeafGreen', monospace;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding-bottom: 2px;
  padding-right: 4px;
  cursor: pointer;
  box-shadow: 0 2px 6px Rgba(0, 0, 0, 0.6);
  box-sizing: border-box;

  &:hover {
    background: Rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 10px var(--tier-color);
  }
}

.sel-illegal-danger-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: Rgba(239, 68, 68, 0.2);
  border: 2px dashed #ef4444;
  border-radius: 6px;

  .danger-icon {
    font-size: 1.3rem;
    line-height: 1;
  }

  .danger-label {
    font-size: 0.5rem;
    font-weight: 900;
    color: #ff6b6b;
    letter-spacing: 0.5px;
    margin-top: 1px;
  }
}
</style>
