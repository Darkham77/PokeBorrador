<script setup>
import { ref, reactive, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useTradeStore } from '@/stores/trade'
import TradePokemonSelector from './social/TradePokemonSelector.vue'
import { getSpriteUrl } from '@/data/spriteMapping'
import BaseModal from '@/components/common/BaseModal.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const tradeStore = useTradeStore()

const isTradeOpen = computed({
  get: () => uiStore.isTradeOpen,
  set: (val) => { uiStore.isTradeOpen = val }
})
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
  isTradeOpen.value = false
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
    :show="isTradeOpen"
    :title="`INTERCAMBIO CON ${target?.username || 'JUGADOR'}`"
    max-width="900px"
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
        <div class="trade-side">
          <div class="side-title">
            Mi Equipo / Mochila
          </div>
          
          <div class="selected-poke-display">
            <div
              v-if="tradeStore.tradeOfferPoke"
              class="poke-preview"
              @click="openSelector('offer')"
            >
              <img
                :src="getSpriteUrl(tradeStore.tradeOfferPoke.id, tradeStore.tradeOfferPoke.isShiny)"
                class="preview-sprite"
              >
              <div class="preview-info">
                <div class="name">
                  {{ tradeStore.tradeOfferPoke.name }}
                </div>
                <div class="meta">
                  Nv. {{ tradeStore.tradeOfferPoke.level }}
                </div>
              </div>
              <div class="change-hint">
                CAMBIAR
              </div>
            </div>
            <button
              v-else
              class="btn-open-selector"
              @click="openSelector('offer')"
            >
              + SELECCIONAR POKÉMON
            </button>
          </div>

          <div class="item-selection-grid">
            <div 
              v-for="(qty, name) in gs.inventory" 
              :key="name"
              class="trade-item-pill"
              :class="{ selected: tradeStore.tradeOfferItems[name] }"
              @click="toggleOfferItem(name)"
            >
              {{ name }} ({{ qty }})
            </div>
          </div>

          <div class="money-input-group">
            <label>Ofrecer Dinero (₽):</label>
            <input
              v-model.number="offerMoney"
              type="number"
              min="0"
              :max="gs.money"
            >
          </div>
        </div>

        <!-- Right: Friend's Side -->
        <div class="trade-side friend-side">
          <div class="side-title">
            Equipo de {{ target?.username }}
          </div>

          <div
            v-if="!isGift"
            class="selected-poke-display"
          >
            <div
              v-if="tradeStore.tradeRequestPoke"
              class="poke-preview"
              @click="openSelector('request')"
            >
              <img
                :src="getSpriteUrl(tradeStore.tradeRequestPoke.id, tradeStore.tradeRequestPoke.isShiny)"
                class="preview-sprite"
              >
              <div class="preview-info">
                <div class="name">
                  {{ tradeStore.tradeRequestPoke.name }}
                </div>
                <div class="meta">
                  Nv. {{ tradeStore.tradeRequestPoke.level }}
                </div>
              </div>
              <div class="change-hint">
                CAMBIAR
              </div>
            </div>
            <button
              v-else
              class="btn-open-selector"
              @click="openSelector('request')"
            >
              + PEDIR POKÉMON
            </button>
          </div>

          <div
            v-if="!isGift"
            class="item-selection-grid"
          >
            <div 
              v-for="(qty, name) in friendSave.inventory" 
              :key="name"
              class="trade-item-pill"
              :class="{ selected: tradeStore.tradeRequestItems[name] }"
              @click="toggleRequestItem(name)"
            >
              {{ name }} ({{ qty }})
            </div>
          </div>

          <div
            v-if="!isGift"
            class="money-input-group"
          >
            <label>Pedir Dinero (₽):</label>
            <input
              v-model.number="requestMoney"
              type="number"
              min="0"
              :max="friendSave.money || 999999"
            >
          </div>

          <div
            v-if="isGift"
            class="gift-overlay"
          >
            <div class="gift-content">
              <span class="gift-icon">🎁</span>
              <span class="gift-title">ESTÁS ENVIANDO UN REGALO</span>
              <p class="gift-text">
                No pedirás nada a cambio de tu oferta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="trade-footer-controls">
        <div class="message-section">
          <textarea 
            v-model="message" 
            placeholder="Escribe un mensaje para tu oferta..." 
            class="trade-message-input"
          />
        </div>

        <div class="action-section">
          <label class="gift-toggle">
            <input
              v-model="isGift"
              type="checkbox"
            >
            <span class="toggle-label">🎁 Es un regalo</span>
          </label>

          <button
            class="send-offer-btn"
            :disabled="isSending"
            @click="handleSend"
          >
            <span v-if="isSending">PROCESANDO...</span>
            <span v-else>ENVIAR OFERTA</span>
          </button>
        </div>
      </div>
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
      font-size: 11px; 
      color: #fff; 
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

.trade-side {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .side-title {
    font-size: 10px;
    font-family: 'Press Start 2P', monospace;
    color: var(--gray);
    letter-spacing: 1px;
  }
}

.btn-open-selector {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #888;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--purple);
    color: #fff;
  }
}

.poke-preview {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--purple);
  padding: 12px;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &:hover {
    background: rgba(168, 85, 247, 0.15);
    .change-hint { opacity: 1; }
  }

  .preview-sprite {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
  }

  .preview-info {
    flex: 1;
    .name { font-weight: 800; font-size: 14px; color: #fff; }
    .meta { font-size: 11px; color: #888; }
  }

  .change-hint {
    position: absolute;
    right: 15px;
    font-size: 8px;
    font-family: 'Press Start 2P', monospace;
    color: var(--purple);
    opacity: 0.6;
    transition: opacity 0.2s;
  }
}

.item-selection-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 4px;
}

.trade-item-pill {
  font-size: 9px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  cursor: pointer;
  color: var(--gray);
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.08);
  }

  &.selected {
    background: var(--purple);
    color: #fff;
    border-color: var(--purple);
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
  }
}

.money-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label { font-size: 9px; font-family: 'Press Start 2P', monospace; color: var(--gray); }
  input {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 12px;
    border-radius: 12px;
    color: var(--yellow);
    font-weight: 900;
    font-size: 14px;
    outline: none;

    &:focus {
      border-color: var(--yellow);
    }
  }
}

.gift-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107, 203, 119, 0.05);
  border: 2px dashed rgba(107, 203, 119, 0.2);
  border-radius: 20px;
  padding: 30px;
  text-align: center;

  .gift-icon { font-size: 40px; display: block; margin-bottom: 12px; }
  .gift-title { font-weight: 900; font-size: 14px; color: var(--green); display: block; margin-bottom: 8px; }
  .gift-text { font-size: 11px; color: rgba(255, 255, 255, 0.5); margin: 0; }
}

.trade-footer-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.trade-message-input {
  width: 100%;
  height: 60px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 12px;
  color: #fff;
  font-size: 12px;
  resize: none;
  outline: none;

  &:focus {
    border-color: var(--purple);
  }
}

.action-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.gift-toggle { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  cursor: pointer;

  input { width: 20px; height: 20px; cursor: pointer; accent-color: var(--purple); }
  .toggle-label { font-size: 10px; font-family: 'Press Start 2P', monospace; color: #fff; }
}

.send-offer-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--purple), #8e24aa);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}
</style>
