<script setup lang="ts">
import { ref, computed } from 'vue'
import { MOCK_SELECTION_ITEMS, type SelectionDemoPokemon } from '../data/mockSelectionPokemon.ts'
import { logToInspector } from '../logic/useLiveInspector.ts'
import Sec10SelectionFilters from './Sec10SelectionFilters.vue'
import Sec10SelectionItem from './Sec10SelectionItem.vue'

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
const activeSort = ref<'rec' | 'lvl' | 'ivs' | 'tot' | 'dex' | 'cri' | 'pes' | 'alt' | 'ami'>('rec')
const activeTag = ref<'clear' | 'fav' | 'gen' | 'cmp' | 'trd' | 'iv31' | 'shy' | 'tem' | 'cri' | 'evo' | 'max' | null>(null)
const selectedUid = ref<string>('sel-dragonite-85')

const filteredPokemon = computed<SelectionDemoPokemon[]>(() => {
  let list = [...MOCK_SELECTION_ITEMS]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || String(p.id).includes(q))
  }
  return list
})

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
        <Sec10SelectionFilters
          v-model:search-query="searchQuery"
          v-model:active-sort="activeSort"
          v-model:active-tag="activeTag"
          :is-floating="props.isFloating"
        />

        <!-- LISTA VERTICAL DE TARJETAS DE POKÉMON (1:1 CON POKEMONSELECTIONITEM) -->
        <div class="ps-vertical-list">
          <Sec10SelectionItem
            v-for="poke in filteredPokemon"
            :key="poke.uid"
            :poke="poke"
            :is-selected="selectedUid === poke.uid"
            @select="onSelectPokemon"
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

.floating-mode {
  width: 100%;
}

.modal-launcher-row {
  display: flex;
  margin-bottom: 12px;
}
</style>
