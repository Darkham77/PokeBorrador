<script setup>
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'

defineProps({
  item: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
    total: { type: Number, required: true }
})

const emit = defineEmits(['select', 'openDetail'])

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || 'Rgba(170, 170, 170, 1)'
</script>

<template>
  <div 
    class="list-item"
    :class="{ selected: isSelected }"
    :style="{ '--type-color': getTypeColor(item.pokemon.types?.[0] || item.pokemon.type) }"
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
          <div class="preview-bg" />
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
          <span class="m-badge-level">Nv. {{ item.pokemon.level ?? 1 }}</span>
        </div>
      </div>
      <div class="bottom-line">
        <div class="types-row">
          <span 
            v-for="t in item.pokemon.types || [item.pokemon.type]" 
            :key="t"
            class="type-pill"
            :style="{ background: getTypeColor(t) }"
          >
            {{ t?.toUpperCase() }}
          </span>
        </div>
        <span
          v-if="item.pokemon.ivs"
          class="m-badge-iv"
        >IVs: {{ Object.values(item.pokemon.ivs).reduce((s,v)=>s+(v||0),0) }}</span>
        <span class="m-badge-tot">TOT: {{ total }}</span>
        <span
          class="source-tag"
          :class="item._source"
        >{{ item._source === 'team' ? 'EQUIPO' : 'CAJA' }}</span>
      </div>
    </div>

    <div class="selection-indicator">
      <div class="check-circle">
        <span v-if="isSelected">✓</span>
      </div>
    </div>
  </div>
</template>
