<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { SelectionDemoPokemon } from '../data/mockSelectionPokemon.ts'

const props = defineProps<{
  poke: SelectionDemoPokemon
  isSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'select', item: SelectionDemoPokemon): void
}>()

const hpPercent = computed(() => {
  if (!props.poke.maxHp) return 0
  return Math.min(100, Math.max(0, (props.poke.hp / props.poke.maxHp) * 100))
})

const getBadgeIcon = (b: string): string => {
  if (b === 'star') return '⭐'
  if (b === 'spider') return '🕸️'
  if (b === '31') return '31'
  return '🏆'
}
</script>

<template>
  <div
    :id="'sel-card-' + poke.uid"
    v-gsap-hover="{ scale: 1.01, y: -2 }"
    class="pv-curve-lg sel-pokemon-card"
    :class="{ 'is-disabled': !!poke.seasonViolation, 'is-selected': isSelected }"
    :style="{
      '--tier-color': poke.tierColor,
      '--tier-bg': poke.tierBg
    }"
    @click="emit('select', poke)"
  >
    <!-- COLUMNA IZQUIERDA: BOTÓN '?' Y SPRITE -->
    <div class="poke-preview-container">
      <button
        type="button"
        class="btn-info-detail-trigger"
        title="Detalles"
      >
        ?
      </button>
      <div class="poke-preview">
        <img
          :src="getAssetUrl(ASSET_TYPES.POKEMON, poke.id)"
          :alt="poke.name"
          class="pixelated"
        >
      </div>
    </div>

    <!-- COLUMNA DERECHA: DATOS, STATS Y HP / TEMPORADA -->
    <div class="poke-details">
      <!-- TOP LINE -->
      <div class="top-line">
        <div class="name-group">
          <span class="name">{{ poke.name }}</span>
          <span
            v-if="poke.gender"
            class="gender-badge"
            :class="poke.gender === 'm' ? 'male' : 'female'"
          >
            {{ poke.gender === 'm' ? '♂' : '♀' }}
          </span>
          <div class="mini-badges">
            <span
              v-for="b in poke.badges"
              :key="b"
              class="mini-badge-item"
              :class="{ 'is-text': b === '31' }"
            >
              {{ getBadgeIcon(b) }}
            </span>
          </div>
        </div>

        <div class="actions-right">
          <span class="emoji source-symbol">{{ poke.source === 'team' ? '⚔️' : '📦' }}</span>
          <span class="emoji source-symbol">🌱</span>
          <span class="pv-curve-xs m-badge-tier">{{ poke.tier }}</span>
        </div>
      </div>

      <!-- STATS LINE -->
      <div class="info-row stats-line">
        <div class="sel-types-row">
          <span
            v-for="t in poke.types"
            :key="t.id"
            class="m-type-tag sm"
            :class="`type-${t.id}`"
          >
            {{ t.label }}
          </span>
        </div>
        <span class="m-badge-level">Nv. {{ poke.level }}</span>
        <span class="m-badge-iv">IVs {{ poke.ivs }}</span>
        <span class="m-badge-tot">TOT {{ poke.total }}</span>
      </div>

      <!-- HP BAR (CANÓNICO COMBATE) -->
      <div
        v-if="!poke.seasonViolation"
        class="battle-hp-status"
      >
        <span class="hp-label">HP</span>
        <div class="hp-bar-container">
          <div
            class="hp-bar-fill"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
        <span class="hp-text">{{ poke.hp }} / {{ poke.maxHp }}</span>
      </div>

      <!-- AVISO DE TEMPORADA (CANÓNICO TEMPORADA) -->
      <div
        v-else
        class="pv-curve-xs sel-season-violation-badge"
      >
        <span class="emoji">⚠️</span>
        <span class="violation-label">{{ poke.seasonViolation }}</span>
      </div>
    </div>
  </div>
</template>
