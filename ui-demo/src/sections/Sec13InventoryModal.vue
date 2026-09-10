<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ItemId } from '@/data/inventory/itemIds'
import { logToInspector } from '../logic/useLiveInspector.ts'

interface Props {
  isFloating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFloating: false
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-floating'): void
}>()

interface CanonicalBagItem {
  id: ItemId
  name: string
  qty: number
  category: string
  borderColorClass?: string
}

const activeMainTab = ref<'productos' | 'materiales'>('productos')
const activeCategory = ref<string>('todos')
const searchQuery = ref('')
const selectedItemId = ref<ItemId>('focussash')

const categories = [
  { id: 'todos', label: 'TODOS', icon: '📦', count: 232 },
  { id: 'utilizables', label: 'UTILIZABLES', icon: '⭐', count: 18 },
  { id: 'piedras', label: 'PIEDRAS', icon: '💎', count: 22 },
  { id: 'pokeballs', label: 'POKÉBALLS', icon: '⚪', count: 45 },
  { id: 'curativos', label: 'CURATIVOS', icon: '🧪', count: 38 },
  { id: 'combate', label: 'COMBATE', icon: '🥊', count: 24 },
  { id: 'crianza', label: 'CRIANZA', icon: '🥚', count: 12 },
  { id: 'maquinaria', label: 'MAQUINARIA', icon: '🏭', count: 8 },
  { id: 'herramientas', label: 'HERRAMIENTAS', icon: '🔧', count: 15 },
  { id: 'mts', label: 'MTS', icon: '💿', count: 30 },
  { id: 'otros', label: 'OTROS', icon: '✨', count: 20 }
] as const

// 32 ÍTEMS EXACTOS DE LA CAPTURA CANÓNICA MEDIA_1789002324882.PNG (8 COLUMNAS X 4 FILAS)
const canonicalItems: CanonicalBagItem[] = [
  // Fila 1
  { id: 'mysticwater', name: 'Agua Mística', qty: 1, category: 'combate', borderColorClass: 'is-blue-border' },
  { id: 'oldamber', name: 'Ámbar Viejo', qty: 3, category: 'otros', borderColorClass: 'is-blue-border' },
  { id: 'iceheal', name: 'Anticongelante', qty: 3, category: 'curativos' },
  { id: 'antidote', name: 'Antídoto', qty: 3, category: 'curativos' },
  { id: 'paralyzeheal', name: 'Antiparaliz.', qty: 2, category: 'curativos' },
  { id: 'focussash', name: 'Banda Focus', qty: 1, category: 'combate', borderColorClass: 'is-gold-border' },
  { id: 'oranberry', name: 'Baya de Oro', qty: 2, category: 'utilizables' },
  { id: 'sitrusberry', name: 'Baya de Plata', qty: 2, category: 'utilizables' },

  // Fila 2
  { id: 'fullheal', name: 'Cura Total', qty: 7, category: 'curativos', borderColorClass: 'is-blue-border' },
  { id: 'awakening', name: 'Despertar', qty: 3, category: 'curativos' },
  { id: 'elixir', name: 'Elixir', qty: 3, category: 'curativos' },
  { id: 'dragonscale', name: 'Escama Dragón', qty: 1, category: 'piedras', borderColorClass: 'is-purple-border' },
  { id: 'ether', name: 'Éter', qty: 2, category: 'curativos' },
  { id: 'domefossil', name: 'Fósil Domo', qty: 4, category: 'otros' },
  { id: 'helixfossil', name: 'Fósil Hélix', qty: 1, category: 'otros' },
  { id: 'hyperpotion', name: 'Hiper Poción', qty: 2, category: 'curativos' },

  // Fila 3
  { id: 'magnet', name: 'Imán', qty: 1, category: 'combate', borderColorClass: 'is-blue-border' },
  { id: 'lemonade', name: 'Limonada', qty: 22, category: 'curativos' },
  { id: 'tm03', name: 'MT03 Pulso Agua', qty: 1, category: 'mts' },
  { id: 'tm04', name: 'MT04 Paz Mental', qty: 1, category: 'mts' },
  { id: 'tm06', name: 'MT06 Tóxico', qty: 1, category: 'mts' },
  { id: 'tm19', name: 'MT19 Gigadrenado', qty: 1, category: 'mts' },
  { id: 'tm24', name: 'MT24 Rayo', qty: 1, category: 'mts' },
  { id: 'tm26', name: 'MT26 Terremoto', qty: 2, category: 'mts', borderColorClass: 'is-gold-border' },

  // Fila 4
  { id: 'tm29', name: 'MT29 Psíquico', qty: 2, category: 'mts', borderColorClass: 'is-gold-border' },
  { id: 'tm38', name: 'MT38 Llamarada', qty: 1, category: 'mts' },
  { id: 'heavyball', name: 'Peso Ball', qty: 20, category: 'pokeballs' },
  { id: 'stick', name: 'Puerro', qty: 1, category: 'combate' },
  { id: 'potion', name: 'Poción', qty: 1, category: 'curativos', borderColorClass: 'is-purple-border' },
  { id: 'waterstone', name: 'Piedra Agua', qty: 1, category: 'piedras', borderColorClass: 'is-purple-border' },
  { id: 'moonstone', name: 'Piedra Lunar', qty: 1, category: 'piedras' },
  { id: 'leafstone', name: 'Piedra Hoja', qty: 1, category: 'piedras' }
]

const filteredItems = computed(() => {
  return canonicalItems.filter(item => {
    const matchesCategory = activeCategory.value === 'todos' || item.category === activeCategory.value
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesCategory && matchesSearch
  })
})

