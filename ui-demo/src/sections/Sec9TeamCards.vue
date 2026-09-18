<script setup lang="ts">
import { ref } from 'vue'
import { logToInspector } from '../logic/useLiveInspector.ts'
import type { TeamMember, TeamActiveMode } from './sec9TeamTypes'
import Sec9TeamMemberCard from './Sec9TeamMemberCard.vue'

const activeMode = ref<TeamActiveMode>('aventura')

const emit = defineEmits<{
  (e: 'select-pokemon', uid: string): void
  (e: 'open-inventory'): void
}>()

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
          <Sec9TeamMemberCard
            v-for="poke in team"
            :key="poke.uid"
            :poke="poke"
            @select-pokemon="emit('select-pokemon', $event)"
            @open-inventory="emit('open-inventory')"
            @action="onAction"
          />
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
