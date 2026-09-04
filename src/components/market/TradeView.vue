<script setup lang="ts">

import { ref, computed, watch, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'
import { useTradeStore } from '@/stores/trade'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import TradeSidePanel from '../social/TradeSidePanel.vue'
import TradeFooter from '../social/TradeFooter.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { gsap } from 'gsap'
import { getItemById } from '@/data/inventory/items'
import { isPokemonBusy } from '@/logic/constants/tags'

interface Props {
  show?: boolean
}

const TRADE_HEADER_ANIM_OFFSET_Y = -30;
const TRADE_SIDE_ANIM_OFFSET_X = 50;

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const tradeStore = useTradeStore()
const uiStore = useUIStore()

const gs = computed(() => gameStore.state)
const target = computed(() => tradeStore.tradeTarget)

interface FriendSave {
  team: Pokemon[]
  box: (Pokemon | null)[]
  inventory: Record<string, number>
  money: number
}

const friendSave = computed<FriendSave>(() => (tradeStore.tradeFriendSave as FriendSave) || { team: [], box: [], inventory: {}, money: 0 })

// Local state for the form
const isSending = ref(false)
const isGift = ref(false)
const offerMoney = ref(0)
const requestMoney = ref(0)
const message = ref('')

const openSelector = (side: string) => {
  if (side === 'offer') {
    const team = (gs.value.team || []).filter((p): p is Pokemon => p !== null && !isPokemonBusy(p))
    const box = (gs.value.box as (Pokemon | null)[] || []).filter((p): p is Pokemon => p !== null && !isPokemonBusy(p))
    const allMyPokemon = [...team, ...box]
    
    uiStore.open('PokemonSelection', {
      title: 'SELECCIONA TU POKÉMON',
      subtitle: 'Elige un Pokémon de tu equipo o caja para ofrecer.',
      excludeUids: Array.from(tradeStore.lockedUids || []),
      customList: allMyPokemon,
      callbackConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0) {
          tradeStore.tradeOfferPoke = selected[0] || null
        }
      }
    })
  } else {
    const team = (friendSave.value.team || []).filter((p): p is Pokemon => p !== null && !isPokemonBusy(p))
    const box = (friendSave.value.box || []).filter((p): p is Pokemon => p !== null && !isPokemonBusy(p))
    const allFriendPokemon = [...team, ...box]
    
    uiStore.open('PokemonSelection', {
      title: `POKÉMON DE ${target.value?.username || 'ENTRENADOR'}`,
      subtitle: `Elige un Pokémon de ${target.value?.username || 'su'} equipo o caja para pedir.`,
      customList: allFriendPokemon,
      callbackConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0) {
          tradeStore.tradeRequestPoke = selected[0] || null
        }
      }
    })
  }
}

const closeTrade = () => {
  if (isSending.value) return
  emit('close')
}

import type { ItemId } from '@/data/inventory/items'

const toggleOfferItem = (itemId: ItemId) => {
  if (tradeStore.tradeOfferItems[itemId]) {
    delete tradeStore.tradeOfferItems[itemId]
  } else {
    tradeStore.tradeOfferItems[itemId] = 1
  }
}

const updateOfferItemQty = (itemId: ItemId, qty: number) => {
  if (qty <= 0) {
    delete tradeStore.tradeOfferItems[itemId]
  } else {
    tradeStore.tradeOfferItems[itemId] = qty
  }
}

const toggleRequestItem = (itemId: ItemId) => {
  if (tradeStore.tradeRequestItems[itemId]) {
    delete tradeStore.tradeRequestItems[itemId]
  } else {
    tradeStore.tradeRequestItems[itemId] = 1
  }
}

const updateRequestItemQty = (itemId: ItemId, qty: number) => {
  if (qty <= 0) {
    delete tradeStore.tradeRequestItems[itemId]
  } else {
    tradeStore.tradeRequestItems[itemId] = qty
  }
}

const handleSend = async () => {
  if (isSending.value) return
  isSending.value = true
  
  const success = await tradeStore.sendTradeOffer({
    isGift: isGift.value,
    offerMoney: offerMoney.value,
    requestMoney: requestMoney.value,
    message: message.value
  })
  
  isSending.value = false
  if (success) {
    closeTrade()
  }
}

