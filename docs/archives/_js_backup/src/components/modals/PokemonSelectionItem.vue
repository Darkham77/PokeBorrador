<script setup>
import { computed } from 'vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { useBattleVisuals } from '@/composables/useBattleVisuals'

const { getHpColor } = useBattleVisuals()

const props = defineProps({
  item: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  total: { type: Number, required: true },
  isBattleContext: { type: Boolean, default: false },
  autoConfirm: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'openDetail'])

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || 'Rgba(170, 170, 170, 1)'

const tierData = computed(() => getPokemonTier(props.item.pokemon))
const ivTotal = computed(() => Object.values(props.item.pokemon.ivs || {}).reduce((s, v) => s + (v || 0), 0))
const isPremiumTier = computed(() => tierData.value.tier === 'S' || tierData.value.tier === 'S+')
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
    @click.stop="emit('select', item)"
  >
    <div class="poke-preview-container">
      <PVTooltip
        title="DETALLES"
        description="Ver información completa de este Pokémon."
        position="top"
        class="poke-preview"
        @click.stop="emit('openDetail', item)"
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
            @error="e => e.target.style.display = 'none'"
          >
        </PVSpriteFX>
      </PVTooltip>
    </div>

    <div class="poke-details">
      <div class="top-line">
        <div class="name-group">
          <div class="ps-name-stack">
            <span class="name">{{ item.pokemon.nickname || item.pokemon.name?.replace(/[♂♀]/g, '').trim() || 'Desconocido' }}</span>
            <span
              v-if="item.pokemon.nickname"
              class="ps-species-subtitle"
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
          <span class="m-badge-tier">{{ tierData.tier }}</span>
        </div>
      </div>
      <div class="bottom-line">
        <div class="sel-types-row">
          <span 
            v-for="t in item.pokemon.types || [item.pokemon.type]" 
            :key="t"
            class="ps-type-pill sm"
            :class="`type-${t?.toLowerCase()}`"
            :style="{ background: getTypeColor(t) }"
          >
            {{ t?.toUpperCase() }}
          </span>
        </div>
        <span class="m-badge-level">Nv. {{ item.pokemon.level ?? 1 }}</span>
        <span
          v-if="item.pokemon.ivs"
          class="m-badge-iv"
        >IVs {{ ivTotal }}</span>
        <span class="m-badge-tot">TOT {{ total }}</span>
        <span
          class="source-tag"
          :class="item._source"
        >{{ item._source === 'team' ? 'EQUIPO' : 'CAJA' }}</span>
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
    </div>

    <div 
      v-if="!autoConfirm"
      class="selection-indicator"
    >
      <div class="check-circle">
        <span v-if="isSelected">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/badges" as *;

.list-item {
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
  margin-top: 8px;
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
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
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
</style>
