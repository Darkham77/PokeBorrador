<script setup lang="ts">
import { ref } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const activeTab = ref<'resumen' | 'stats' | 'ataques' | 'evol'>('resumen')
const isFloatingModalOpen = ref(false)

import {
  type PokemonSummaryItem,
  type DetailPokemon,
  MOCK_DETAIL_PIKACHU,
  MOCK_DETAIL_CHARIZARD,
  MOCK_DETAIL_GENGAR
} from '../data/mockDetailPokemon.ts'

const currentPokemon = ref<DetailPokemon>({ ...MOCK_DETAIL_PIKACHU })

function openDetailFor(p: PokemonSummaryItem) {
  if (p.id === 25) {
    currentPokemon.value = { ...MOCK_DETAIL_PIKACHU }
  } else if (p.id === 6) {
    currentPokemon.value = { ...MOCK_DETAIL_CHARIZARD }
  } else if (p.id === 94) {
    currentPokemon.value = { ...MOCK_DETAIL_GENGAR }
  }
  isFloatingModalOpen.value = true
}

defineExpose({
  openDetailFor
})
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">🔍</span>
      <span>12. Modal de Información / Detalle (Canónico 1:1 con Media & UnifiedPokemonDetailModal)</span>
    </h2>

    <!-- Selector de Muestra de Pokémon -->
    <div
      class="pv-frame-panel pv-panel-surface"
      style="padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;"
    >
      <div style="font-size: 8px; color: var(--color-text-gold); font-weight: bold;">
        FICHA TÉCNICA PIXELADA GBA (1:1 CON MEDIA_1788978462035.PNG):
      </div>
      <button
        id="btn-open-detail-floating"
        v-gsap-hover="'button'"
        type="button"
        class="pv-frame-btn pv-btn pv-btn-primary pv-btn-sm"
        @click="isFloatingModalOpen = true"
      >
        <span class="emoji">🪟</span>
        <span>ABRIR EN MODAL FLOTANTE</span>
      </button>
    </div>

    <div
      class="pv-panel-wrap has-cast-shadow shadow-curve-xl"
      style="display: flex; justify-content: center;"
    >
      <!-- VISTA DEL DETALLE (1:1 CON MEDIA_1788978462035.PNG) -->
      <div class="pv-curve-xl detail-modal-container">
        <!-- HEADER: Número Pokédex, Lápiz, Género, Nombre, Tipo, Cerrar -->
        <div class="detail-modal-header">
          <div class="detail-header-left">
            <span class="pv-curve-xs dex-num-badge">
              {{ currentPokemon.dexNum }}
            </span>
            <span
              class="edit-nick-icon"
              title="Editar Mote"
            >✏️</span>
            <span
              class="emoji"
              :class="currentPokemon.gender === 'm' ? 'gender-male' : 'gender-female'"
              style="font-size: 9px;"
            >
              {{ currentPokemon.gender === 'm' ? '♂' : '♀' }}
            </span>
            <span class="pokemon-title-name">{{ currentPokemon.name }}</span>
          </div>

          <div class="detail-header-right">
            <span
              class="pv-frame-pill pv-type-pill pv-type-md"
              :class="`type-${currentPokemon.type}`"
            >
              {{ currentPokemon.typeLabel }}
            </span>
            <button
              type="button"
              class="pv-curve-xs pv-window-close"
              title="Cerrar Ficha"
              @click="isFloatingModalOpen = false"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                stroke-width="3.5"
                stroke-linecap="square"
              >
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                />
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- HERO SECTION: SPRITE CON RESPLANDOR Y BADGES HORIZONTALES -->
        <div class="detail-hero-section">
          <div class="hero-sprite-wrapper">
            <span class="hero-sparkle-1">✨</span>
            <img
              :src="getAssetUrl(ASSET_TYPES.POKEMON, currentPokemon.id)"
              :alt="currentPokemon.name"
              class="hero-sprite-img"
            >
            <span class="hero-sparkle-2">✨</span>
          </div>

          <div class="pv-frame-control hero-bottom-badges">
            <span
              class="hero-badge-icon"
              title="Favorito"
            >⭐</span>
            <span
              class="hero-badge-icon"
              title="Genética Especial / Shiny"
            >🧬</span>
            <span
              class="hero-badge-icon"
              title="Concursos Ganados"
            >🏆</span>
            <span
              class="hero-badge-icon"
              title="Defensa de Gimnasio"
            >🛡️</span>
          </div>
        </div>

        <!-- PESTAÑAS DE NAVEGACIÓN: RESUMEN, STATS+, ATAQUES, EVOL. -->
        <div class="detail-nav-tabs">
          <button
            id="tab-detail-resumen"
            v-gsap-hover="'button'"
            type="button"
            class="pv-curve-sm detail-tab-btn"
            :class="{ active: activeTab === 'resumen' }"
            @click="activeTab = 'resumen'"
          >
            <span class="emoji">📝</span>
            <span>RESUMEN</span>
          </button>
          <button
            id="tab-detail-stats"
            v-gsap-hover="'button'"
            type="button"
            class="pv-curve-sm detail-tab-btn"
            :class="{ active: activeTab === 'stats' }"
            @click="activeTab = 'stats'"
          >
            <span class="emoji">📊</span>
            <span>STATS+</span>
          </button>
          <button
            id="tab-detail-ataques"
            v-gsap-hover="'button'"
            type="button"
            class="pv-curve-sm detail-tab-btn"
            :class="{ active: activeTab === 'ataques' }"
            @click="activeTab = 'ataques'"
          >
            <span class="emoji">⚔️</span>
            <span>ATAQUES</span>
          </button>
          <button
            id="tab-detail-evol"
            v-gsap-hover="'button'"
            type="button"
            class="pv-curve-sm detail-tab-btn"
            :class="{ active: activeTab === 'evol' }"
            @click="activeTab = 'evol'"
          >
            <span class="emoji">✨</span>
            <span>EVOL.</span>
          </button>
        </div>

        <!-- TAB BODY 1: RESUMEN -->
        <div
          v-if="activeTab === 'resumen'"
          class="detail-tab-body"
        >
          <!-- Grid 2x3 de Información -->
          <div class="detail-info-grid">
            <div class="pv-frame-control detail-info-cell">
              <span class="cell-label">CATEGORÍA</span>
              <span class="cell-value">{{ currentPokemon.category }}</span>
            </div>
            <div class="pv-frame-control detail-info-cell">
              <span class="cell-label">ALTURA</span>
              <span class="cell-value">{{ currentPokemon.height }} <span class="val-bracket">M</span></span>
            </div>
            <div class="pv-frame-control detail-info-cell">
              <span class="cell-label">PESO</span>
              <span class="cell-value">{{ currentPokemon.weight }} <span class="val-bracket">M</span></span>
            </div>
            <div class="pv-frame-control detail-info-cell">
              <span class="cell-label">NATURALEZA</span>
              <span class="cell-value">{{ currentPokemon.nature }}</span>
            </div>
            <div class="pv-frame-control detail-info-cell">
              <span class="cell-label">HABILIDAD</span>
              <span class="cell-value">{{ currentPokemon.ability }}</span>
            </div>
            <div class="pv-frame-control detail-info-cell">
              <span class="cell-label">VIGOR</span>
              <span class="cell-value"><span style="color: #ffd60a;">⚡</span> {{ currentPokemon.vigor }}</span>
            </div>
          </div>

          <!-- Barras de Estado (HP, Nivel, Experiencia, Amistad) -->
          <div class="pv-frame-control detail-bars-list">
            <!-- HP -->
            <div class="detail-bar-row">
              <div class="bar-header">
                <span class="bar-title">HP</span>
                <span class="bar-value">{{ currentPokemon.hp }} / {{ currentPokemon.maxHp }}</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill fill-hp"
                  :style="{ width: `${(currentPokemon.hp / currentPokemon.maxHp) * 100}%` }"
                />
              </div>
            </div>

            <!-- NIVEL -->
            <div class="detail-bar-row">
              <div class="bar-header">
                <span class="bar-title">NIVEL</span>
                <span
                  class="bar-value"
                  style="color: #38bdf8;"
                >Nv. {{ currentPokemon.level }} / {{ currentPokemon.maxLevel }}</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill fill-lvl"
                  :style="{ width: `${(currentPokemon.level / currentPokemon.maxLevel) * 100}%` }"
                />
              </div>
            </div>

            <!-- EXPERIENCIA -->
            <div class="detail-bar-row">
              <div class="bar-header">
                <span class="bar-title">EXPERIENCIA</span>
                <span
                  class="bar-value"
                  style="color: #c084fc;"
                >{{ currentPokemon.exp }} / {{ currentPokemon.expNext }}</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill fill-exp"
                  style="width: 85%;"
                />
              </div>
            </div>

            <!-- AMISTAD -->
            <div class="detail-bar-row">
              <div class="bar-header">
                <span class="bar-title">AMISTAD ({{ currentPokemon.friendshipTitle }})</span>
                <span
                  class="bar-value"
                  style="color: #ffd60a;"
                >🎀 {{ currentPokemon.friendship }} / {{ currentPokemon.maxFriendship }}</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill fill-friend"
                  :style="{ width: `${(currentPokemon.friendship / currentPokemon.maxFriendship) * 100}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Caja de Lore / Pokédex -->
          <div class="pv-frame-control detail-lore-box">
            <p class="lore-quote">
              "{{ currentPokemon.lore }}"
            </p>
          </div>

          <!-- Historial de Competencias -->
          <div
            class="pv-frame-control"
            style="padding: 6px 12px; font-size: 7.5px; color: var(--color-text-gold); font-weight: bold; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed var(--color-control-border);"
          >
            <span>🏆</span> <span>HISTORIAL DE COMPETENCIAS</span>
          </div>

          <!-- Botón de Acción Principal (Evolucionar) -->
          <div class="detail-footer-action">
            <button
              id="btn-detail-evolve"
              v-gsap-hover="'button'"
              type="button"
              class="pv-curve-sm pv-btn pv-btn-warning detail-big-btn"
            >
              {{ currentPokemon.evolButtonText }}
            </button>
          </div>
        </div>

        <!-- TAB BODY 2: STATS+ -->
        <div
          v-else-if="activeTab === 'stats'"
          class="detail-tab-body"
        >
          <div class="pv-frame-control detail-stats-grid">
            <div
              v-for="s in currentPokemon.stats"
              :key="s.name"
              class="stat-row-item"
            >
              <span class="stat-name">{{ s.name }}</span>
              <div class="stat-bar-track">
                <div
                  class="stat-bar-fill"
                  :style="{ width: `${(s.value / s.max) * 100}%` }"
                />
              </div>
              <span class="stat-numbers">{{ s.value }} / {{ s.max }}</span>
            </div>
          </div>
        </div>

        <!-- TAB BODY 3: ATAQUES -->
        <div
          v-else-if="activeTab === 'ataques'"
          class="detail-tab-body"
        >
          <div class="detail-moves-list">
            <div
              v-for="mv in currentPokemon.moves"
              :key="mv.name"
              class="pv-frame-control dock-move-card"
            >
              <div class="dock-move-header">
                <span class="dock-move-name">{{ mv.name }}</span>
                <span
                  class="pv-frame-pill pv-type-pill pv-type-sm"
                  :class="`type-${mv.type}`"
                >{{ mv.typeLabel }}</span>
              </div>
              <div class="dock-move-stats">
                <span>POT: {{ mv.pot }}</span>
                <span>PREC: {{ mv.prec }}</span>
                <span>{{ mv.cat }}</span>
                <span class="pp-val">PP {{ mv.pp }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB BODY 4: EVOLUCIÓN -->
        <div
          v-else-if="activeTab === 'evol'"
          class="detail-tab-body"
        >
          <div class="pv-frame-control detail-evol-chain">
            <template
              v-for="(node, nIdx) in currentPokemon.evolChain"
              :key="node.id"
            >
              <div class="evol-node">
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, node.id)"
                  :alt="node.name"
                  class="evol-sprite"
                >
                <span class="evol-name">{{ node.name }}</span>
                <span class="evol-req">{{ node.req }}</span>
              </div>
              <span
                v-if="nIdx < currentPokemon.evolChain.length - 1"
                class="evol-arrow"
              >➔</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL FLOTANTE CUANDO SE DISPARA -->
    <div
      v-if="isFloatingModalOpen"
      id="modal-detail-overlay"
      class="pv-modal-backdrop"
      @click.self="isFloatingModalOpen = false"
    >
      <div class="pv-modal-floating-content">
        <div class="pv-curve-xl detail-modal-container">
          <div class="detail-modal-header">
            <div class="detail-header-left">
              <span class="pv-curve-xs dex-num-badge">{{ currentPokemon.dexNum }}</span>
              <span class="pokemon-title-name">{{ currentPokemon.name }}</span>
            </div>
            <button
              type="button"
              class="pv-curve-xs pv-window-close"
              @click="isFloatingModalOpen = false"
            >
              ✕
            </button>
          </div>
          <div style="padding: 12px; text-align: center;">
            <img
              :src="getAssetUrl(ASSET_TYPES.POKEMON, currentPokemon.id)"
              :alt="currentPokemon.name"
              style="width: 72px; height: 72px; image-rendering: pixelated;"
            >
            <p style="font-size: 8px; color: var(--color-text-main); margin-top: 8px;">
              {{ currentPokemon.lore }}
            </p>
            <button
              type="button"
              class="pv-curve-sm pv-btn pv-btn-secondary pv-btn-md"
              style="width: 100%; margin-top: 12px;"
              @click="isFloatingModalOpen = false"
            >
              <span>CERRAR MODAL FLOTANTE</span>
            </button>
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
