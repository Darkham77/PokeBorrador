<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGTSStore } from '@/stores/gts'
import { useGameStore } from '@/stores/game'
import { useAudioStore } from '@/stores/audio'
import { formatCurrency } from '@/logic/utils/formatters'
import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import { formatDisplayDate } from '@/logic/utils/timeUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useUIStore } from '@/stores/ui'
import { getItemById } from '@/data/inventory/items'
import type { MarketListingType } from '@/logic/economy/market'
import type { ClaimItem } from '@/types/system/game'

import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

const gtsStore = useGTSStore()
const gameStore = useGameStore()
const audioStore = useAudioStore()
const uiStore = useUIStore()

const activeListings = computed(() => gtsStore.activeMyListings)
const history = computed(() => gtsStore.salesHistory)
const allPendingGtsClaims = computed(() => gtsStore.allPendingGtsClaims)
const unclaimedCount = computed(() => gtsStore.unclaimedGtsCount)

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

function isPurchaseRow(sale: MarketHistoryRow): boolean {
  const claim = getClaimForSale(sale.id)
  if (claim && claim.asset_data?.type !== 'money') return true
  return sale.status === 'purchased'
}

interface MarketHistoryRow {
  id: string | number
  seller_id: string
  seller_name?: string
  listing_type: MarketListingType
  data: unknown
  price: number
  status: string
  created_at: string
}

function getSaleAmount(sale: MarketHistoryRow): number {
  const claim = getClaimForSale(sale.id)
  if (claim && typeof claim.asset_data?.data === 'number') {
    return claim.asset_data.data
  }
  return Math.floor(sale.price * (1 - gtsStore.MARKET_FEE))
}

const displayHistory = computed<MarketHistoryRow[]>(() => {
  const list: MarketHistoryRow[] = [...history.value]
  const matchedClaimIds = new Set<string | number>()

  for (const sale of list) {
    const claim = getClaimForSale(sale.id)
    if (claim) {
      matchedClaimIds.add(claim.id)
    }
  }

  for (const claim of allPendingGtsClaims.value) {
    if (!matchedClaimIds.has(claim.id)) {
      const isMoney = claim.asset_data?.type === 'money'
      if (isMoney) {
        const soldItem = claim.asset_data?.sold_item
        const soldPoke = claim.asset_data?.sold_pokemon
        const listingType: MarketListingType = soldPoke ? 'pokemon' : 'item'
        const data = soldPoke || soldItem || { name: 'Venta GTS' }
        const amount = typeof claim.asset_data?.data === 'number' ? claim.asset_data.data : 0
        const item: MarketHistoryRow = {
          id: claim.source_id || claim.id,
          seller_id: (claim as { user_id?: string }).user_id || '',
          seller_name: '',
          listing_type: listingType,
          data,
          price: Math.round(amount / (1 - gtsStore.MARKET_FEE)),
          status: 'sold',
          created_at: claim.created_at || Temporal.Now.instant().toString()
        }
        list.unshift(item)
      } else {
        const isPokemon = claim.asset_data?.type === 'pokemon'
        const listingType: MarketListingType = isPokemon ? 'pokemon' : 'item'
        const data = claim.asset_data?.data || { name: isPokemon ? 'Pokémon' : 'Objeto' }
        const item: MarketHistoryRow = {
          id: claim.source_id || claim.id,
          seller_id: (claim as { user_id?: string }).user_id || '',
          seller_name: '',
          listing_type: listingType,
          data,
          price: 0,
          status: 'purchased',
          created_at: claim.created_at || Temporal.Now.instant().toString()
        }
        list.unshift(item)
      }
    }
  }

  return list
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

function parseSaleData(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown> // open-record: Generic key-value data dictionary container
    } catch {
      return {}
    }
  }
  return typeof data === 'object' ? (data as Record<string, unknown>) : {} // open-record: Generic key-value data dictionary container
}

function getSoldItemName(sale: MarketHistoryRow): string {
  const data = parseSaleData(sale.data)
  if (sale.listing_type === 'pokemon') {
    const pokeName = (data.name as string) || (data.species as string) || 'Pokémon'
    const isShiny = Boolean(data.shiny || data.isShiny)
    const level = data.level ? ` (Nv. ${data.level})` : ''
    return `${pokeName}${level}${isShiny ? ' ✨' : ''}`
  }
  const itemName = (data.name as string) || 'Objeto'
  const found = getItemById(itemName)
  const qty = typeof data.qty === 'number' && data.qty > 1 ? ` x${data.qty}` : ''
  return `${found?.name || itemName}${qty}`
}