function selectItem(item: CanonicalBagItem) {
  selectedItemId.value = item.id
  logToInspector(`Mochila: Seleccionado "${item.name}" (x${item.qty})`)
}

function onCategorySelect(catId: string) {
  activeCategory.value = catId
  logToInspector(`Mochila: Categoría cambiada a "${catId}"`)
}

function onActionClick(action: string) {
  logToInspector(`Mochila: Acción "${action}" activada`)
}
</script>

<template>
  <section :class="{ 'pv-section': !props.isFloating, 'floating-mode': props.isFloating }">
    <template v-if="!props.isFloating">
      <h2 class="section-title">
        <span class="emoji">🎒</span>
        <span>13. Modal Canónico de Mochila (1:1 con media_1789002324882.png)</span>
      </h2>

      <div class="modal-launcher-row">
        <button
          id="btn-open-inventory-floating"
          v-gsap-hover="'button'"
          type="button"
          class="pv-frame-btn pv-btn pv-btn-primary pv-btn-sm"
          @click="emit('open-floating')"
        >
          <span class="emoji">🎒</span> <span>PROBAR COMO MODAL FLOTANTE (CON BACKDROP Y SOMBRA BRESENHAM)</span>
        </button>
      </div>
    </template>

    <!-- WRAPPER CONTEXTUAL CON MAX-WIDTH 860PX PARA EVITAR DESBORDAMIENTO DE SOMBRA -->
    <div class="inventory-modal-wrap pv-panel-wrap has-cast-shadow shadow-curve-xl">
      <div class="pv-curve-xl inventory-window-frame">
        <!-- HEADER 1:1: TÍTULO, TOTALES Y MIS CRÉDITOS -->
        <div class="inv-header-row">
          <div class="inv-title-group">
            <span class="inv-backpack-icon">🎒</span>
            <div class="inv-title-text">
              <span class="inv-main-heading">MOCHILA</span>
              <span class="inv-sub-heading">GESTIÓN DE INVENTARIO</span>
            </div>
          </div>

          <div class="inv-header-meta">
            <div class="meta-node">
              <span class="meta-label">OBJETOS TOTALES</span>
              <span class="meta-val totals">232</span>
            </div>
            <div class="meta-node">
              <span class="meta-label">MIS CRÉDITOS</span>
              <span class="meta-val credits">₽111.423</span>
            </div>
            <button
              :id="(props.isFloating ? 'modal-' : '') + 'btn-inventory-close'"
              v-gsap-hover="'button'"
              type="button"
              class="inv-close-btn"
              title="Cerrar Mochila"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- CONTROLES SUPERIORES: TABS PRODUCTOS/MATERIALES, BUSCADOR Y BOTONES -->
        <div class="inv-controls-row">
          <div class="inv-main-tabs">
            <button
              type="button"
              class="pv-curve-xs tab-btn"
              :class="{ active: activeMainTab === 'productos' }"
              @click="activeMainTab = 'productos'"
            >
              Productos
            </button>
            <button
              type="button"
              class="pv-curve-xs tab-btn"
              :class="{ active: activeMainTab === 'materiales' }"
              @click="activeMainTab = 'materiales'"
            >
              Materiales
            </button>
          </div>

          <div class="inv-search-actions">
            <div class="pv-curve-xs inv-search-box">
              <span class="search-icon">🔍</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar objeto..."
                class="search-input"
              >
            </div>

            <button
              type="button"
              class="pv-curve-xs inv-sort-btn"
            >
              ABC ↑
            </button>

            <button
              type="button"
              class="pv-curve-xs inv-btn-sell"
              @click="onActionClick('MODO VENTA')"
            >
              <span>🔒</span> <span>MODO VENTA</span>
            </button>

            <button
              type="button"
              class="pv-curve-xs inv-btn-trash"
              @click="onActionClick('TIRAR OBJETOS')"
            >
              <span>🗑</span> <span>TIRAR OBJETOS</span>
            </button>
          </div>
        </div>

        <!-- LAYOUT PRINCIPAL: SIDEBAR 11 CATEGORÍAS + CUADRÍCULA DE 8 COLUMNAS -->
        <div class="inv-main-layout">
          <!-- SIDEBAR CON 11 CATEGORÍAS OFICIALES -->
          <div class="inv-sidebar">
            <button
              v-for="cat in categories"
              :id="'inv-cat-' + cat.id"
              :key="cat.id"
              v-gsap-hover="'pill'"
              type="button"
              class="pv-curve-xs cat-btn"
              :class="{ active: activeCategory === cat.id }"
              @click="onCategorySelect(cat.id)"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>

          <!-- CUADRÍCULA CANÓNICA DE 8 COLUMNAS CON 32 OBJETOS -->
          <div class="inv-grid-container">
            <div
              v-for="item in filteredItems"
              :id="'inv-slot-' + item.id"
              :key="item.id"
              v-gsap-hover="{ scale: 1.05, y: -2 }"
              class="pv-curve-xs inv-card-item"
              :class="[
                item.borderColorClass || '',
                { 'is-selected': selectedItemId === item.id }
              ]"
              @click="selectItem(item)"
            >
              <div class="inv-card-visual">
                <img
                  :src="getAssetUrl(ASSET_TYPES.ITEM, item.id)"
                  :alt="item.name"
                  class="item-sprite"
                  @error="e => { (e.target as HTMLImageElement).src = '/assets/items/pokeball.png' }"
                >
                <div class="inv-card-qty-pill">
                  x{{ item.qty }}
                </div>
              </div>
              <span class="inv-card-name">{{ item.name }}</span>
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
