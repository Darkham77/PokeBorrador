<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/logic/utils/formatters'
import { formatDisplayDate } from '@/logic/utils/timeUtils'
import type { ClaimItem } from '@/types/system/game'
import {
  type MarketHistoryRow,
  getSoldItemName,
  getSaleVisual,
  isPurchaseRow,
  getSaleAmount
} from './marketMyItemsHelper.ts'

const props = defineProps<{
  sale: MarketHistoryRow
  claim?: ClaimItem
  isClaiming: boolean
  marketFee: number
}>()

const emit = defineEmits<{
  (e: 'claim', claim: ClaimItem, saleName: string): void
}>()

const soldName = computed(() => getSoldItemName(props.sale))
const visual = computed(() => getSaleVisual(props.sale))
const isPurchase = computed(() => isPurchaseRow(props.sale, props.claim))
const saleAmount = computed(() => getSaleAmount(props.sale, props.claim, props.marketFee))

const badgeText = computed(() => {
  if (props.claim) {
    return isPurchase.value ? 'COMPRA PENDIENTE' : 'SIN RECLAMAR'
  }
  return isPurchase.value ? 'COMPRADO' : 'VENDIDO'
})
</script>

<template>
  <div
    class="history-row"
    :class="{ 'is-unclaimed': Boolean(claim) }"
  >
    <div class="sale-main">
      <div class="sale-visual">
        <img
          :src="visual.url"
          :alt="soldName"
          class="sale-sprite pixelated"
          :class="visual.type"
          @error="(e: Event) => (e.target as HTMLImageElement).src = visual.fallbackUrl"
        >
      </div>
      <div class="sale-info">
        <div class="item-title-row">
          <span class="item-name">{{ soldName }}</span>
          <span 
            class="sale-badge"
            :class="{
              'badge-pending': Boolean(claim),
              'badge-purchase': isPurchase
            }"
          >
            {{ badgeText }}
          </span>
        </div>
        <div class="sale-meta">
          <span class="date">{{ formatDisplayDate(sale.created_at) }}</span>
        </div>
      </div>
    </div>
    <div class="sale-value">
      <span
        v-if="!isPurchase"
        class="net-gain"
      >+ ₽{{ formatCurrency(saleAmount) }}</span>
      <span
        v-else
        class="net-gain asset-gain"
      >ACTIVO</span>
      <button
        v-if="claim"
        :id="`market-claim-sale-btn-${sale.id}`"
        class="btn-vicio-success btn-vicio-sm claim-btn"
        :disabled="isClaiming"
        @click.stop="emit('claim', claim, soldName)"
      >
        {{ isClaiming ? '...' : 'RECLAMAR' }}
      </button>
      <span
        v-else
        class="claimed-badge"
      >
        {{ isPurchase ? 'RETIRADO' : 'RECLAMADO' }}
      </span>
    </div>
  </div>
</template>

<style scoped src="./MarketMyItems.styles.scss" lang="scss"></style>
