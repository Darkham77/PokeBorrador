<script setup lang="ts">
import { formatCurrency } from '@/logic/utils/formatters'

defineProps<{
  totalObjectsCount: number
  battleMode?: boolean
  money: number
}>()
</script>

<template>
  <div class="inventory-modal-header">
    <div class="inv-title-group">
      <div class="title-icon emoji">
        🎒
      </div>
      <div class="title-text-wrap">
        <span class="main-title">MOCHILA</span>
        <span class="sub-title">GESTIÓN DE INVENTARIO</span>
      </div>
    </div>
    
    <div class="header-stats">
      <div class="stat-node">
        <span class="inv-stat-label">OBJETOS TOTALES</span>
        <span class="value">{{ totalObjectsCount }}</span>
      </div>
      <div 
        v-if="!battleMode"
        class="stat-node money"
      >
        <span class="inv-stat-label">MIS CRÉDITOS</span>
        <span class="value">₱{{ formatCurrency(money) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="./InventoryModal.styles.scss" lang="scss"></style>

