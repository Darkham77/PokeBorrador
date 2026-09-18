<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGTSStore } from '@/stores/gts'
import { useGameStore } from '@/stores/game'
import { useAudioStore } from '@/stores/audio'
import { formatCurrency } from '@/logic/utils/formatters'
import { useUIStore } from '@/stores/ui'
import type { ClaimItem } from '@/types/system/game'
import MarketMyListingCard from './MarketMyListingCard.vue'
import MarketHistoryRowItem from './MarketHistoryRowItem.vue'
import { type MarketHistoryRow, buildDisplayHistory } from './marketMyItemsHelper.ts'

const gtsStore = useGTSStore()
const gameStore = useGameStore()
const audioStore = useAudioStore()
const uiStore = useUIStore()

const {
  activeMyListings: activeListings,
  salesHistory: history,
  allPendingGtsClaims,
  unclaimedGtsCount: unclaimedCount,
} = storeToRefs(gtsStore)

const isClaimingId = ref<string | number | null>(null)
const isClaimingAll = ref(false)

const claimsBySaleId = computed(() => {
  const map = new Map<string, ClaimItem>() // runtime-map: Fast O(1) keyed lookup dictionary
  for (const claim of allPendingGtsClaims.value) {
    if (claim.source_id) {
      map.set(String(claim.source_id), claim)
    }
    map.set(String(claim.id), claim)
  }
  return map
})

function getClaimForSale(saleId: string | number): ClaimItem | undefined { // domain-ok: Dynamic UI lookup returning found element or undefined
  return claimsBySaleId.value.get(String(saleId))
}

const displayHistory = computed<MarketHistoryRow[]>(() => {
  return buildDisplayHistory(
    history.value,
    allPendingGtsClaims.value,
    claimsBySaleId.value,
    gtsStore.MARKET_FEE
  )
})

async function handleClaimSale(claim: ClaimItem, saleName: string) {
  if (isClaimingId.value) return
  isClaimingId.value = claim.id
  try {
    const isMoney = claim.asset_data?.type === 'money'
    const amount = typeof claim.asset_data?.data === 'number' ? claim.asset_data.data : 0
    const success = await gameStore.claimAsset(claim.id)
    if (success) {
      if (isMoney) {
        audioStore.play('money')
        uiStore.notify(`¡Has cobrado ₽${formatCurrency(amount)} por la venta de ${saleName}!`, '💰')
      } else {
        audioStore.play('level_up')
        uiStore.notify(`¡Has retirado ${saleName} de tus compras en GTS!`, '🎁')
      }
      await gtsStore.fetchUserData()
    }
  } finally {
    isClaimingId.value = null
  }
}

async function handleClaimAll() {
  if (isClaimingAll.value) return
  isClaimingAll.value = true
  try {
    const claimsToProcess = [...allPendingGtsClaims.value]
    let totalCollected = 0
    let assetsCount = 0
    for (const claim of claimsToProcess) {
      const isMoney = claim.asset_data?.type === 'money'
      const amount = typeof claim.asset_data?.data === 'number' ? claim.asset_data.data : 0
      const success = await gameStore.claimAsset(claim.id)
      if (success) {
        if (isMoney) {
          totalCollected += amount
        } else {
          assetsCount++
        }
      }
    }
    if (totalCollected > 0 || assetsCount > 0) {
      audioStore.play('money')
      let msg = '¡Reclamos procesados con éxito!'
      if (totalCollected > 0 && assetsCount > 0) {
        msg = `¡Has cobrado ₽${formatCurrency(totalCollected)} y retirado ${assetsCount} compra(s) de GTS!`
      } else if (totalCollected > 0) {
        msg = `¡Has cobrado un total de ₽${formatCurrency(totalCollected)} de tus ventas!`
      } else {
        msg = `¡Has retirado ${assetsCount} compra(s) de GTS!`
      }
      uiStore.notify(msg, '💰')
      await gtsStore.fetchUserData()
    }
  } finally {
    isClaimingAll.value = false
  }
}

onMounted(() => {
  void gtsStore.fetchUserData()
})

function handleCancel(listingId: string | number) {
  console.debug('[GTS] UI: handleCancel disparado para ID:', listingId)
  uiStore.openConfirm({
    title: '¿CANCELAR PUBLICACIÓN?',
    message: '¿Estás seguro de que deseas cancelar esta publicación? El objeto/Pokémon volverá a tu inventario.',
    confirmText: 'ACEPTAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    onConfirm: async () => {
      console.debug('[GTS] UI: Confirmación aceptada, llamando al store...')
      const success = await gtsStore.cancelListing(listingId)
      console.debug('[GTS] UI: Resultado cancelación en store:', success)
    },
    onCancel: () => {
      console.debug('[GTS] UI: Cancelación abortada por el usuario.')
    }
  })
}
</script>

<template>
  <div class="market-my-items custom-scrollbar">
    <section class="listings-section">
      <h3 class="mkt-section-title">
        PUBLICACIONES ACTIVAS ({{ activeListings.length }}/{{ gtsStore.MAX_LISTINGS }})
      </h3>
      
      <div
        v-if="activeListings.length === 0"
        class="empty-state"
      >
        <p>No tienes publicaciones activas en este momento.</p>
      </div>

      <div
        v-else
        class="my-listings-grid-unified"
      >
        <MarketMyListingCard
          v-for="item in activeListings"
          :key="item.id"
          :item="item"
          @cancel="handleCancel"
        />
      </div>
    </section>

    <section class="history-section">
      <div class="mkt-section-header">
        <div class="title-with-badge">
          <h3 class="mkt-section-title">
            HISTORIAL DE TRANSACCIONES
          </h3>
          <span
            v-if="unclaimedCount > 0"
            class="hud-notification-badge text-outline inline-badge"
          >
            {{ unclaimedCount }}
          </span>
        </div>
        <button
          v-if="unclaimedCount > 1"
          class="btn-vicio-success btn-vicio-sm"
          :disabled="isClaimingAll"
          @click.stop="handleClaimAll"
        >
          {{ isClaimingAll ? '...COBRANDO' : `RECLAMAR TODO (${unclaimedCount})` }}
        </button>
      </div>
      
      <div
        v-if="displayHistory.length === 0"
        class="empty-state"
      >
        <p>No hay transacciones registradas recientemente.</p>
      </div>

      <div
        v-else
        class="history-list custom-scrollbar"
      >
        <MarketHistoryRowItem
          v-for="sale in displayHistory"
          :key="sale.id"
          :sale="sale"
          :claim="getClaimForSale(sale.id)"
          :is-claiming="isClaimingId === getClaimForSale(sale.id)?.id"
          :market-fee="gtsStore.MARKET_FEE"
          @claim="handleClaimSale"
        />
      </div>
    </section>
  </div>
</template>

<style scoped src="./MarketMyItems.styles.scss" lang="scss"></style>

