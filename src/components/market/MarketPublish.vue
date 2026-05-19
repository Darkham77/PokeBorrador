<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { SHOP_ITEMS } from '@/data/items'
import PokemonSelectionItem from '../modals/PokemonSelectionItem.vue'
import type { Pokemon } from '@/types/pokemon'

const game = useGameStore()
const gtsStore = useGTSStore()

// Expose to template
const _ASSET_TYPES = ASSET_TYPES
const _getAssetUrl = getAssetUrl

interface InventoryItem {
  name: string
  qty: number
  desc: string
}

const activeMode = ref<'pokemon' | 'item'>('pokemon')
const selection = ref<Pokemon | InventoryItem | null>(null)
const price = ref(1000)

const availablePokemon = computed(() => {
  const team = (game.state.team || [])
    .filter((p): p is Pokemon => p !== null)
    .map((p, i) => ({ pokemon: p, _source: 'team' as const, index: i }))
  
  const box = (game.state.box || [])
    .filter((p): p is Pokemon => p !== null)
    .map((p, i) => ({ pokemon: p, _source: 'box' as const, index: i }))
    
  return [...team, ...box]
})

const inventory = computed<InventoryItem[]>(() => {
  return Object.entries(game.state.inventory as Record<string, number>)
    .filter(([_name, qty]) => qty > 0)
    .map(([name, qty]) => {
      const dbItem = SHOP_ITEMS.find(
        (i) => i.name.toLowerCase() === name.toLowerCase() || i.id.toLowerCase() === name.toLowerCase()
      )
      return {
        name,
        qty,
        desc: dbItem?.desc || 'Objeto sin descripción.'
      }
    })
})

function getPokemonTotalPower(p: Pokemon) {
  if (!p) return 0
  const base = pokemonDataProvider.getPokemonData(p.id)
  const TOT = base ? (base.hp + base.atk + base.def + base.spa + base.spd + base.spe) : 0
  
  const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  return TOT + totalIvs
}

const itemQty = ref(1)

async function handlePublish() {
  if (!selection.value || price.value < 1) return
  
  const publishData = activeMode.value === 'item' && 'qty' in selection.value
    ? { name: selection.value.name, qty: itemQty.value }
    : selection.value

  const success = await gtsStore.publishListing(activeMode.value, publishData, price.value)
  if (success) {
    selection.value = null
    price.value = 1000
    itemQty.value = 1
    // Optional: emit event to parent to switch tab
  }
}

function updateSuggestedPrice() {
  if (activeMode.value === 'item' && selection.value && 'qty' in selection.value) {
    const nameStr = selection.value.name.toLowerCase()
    const shopItem = SHOP_ITEMS.find(i => i.name.toLowerCase() === nameStr || i.id.toLowerCase() === nameStr)
    if (shopItem && shopItem.price > 0) {
      price.value = shopItem.price * itemQty.value
    } else {
      price.value = 1000
    }
  } else {
    price.value = 1000
  }
}

watch(itemQty, () => {
  updateSuggestedPrice()
})

