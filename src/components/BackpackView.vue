<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const gs = computed(() => gameStore.state)

// Estado local
const searchQuery = ref('')
const activeCategory = ref('all')
const isSellMode = ref(false)
const sellSelection = ref({}) // { itemName: quantityToSell }

// Categorías disponibles
const categories = [
  { id: 'all', label: 'Todo' },
  { id: 'potion', label: 'Pociones' },
  { id: 'ball', label: 'Pokéballs' },
  { id: 'etc', label: 'Otros' }
]

// Base de datos de objetos (Legacy)
const getShopItems = () => window.SHOP_ITEMS || []
const getHealingItems = () => window.HEALING_ITEMS || {}

// Listado filtrado de objetos
const filteredItems = computed(() => {
  const inventory = gs.value.inventory || {}
  const shopItems = getShopItems()
  const healingItems = getHealingItems()

  return Object.entries(inventory)
    .filter(([name, qty]) => {
      if (qty <= 0) return false
      
      // Filtro de búsqueda
      if (searchQuery.value && !name.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        return false
      }

      // Obtener info del objeto
      const itemInfo = shopItems.find(i => i.name === name)
      if (!itemInfo) return false

      // Filtro de categoría
      if (activeCategory.value === 'all') return true
      if (activeCategory.value === 'potion') return itemInfo.cat === 'pociones'
      if (activeCategory.value === 'ball') return itemInfo.cat === 'pokeballs'
      if (activeCategory.value === 'etc') return !['pociones', 'pokeballs'].includes(itemInfo.cat)
      
      return true
    })
    .map(([name, qty]) => {
      const itemInfo = shopItems.find(i => i.name === name)
      const isHealing = !!healingItems[name]
      const isStone = itemInfo?.type === 'stone'
      const isUsable = isHealing || isStone
      const canSell = itemInfo && (itemInfo.market !== false || (itemInfo.price && itemInfo.price > 0))
      
      return {
        name,
        qty,
        info: itemInfo,
        isUsable,
        isStone,
        canSell,
        tierCls: `tier-${itemInfo?.tier || 'common'}`,
        tierLabel: { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' }[itemInfo?.tier || 'common'],
        typeTag: itemInfo?.type || 'usable',
        typeLabel: { stone: 'Piedra', held: 'Equipable', usable: 'Usable' }[itemInfo?.type || 'usable'] || 'Objeto',
        typeColor: { stone: '#f5a623', held: '#7ed321', usable: '#4a90e2' }[itemInfo?.type || 'usable'] || '#666'
      }
    })
})

// Acciones
const toggleSellMode = () => {
  isSellMode.value = !isSellMode.value
  if (!isSellMode.value) sellSelection.value = {}
}

const toggleItemSelection = (item) => {
  if (!item.canSell) return
  if (sellSelection.value[item.name]) {
    delete sellSelection.value[item.name]
  } else {
    sellSelection.value[item.name] = item.qty
  }
}

const updateSellQty = (itemName, newQty, maxQty) => {
  const val = Math.max(1, Math.min(newQty, maxQty))
  sellSelection.value[itemName] = val
}

const calculateTotalGain = computed(() => {
  const shopItems = getShopItems()
  return Object.entries(sellSelection.value).reduce((total, [name, qty]) => {
    const item = shopItems.find(i => i.name === name)
    const price = item ? Math.floor(item.price * 0.4) : 0 // 40% según hint legacy
    return total + (price * qty)
  }, 0)
})

const handleUse = (item) => {
  if (item.isStone) {
    if (typeof window.openBagStoneMenu === 'function') window.openBagStoneMenu(item.name)
  } else {
    if (typeof window.openBagItemMenu === 'function') window.openBagItemMenu(item.name)
  }
}

const handleConfirmSell = () => {
  if (Object.keys(sellSelection.value).length === 0) return
  
  // Llamar a la lógica legacy para procesar la venta (si existe)
  // o implementar nuestra propia lógica si el bridge está bien configurado.
  if (typeof window.confirmBagSell === 'function') {
    // Nota: El motor legacy usa _bagSellSelected global. Necesitamos sincronizarlo.
    window._bagSellSelected = { ...sellSelection.value }
    window.confirmBagSell()
    
    // Limpiar selección tras vender
    isSellMode.value = false
    sellSelection.value = {}
  }
}

</script>

<template>
  <div class="team-section" style="min-height:50vh;">
    <!-- CABECERA -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div class="section-title" style="margin:0;">🎒 Mochila</div>
      <div style="display:flex; gap:10px;">
        <button v-show="!isSellMode" @click="toggleSellMode" id="btn-bag-sell-mode" 
          style="font-family:'Press Start 2P',monospace; font-size:8px; padding:10px 16px; background:linear-gradient(135deg, #4caf50, #388e3c); color:white; border:none; border-radius:12px; cursor:pointer; box-shadow:0 4px 12px rgba(76,175,80,0.3);">
          💰 MODO VENTA
        </button>
        <button v-show="isSellMode" @click="handleConfirmSell" id="btn-bag-confirm-sell" 
          style="font-family:'Press Start 2P',monospace; font-size:8px; padding:10px 16px; background:linear-gradient(135deg, #ff9800, #f57c00); color:white; border:none; border-radius:12px; cursor:pointer; box-shadow:0 4px 12px rgba(255,152,0,0.3);">
          ✅ VENDER SELECCIÓN (₱{{ calculateTotalGain.toLocaleString() }})
        </button>
        <button v-show="isSellMode" @click="toggleSellMode" id="btn-bag-cancel-sell" 
          style="font-family:'Press Start 2P',monospace; font-size:8px; padding:10px 16px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:12px; cursor:pointer;">
          CANCELAR
        </button>
      </div>
    </div>

    <!-- HINT VENTA -->
    <div v-show="isSellMode" id="bag-sell-hint" style="background:rgba(76,175,80,0.1); border:1px solid rgba(76,175,80,0.3); border-radius:12px; padding:12px; margin-bottom:16px; font-size:11px; color:#81c784; text-align:center;">
      Seleccioná los objetos que quieras vender. Recibirás el <strong>40% de su valor</strong>.
    </div>

    <!-- BUSCADOR -->
    <div style="margin-bottom:14px;">
      <input v-model="searchQuery" id="bag-search-input" type="text" placeholder="Buscar en la mochila..." 
        style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:#fff; font-size:13px; font-family:'Nunito',sans-serif; outline:none;">
    </div>

    <!-- PESTAÑAS -->
    <div id="bag-tabs" class="market-tab-bar" style="margin-bottom:16px;">
      <button v-for="cat in categories" :key="cat.id" 
        @click="activeCategory = cat.id"
        :class="['market-tab-btn', { active: activeCategory === cat.id }]"
        :id="`bag-tab-${cat.id}`">
        {{ cat.label }}
      </button>
    </div>

    <!-- EMPTY STATE -->
    <div v-if="filteredItems.length === 0" id="bag-empty-warning"
      style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:32px;text-align:center;font-size:12px;color:var(--gray);">
      <span class="empty-icon" style="font-size:48px;margin-bottom:12px;display:block;">🎁</span>
      No tenés ningún objeto en esta categoría.
    </div>

    <!-- GRID DE OBJETOS -->
    <div v-else id="bag-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;">
      <div v-for="item in filteredItems" :key="item.name" 
        :class="['market-card', { selected: sellSelection[item.name] }]"
        :style="[
          !item.canSell && isSellMode ? 'opacity:0.5; filter:grayscale(1); cursor:not-allowed;' : 'cursor:pointer;',
          sellSelection[item.name] ? 'border:2px solid #4caf50; background:rgba(76,175,80,0.05);' : ''
        ]"
        @click="isSellMode ? toggleItemSelection(item) : null">
        
        <span :class="['market-tier-badge', item.tierCls]">{{ item.tierLabel }}</span>
        
        <div class="market-item-icon" style="margin-bottom:8px;">
          <img v-if="item.info?.sprite" :src="item.info.sprite" width="40" height="40" style="image-rendering:pixelated;">
          <span v-else style="font-size:32px">{{ item.info?.icon || '📦' }}</span>
        </div>
        
        <div class="market-item-name" style="font-size:12px;margin-bottom:4px;">{{ item.name }}</div>
        
        <div style="margin-bottom:8px;">
          <span :style="{ 
            fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '8px',
            background: item.typeColor + '22', color: item.typeColor, border: '1px solid ' + item.typeColor + '44'
          }">
            {{ item.typeLabel }}
          </span>
        </div>
        
        <div style="font-size:10px;color:var(--gray);margin-bottom:10px;line-height:1.4;min-height:28px;">
          {{ item.info?.desc || 'Objeto de entrenador.' }}
        </div>

        <!-- MODO NORMAL: MOSTRAR CANTIDAD Y USAR -->
        <div v-if="!isSellMode" style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:11px;font-weight:700;color:var(--purple-light);">x{{ item.qty }}</span>
          <button v-if="item.isUsable" @click.stop="handleUse(item)" 
            style="padding:6px 12px;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(199,125,255,0.3);"
            :style="{ 
              background: item.isStone ? 'rgba(255,217,61,0.2)' : 'var(--purple)',
              color: item.isStone ? 'var(--yellow)' : 'white',
              border: item.isStone ? '1px solid rgba(255,217,61,0.3)' : 'none'
            }">
            USAR
          </button>
        </div>

        <!-- MODO VENTA: AJUSTAR CANTIDAD -->
        <div v-else style="margin-top:auto; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
           <template v-if="sellSelection[item.name]">
              <div @click.stop="" style="font-size:9px; color:var(--gray); margin-bottom:6px;">Cantidad a vender:</div>
              <div @click.stop="" style="display:flex; align-items:center; gap:8px; justify-content:center;">
                <button @click="updateSellQty(item.name, sellSelection[item.name] - 1, item.qty)" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:white;cursor:pointer;">-</button>
                <input type="number" :value="sellSelection[item.name]" min="1" :max="item.qty" 
                  @change="updateSellQty(item.name, $event.target.value, item.qty)"
                  style="width:40px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:white; text-align:center; font-size:11px; padding:2px;">
                <button @click="updateSellQty(item.name, sellSelection[item.name] + 1, item.qty)" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:white;cursor:pointer;">+</button>
              </div>
              <div style="font-size:10px; color:var(--yellow); margin-top:8px; font-weight:700;">
                +₱{{ (Math.floor((item.info?.price || 0) * 0.4) * sellSelection[item.name]).toLocaleString() }}
              </div>
           </template>
           <template v-else>
              <div style="font-size:10px; color:var(--gray);">Precio venta: ₱{{ Math.floor((item.info?.price || 0) * 0.4).toLocaleString() }}</div>
           </template>
        </div>
      </div>
    </div>
  </div>
</template>
