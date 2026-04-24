<script setup>
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { POKEMON_TAGS, POKEMON_BADGES, hasPokemonTag } from '@/logic/constants/tags'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'

defineProps({
  item: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  bst: { type: Number, required: true }
})

const emit = defineEmits(['select', 'openDetail'])

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || '#aaa'
</script>

<template>
  <div 
    class="list-item"
    :class="{ selected: isSelected }"
    :style="{ '--type-color': getTypeColor(item.pokemon.types?.[0] || item.pokemon.type) }"
    @click="emit('select', item)"
  >
    <div class="poke-preview-container">
      <PVTooltip
        title="DETALLES"
        description="Ver información completa de este Pokémon."
        position="top"
        class="poke-preview"
        @click.stop="emit('openDetail', item)"
      >
        <div 
          class="sprite-container"
          :class="{ 'is-guardian': item.pokemon.isGuardian, 'is-shiny': item.pokemon.isShiny }"
        >
          <div class="preview-bg" />
          <img
            :src="getAssetUrl(ASSET_TYPES.POKEMON, item.pokemon.id, { isShiny: item.pokemon.isShiny })"
            alt=""
            class="pixelated"
            @error="e => e.target.style.display = 'none'"
          >
          <span
            v-if="item.pokemon.isShiny"
            class="shiny-star"
          >✨</span>
        </div>
      </PVTooltip>

      <!-- Action badges (Held Item + Tags) -->
      <div
        v-if="item.pokemon.heldItem || item.pokemon.tags?.length"
        class="mini-badges"
      >
        <PVTooltip
          v-if="item.pokemon.heldItem"
          :title="POKEMON_BADGES.heldItem.label"
          :description="`${POKEMON_BADGES.heldItem.desc} (${item.pokemon.heldItem})`"
          position="top"
        >
          <span class="mini-icon">{{ POKEMON_BADGES.heldItem.icon }}</span>
        </PVTooltip>

        <template
          v-for="t in POKEMON_TAGS"
          :key="t.id"
        >
          <PVTooltip
            v-if="hasPokemonTag(item.pokemon, t.id)"
            :title="t.label"
            :description="t.desc"
            position="top"
          >
            <span class="mini-icon">{{ t.icon }}</span>
          </PVTooltip>
        </template>
      </div>
    </div>

    <div class="poke-details">
      <div class="top-line">
        <div class="name-group">
          <div class="name-stack">
            <span class="name">{{ item.pokemon.nickname || item.pokemon.name?.replace(/[♂♀]/g, '').trim() || 'Desconocido' }}</span>
            <span
              v-if="item.pokemon.nickname"
              class="species-subtitle"
            >{{ item.pokemon.name }}</span>
          </div>
          <span
            v-if="item.pokemon.gender"
            :class="['gender-icon', item.pokemon.gender === 'M' ? 'male' : 'female']"
          >
            {{ item.pokemon.gender === 'M' ? '♂' : '♀' }}
          </span>
        </div>
        <div class="actions-right">
          <span class="lvl">Nv.{{ item.pokemon.level ?? 1 }}</span>
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
        <div class="stats-summary">
          <span
            v-if="item.pokemon.ivs"
            class="stat-badge ivs"
          >IVs: {{ Object.values(item.pokemon.ivs).reduce((s,v)=>s+(v||0),0) }}</span>
          <span class="stat-badge bst">BST: {{ bst }}</span>
        </div>
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