function selectItem(item: Pokemon | InventoryItem) {
  selection.value = item
  if ('qty' in item) { 
    itemQty.value = 1 
  }
  updateSuggestedPrice()
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
          @click.stop="activeMode = 'pokemon'; selection = null"
        >
          POKÉMON
        </button>
        <button 
          :class="{ active: activeMode === 'item' }"
          @click.stop="activeMode = 'item'; selection = null"
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
      <div class="selection-container">
        <div class="selection-list ps-vertical-list custom-scrollbar">
          <template v-if="activeMode === 'pokemon'">
            <PokemonSelectionItem 
              v-for="item in availablePokemon"
              :key="item.pokemon.uid"
              :item="item"
              :is-selected="!!(selection && 'uid' in selection && selection.uid === item.pokemon.uid)"
              :total="getPokemonTotalPower(item.pokemon)"
              auto-confirm
              @select="selectItem(item.pokemon)"
            />
            <div
              v-if="availablePokemon.length === 0"
              class="empty-list"
            >
              No tienes Pokémon disponibles para vender.
            </div>
          </template>

          <template v-else>
            <div 
              v-for="i in inventory"
              :key="i.name"
              class="selectable-item-card"
              :class="{ selected: selection && 'name' in selection && selection.name === i.name }"
              @click.stop="selectItem(i)"
            >
              <PVTooltip
                :title="i.name"
                :description="i.desc"
                position="top"
                tag="div"
                class="item-tooltip-trigger"
              >
                <div class="item-visual">
                  <img 
                    :src="_getAssetUrl(_ASSET_TYPES.ITEM, i.name)" 
                    class="i-sprite pixelated"
                    @error="(e: Event) => (e.target as HTMLImageElement).src = _getAssetUrl(_ASSET_TYPES.ITEM, 'Poción')"
                  >
                </div>
                <div class="item-details">
                  <span class="i-name">{{ i.name }}</span>
                  <div class="i-meta">
                    <span class="i-qty">STOCK: {{ i.qty }}</span>
                  </div>
                </div>
                <div class="selection-indicator">
                  <div class="check-circle">
                    <span v-if="selection && 'name' in selection && selection.name === i.name">✓</span>
                  </div>
                </div>
              </PVTooltip>
            </div>
            <div
              v-if="inventory.length === 0"
              class="empty-list"
            >
              No tienes objetos para vender.
            </div>
          </template>
        </div>
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

          <div
            v-if="activeMode === 'item' && selection && 'qty' in selection"
            class="input-group"
          >
            <label>CANTIDAD (MÁX: {{ selection.qty }})</label>
            <input 
              v-model.number="itemQty" 
              type="number" 
              min="1"
              :max="selection.qty"
              class="price-input"
            >
          </div>

          <div class="input-group">
            <label>PRECIO DE VENTA (₱)</label>
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
              <span class="neg">-₱{{ fee.toLocaleString() }}</span>
            </div>
            <div class="row total">
              <span>Tú recibes:</span>
              <span class="pos">₱{{ net.toLocaleString() }}</span>
            </div>
          </div>


          <button 
            class="btn-vicio-secondary btn-vicio-sm" 
            :disabled="gtsStore.publishing || gtsStore.activeMyListings.length >= gtsStore.MAX_LISTINGS"
            @click.stop="handlePublish"
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

<style lang="scss">
@use "@/styles/components/pokemon-selection";
</style>

<style lang="scss">
@use "@/styles/core/_mixins" as *;

.market-publish-wizard {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px 0;

  .publish-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .limit-info {
      font-size: 10px;
      color: $muted;
      font-weight: bold;
    }
  }

  .mode-selector {
    display: flex;
    background: Rgba(0, 0, 0, 0.3);
    padding: 4px;
    border-radius: 12px;
    gap: 4px;

    button {
      padding: 8px 16px;
      border: none;
      background: transparent;
      color: $muted;
      @include pixelated;
      font-size: 8px;
      cursor: pointer;
      border-radius: 10px;
      transition: all 0.2s;

      &.active {
        background: Rgba(56, 189, 248, 1);
        color: $white;
        box-shadow: 0 0 15px Rgba(56, 189, 248, 0.3);
      }
    }
  }

  .main-split {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 20px;
    min-height: 0;

    @include responsive(950px) {
      grid-template-columns: 1fr;
      overflow-y: auto;
      gap: 32px;
    }
  }

  .selection-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0; // Allow shrinking
    background: Rgba(0, 0, 0, 0.15);
    border-radius: 20px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .selection-list {
    flex: 1;
    padding: 12px 10px;
    overflow-x: auto; // Add horizontal scroll if cards are too wide
    overflow-y: auto;
    
    // Ensure horizontal scrollbar is visible if needed
    &::-webkit-scrollbar:horizontal {
      height: 6px;
    }
  }

  .publish-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 6px;
  }

  .selectable-item-card {
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    margin-bottom: 8px;

    .item-tooltip-trigger {
      display: flex !important;
      align-items: center;
      width: 100%;
      gap: 15px;
      padding: 12px 16px;
      box-sizing: border-box;
    }

    &:hover {
      background: Rgba(255, 255, 255, 0.06);
      border-color: Rgba(255, 255, 255, 0.1);
      transform: Translatex(4px);
    }

    &.selected {
      background: Rgba(56, 189, 248, 0.1);
      border-color: Rgba(56, 189, 248, 0.5);
      box-shadow: 0 0 15px Rgba(56, 189, 248, 0.15);
      
      .selection-indicator .check-circle {
        border-color: Rgba(56, 189, 248, 1);
        background: Rgba(56, 189, 248, 1);
        color: white;
      }
    }

    .item-visual {
      width: 44px;
      height: 44px;
      background: Rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .i-sprite {
        width: 32px;
        height: 32px;
        object-fit: contain;
      }
    }

    .item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .i-name {
        font-size: 13px;
        font-weight: bold;
        color: var(--white);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .i-meta {
        display: flex;
        gap: 10px;
        .i-qty {
          @include pixelated;
          font-size: 8px;
          color: $muted;
        }
      }
    }

    .selection-indicator {
      flex-shrink: 0;
      .check-circle {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid Rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        transition: all 0.2s;
      }
    }
  }
  .i-icon { font-size: 24px; }

  .publish-panel {
    background: Rgba(255, 255, 255, 0.02);
    border-radius: 24px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }


  .selection-hint {
    text-align: center;
    color: $muted;
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
    .label { display: block; font-size: 9px; color: $muted; margin-bottom: 5px; }
    .val { font-size: 18px; font-weight: 900; color: var(--white); text-transform: uppercase; }
  }

  .input-group {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    width: 100% !important;

    label {
      display: block !important;
      font-size: 9px;
      @include pixelated;
      color: Rgba(56, 189, 248, 1);
      margin-bottom: 12px !important;
      text-align: center !important;
    }

    .price-input {
      width: 100% !important;
      background: var(--black);
      border: 2px solid Rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px;
      color: $coin-gold;
      @include pixelated;
      font-size: 16px;
      text-align: center;
      outline: none;
      box-sizing: border-box;

      /* Hide standard HTML5 up/down spin buttons */
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        appearance: none;
        margin: 0;
      }
      &[type=number] {
        -moz-appearance: textfield;
        appearance: textfield;
      }

      &:focus { border-color: Rgba(255, 215, 0, 0.27); }
    }
  }

  .financials {
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: Rgba(148, 163, 184, 1);
      gap: 12px;

      span {
        white-space: nowrap;
      }

      &.total {
         border-top: 1px solid Rgba(255, 255, 255, 0.05);
         padding-top: 10px;
         margin-top: 5px;
         font-weight: bold;
         font-size: 13px;
         color: var(--white);
      }
      .neg { color: Rgba(248, 113, 113, 1); }
      .pos { color: Rgba(34, 197, 94, 1); }
    }
  }


  .empty-list { text-align: center; padding: 40px; color: $muted; font-size: 12px; }
}
</style>
