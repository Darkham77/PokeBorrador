<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useTradeStore } from '@/stores/trade'

const gameStore = useGameStore()
const uiStore = useUIStore()
const tradeStore = useTradeStore()

const isTradeOpen = computed(() => uiStore.isTradeOpen)
const gs = computed(() => gameStore.state)
const target = computed(() => tradeStore.tradeTarget)
const friendSave = computed(() => tradeStore.tradeFriendSave || { team: [], inventory: {}, money: 0 })

// Local state for the form
const isGift = ref(false)
const offerMoney = ref(0)
const requestMoney = ref(0)
const message = ref('')
const activeTab = ref('team') // 'team' or 'box'
const friendTab = ref('team') // 'team' or 'box'

const closeTrade = () => {
  uiStore.isTradeOpen = false
}

const selectOfferPoke = (poke) => {
  tradeStore.tradeOfferPoke = poke
}

const selectRequestPoke = (poke) => {
  tradeStore.tradeRequestPoke = poke
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
  const success = await tradeStore.sendTradeOffer({
    isGift: isGift.value,
    offerMoney: offerMoney.value,
    requestMoney: requestMoney.value,
    message: message.value
  })
  if (success) {
    closeTrade()
  }
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
  <div
    v-if="isTradeOpen"
    class="trade-modal-overlay"
  >
    <div class="trade-modal-container">
      <!-- Header -->
      <div class="trade-header">
        <div class="trade-title">
          INTERCAMBIO CON {{ target?.username }}
        </div>
        <button
          class="trade-close"
          @click="closeTrade"
        >
          ✕
        </button>
      </div>

      <div class="trade-body">
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
            
            <div class="side-tabs">
              <button
                :class="{ active: activeTab === 'team' }"
                @click="activeTab = 'team'"
              >
                EQUIPO
              </button>
              <button
                :class="{ active: activeTab === 'box' }"
                @click="activeTab = 'box'"
              >
                CAJA
              </button>
            </div>
            
            <div class="poke-selection-list scrollbar">
              <div 
                v-for="(poke, idx) in (activeTab === 'team' ? gs.team : gs.box)" 
                :key="poke.uid || idx"
                class="trade-poke-card"
                :class="{ 
                  selected: tradeStore.tradeOfferPoke?.uid === poke.uid,
                  locked: tradeStore.lockedUids.has(poke.uid)
                }"
                @click="!tradeStore.lockedUids.has(poke.uid) && selectOfferPoke(poke)"
              >
                <img
                  :src="window.getSpriteUrl?.(poke.id)"
                  class="poke-sprite"
                >
                <div class="poke-info">
                  <div class="name">
                    {{ poke.name }}
                  </div>
                  <div class="lv">
                    Nv. {{ poke.level }}
                  </div>
                </div>
              </div>
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
              class="side-tabs"
            >
              <button
                :class="{ active: friendTab === 'team' }"
                @click="friendTab = 'team'"
              >
                EQUIPO
              </button>
              <button
                :class="{ active: friendTab === 'box' }"
                @click="friendTab = 'box'"
              >
                CAJA
              </button>
            </div>

            <div
              v-if="!isGift"
              class="poke-selection-list scrollbar"
            >
              <div 
                v-for="(poke, idx) in (friendTab === 'team' ? friendSave.team : friendSave.box)" 
                :key="poke.uid || idx"
                class="trade-poke-card"
                :class="{ selected: tradeStore.tradeRequestPoke?.uid === poke.uid }"
                @click="selectRequestPoke(poke)"
              >
                <img
                  :src="window.getSpriteUrl?.(poke.id)"
                  class="poke-sprite"
                >
                <div class="poke-info">
                  <div class="name">
                    {{ poke.name }}
                  </div>
                  <div class="lv">
                    Nv. {{ poke.level }}
                  </div>
                </div>
              </div>
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
              <span>🎁 ESTÁS ENVIANDO UN REGALO</span>
              <p>No pedirás nada a cambio de tu oferta.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="trade-footer">
        <textarea 
          v-model="message" 
          placeholder="Escribe un mensaje para tu oferta..." 
          class="trade-message-input"
        />

        <div class="footer-controls">
          <label class="gift-toggle">
            <input
              v-model="isGift"
              type="checkbox"
            >
            <span>🎁 Es un regalo</span>
          </label>

          <button
            class="send-offer-btn"
            @click="handleSend"
          >
            ENVIAR OFERTA DE INTERCAMBIO
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.trade-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(5px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.trade-modal-container {
  background: #1a1a1a;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.trade-header {
  padding: 20px;
  background: rgba(255,255,255,0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.trade-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--purple);
}

.trade-close {
  background: none; border: none; color: var(--gray);
  font-size: 20px; cursor: pointer;
}

.trade-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.trade-summary-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 24px;
  background: rgba(0,0,0,0.3);
  padding: 15px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
}

.summary-box { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.summary-box .label { font-size: 9px; font-weight: 700; color: var(--gray); text-transform: uppercase; }
.summary-box .value { font-size: 11px; color: #fff; font-weight: 500; }
.summary-icon { font-size: 24px; }

.trade-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.trade-side {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.side-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.side-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
}

.side-tabs button {
  flex: 1;
  padding: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  color: #666;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
}

.side-tabs button.active {
  background: rgba(168, 85, 247, 0.1);
  border-color: var(--purple);
  color: #fff;
}

.poke-selection-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 5px;
}

.trade-poke-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.trade-poke-card:hover { background: rgba(255,255,255,0.08); }
.trade-poke-card.selected { border-color: var(--purple); background: rgba(199, 125, 255, 0.1); }
.trade-poke-card.locked { opacity: 0.4; cursor: not-allowed; filter: grayscale(#{1}); }

.poke-sprite { width: 32px; height: 32px; image-rendering: pixelated; }
.poke-info .name { font-size: 10px; font-weight: 700; color: #fff; }
.poke-info .lv { font-size: 9px; color: var(--gray); }

.item-selection-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.trade-item-pill {
  font-size: 9px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  cursor: pointer;
  color: var(--gray);
}

.trade-item-pill.selected { background: var(--purple); color: #fff; border-color: var(--purple); }

.money-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.money-input-group label { font-size: 10px; color: var(--gray); }
.money-input-group input {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 8px;
  color: var(--yellow);
  font-weight: 900;
}

.gift-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: rgba(107, 203, 119, 0.05);
  border: 2px dashed rgba(107, 203, 119, 0.2);
  border-radius: 20px;
  padding: 20px;
  color: var(--green);
}

.gift-overlay span { font-weight: 900; font-size: 14px; margin-bottom: 10px; }
.gift-overlay p { font-size: 11px; opacity: 0.7; }

.trade-footer {
  padding: 20px;
  background: rgba(0,0,0,0.2);
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.trade-message-input {
  width: 100%;
  height: 60px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 12px;
  color: #fff;
  font-size: 12px;
  resize: none;
}

.footer-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gift-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.gift-toggle input { width: 18px; height: 18px; cursor: pointer; }
.gift-toggle span { font-size: 11px; color: #fff; }

.send-offer-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--purple), #8e24aa);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(199, 125, 255, 0.3);
  transition: all 0.2s;
}

.send-offer-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(199, 125, 255, 0.5); }
</style>
