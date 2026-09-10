<script setup lang="ts">
import { ref } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ItemId } from '@/data/inventory/itemIds'
import { logToInspector } from '../logic/useLiveInspector.ts'

const _TEAM_ACTIVE_MODES = ['aventura', 'pvp3', 'pvp6', 'guerra'] as const
type TeamActiveMode = typeof _TEAM_ACTIVE_MODES[number]

const activeMode = ref<TeamActiveMode>('aventura')

const emit = defineEmits<{
  (e: 'select-pokemon', uid: string): void
  (e: 'open-selection'): void
  (e: 'open-inventory'): void
}>()

interface TeamMember {
  uid: string
  id: number
  name: string
  level: number
  gender: 'm' | 'f'
  power: number
  hp: number
  maxHp: number
  tier: string
  tierColor: string
  passives: string[]
  heldItem?: ItemId
  badges: string[]
  types: { id: string; label: string }[]
}

// 6 POKÉMON EXACTOS DE LA CAPTURA CANÓNICA MEDIA_1789000545523.PNG (CUADRÍCULA 3X2)
const team: TeamMember[] = [
  {
    uid: 'demo-gengar',
    id: 94,
    name: 'GENGAR',
    level: 60,
    gender: 'f',
    power: 659,
    hp: 154,
    maxHp: 160,
    tier: 'A',
    tierColor: '#a855f7',
    passives: ['🌱'],
    badges: ['31', '⭐', '🧬'],
    types: [
      { id: 'ghost', label: 'FANTASMA' },
      { id: 'poison', label: 'VENENO' }
    ]
  },
  {
    uid: 'demo-dragonite',
    id: 149,
    name: 'DRAGONITE',
    level: 85,
    gender: 'm',
    power: 699,
    hp: 273,
    maxHp: 273,
    tier: 'C',
    tierColor: '#22c55e',
    passives: ['🌱'],
    heldItem: 'focussash',
    badges: ['item', '⭐', '🧬'],
    types: [
      { id: 'dragon', label: 'DRAGÓN' },
      { id: 'flying', label: 'VOLADOR' }
    ]
  },
  {
    uid: 'demo-nidorino',
    id: 33,
    name: 'NIDORINO',
    level: 52,
    gender: 'm',
    power: 477,
    hp: 140,
    maxHp: 140,
    tier: 'B',
    tierColor: '#3b82f6',
    passives: ['🌱'],
    heldItem: 'focussash',
    badges: ['item', '⭐', '🧬'],
    types: [{ id: 'poison', label: 'VENENO' }]
  },
  {
    uid: 'demo-wartortle',
    id: 8,
    name: 'WARTORTLE',
    level: 35,
    gender: 'm',
    power: 488,
    hp: 94,
    maxHp: 94,
    tier: 'D',
    tierColor: '#f97316',
    passives: ['🌱'],
    heldItem: 'focussash',
    badges: ['item'],
    types: [{ id: 'water', label: 'AGUA' }]
  },
  {
    uid: 'demo-dratini',
    id: 147,
    name: 'DRATINI',
    level: 26,
    gender: 'f',
    power: 440,
    hp: 59,
    maxHp: 59,
    tier: 'A',
    tierColor: '#a855f7',
    passives: ['🌱'],
    heldItem: 'focussash',
    badges: ['31', '🥚', 'item', '🏆', '🧬'],
    types: [{ id: 'dragon', label: 'DRAGÓN' }]
  },
  {
    uid: 'demo-ninetales',
    id: 38,
    name: 'NINETALES',
    level: 44,
    gender: 'f',
    power: 645,
    hp: 127,
    maxHp: 127,
    tier: 'A',
    tierColor: '#a855f7',
    passives: ['🌱', '🔥'],
    heldItem: 'charcoal',
    badges: ['item'],
    types: [{ id: 'fire', label: 'FUEGO' }]
  }
]