function getSaleVisual(sale: MarketHistoryRow): {
  type: MarketListingType
  url: string
  fallbackUrl: string
} {
  const data = parseSaleData(sale.data)
  if (sale.listing_type === 'pokemon') {
    const species = (data.id as string) || (data.species as string) || (data.name as string) || 'pikachu'
    const isShiny = Boolean(data.shiny || data.isShiny)
    return {
      type: 'pokemon',
      url: getAssetUrl(ASSET_TYPES.POKEMON, species, { isShiny }),
      fallbackUrl: getAssetUrl(ASSET_TYPES.POKEMON, 'pikachu')
    }
  }
  const rawName = (data.name as string) || 'potion'
  const found = getItemById(rawName)
  const spriteId = found?.sprite || found?.id || rawName
  return {
    type: 'item',
    url: getAssetUrl(ASSET_TYPES.ITEM, spriteId),
    fallbackUrl: getAssetUrl(ASSET_TYPES.ITEM, 'potion')
  }
}

// formatTime is now centralized in timeUtils.ts as formatDisplayDate
const formatTime = formatDisplayDate
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
        <div 
          v-for="item in activeListings"
          :key="item.id"
          class="my-listing-item-wrapper"
        >
          <template v-if="item.listing_type === 'pokemon'">
            <PokemonSelectionItem
              :item="{
                pokemon: item.data,
                _source: 'market',
                index: 0
              }"
              :total="getPokemonTotalPower(item.data)"
              auto-confirm
              class="listing-card-override"
            />
            <div class="listing-actions">
              <span class="price-tag">₽{{ formatCurrency(item.price) }}</span>
              <button
                :id="`market-my-items-cancel-pokemon-btn-${item.id}`"
                class="btn-vicio-danger btn-vicio-sm"
                @click.stop="handleCancel(item.id)"
              >
                CANCELAR
              </button>
            </div>
          </template>
          <div 
            v-else
            class="my-listing-item-card"
          >
            <div class="card-visual">
              <img 
                :src="getAssetUrl(ASSET_TYPES.ITEM, item.data.name || '')" 
                class="i-sprite pixelated"
                @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'potion')"
              >
            </div>
            <div class="card-info">
              <span class="name">{{ getItemById(item.data.name || '')?.name || item.data.name }}</span>
              <div class="i-meta">
                <span class="qty">CANTIDAD: x{{ item.data.qty || 1 }}</span>
                <span class="price">₽{{ formatCurrency(item.price) }}</span>
              </div>
            </div>
            <button
              :id="`market-my-items-cancel-item-btn-${item.id}`"
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="handleCancel(item.id)"
            >
              CANCELAR
            </button>
          </div>
        </div>
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
        <div
          v-for="sale in displayHistory"
          :key="sale.id"
          class="history-row"
          :class="{ 'is-unclaimed': Boolean(getClaimForSale(sale.id)) }"
        >
          <div class="sale-main">
            <div class="sale-visual">
              <img
                :src="getSaleVisual(sale).url"
                class="sale-sprite pixelated"
                :class="getSaleVisual(sale).type"
                @error="(e: Event) => (e.target as HTMLImageElement).src = getSaleVisual(sale).fallbackUrl"
              >
            </div>
            <div class="sale-info">
              <div class="item-title-row">
                <span class="item-name">{{ getSoldItemName(sale) }}</span>
                <span 
                  class="sale-badge"
                  :class="{
                    'badge-pending': Boolean(getClaimForSale(sale.id)),
                    'badge-purchase': isPurchaseRow(sale)
                  }"
                >
                  {{ getClaimForSale(sale.id) ? (isPurchaseRow(sale) ? 'COMPRA PENDIENTE' : 'SIN RECLAMAR') : (isPurchaseRow(sale) ? 'COMPRADO' : 'VENDIDO') }}
                </span>
              </div>
              <div class="sale-meta">
                <span class="date">{{ formatTime(sale.created_at) }}</span>
              </div>
            </div>
          </div>
          <div class="sale-value">
            <span
              v-if="!isPurchaseRow(sale)"
              class="net-gain"
            >+ ₽{{ formatCurrency(getSaleAmount(sale)) }}</span>
            <span
              v-else
              class="net-gain asset-gain"
            >ACTIVO</span>
            <button
              v-if="getClaimForSale(sale.id)"
              :id="`market-claim-sale-btn-${sale.id}`"
              class="btn-vicio-success btn-vicio-sm claim-btn"
              :disabled="isClaimingId === getClaimForSale(sale.id)!.id"
              @click.stop="handleClaimSale(getClaimForSale(sale.id)!, getSoldItemName(sale))"
            >
              {{ isClaimingId === getClaimForSale(sale.id)!.id ? '...' : 'RECLAMAR' }}
            </button>
            <span
              v-else
              class="claimed-badge"
            >
              {{ isPurchaseRow(sale) ? 'RETIRADO' : 'RECLAMADO' }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped src="./MarketMyItems.styles.scss" lang="scss"></style>

