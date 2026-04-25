<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import { TAG_DEFINITIONS, POKEMON_BADGES } from '@/logic/constants/tags'
import { getPokemonTier } from '@/logic/constants/tiers'

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, default: -1 },
  isPvp: { type: Boolean, default: false },
  maxObeyLv: { type: Number, default: 100 },
  // Permite configurar qué botones se muestran: 'item', 'details', 'box'
  actions: { type: Array, default: () => ['item', 'details', 'box'] }
})

const emit = defineEmits(['click', 'openDetail', 'openItem', 'sendToBox', 'select'])

const hpPct = computed(() => props.pokemon.hp / props.pokemon.maxHp)

const getHpClass = (pct) => {
  if (pct > 0.5) return 'hp-high'
  if (pct > 0.25) return 'hp-mid'
  return 'hp-low'
}

const tierInfo = computed(() => getPokemonTier(props.pokemon))

const disobeys = computed(() => props.pokemon.level > props.maxObeyLv)

const spriteUrl = computed(() => {
  return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
    isShiny: props.pokemon.isShiny 
  })
})

const cardClasses = computed(() => {
  const classes = ['pokemon-display-card']
  if (props.pokemon.onMission) classes.push('on-mission')
  if (props.pokemon.aura) classes.push(`aura-${props.pokemon.aura}-mini`)
  if (props.pokemon.isShiny) classes.push('is-shiny')
  if (props.pokemon.isGuardian) classes.push('is-guardian')
  return classes
})

function renderGenderSymbol(gender) {
  if (gender === 'M') return '♂'
  if (gender === 'F') return '♀'
  return ''
}

function getGenderClass(gender) {
  if (gender === 'M') return 'gender-male'
  if (gender === 'F') return 'gender-female'
  return 'gender-none'
}

const activeTags = computed(() => {
  if (!props.pokemon.tags) return []
  return props.pokemon.tags.map(id => ({
    id,
    ...(TAG_DEFINITIONS[id] || TAG_DEFINITIONS[id === 'competitive' ? 'comp' : ''] || { icon: '?', color: '#ccc', label: 'TAG', desc: 'Etiqueta personalizada.' })
  }))
})

const hasBadges = computed(() => {
  return props.pokemon.heldItem || activeTags.value.length > 0 || props.pokemon.isShiny
})
</script>

<template>
  <div
    :class="cardClasses"
    @click="emit('openDetail', index)"
  >
    <!-- Top Row: Items/Tags + Tier -->
    <div class="top-row">
      <div
        v-if="hasBadges"
        class="badges-area"
      >
        <!-- Column 1: Dynamic Tags -->
        <div class="tags-col">
          <PVTooltip
            v-for="tag in activeTags"
            :key="tag.id"
            :title="tag.label"
            :description="tag.desc"
            position="top"
          >
            <div
              class="tag-badge"
              :style="{ '--tag-color': tag.color }"
            >
              {{ tag.icon }}
            </div>
          </PVTooltip>

          <!-- Shiny Indicator (if not in tags) -->
          <PVTooltip
            v-if="pokemon.isShiny"
            :title="POKEMON_BADGES.shiny.label"
            :description="POKEMON_BADGES.shiny.desc"
            position="top"
          >
            <span class="shiny-icon">{{ POKEMON_BADGES.shiny.icon }}</span>
          </PVTooltip>
        </div>

        <!-- Column 2: Held Item -->
        <div 
          v-if="pokemon.heldItem"
          class="items-col"
        >
          <PVTooltip
            :title="POKEMON_BADGES.heldItem.label"
            :description="`${POKEMON_BADGES.heldItem.desc} (${pokemon.heldItem})`"
            position="top"
          >
            <div class="item-badge">
              <span class="icon">{{ POKEMON_BADGES.heldItem.icon }}</span>
            </div>
          </PVTooltip>
        </div>
      </div>
      <div
        v-else
        class="badges-spacer"
      />

      <div
        class="card-tier-badge"
        :style="{ '--tier-bg': tierInfo.bg, '--tier-color': tierInfo.color }"
      >
        {{ tierInfo.tier }}
      </div>
    </div>

    <!-- Sprite Section -->
    <div class="sprite-section">
      <PVSpriteFX
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
        :sparkle-count="5"
      >
        <img
          :src="spriteUrl"
          :alt="pokemon.name"
          class="pokemon-sprite"
          @error="e => e.target.style.display = 'none'"
        >
      </PVSpriteFX>
    </div>


    <!-- Info Section -->
    <div class="pokemon-info">
      <div
        class="name-line"
        :class="{ 'has-nickname': pokemon.nickname }"
      >
        <div class="name-stack">
          <span class="pokemon-name">{{ pokemon.nickname || pokemon.name }}</span>
          <span
            v-if="pokemon.nickname"
            class="species-subtitle"
          >{{ pokemon.name }}</span>
        </div>
        <div
          v-if="pokemon.gender"
          :class="['gender-pill', getGenderClass(pokemon.gender)]"
        >
          {{ renderGenderSymbol(pokemon.gender) }}
        </div>
      </div>
      
      <div class="level-line">
        Nv. {{ pokemon.level }}
      </div>

      <!-- Status Labels (Floating) -->
      <div class="status-labels">
        <span
          v-if="disobeys"
          class="status-tag obedience"
        >NV ALTO</span>
        <span
          v-if="pokemon.onMission"
          class="status-tag mission"
        >EN MISIÓN</span>
      </div>
      
      <div class="hp-container">
        <div class="hp-bar-outer">
          <div
            :class="['hp-bar-inner', getHpClass(hpPct)]"
            :style="{ width: (hpPct * 100) + '%' }"
          />
        </div>
        <div class="hp-stats">
          {{ pokemon.hp }} / {{ pokemon.maxHp }} HP
        </div>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="card-footer">
      <div class="action-grid">
        <button
          v-if="actions.includes('item')"
          class="footer-btn item-btn"
          @click.stop="emit('openItem', index)"
        >
          <span class="emoji">🎒</span> OBJETO
        </button>
        <button
          v-if="actions.includes('details')"
          class="footer-btn data-btn"
          @click.stop="emit('openDetail', index)"
        >
          <span class="emoji">📊</span> DATOS
        </button>
        <button
          v-if="actions.includes('box') && !isPvp"
          class="footer-btn box-btn"
          @click.stop="emit('sendToBox', index)"
        >
          <span class="emoji">📦</span> CAJA
        </button>
        <button
          v-if="isPvp"
          class="footer-btn replace-btn"
          @click.stop="emit('select', index)"
        >
          <span class="emoji">🔄</span> REEMPLAZAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-display-card" as *;
</style>
