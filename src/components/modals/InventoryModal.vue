<script setup>
import { ref, computed, reactive } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import { SHOP_ITEMS } from '@/data/items'
import InventoryItemNode from './inventory/InventoryItemNode.vue'
import InventoryTargetOverlay from './inventory/InventoryTargetOverlay.vue'

defineProps({ show: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const gameStore = useGameStore(); const inventoryStore = useInventoryStore(); const uiStore = useUIStore()
const bagCategory = computed(() => inventoryStore.bagCategory)
const bagSearch = computed({ get: () => inventoryStore.bagSearch, set: (val) => inventoryStore.bagSearch = val })

const categories = [
  { id: 'todos', label: 'Todos', icon: '📦' }, { id: 'pokeballs', label: 'Balls', icon: '⚪' },
  { id: 'pociones', label: 'Cura', icon: '🧪' }, { id: 'stones', label: 'Piedras', icon: '💎' },
  { id: 'held', label: 'Equipo', icon: '🎒' }, { id: 'breeding', label: 'Crianza', icon: '🥚' },
  { id: 'especial', label: 'Otros', icon: '✨' }
]

const multiSelectMode = ref(null); const selectedItems = reactive(new Set())
const targetingItem = ref(null); const showTargetOverlay = ref(false)

const filteredItems = computed(() => {
  const search = (bagSearch.value || '').toLowerCase()
  return (inventoryStore.bagItems || []).filter(item => {
    return item.name.toLowerCase().includes(search) && (bagCategory.value === 'todos' || item.cat === bagCategory.value)
  })
})

const handleItemClick = (item) => {
  if (multiSelectMode.value) {
    selectedItems.has(item.name) ? selectedItems.delete(item.name) : selectedItems.add(item.name)
    return
  }

  // --- EGG HANDLING ---
  if (item.isEgg) {
    if (item.ready) {
      uiStore.open('HatchAnimation', { egg: item.eggData })
      emit('close')
    } else {
      uiStore.notify(`Este huevo aún no está listo (${Math.ceil(item.steps)} pasos restantes)`, '🥚')
    }
    return
  }

  const dbItem = SHOP_ITEMS.find(i => i.id === item.id)
  if (!dbItem) return
  if (['stones', 'pociones'].includes(dbItem.cat) || dbItem.id === 'rare_candy') {
    targetingItem.value = dbItem; showTargetOverlay.value = true
  } else if (dbItem.cat === 'held') uiStore.notify(`Equipa este item desde el detalle del Pokémon`, '🎒')
  else uiStore.notify(`Este objeto no se puede usar desde aquí`, '🚫')
}

const handleMultiExecute = async () => {
  if (selectedItems.size === 0) return
  const mode = multiSelectMode.value; const actionText = mode === 'sell' ? 'vender' : 'tirar'
  uiStore.openConfirm({
    title: `CONFIRMAR ACCIÓN`, message: `¿Estás seguro que deseas ${actionText} estos ${selectedItems.size} objetos?`,
    confirmText: mode === 'sell' ? 'VENDER' : 'TIRAR',
    onConfirm: async () => {
      for (const name of selectedItems) { mode === 'sell' ? await inventoryStore.sellItem(name, 999) : await inventoryStore.removeItem(name, 999) }
      uiStore.notify(mode === 'sell' ? 'Venta realizada' : 'Objetos eliminados', mode === 'sell' ? '💰' : '🗑️')
      selectedItems.clear(); multiSelectMode.value = null
    }
  })
}

const close = () => { emit('close'); multiSelectMode.value = null; selectedItems.clear(); showTargetOverlay.value = false }
</script>

<template>
  <BaseModal
    :show="show"
    max-width="800px"
    variant="retro"
    padding="raw"
    @close="close"
  >
    <template #header>
      <div class="inventory-header">
        <div class="title-group">
          <span class="icon">🎒</span><span class="text">MOCHILA</span>
        </div>
        <div class="header-stats">
          <div class="stat">
            <span class="label">CAPACIDAD</span><span class="value">{{ Object.values(gameStore.state.inventory || {}).reduce((s, v) => s + v, 0) }}</span>
          </div>
          <div class="stat money">
            <span class="label">SALDO</span><span class="value">₽{{ gameStore.state.money.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="inventory-content">
      <div class="sidebar-categories">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="cat-btn"
          :class="{ active: bagCategory === cat.id }"
          @click.stop="inventoryStore.bagCategory = cat.id"
        >
          <span class="icon">{{ cat.icon }}</span><span class="label">{{ cat.label }}</span>
        </button>
      </div>

      <div class="main-bag">
        <div class="bag-controls">
          <div class="search-box">
            <span class="search-icon">🔍</span><input
              v-model="bagSearch"
              type="text"
              placeholder="Filtrar inventario..."
              class="search-input"
            >
          </div>
        </div>
        <div class="items-area custom-scrollbar">
          <div
            v-if="filteredItems.length"
            class="item-grid"
          >
            <InventoryItemNode
              v-for="item in filteredItems"
              :key="item.name"
              :item="item"
              :is-selected="selectedItems.has(item.name)"
              :multi-select-mode="!!multiSelectMode"
              @click.stop="handleItemClick(item)"
            />
          </div>
          <div
            v-else
            class="empty-bag"
          >
            <div class="empty-icon">
              {{ categories.find(c => c.id === bagCategory)?.icon || '📦' }}
            </div><p>{{ bagSearch ? 'No se encontraron coincidencias' : 'Esta sección está vacía' }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="inventory-footer">
        <div
          v-if="!multiSelectMode"
          class="standard-actions"
        >
          <button
            class="action-btn"
            @click.stop="multiSelectMode = 'sell'"
          >
            <span class="icon">💰</span> VENDER A ROCKET
          </button>
          <button
            class="action-btn"
            @click.stop="multiSelectMode = 'release'"
          >
            <span class="icon">🗑️</span> TIRAR OBJETOS
          </button>
        </div>
        <div
          v-else
          class="multi-select-actions"
        >
          <div class="selection-info">
            <span class="count">{{ selectedItems.size }}</span> SELECCIONADOS
          </div>
          <div class="action-buttons">
            <button
              class="btn-cancel"
              @click.stop="selectedItems.clear(); multiSelectMode = null"
            >
              CANCELAR
            </button>
            <button
              class="btn-execute"
              :class="multiSelectMode"
              :disabled="selectedItems.size === 0"
              @click.stop="handleMultiExecute"
            >
              {{ multiSelectMode === 'sell' ? 'CONFIRMAR VENTA' : 'CONFIRMAR ELIMINACIÓN' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <InventoryTargetOverlay
      v-if="showTargetOverlay"
      :show="true"
      :item="targetingItem"
      @close="showTargetOverlay = false"
      @select="async (p, i) => { const res = await inventoryStore.useItem(targetingItem.name, 'team', i); if (res.success) { uiStore.notify(res.msg, '✨'); showTargetOverlay.value = false; targetingItem.value = null } else uiStore.notify(res.msg, '⚠️') }"
    />
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/inventory";
</style>
