<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { useUIStore } from '@/stores/ui'
import { getItemById } from '@/data/inventory/items'
import { isItemUsableOutsideCombat } from '@/stores/inventory/inventory'
import type { Item } from '@/stores/inventory/inventory'

interface Props {
  show: boolean
  item: Item | null
  battleMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  battleMode: false
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', type: 'use' | 'sell' | 'release'): void
}>()

const uiStore = useUIStore()

const isItemUsableOrEquippable = computed(() => {
  if (!props.item) return false
  const dbItem = getItemById(props.item.id)
  if (!dbItem) return false
  return isItemUsableOutsideCombat(dbItem)
})

const isItemHeld = computed(() => {
  if (!props.item) return false
  const dbItem = getItemById(props.item.id)
  if (!dbItem) return false
  return dbItem.cat === 'held' || dbItem.type === 'held' || (dbItem.cat === 'breeding' && dbItem.id !== 'vigorrestorer' && !dbItem.id.includes('berry'))
})

const handleSelect = (actionType: 'use' | 'sell' | 'release') => {
  emit('action', actionType)
}
</script>

<template>
  <BaseModal
    v-if="item"
    :show="show"
    max-width="320px"
    variant="retro"
    accent-color="var(--red)"
    @close="emit('close')"
  >
    <template #header>
      <div class="action-menu-header">
        {{ item.name }}
      </div>
    </template>
    <div class="action-menu-body">
      <button
        v-if="uiStore.inventoryTarget"
        class="menu-btn vicio-primary"
        @click.stop="handleSelect('use')"
      >
        <span class="icon">✨</span> USAR / EQUIPAR
      </button>
      <button
        v-else-if="!battleMode && isItemUsableOrEquippable"
        class="menu-btn vicio-primary"
        @click.stop="handleSelect('use')"
      >
        <template v-if="isItemHeld">
          <span class="icon">🎒</span> EQUIPAR
        </template>
        <template v-else>
          <span class="icon">✨</span> USAR
        </template>
      </button>
      <button
        v-if="!battleMode"
        class="menu-btn vicio-warning"
        @click.stop="handleSelect('sell')"
      >
        <span class="icon">💰</span> VENDER
      </button>
      <button
        v-if="!battleMode"
        class="menu-btn vicio-danger"
        @click.stop="handleSelect('release')"
      >
        <span class="icon">🗑️</span> TIRAR
      </button>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.action-menu-header {
  @include pixelated;
  font-size: 10px;
  color: var(--yellow);
  text-align: center;
  width: 100%;
}

.action-menu-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;

  .menu-btn {
    width: 100%;
    margin-bottom: 8px;
    
    &.vicio-primary { @include btn-vicio('primary', 'md', true); }
    &.vicio-warning { @include btn-vicio('primary', 'md', true); }
    &.vicio-danger  { @include btn-vicio('danger', 'md', true); }
    
    .icon { font-size: 16px; }
  }
}
</style>
