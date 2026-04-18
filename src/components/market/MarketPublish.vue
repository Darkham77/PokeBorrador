<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gtsStore'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'

const auth = useAuthStore()
const game = useGameStore()
const gtsStore = useGTSStore()

const activeMode = ref('pokemon') // 'pokemon' | 'item'
const selection = ref(null)
const price = ref(1000)

const box = computed(() => game.state.box)
const inventory = computed(() => {
  return Object.entries(game.state.inventory)
    .filter(([name, qty]) => qty > 0)
    .map(([name, qty]) => ({ name, qty }))
})

async function handlePublish() {
  if (!selection.value || price.value < 1) return
  
  const success = await gtsStore.publishListing(activeMode.value, selection.value, price.value)
  if (success) {
    selection.value = null
    price.value = 1000
    // Optional: emit event to parent to switch tab
  }
}

function selectItem(item) {
  selection.value = item
  // Suggest a default price?
}

const fee = computed(() => Math.floor(price.value * gtsStore.MARKET_FEE))
const net = computed(() => price.value - fee.value)
</script>

<template>
  <div class="market-publish-wizard">
    <div class="publish-header">
      <div class="mode-selector">
        <button 
          :class="{ active: activeMode === 'pokemon' }"
          @click="activeMode = 'pokemon'; selection = null"
        >
          POKÉMON
        </button>
        <button 
          :class="{ active: activeMode === 'item' }"
          @click="activeMode = 'item'; selection = null"
        >
          OBJETOS
        </button>
      </div>
      <p class="limit-info">
        Publicaciones: {{ gtsStore.activeMyListings.length }} / {{ gtsStore.MAX_LISTINGS }}
      </p>
    </div>

    <div class="main-split">
      <!-- Selector List -->
      <div class="selection-list custom-scrollbar">
        <template v-if="activeMode === 'pokemon'">
          <div 
            v-for="p in box"
            :key="p.uid"
            class="selectable-card pokemon"
            :class="{ selected: selection?.uid === p.uid }"
            @click="selectItem(p)"
          >
            <div
              class="tier-mark"
              :style="{ background: getPokemonTier(p).bg }"
            />
            <img
              :src="`/assets/sprites/pokemon/${p.id}.webp`"
              class="p-sprite pixelated"
            >
            <div class="p-info">
              <span class="p-name">{{ p.name }}</span>
              <span class="p-lvl">Nv. {{ p.level }}</span>
            </div>
          </div>
          <div
            v-if="box.length === 0"
            class="empty-list"
          >
            Tu PC está vacía.
          </div>
        </template>

        <template v-else>
          <div 
            v-for="i in inventory"
            :key="i.name"
            class="selectable-card item"
            :class="{ selected: selection?.name === i.name }"
            @click="selectItem(i)"
          >
            <span class="i-icon">📦</span>
            <div class="i-info">
              <span class="i-name">{{ i.name }}</span>
              <span class="i-qty">Posees: {{ i.qty }}</span>
            </div>
          </div>
          <div
            v-if="inventory.length === 0"
            class="empty-list"
          >
            No tienes objetos para vender.
          </div>
        </template>
      </div>

      <!-- Price & Confirm -->
      <div class="publish-panel">
        <div
          v-if="selection"
          class="form-container"
        >
          <div class="selected-summary">
            <span class="label">VAS A VENDER:</span>
            <span class="val">{{ selection.name }}</span>
          </div>

          <div class="input-group">
            <label>PRECIO DE VENTA (₽)</label>
            <input 
              v-model.number="price" 
              type="number" 
              min="1"
              class="price-input"
            >
          </div>

          <div class="financials">
            <div class="row">
              <span>Comisión GTS (5%):</span>
              <span class="neg">- ₽{{ fee.toLocaleString() }}</span>
            </div>
            <div class="row total">
              <span>Tú recibes:</span>
              <span class="pos">₽{{ net.toLocaleString() }}</span>
            </div>
          </div>

          <button 
            class="confirm-btn" 
            :disabled="gtsStore.publishing || gtsStore.activeMyListings.length >= gtsStore.MAX_LISTINGS"
            @click="handlePublish"
          >
            {{ gtsStore.publishing ? 'PROCESANDO...' : 'PUBLICAR OFERTA' }}
          </button>
        </div>
        <div
          v-else
          class="selection-hint"
        >
          <div class="hint-icon">
            👈
          </div>
          <p>Selecciona un Pokémon u objeto para venderlo en el mercado mundial.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.market-publish-wizard {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.publish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .limit-info {
    font-size: 10px;
    color: #64748b;
    font-weight: bold;
  }
}

.mode-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 12px;
  gap: 4px;

  button {
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: #64748b;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s;

    &.active {
      background: #a855f7;
      color: #fff;
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.3);
    }
  }
}

.main-split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  overflow: hidden;
}

.selection-list {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selectable-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &:hover { background: rgba(255, 255, 255, 0.08); }
  &.selected {
    border-color: #a855f7;
    background: rgba(168, 85, 247, 0.1);
  }

  .tier-mark {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  .p-sprite { width: 44px; height: 44px; object-fit: contain; }
  .p-info, .i-info {
    display: flex;
    flex-direction: column;
    .p-name, .i-name { font-size: 13px; font-weight: bold; color: #fff; }
    .p-lvl, .i-qty { font-size: 10px; color: #64748b; }
  }
  
  .i-icon { font-size: 24px; }
}

.publish-panel {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.selection-hint {
  text-align: center;
  color: #64748b;
  .hint-icon { font-size: 40px; margin-bottom: 15px; opacity: 0.2; }
  p { font-size: 13px; max-width: 200px; line-height: 1.6; }
}

.form-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.selected-summary {
  text-align: center;
  .label { display: block; font-size: 9px; color: #64748b; margin-bottom: 5px; }
  .val { font-size: 18px; font-weight: 900; color: #fff; text-transform: uppercase; }
}

.input-group {
  label {
    display: block;
    font-size: 9px;
    font-family: 'Press Start 2P', monospace;
    color: #a855f7;
    margin-bottom: 12px;
    text-align: center;
  }
  .price-input {
    width: 100%;
    background: #000;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 16px;
    color: #ffd700;
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    text-align: center;
    outline: none;
    &:focus { border-color: #ffd70044; }
  }
}

.financials {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #94a3b8;
    &.total {
       border-top: 1px solid rgba(255, 255, 255, 0.05);
       padding-top: 10px;
       margin-top: 5px;
       font-weight: bold;
       font-size: 13px;
       color: #fff;
    }
    .neg { color: #f87171; }
    .pos { color: #22c55e; }
  }
}

.confirm-btn {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #fff;
  border: none;
  border-radius: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
  transition: all 0.2s;

  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(124, 58, 237, 0.5); }
  &:disabled { background: #334155; color: #64748b; box-shadow: none; cursor: not-allowed; }
}

.empty-list { text-align: center; padding: 40px; color: #64748b; font-size: 12px; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
