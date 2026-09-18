<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useShopStore } from '@/stores/inventory/shop'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import BlackMarketHeader from './BlackMarketHeader.vue'
import BlackMarketCard from './BlackMarketCard.vue'
import { isItemId, type ItemId } from '@/data/inventory/items'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const shopStore = useShopStore()
const uiStore = useUIStore()

const isSmallScreen = computed(() => uiStore.isSmallScreen)

const ROCKET_MIN_LEVEL = 10
const isAuthorized = computed(() => {
  return gameStore.state.playerClass === 'rocket' && (gameStore.state.classLevel || 1) >= ROCKET_MIN_LEVEL
})

const DISCOUNT = PLAYER_CLASSES.rocket.modifiers?.shopDiscount || 0.20
const BC_TO_MONEY_RATE = 50

const blackMarketItems = computed(() => {
  if (!isAuthorized.value) return []
  return shopStore.getBlackMarketItems()
})

const purchasedItemIds = computed<ItemId[]>(() => {
  const list = gameStore.state.classData?.blackMarketDaily?.purchased || []
  return list.filter(isItemId)
})

function isPurchased(itemId: ItemId): boolean {
  return purchasedItemIds.value.includes(itemId)
}

function handleBuy(itemId: ItemId) {
  shopStore.buyBlackMarketItem(itemId)
}

const gridRef = ref<HTMLElement | null>(null)

const animateGrid = () => {
  nextTick(() => {
    if (!gridRef.value) return
    const cards = gridRef.value.querySelectorAll('.bm-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.fromTo(cards,
        { opacity: 0, y: 15, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power1.out',
          clearProps: 'transform,scale'
        }
      )
    }
  })
}

watch(() => props.show, (val) => {
  if (val) {
    animateGrid()
  }
})

const close = () => {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '860px'"
    disable-auto-grow
    variant="retro"
    padding="raw"
    accent-color="#ef4444"
    header-background="rgba(20, 10, 10, 0.9)"
    @close="close"
  >
    <!-- Header -->
    <template #header>
      <BlackMarketHeader
        :money="gameStore.state.money || 0"
        :class-level="gameStore.state.classLevel || 1"
      />
    </template>

    <div class="bm-modal-body custom-scrollbar">
      <!-- Unauthorized State -->
      <div
        v-if="!isAuthorized"
        class="bm-unauthorized-box"
      >
        <span class="emoji lock-icon">🔒</span>
        <h3>ACCESO RESTRINGIDO</h3>
        <p>Solo los miembros del Team Rocket de nivel 10 o superior tienen autorización para negociar en el Mercado Negro.</p>
      </div>

      <!-- Authorized State -->
      <div
        v-else
        class="bm-content"
      >
        <!-- Syndicate Banner -->
        <div class="bm-syndicate-banner">
          <div class="syndicate-header">
            <span class="emoji syndicate-icon">💼</span>
            <div class="syndicate-text">
              <span class="syndicate-title">OFERTA DIARIA DEL SINDICATO</span>
              <span class="syndicate-desc">Stock exclusivo renovado diariamente a las 00:00 (GMT-3) · 20% de descuento en ₽ · Límite de 1 por objeto al día</span>
            </div>
          </div>
        </div>

        <!-- 3 Items Grid -->
        <div
          ref="gridRef"
          class="bm-grid"
        >
          <BlackMarketCard
            v-for="item in blackMarketItems"
            :key="item.id"
            :item="item"
            :is-purchased="isPurchased(item.id)"
            :user-money="gameStore.state.money || 0"
            :discount="DISCOUNT"
            :bc-to-money-rate="BC_TO_MONEY_RATE"
            @buy="handleBuy"
          />
        </div>
      </div>
    </div>
  </BaseModal>
</template>
<style scoped lang="scss" src="./BlackMarketModal.styles.scss"></style>