// Entry animation using GSAP
const animateEntry = () => {
  if (document.querySelector('.trade-summary-bar')) {
    gsap.fromTo('.trade-summary-bar', 
      { y: TRADE_HEADER_ANIM_OFFSET_Y, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.2)' }
    )
  }
  if (document.querySelector('.trade-grid .offer-side')) {
    gsap.fromTo('.trade-grid .offer-side', 
      { x: -TRADE_SIDE_ANIM_OFFSET_X, opacity: 0 }, 
      { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
    gsap.fromTo('.trade-grid .request-side', 
      { x: TRADE_SIDE_ANIM_OFFSET_X, opacity: 0 }, 
      { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
  }
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    await nextTick()
    animateEntry()
  }
}, { immediate: true })

// Summary helpers
const offerSummary = computed(() => {
  const lines: string[] = [] // text-ok: UI text display localization string
  if (tradeStore.tradeOfferPoke) lines.push(tradeStore.tradeOfferPoke.name)
  Object.entries(tradeStore.tradeOfferItems).forEach(([name, qty]) => {
    const dbItem = getItemById(name)
    lines.push(`${dbItem?.name || name} x${qty}`)
  })
  if (offerMoney.value > 0) lines.push(`₽${offerMoney.value.toLocaleString()}`)
  return lines.length ? lines.join(', ') : 'Vacío'
})

const requestSummary = computed(() => {
  if (isGift.value) return '🎁 REGALO'
  const lines: string[] = [] // text-ok: UI text display localization string
  if (tradeStore.tradeRequestPoke) lines.push(tradeStore.tradeRequestPoke.name)
  Object.entries(tradeStore.tradeRequestItems).forEach(([name, qty]) => {
    const dbItem = getItemById(name)
    lines.push(`${dbItem?.name || name} x${qty}`)
  })
  if (requestMoney.value > 0) lines.push(`₽${requestMoney.value.toLocaleString()}`)
  return lines.length ? lines.join(', ') : 'Nada (¿Es un regalo?)'
})
</script>

<template>
  <BaseModal
    :show="show"
    :title="`INTERCAMBIO CON ${target?.username || 'JUGADOR'}`"
    title-color="var(--yellow)"
    header-background="#161a2e"
    max-width="900px"
    variant="modern"
    :prevent-close="isSending"
    @close="closeTrade"
  >
    <div class="trade-modal-inner">
      <!-- Summary split -->
      <div class="trade-summary-bar">
        <div class="summary-box offer">
          <span class="label">TE OFREZCO:</span>
          <span class="value">{{ offerSummary }}</span>
        </div>
        <div class="summary-icon emoji">
          🔄
        </div>
        <div class="summary-box request">
          <span class="label">PIDO A CAMBIO:</span>
          <span class="value">{{ requestSummary }}</span>
        </div>
      </div>

      <div class="trade-grid">
        <!-- Left: My Side -->
        <TradeSidePanel
          class="offer-side"
          title="Mi Equipo / Mochila"
          :pokemon="tradeStore.tradeOfferPoke"
          :inventory="gs.inventory"
          :selected-items="tradeStore.tradeOfferItems"
          :money="offerMoney"
          :max-money="gs.money"
          @open-selector="openSelector('offer')"
          @toggle-item="toggleOfferItem"
          @update-item-qty="updateOfferItemQty"
          @update:money="val => offerMoney = val"
        />

        <!-- Right: Friend's Side -->
        <TradeSidePanel
          class="request-side"
          :title="`Equipo de ${target?.username}`"
          :pokemon="tradeStore.tradeRequestPoke"
          :inventory="friendSave.inventory"
          :selected-items="tradeStore.tradeRequestItems"
          :money="requestMoney"
          :max-money="friendSave.money || 999999"
          :is-gift="isGift"
          :is-friend-side="true"
          @open-selector="openSelector('request')"
          @toggle-item="toggleRequestItem"
          @update-item-qty="updateRequestItemQty"
          @update:money="val => requestMoney = val"
        />
      </div>
    </div>

    <template #footer>
      <TradeFooter
        v-model:message="message"
        v-model:is-gift="isGift"
        :is-sending="isSending"
        @send="handleSend"
      />
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.trade-modal-inner {
  padding: 8px 0;
}

.trade-summary-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 24px;
  background: Rgba(0,0,0,0.3);
  padding: 16px;
  border-radius: 16px;
  border: 1px solid Rgba(255,255,255,0.05);

  .summary-box { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    gap: 4px; 

    .label { 
      font-size: 8px; 
      @include pixelated;
      color: var(--gray);
    }
    .value { 
      font-size: 8px; 
      color: $white; 
      font-weight: 700;
      line-height: 1.5;
      @include pixelated;
    }
  }

  .summary-icon { font-size: 24px; }
}

.trade-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }

  .offer-side,
  .request-side {
    min-width: 0;
  }
}
</style>
