<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MOCK_SELECTION_ITEMS, type SelectionDemoPokemon } from '../data/mockSelectionPokemon.ts'

interface Props {
  isFloating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFloating: false
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', uid: string): void
  (e: 'open-floating'): void
}>()

const searchQuery = ref('')
const activeSort = ref('rec')
const activeTag = ref<string | null>(null)
const selectedUid = ref<string>('sel-dragonite-85')

const sortOptions = [
  { id: 'rec', label: 'REC ▾', icon: '🔘' },
  { id: 'lvl', label: 'LVL', icon: '⭐' },
  { id: 'ivs', label: 'IVS', icon: '⚡' },
  { id: 'tot', label: 'TOT ▾', icon: '💪' },
  { id: 'dex', label: 'DEX', icon: '■' },
  { id: 'cri', label: 'CRI', icon: '🥚' },
  { id: 'pes', label: 'PES', icon: '⚖️' },
  { id: 'alt', label: 'ALT', icon: '📏' },
  { id: 'ami', label: 'AMI', icon: '❤️' }
] as const

const filterTags = [
  { id: 'clear', label: '', icon: '🖌' },
  { id: 'fav', label: 'FAV', icon: '⭐' },
  { id: 'gen', label: 'GEN', icon: '🧬' },
  { id: 'cmp', label: 'CMP', icon: '🏆' },
  { id: 'trd', label: 'TRD', icon: '🗃' },
  { id: 'iv31', label: '31 IV', icon: '' },
  { id: 'shy', label: 'SHY', icon: '✨' },
  { id: 'tem', label: 'TEM', icon: '👥' },
  { id: 'cri', label: 'CRI', icon: '🥚' },
  { id: 'evo', label: 'EVO', icon: '💎' },
  { id: 'max', label: 'MAX', icon: '👑' }
] as const

const filteredPokemon = computed<SelectionDemoPokemon[]>(() => {
  let list = [...MOCK_SELECTION_ITEMS]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || String(p.id).includes(q))
  }
  return list
})

import { logToInspector } from '../logic/useLiveInspector.ts'

function onSelectPokemon(item: SelectionDemoPokemon) {
  if (item.seasonViolation) {
    logToInspector(`Selector: ${item.name} bloqueado por reglas de temporada`)
    return
  }
  selectedUid.value = item.uid
  logToInspector(`Selector: ${item.name} seleccionado (UID: ${item.uid})`)
  emit('confirm', item.uid)
}
</script>

<template>
  <section :class="{ 'pv-section': !props.isFloating, 'floating-mode': props.isFloating }">
    <template v-if="!props.isFloating">
      <h2 class="section-title">
        <span class="emoji">⚡</span>
        <span>10. Modal Canónico de Selección de Pokémon (1:1 con PokemonSelectionModal.vue)</span>
      </h2>

      <div class="modal-launcher-row">
        <button
          id="btn-open-selection-floating"
          v-gsap-hover="'button'"
          type="button"
          class="pv-frame-btn pv-btn pv-btn-primary pv-btn-sm"
          @click="emit('open-floating')"
        >
          <span class="emoji">⚡</span>
          <span>PROBAR COMO MODAL FLOTANTE (CON BACKDROP Y SOMBRA BRESENHAM)</span>
        </button>
      </div>
    </template>

    <div class="selection-modal-wrap pv-panel-wrap has-cast-shadow shadow-curve-xl">
      <div class="pv-curve-xl selection-window-frame">
        <!-- TOP HEADER: TÍTULO Y CERRAR -->
        <div class="selection-top-info">
          <div class="selection-main-title">
            <span class="emoji">⚡</span>
            <span>CAMBIAR POKÉMON</span>
          </div>

          <button
            :id="(props.isFloating ? 'modal-' : '') + 'btn-selection-close'"
            v-gsap-hover="'button'"
            type="button"
            class="modal-close-btn"
            title="Cerrar"
            @click="emit('close')"
          >
            <div class="close-icon-wrapper" />
          </button>
        </div>

        <!-- FILTROS (1:1 CON POKEMONSELECTIONFILTERS) -->
        <div class="filters-bar">
          <!-- BÚSQUEDA -->
          <div class="ps-search-row">
            <span class="emoji ps-search-icon">🔍</span>
            <input
              :id="(props.isFloating ? 'modal-' : '') + 'input-selection-search'"
              v-model="searchQuery"
              type="text"
              class="pv-curve-xs ps-search-input"
              placeholder="Buscar por nombre o ID..."
            >
            <button
              v-if="searchQuery"
              type="button"
              class="ps-clear-search"
              @click.stop="searchQuery = ''"
            >
              ×
            </button>
          </div>

          <!-- ORDENAMIENTOS -->
          <div class="ps-sort-btns">
            <div
              v-for="s in sortOptions"
              :key="s.id"
              class="ps-sort-wrapper"
            >
              <button
                type="button"
                class="pv-curve-xs sort-pill-btn"
                :class="{ active: activeSort === s.id }"
                @click="activeSort = s.id"
              >
                <span class="emoji">{{ s.icon }}</span>
                <span class="label">{{ s.label }}</span>
              </button>
            </div>
          </div>

          <!-- TAGS SECUNDARIOS -->
          <div class="ps-tags-section">
            <div class="pv-curve-xs ps-tags-row-unified">
              <button
                id="ps-clear-filters-btn"
                type="button"
                class="pv-curve-xs ps-clear-icon-btn"
                title="Limpiar filtros"
                @click="activeTag = null; searchQuery = ''"
              >
                <span class="emoji">🧹</span>
              </button>

              <div class="ps-tags-list-horizontal">
                <button
                  v-for="tg in filterTags.filter(t => t.id !== 'clear')"
                  :key="tg.id"
                  type="button"
                  class="pv-curve-xs tag-pill-btn"
                  :class="{ active: activeTag === tg.id }"
                  @click="activeTag = activeTag === tg.id ? null : tg.id"
                >
                  <span
                    v-if="tg.icon"
                    class="emoji tag-icon"
                  >{{ tg.icon }}</span>
                  <span class="tag-text">{{ tg.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- LISTA VERTICAL DE TARJETAS DE POKÉMON (1:1 CON POKEMONSELECTIONITEM) -->
        <div class="ps-vertical-list">
          <div
            v-for="poke in filteredPokemon"
            :id="'sel-card-' + poke.uid"
            :key="poke.uid"
            v-gsap-hover="{ scale: 1.01, y: -2 }"
            class="pv-curve-lg sel-pokemon-card"
            :class="{ 'is-disabled': !!poke.seasonViolation, 'is-selected': selectedUid === poke.uid }"
            :style="{
              '--tier-color': poke.tierColor,
              '--tier-bg': poke.tierBg
            }"
            @click="onSelectPokemon(poke)"
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
                      {{ b === 'star' ? '⭐' : (b === 'spider' ? '🕸️' : (b === '31' ? '31' : '🏆')) }}
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
                    :style="{ width: `${(poke.hp / poke.maxHp) * 100}%` }"
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
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}

.floating-mode {
  width: 100%;
}

.modal-launcher-row {
  display: flex;
  margin-bottom: 12px;
}
</style>