function onTabClick(mode: TeamActiveMode) {
  activeMode.value = mode
  logToInspector(`Equipo: Modo seleccionado "${mode}"`)
}

function onAction(action: string, poke: TeamMember) {
  logToInspector(`Equipo: Acción "${action}" en ${poke.name}`)
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">👥</span>
      <span>9. Modal de Gestión de Equipo (1:1 con media_1789000545523.png)</span>
    </h2>

    <!-- CONTENEDOR AJUSTADO A 960PX PARA EVITAR SOMBRAS DEFORMADAS -->
    <div class="team-modal-wrap pv-panel-wrap has-cast-shadow shadow-curve-xl">
      <div class="pv-curve-xl team-view-container">
        <!-- HEADER ROW: TABS Y BOTÓN CERRAR -->
        <div class="team-header-row">
          <div class="team-mode-tabs">
            <button
              id="btn-team-tab-aventura"
              v-gsap-hover="'button'"
              type="button"
              class="pv-curve-xs team-mode-btn"
              :class="{ active: activeMode === 'aventura' }"
              @click="onTabClick('aventura')"
            >
              <span>🎒 AVENTURA</span>
              <span class="mode-count">6/6</span>
            </button>
            <button
              id="btn-team-tab-pvp3"
              v-gsap-hover="'button'"
              type="button"
              class="pv-curve-xs team-mode-btn"
              :class="{ active: activeMode === 'pvp3' }"
              @click="onTabClick('pvp3')"
            >
              <span>⚔️ PVP 3v3</span>
              <span class="mode-count">3/3</span>
            </button>
            <button
              id="btn-team-tab-pvp6"
              v-gsap-hover="'button'"
              type="button"
              class="pv-curve-xs team-mode-btn"
              :class="{ active: activeMode === 'pvp6' }"
              @click="onTabClick('pvp6')"
            >
              <span>⚔️ PVP 6v6</span>
              <span class="mode-count">6/6</span>
            </button>
            <button
              id="btn-team-tab-guerra"
              v-gsap-hover="'button'"
              type="button"
              class="pv-curve-xs team-mode-btn"
              :class="{ active: activeMode === 'guerra' }"
              @click="onTabClick('guerra')"
            >
              <span>🛡️ GUERRA</span>
              <span class="mode-count">0/6</span>
            </button>
          </div>

          <button
            type="button"
            class="team-close-btn"
            title="Cerrar Equipo"
          >
            ✕
          </button>
        </div>

        <!-- CUADRÍCULA 3X2 EXACTA DE 6 POKÉMON -->
        <div class="team-grid-layout">
          <div
            v-for="poke in team"
            :id="'team-card-' + poke.uid"
            :key="poke.uid"
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
                    :style="{ width: `${(poke.hp / poke.maxHp) * 100}%` }"
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
                @click="onAction('USAR OBJETO', poke); emit('open-inventory')"
              >
                <span>🎒</span> <span>USAR OBJETO</span>
              </button>
              <button
                :id="'btn-team-unequip-' + poke.uid"
                v-gsap-hover="'button'"
                type="button"
                class="pv-curve-xs pv-btn btn-action-unequip"
                @click="onAction('QUITAR OBJETO', poke)"
              >
                <span>✕</span> <span>QUITAR OBJETO</span>
              </button>
              <button
                :id="'btn-team-details-' + poke.uid"
                v-gsap-hover="'button'"
                type="button"
                class="pv-curve-xs pv-btn btn-action-details"
                @click="onAction('DATOS', poke); emit('select-pokemon', poke.uid)"
              >
                <span>📊</span> <span>DATOS</span>
              </button>
              <button
                :id="'btn-team-box-' + poke.uid"
                v-gsap-hover="'button'"
                type="button"
                class="pv-curve-xs pv-btn btn-action-box"
                @click="onAction('CAJA', poke)"
              >
                <span>📦</span> <span>CAJA</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}
</style>
