<script setup>
/**
 * TradeView
 * Standardized modal for P2P trading.
 */
import { ref, reactive, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useTradeStore } from '@/stores/trade'
import TradePokemonSelector from './social/TradePokemonSelector.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import TradeSidePanel from './social/TradeSidePanel.vue'
import TradeFooter from './social/TradeFooter.vue'

defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const tradeStore = useTradeStore()

const gs = computed(() => gameStore.state)
const target = computed(() => tradeStore.tradeTarget)
const friendSave = computed(() => tradeStore.tradeFriendSave || { team: [], inventory: {}, money: 0 })

// Local state for the form
const isSending = ref(false)
const isGift = ref(false)
const offerMoney = ref(0)
const requestMoney = ref(0)
const message = ref('')

const selectorState = reactive({
  show: false,
  side: 'offer', // 'offer' or 'request'
  title: '',
  list: []
})

const openSelector = (side) => {
  selectorState.side = side
  selectorState.show = true
  
  if (side === 'offer') {
    selectorState.title = 'SELECCIONA TU POKÉMON'
    const team = gs.value.team.map(p => ({ ...p, _source: 'team' }))
    const box = gs.value.box.map(p => ({ ...p, _source: 'box' }))
    selectorState.list = [...team, ...box]
  } else {
    selectorState.title = `POKÉMON DE ${target.value?.username}`
    const team = friendSave.value.team.map(p => ({ ...p, _source: 'team' }))
    const box = (friendSave.value.box || []).map(p => ({ ...p, _source: 'box' }))
    selectorState.list = [...team, ...box]
  }
}

const handleSelectorSelect = (poke) => {
  if (selectorState.side === 'offer') {
    tradeStore.tradeOfferPoke = poke
  } else {
    tradeStore.tradeRequestPoke = poke
  }
  selectorState.show = false
}

const closeTrade = () => {
  if (isSending.value) return
  emit('close')
}

const toggleOfferItem = (itemName) => {
  if (tradeStore.tradeOfferItems[itemName]) {
    delete tradeStore.tradeOfferItems[itemName]
  } else {
    tradeStore.tradeOfferItems[itemName] = 1
  }
}

const toggleRequestItem = (itemName) => {
  if (tradeStore.tradeRequestItems[itemName]) {
    delete tradeStore.tradeRequestItems[itemName]
  } else {
    tradeStore.tradeRequestItems[itemName] = 1
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
  
  if (success) {
    closeTrade()
  }
  isSending.value = false
}

// Summary helpers
const offerSummary = computed(() => {
  const lines = []
  if (tradeStore.tradeOfferPoke) lines.push(tradeStore.tradeOfferPoke.name)
  Object.entries(tradeStore.tradeOfferItems).forEach(([name, qty]) => lines.push(`${name} x${qty}`))
  if (offerMoney.value > 0) lines.push(`₽${offerMoney.value.toLocaleString()}`)
  return lines.length ? lines.join(', ') : 'Vacío'
})

const requestSummary = computed(() => {
  if (isGift.value) return '🎁 REGALO'
  const lines = []
  if (tradeStore.tradeRequestPoke) lines.push(tradeStore.tradeRequestPoke.name)
  Object.entries(tradeStore.tradeRequestItems).forEach(([name, qty]) => lines.push(`${name} x${qty}`))
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
        <div class="summary-icon">
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
          title="Mi Equipo / Mochila"
          :pokemon="tradeStore.tradeOfferPoke"
          :inventory="gs.inventory"
          :selected-items="tradeStore.tradeOfferItems"
          :money="offerMoney"
          :max-money="gs.money"
          @open-selector="openSelector('offer')"
          @toggle-item="toggleOfferItem"
          @update:money="val => offerMoney = val"
        />

        <!-- Right: Friend's Side -->
        <TradeSidePanel
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

    <!-- Enhanced Pokémon Selector (Nested Modal) -->
    <TradePokemonSelector 
      :show="selectorState.show"
      :side="selectorState.side"
      :title="selectorState.title"
      :pokemon-list="selectorState.list"
      :locked-uids="tradeStore.lockedUids"
      @close="selectorState.show = false"
      @select="handleSelectorSelect"
    />
  </BaseModal>
</template>

<style scoped lang="scss">
.trade-modal-inner {
  padding: 8px 0;
}

.trade-summary-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 24px;
  background: rgba(0,0,0,0.3);
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);

  .summary-box { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    gap: 4px; 

    .label { 
      font-size: 8px; 
      font-family: 'Press Start 2P', monospace;
      color: var(--gray);
    }
    .value { 
      font-size: 8px; 
      color: $white; 
      font-weight: 700;
    }
  }

  .summary-icon { font-size: 24px; }
}

.trade-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}
</style>
