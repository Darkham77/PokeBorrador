<script setup lang="ts">
import { formatCurrency } from '@/logic/utils/formatters'

interface Props {
  money: number
  classLevel: number
}

defineProps<Props>()
</script>

<template>
  <div class="bm-modal-header">
    <div class="bm-title-group">
      <span class="emoji title-icon">🚀</span>
      <div class="title-text-wrap">
        <span class="main-title">
          MERCADO NEGRO
          <span class="rocket-badge">EXCLUSIVO ROCKET</span>
        </span>
        <span class="sub-title">STOCK EXCLUSIVO Y CONTRABANDO DIARIO</span>
      </div>
    </div>

    <div class="header-stats">
      <div class="stat-node money">
        <span class="shop-stat-label">MIS FONDOS</span>
        <span class="value">
          ₽{{ formatCurrency(money) }}
        </span>
      </div>

      <div class="stat-node level">
        <span class="shop-stat-label">RANGO ROCKET</span>
        <span class="value">Nv. {{ classLevel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./BlackMarketModal.styles.scss"></style>
