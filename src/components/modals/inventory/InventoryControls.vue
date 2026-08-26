<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory/inventory'
import PVTooltip from '@/components/common/PVTooltip.vue'
import SortControls from '@/components/common/SortControls.vue'

interface Props {
  multiSelectMode?: string | null
  selectedCount?: number
}

withDefaults(defineProps<Props>(), {
  multiSelectMode: null,
  selectedCount: 0
})

const emit = defineEmits<{
  (e: 'update:multiSelectMode', mode: string | null): void
  (e: 'execute'): void
  (e: 'cancel'): void
}>()

const inventoryStore = useInventoryStore()

const searchQuery = computed({
  get: () => inventoryStore.searchQuery,
  set: (val: string) => { inventoryStore.searchQuery = val }
})

const startMode = (mode: string) => {
  emit('update:multiSelectMode', mode)
}
</script>

<template>
  <div class="inventory-controls">
    <!-- SEARCH BAR -->
    <div class="search-section">
      <div class="search-wrapper">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            id="inventory-search-input"
            v-model="searchQuery"
            type="text"
            placeholder="Buscar objeto..."
            class="premium-search-input"
          >
          <button
            v-if="searchQuery"
            id="inventory-search-clear-btn"
            class="clear-btn"
            @click.stop="searchQuery = ''"
          >
            ×
          </button>
        </div>
        <!-- SORT CONTROLS: inline with search bar -->
        <SortControls
          v-model="inventoryStore.currentSort"
          v-model:sort-order="inventoryStore.currentSortOrder"
        />
      </div>
    </div>

    <!-- ACTIONS SECTION -->
    <div class="actions-section">
      <template v-if="!multiSelectMode">
        <PVTooltip
          title="Venta por Lote"
          description="Selecciona objetos para vender sus PILAS COMPLETAS. Para vender una cantidad específica, haz clic directo en el objeto."
          position="bottom"
        >
          <button
            id="inventory-mode-sell-btn"
            class="vicio-btn secondary sm"
            @click.stop="startMode('sell')"
          >
            <span class="icon">💰</span>
            <span class="label">MODO VENTA</span>
          </button>
        </PVTooltip>

        <PVTooltip
          title="Tirar por Lote"
          description="Selecciona objetos para tirar sus PILAS COMPLETAS. Para tirar una cantidad específica, haz clic directo en el objeto."
          position="bottom"
        >
          <button
            id="inventory-mode-release-btn"
            class="vicio-btn danger sm"
            @click.stop="startMode('release')"
          >
            <span class="icon">🗑️</span>
            <span class="label">TIRAR OBJETOS</span>
          </button>
        </PVTooltip>
      </template>

      <template v-else>
        <div class="selection-status">
          <span class="count">{{ selectedCount }}</span>
          <span class="label">SELECCIONADOS</span>
        </div>
        
        <div class="multi-actions">
          <button
            id="inventory-multi-cancel-btn"
            class="vicio-btn neutral sm"
            @click.stop="emit('cancel')"
          >
            CANCELAR
          </button>
          <button
            id="inventory-multi-execute-btn"
            class="vicio-btn sm"
            :class="multiSelectMode === 'sell' ? 'primary' : 'danger'"
            :disabled="selectedCount === 0"
            @click.stop="emit('execute')"
          >
            {{ multiSelectMode === 'sell' ? 'VENDER' : 'CONFIRMAR ELIMINACIÓN' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/core/_mixins" as *;

.inventory-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: Rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid Rgba(255, 255, 255, 0.08);
  @include gpu-layer;
}

.search-section {
  flex: 1;
  min-width: 0;

  .search-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;

    .search-input-wrap {
      flex: 1;
      min-width: 0;
      @include premium-search-input;
    }
  }
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-status {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-right: 12px;

  .count {
    @include pixelated;
    font-size: 12px;
    color: var(--yellow);
  }

  .label {
    @include pixelated;
    font-size: 7px;
    color: Rgba(255, 255, 255, 0.4);
  }
}

.multi-actions {
  display: flex;
  gap: 8px;
}

.vicio-btn {
  &.primary { @include btn-vicio-primary('sm'); }
  &.secondary { @include btn-vicio-secondary('sm'); }
  &.danger { @include btn-vicio-danger('sm'); }
  &.neutral { @include btn-vicio('neutral', 'sm'); }
}

@media (max-width: 1024px) {
  .inventory-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-section { max-width: none; }
  .actions-section { justify-content: space-between; }
}
</style>
