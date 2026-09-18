<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { TeamMember } from './sec9TeamTypes'

const props = defineProps<{
  poke: TeamMember
}>()

const emit = defineEmits<{
  (e: 'select-pokemon', uid: string): void
  (e: 'open-inventory'): void
  (e: 'action', action: string, poke: TeamMember): void
}>()

const hpPercent = computed(() => (props.poke.hp / props.poke.maxHp) * 100)
</script>

<template>
  <div
    :id="'team-card-' + poke.uid"
    v-gsap-hover="{ scale: 1.02, y: -3 }"
    class="pv-curve-lg team-card-panel"
    :style="{ '--tier-color': poke.tierColor }"
  >
    <!-- FILA SUPERIOR: PÍLDORA VERTICAL Y TIER/PASIVAS -->
    <div class="team-card-top-row">
      <!-- Píldora Vertical Unificada (Negra) -->
      <div class="pv-curve-xs team-card-unified-pill">
        <template
          v-for="(b, bIdx) in poke.badges"
          :key="bIdx"
        >
          <span
            v-if="b === '31'"
            class="team-pill-iv"
          >31</span>
          <img
            v-else-if="b === 'item' && poke.heldItem"
            :id="`team-card-${poke.id}-held-item-btn`"
            :src="getAssetUrl(ASSET_TYPES.ITEM, poke.heldItem)"
            :alt="poke.heldItem"
            class="team-pill-item-icon"
            title="Objeto Equipado"
            @click.stop="emit('open-inventory')"
          >
          <span
            v-else-if="b === '⭐'"
            class="team-pill-star"
          >⭐</span>
          <span
            v-else-if="b === '🧬'"
            class="team-pill-shiny"
          >🧬</span>
          <span
            v-else-if="b === '🥚'"
            style="font-size: 8px;"
          >🥚</span>
          <span
            v-else-if="b === '🏆'"
            style="font-size: 8px;"
          >🏆</span>
        </template>
      </div>

      <!-- Columna Superior Derecha: Tier y Pasivas -->
      <div class="team-card-top-right">
        <div
          class="team-card-tier-box"
          :style="{ color: poke.tierColor, borderColor: poke.tierColor }"
        >
          {{ poke.tier }}
        </div>
        <div class="team-card-status-icons">
          <span
            v-for="(p, pIdx) in poke.passives"
            :key="pIdx"
            class="team-passive-icon"
          >{{ p }}</span>
        </div>
      </div>
    </div>

    <!-- Sprite Central del Pokémon -->
    <div class="team-card-sprite-section">
      <img
        :src="getAssetUrl(ASSET_TYPES.POKEMON, poke.id)"
        :alt="poke.name"
        class="team-pokemon-sprite"
      >
    </div>

    <!-- Nombre, Género, Tipos, Stats y Barra HP -->
    <div class="team-card-body-info">
      <div class="team-name-row">
        <span class="team-poke-name text-outline">{{ poke.name }}</span>
        <span
          class="team-gender-badge"
          :class="poke.gender === 'm' ? 'gender-male' : 'gender-female'"
        >
          {{ poke.gender === 'm' ? '♂' : '♀' }}
        </span>
      </div>

      <!-- Tipos Elementales -->
      <div class="team-types-row">
        <span
          v-for="t in poke.types"
          :key="t.id"
          class="pv-type-pill pv-type-sm"
          :class="`type-${t.id}`"
        >
          {{ t.label }}
        </span>
      </div>

      <!-- Nivel y TOT -->
      <div class="team-stats-line">
        <span class="stat-badge-lvl">Nv. {{ poke.level }}</span>
        <span class="stat-badge-tot">TOT {{ poke.power }}</span>
      </div>

      <!-- Barra de HP -->
      <div class="team-hp-block">
        <div class="team-hp-track">
          <div
            class="team-hp-fill"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
        <div class="team-hp-text">
          {{ poke.hp }} / {{ poke.maxHp }} HP
        </div>
      </div>
    </div>

    <!-- Botonera 2x2 Inferior Canónica 1:1 -->
    <div class="team-card-footer-grid">
      <button
        :id="'btn-team-use-item-' + poke.uid"
        v-gsap-hover="'button'"
        type="button"
        class="pv-curve-xs pv-btn btn-action-use-item"
        @click="emit('action', 'USAR OBJETO', poke); emit('open-inventory')"
      >
        <span>🎒</span> <span>USAR OBJETO</span>
      </button>
      <button
        :id="'btn-team-unequip-' + poke.uid"
        v-gsap-hover="'button'"
        type="button"
        class="pv-curve-xs pv-btn btn-action-unequip"
        @click="emit('action', 'QUITAR OBJETO', poke)"
      >
        <span>✕</span> <span>QUITAR OBJETO</span>
      </button>
      <button
        :id="'btn-team-details-' + poke.uid"
        v-gsap-hover="'button'"
        type="button"
        class="pv-curve-xs pv-btn btn-action-details"
        @click="emit('action', 'DATOS', poke); emit('select-pokemon', poke.uid)"
      >
        <span>📊</span> <span>DATOS</span>
      </button>
      <button
        :id="'btn-team-box-' + poke.uid"
        v-gsap-hover="'button'"
        type="button"
        class="pv-curve-xs pv-btn btn-action-box"
        @click="emit('action', 'CAJA', poke)"
      >
        <span>📦</span> <span>CAJA</span>
      </button>
    </div>
  </div>
</template>
