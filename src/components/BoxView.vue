<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const gs = computed(() => gameStore.state)

// ----- CONFIGURACIÓN DE TIERS (Legacy) -----
const BOX_TIER_CONFIG = {
  'S+': { min: 186, max: 186, color: '#FFD700', bg: 'rgba(255,215,0,0.18)', label: 'S+' },
  'S': { min: 168, max: 185, color: '#FFB800', bg: 'rgba(255,184,0,0.14)', label: 'S' },
  'A': { min: 140, max: 167, color: '#6BCB77', bg: 'rgba(107,203,119,0.14)', label: 'A' },
  'B': { min: 112, max: 139, color: '#3B8BFF', bg: 'rgba(59,139,255,0.14)', label: 'B' },
  'C': { min: 84, max: 111, color: '#C77DFF', bg: 'rgba(199,125,255,0.14)', label: 'C' },
  'D': { min: 56, max: 83, color: '#FF9632', bg: 'rgba(255,150,50,0.14)', label: 'D' },
  'F': { min: 0, max: 55, color: '#FF3B3B', bg: 'rgba(255,59,59,0.14)', label: 'F' },
}

const getPokemonTier = (p) => {
  const ivs = p.ivs || {}
  const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
    if (total >= cfg.min && total <= cfg.max) return { tier, total, ...cfg }
  }
  return { tier: 'F', total, ...BOX_TIER_CONFIG['F'] }
}

// ----- ESTADO REACTIVO -----
const currentBoxIndex = ref(0)
const isFiltersOpen = ref(false)
const sortMode = ref('none')

// Bridge to global selection state (Legacy <-> Vue)
const uiState = computed(() => gameStore.state.uiSelection)

const isRocketMode = computed(() => uiState.value?.teamRocketMode || uiState.value?.boxRocketMode || false)
const rocketSelection = computed(() => uiState.value?.boxRocketSelected || [])
const isReleaseMode = computed(() => uiState.value?.teamReleaseMode || uiState.value?.boxReleaseMode || false)
const releaseSelection = computed(() => uiState.value?.boxReleaseSelected || [])

const filters = ref({
  tier: 'all',
  type: 'all',
  levelMin: 1,
  levelMax: 100,
  ivHP: 0,
  ivATK: 0,
  ivDEF: 0,
  ivSPA: 0,
  ivSPD: 0,
  ivSPE: 0,
  ivAny31: false,
  ivTotalMin: 0,
  ivTotalMax: 186,
  search: ''
})

// ----- COMPUTED PROPERTIES -----
const hasActiveFilters = computed(() => {
  const f = filters.value
  return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < 100 ||
         f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 || f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0 ||
         f.ivAny31 || f.ivTotalMin > 0 || f.ivTotalMax < 186 || f.search !== ''
})

const maxCapacity = computed(() => (gs.value.boxCount || 4) * 50)

// Lista procesada de Pokémon
const processedBoxList = computed(() => {
  const box = gs.value.box || []
  let list = box.map((p, index) => ({ p, index }))

  // Aplicar filtros
  if (hasActiveFilters.value) {
    const f = filters.value
    list = list.filter(({ p }) => {
      // Búsqueda (manejar IDs numéricos)
      const searchStr = f.search.toLowerCase()
      const matchesId = String(p.id).toLowerCase().includes(searchStr)
      const matchesName = p.name && p.name.toLowerCase().includes(searchStr)
      if (f.search && !matchesId && !matchesName) return false
      
      // Tier
      if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false
      
      // Tipo
      if (f.type !== 'all' && p.type !== f.type && p.type2 !== f.type) return false
      
      // Nivel
      if (p.level < f.levelMin || p.level > f.levelMax) return false
      
      // IVs Individuales
      const ivs = p.ivs || {}
      if ((ivs.hp || 0) < f.ivHP) return false
      if ((ivs.atk || 0) < f.ivATK) return false
      if ((ivs.def || 0) < f.ivDEF) return false
      if ((ivs.spa || 0) < f.ivSPA) return false
      if ((ivs.spd || 0) < f.ivSPD) return false
      if ((ivs.spe || 0) < f.ivSPE) return false
      
      // IV Total
      const tierInfo = getPokemonTier(p)
      if (tierInfo.total < f.ivTotalMin || tierInfo.total > f.ivTotalMax) return false
      
      // IV 31
      if (f.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false

      return true
    })
  }

  // Aplicar ordenamiento
  if (sortMode.value !== 'none') {
    list.sort((a, b) => {
      if (sortMode.value === 'level') return b.p.level - a.p.level
      if (sortMode.value === 'tier') return getPokemonTier(b.p).total - getPokemonTier(a.p).total
      if (sortMode.value === 'type') return (a.p.type || '').localeCompare(b.p.type || '')
      return 0
    })
  }

  return list
})

const displayList = computed(() => {
  // Si hay filtros o sort, mostramos todo el resultado (con scroll limitado o paginación interna si fuera necesario)
  // Pero para paridad, si no hay filtros, paginamos por caja física (asumiendo que los Pokémon están ordenados por su posición en state.box)
  if (hasActiveFilters.value || sortMode.value !== 'none') {
    return processedBoxList.value
  } else {
    // IMPORTANTE: El motor legacy asume que la caja i contiene los Pokémon en el rango [(i-1)*50, i*50)
    const start = currentBoxIndex.value * 50
    const end = start + 50
    // Filtramos manualmente por el rango de indices originales para asegurar que vemos lo correcto en cada caja
    return processedBoxList.value.filter(item => item.index >= start && item.index < end)
  }
})

// ----- ACCIONES -----
const switchBox = (i) => {
  currentBoxIndex.value = i
  if (uiState.value) {
    uiState.value.boxRocketMode = false
    uiState.value.boxRocketSelected = []
  }
}

const toggleRocketMode = () => {
  if (typeof window.toggleBoxRocketMode === 'function') {
    window.toggleBoxRocketMode()
  }
}

const togglePokemonSelection = (index) => {
  if (typeof window.toggleBoxRocketSelect === 'function') {
    window.toggleBoxRocketSelect(index)
  }
}

const getBoxBuyCost = () => {
  const count = gs.value.boxCount || 4
  if (count < 4) return 500000
  if (count === 4) return 500000
  if (count === 5) return 1000000
  return 1000000 * Math.pow(2, count - 5)
}

const buyNewBox = () => {
  const cost = getBoxBuyCost()
  const maxBoxes = 10
  if (gs.value.boxCount >= maxBoxes) return
  
  if (window.confirm(`¿Querés gastar ₱${cost.toLocaleString()} para comprar la Caja ${(gs.value.boxCount || 4) + 1}?`)) {
    if (typeof window.buyNewBox === 'function') {
      window.buyNewBox() // Delegar al motor legacy para consistencia de dinero
    }
  }
}

const resetFilters = () => {
  filters.value = {
    tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
    ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
    ivAny31: false, ivTotalMin: 0, ivTotalMax: 186,
    search: ''
  }
  sortMode.value = 'none'
}

const handleConfirmRocketSell = () => {
  if (rocketSelection.value.length === 0) return
  if (typeof window.confirmBoxRocketSell === 'function') {
    window.confirmBoxRocketSell()
  }
}

const handlePokemonClick = (index) => {
  if (isRocketMode.value) {
    togglePokemonSelection(index)
  } else {
    if (typeof window.openBoxPokemonMenu === 'function') {
      window.openBoxPokemonMenu(index)
    }
  }
}

const getSpriteUrl = (id, isShiny) => {
  const normId = String(id).toLowerCase()
  if (typeof window.getSpriteUrl === 'function') return window.getSpriteUrl(normId, isShiny)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

</script>

<template>
  <div class="team-section">
    <!-- CABECERA -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:8px;">
      <div
        class="section-title"
        style="margin:0;"
      >
        📦 PC de Almacenamiento
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <!-- Botones Rocket -->
        <button
          v-if="gs.playerClass === 'rocket' && !isRocketMode"
          id="btn-box-rocket-mode"
          style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                 border-radius:10px;border:1px solid rgba(239,68,68,0.4);
                 background:rgba(239,68,68,0.1);color:#ef4444;cursor:pointer;transition:all .2s;"
          @click="toggleRocketMode"
        >
          🚀 VENTA MASIVA
        </button>
        <template v-if="isRocketMode">
          <button
            id="btn-box-confirm-rocket"
            style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                   border-radius:10px;border:none;
                   background:linear-gradient(135deg,#ef4444,#991b1b);color:#fff;cursor:pointer;box-shadow:0 0 15px rgba(239,68,68,0.4);"
            @click="handleConfirmRocketSell"
          >
            ✓ VENDER SELECCIÓN
          </button>
          <button
            id="btn-box-cancel-rocket"
            style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                   border-radius:10px;border:1px solid rgba(255,255,255,0.1);
                   background:transparent;color:var(--gray);cursor:pointer;"
            @click="toggleRocketMode"
          >
            ✕ CANCELAR
          </button>
        </template>
      </div>
    </div>

    <!-- CONTADOR Y PESTAÑAS -->
    <div
      id="box-count-badge"
      style="font-size:11px;color:var(--gray);margin-bottom:8px;"
    >
      {{ gs.box?.length || 0 }}/{{ maxCapacity }} Pokémon
    </div>

    <div
      id="box-tabs-container"
      style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; align-items:center;"
    >
      <button
        v-for="i in (gs.boxCount || 4)"
        :key="i"
        :style="{
          padding: '8px 12px', borderRadius: '10px',
          border: currentBoxIndex === (i-1) ? '1px solid var(--purple)' : '1px solid rgba(255,255,255,0.1)',
          background: currentBoxIndex === (i-1) ? 'rgba(199,125,255,0.2)' : 'rgba(255,255,255,0.05)',
          color: currentBoxIndex === (i-1) ? 'var(--purple-light)' : 'var(--gray)',
          fontFamily: '\'Press Start 2P\', monospace', fontSize: '7px', cursor: 'pointer', transition: 'all 0.2s'
        }"
        @click="switchBox(i-1)"
      >
        CAJA {{ i }}
      </button>
      <button
        v-if="(gs.boxCount || 4) < 10"
        :title="'Comprar nueva caja (₱' + getBoxBuyCost().toLocaleString() + ')'"
        style="width:30px; height:30px; border-radius:50%; border:1px solid var(--green); background:rgba(107,203,119,0.1); color:var(--green); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; margin-left:4px;"
        @click="buyNewBox"
      >
        +
      </button>
    </div>

    <!-- HINTS -->
    <div
      v-if="isRocketMode"
      id="box-rocket-hint"
      style="font-size:11px;color:#ef4444;margin-bottom:12px;
       background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
       border-radius:10px;padding:10px 14px;"
    >
      ⚠️ Seleccioná los Pokémon que querés vender al Mercado Negro (₱ + Crimen).
    </div>
    <div
      v-else
      id="box-normal-hint"
      style="font-size:12px;color:var(--gray);margin-bottom:12px;"
    >
      Tocá un Pokémon para intercambiarlo con uno de tu equipo activo.
    </div>

    <!-- FILTROS -->
    <div
      id="box-filter-panel"
      style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:14px;margin-bottom:14px;"
    >
      <div
        style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;"
        @click="isFiltersOpen = !isFiltersOpen"
      >
        <span style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);">🔍 FILTROS</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span
            v-if="hasActiveFilters"
            style="font-size:10px;color:var(--yellow);"
          >{{ processedBoxList.length }} resultados</span>
          <span
            :style="{ transform: isFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }"
            style="color:var(--gray);font-size:14px;transition:transform .2s;"
          >▼</span>
        </div>
      </div>

      <!-- Buscador -->
      <div style="margin-top:12px;">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Buscar por nombre..." 
          style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:#fff; font-size:13px; font-family:'Nunito',sans-serif; outline:none;"
        >
      </div>

      <!-- Cuerpo de Filtros -->
      <div
        v-show="isFiltersOpen"
        style="margin-top:14px;"
      >
        <!-- Ordenar -->
        <div style="margin-bottom:15px;">
          <div style="font-size:10px;color:var(--gray);margin-bottom:8px;font-weight:700;">
            Ordenar por
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button
              :class="['box-filter-btn', { 'box-filter-active': sortMode === 'none' }]"
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.1);color:#eee;"
              @click="sortMode = 'none'"
            >
              Captura
            </button>
            <button
              :class="['box-filter-btn', { 'box-filter-active': sortMode === 'level' }]"
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(59,139,255,0.4);background:rgba(59,139,255,0.12);color:var(--blue);"
              @click="sortMode = 'level'"
            >
              Nivel
            </button>
            <button
              :class="['box-filter-btn', { 'box-filter-active': sortMode === 'tier' }]"
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(255,215,0,0.4);background:rgba(255,215,0,0.12);color:#FFD700;"
              @click="sortMode = 'tier'"
            >
              Tier
            </button>
            <button
              :class="['box-filter-btn', { 'box-filter-active': sortMode === 'type' }]"
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(107,203,119,0.4);background:rgba(107,203,119,0.12);color:var(--green);"
              @click="sortMode = 'type'"
            >
              Tipo
            </button>
            <button
              :class="['box-filter-btn', { 'box-filter-active': sortMode === 'pokedex' }]"
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(199,125,255,0.4);background:rgba(199,125,255,0.12);color:var(--purple);"
              @click="sortMode = 'pokedex'"
            >
              Pokédex
            </button>
          </div>
        </div>

        <!-- Tiers -->
        <div style="margin-bottom:15px;">
          <div style="font-size:10px;color:var(--gray);margin-bottom:8px;font-weight:700;">
            Filtrar por Tier
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button
              :class="['box-filter-btn', { 'box-filter-active': filters.tier === 'all' }]" 
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.1);color:#eee;"
              @click="filters.tier = 'all'"
            >
              Todos
            </button>
            <button
              v-for="t in [['S+', '#FFD700', 'rgba(255,215,0,0.12)', 'rgba(255,215,0,0.4)'], ['S', '#FFB800', 'rgba(255,180,0,0.12)', 'rgba(255,180,0,0.4)'], ['A', 'var(--green)', 'rgba(107,203,119,0.12)', 'rgba(107,203,119,0.4)'], ['B', 'var(--blue)', 'rgba(59,139,255,0.12)', 'rgba(59,139,255,0.4)'], ['C', 'var(--purple)', 'rgba(199,125,255,0.12)', 'rgba(199,125,255,0.4)'], ['D', '#FF9632', 'rgba(255,150,50,0.12)', 'rgba(255,150,50,0.4)'], ['F', 'var(--red)', 'rgba(255,59,59,0.12)', 'rgba(255,59,59,0.4)']]" 
              :key="t[0]"
              :class="['box-filter-btn', { 'box-filter-active': filters.tier === t[0] }]"
              :style="{ 
                color: t[1],
                background: t[2],
                borderColor: t[3],
                fontFamily: '\'Press Start 2P\', monospace',
                fontSize: '7px',
                padding: '5px 10px',
                borderRadius: '20px'
              }"
              @click="filters.tier = t[0]"
            >
              {{ t[0] }}
            </button>
          </div>
        </div>

        <!-- Tipos -->
        <div style="margin-bottom:15px;">
          <div style="font-size:10px;color:var(--gray);margin-bottom:8px;font-weight:700;">
            Tipo
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button
              :class="['box-filter-btn', { 'box-filter-active': filters.type === 'all' }]"
              style="font-family:'Press Start 2P',monospace;font-size:7px;padding:5px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.1);color:#eee;"
              @click="filters.type = 'all'"
            >
              Todos
            </button>
            <button
              v-for="typeObj in [
                { id: 'fire', icon: '🔥', label: 'Fuego', color: 'var(--red)', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.35)' },
                { id: 'water', icon: '💧', label: 'Agua', color: 'var(--blue)', bg: 'rgba(59,139,255,0.1)', border: 'rgba(59,139,255,0.35)' },
                { id: 'grass', icon: '🌿', label: 'Planta', color: 'var(--green)', bg: 'rgba(107,203,119,0.1)', border: 'rgba(107,203,119,0.35)' },
                { id: 'electric', icon: '⚡', label: 'Eléctrico', color: 'var(--yellow)', bg: 'rgba(255,217,61,0.1)', border: 'rgba(255,217,61,0.35)' },
                { id: 'psychic', icon: '🔮', label: 'Psíquico', color: 'var(--purple)', bg: 'rgba(199,125,255,0.1)', border: 'rgba(199,125,255,0.35)' },
                { id: 'normal', icon: '⬜', label: 'Normal', color: '#bbb', bg: 'rgba(200,200,200,0.07)', border: 'rgba(200,200,200,0.25)' },
                { id: 'rock', icon: '🪨', label: 'Roca', color: '#c8a060', bg: 'rgba(200,160,96,0.1)', border: 'rgba(200,160,96,0.35)' },
                { id: 'ground', icon: '🏜️', label: 'Tierra', color: '#c8a060', bg: 'rgba(200,160,96,0.1)', border: 'rgba(200,160,96,0.35)' },
                { id: 'poison', icon: '☠️', label: 'Veneno', color: 'var(--purple)', bg: 'rgba(199,125,255,0.1)', border: 'rgba(199,125,255,0.35)' },
                { id: 'bug', icon: '🐛', label: 'Bicho', color: '#8BC34A', bg: 'rgba(139,195,74,0.1)', border: 'rgba(139,195,74,0.35)' },
                { id: 'flying', icon: '🪶', label: 'Volador', color: '#89CFF0', bg: 'rgba(137,207,240,0.1)', border: 'rgba(137,207,240,0.35)' },
                { id: 'ghost', icon: '👻', label: 'Fantasma', color: '#9B59B6', bg: 'rgba(123,47,190,0.1)', border: 'rgba(123,47,190,0.35)' },
                { id: 'ice', icon: '❄️', label: 'Hielo', color: '#7DF9FF', bg: 'rgba(125,249,255,0.1)', border: 'rgba(125,249,255,0.35)' },
                { id: 'dragon', icon: '🐉', label: 'Dragón', color: '#8060FF', bg: 'rgba(92,22,197,0.1)', border: 'rgba(92,22,197,0.35)' },
                { id: 'fighting', icon: '🥊', label: 'Lucha', color: 'var(--red)', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.35)' },
                { id: 'dark', icon: '🌑', label: 'Siniestro', color: '#888', bg: 'rgba(100,100,100,0.1)', border: 'rgba(100,100,100,0.35)' },
                { id: 'steel', icon: '⚙️', label: 'Acero', color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)', border: 'rgba(158,158,158,0.35)' }
              ]"
              :key="typeObj.id"
              :class="['box-filter-btn', { 'box-filter-active': filters.type === typeObj.id }]"
              :style="{ color: typeObj.color, background: typeObj.bg, borderColor: typeObj.border, fontFamily: '\'Press Start 2P\', monospace', fontSize: '7px', padding: '5px 10px', borderRadius: '20px' }"
              @click="filters.type = typeObj.id"
            >
              {{ typeObj.icon }} {{ typeObj.label }}
            </button>
          </div>
        </div>

        <!-- Row 3: Totales + Especial -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;color:var(--gray);margin-bottom:6px;font-weight:700;">
              IV Totales (Rango)
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <input
                v-model.number="filters.ivTotalMin"
                type="range"
                min="0"
                max="186" 
                :style="{ 
                  flex: 1, 
                  accentColor: 'var(--yellow)',
                  background: `linear-gradient(90deg, var(--yellow) ${ (filters.ivTotalMin / 186) * 100 }%, rgba(255,255,255,0.1) ${ (filters.ivTotalMin / 186) * 100 }%)`
                }"
              >
              <span style="font-size:11px;color:var(--yellow);width:26px;text-align:right;font-weight:700;">{{ filters.ivTotalMin }}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
              <input
                v-model.number="filters.ivTotalMax"
                type="range"
                min="0"
                max="186" 
                :style="{ 
                  flex: 1, 
                  accentColor: 'var(--yellow)',
                  background: `linear-gradient(90deg, var(--yellow) ${ (filters.ivTotalMax / 186) * 100 }%, rgba(255,255,255,0.1) ${ (filters.ivTotalMax / 186) * 100 }%)`
                }"
              >
              <span style="font-size:11px;color:var(--yellow);width:26px;text-align:right;font-weight:700;">{{ filters.ivTotalMax }}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:10px;color:var(--gray);margin-bottom:6px;font-weight:700;">
              IV Especial
            </div>
            <button
              class="box-filter-btn" 
              :class="{ 'box-filter-active': filters.ivAny31 }"
              :style="{ 
                width: '100%', padding: '10px', borderRadius: '12px',
                fontSize: '7px', fontFamily: '\'Press Start 2P\', monospace', cursor: 'pointer',
                border: filters.ivAny31 ? '1px solid var(--yellow)' : '1px solid rgba(255,255,255,0.15)',
                background: filters.ivAny31 ? 'rgba(255,184,0,0.12)' : 'rgba(255,255,255,0.1)',
                color: filters.ivAny31 ? 'var(--yellow)' : '#eee'
              }"
              @click="filters.ivAny31 = !filters.ivAny31"
            >
              {{ filters.ivAny31 ? '[★] IV 31 DETECTADO' : 'Cualquier IV en 31' }}
            </button>
          </div>
        </div>

        <!-- Row 4: Niveles -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;color:var(--gray);margin-bottom:6px;font-weight:700;">
              Nivel mínimo
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <input
                v-model.number="filters.levelMin"
                type="range"
                min="1"
                max="100" 
                :style="{ 
                  flex: 1, 
                  accentColor: '#ffffff',
                  background: `linear-gradient(90deg, #ffffff ${ ((filters.levelMin - 1) / 99) * 100 }%, rgba(255,255,255,0.1) ${ ((filters.levelMin - 1) / 99) * 100 }%)`
                }"
              >
              <span style="font-size:11px;color:var(--yellow);width:26px;text-align:right;font-weight:700;">{{ filters.levelMin }}</span>
            </div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--gray);margin-bottom:6px;font-weight:700;">
              Nivel máximo
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <input
                v-model.number="filters.levelMax"
                type="range"
                min="1"
                max="100" 
                :style="{ 
                  flex: 1, 
                  accentColor: 'var(--purple)',
                  background: `linear-gradient(90deg, var(--purple) ${ ((filters.levelMax - 1) / 99) * 100 }%, rgba(255,255,255,0.1) ${ ((filters.levelMax - 1) / 99) * 100 }%)`
                }"
              >
              <span style="font-size:11px;color:var(--yellow);width:26px;text-align:right;font-weight:700;">{{ filters.levelMax }}</span>
            </div>
          </div>
        </div>

        <!-- Row 5: IVs individuales -->
        <div style="margin-top:12px;">
          <div style="font-size:10px;color:var(--gray);margin-bottom:6px;font-weight:700;">
            IV específico (stat mínimo)
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <div
              v-for="stat in [
                { id: 'HP', label: 'HP', color: '#6BCB77' },
                { id: 'ATK', label: 'Ataque', color: '#FF6B35' },
                { id: 'DEF', label: 'Defensa', color: '#3B8BFF' },
                { id: 'SPA', label: 'At.Esp', color: '#C77DFF' },
                { id: 'SPD', label: 'Def.Esp', color: '#89CFF0' },
                { id: 'SPE', label: 'Velocidad', color: '#FFD93D' }
              ]"
              :key="stat.id"
            >
              <div style="font-size:9px;color:#888;margin-bottom:3px;">
                {{ stat.label }}
              </div>
              <div style="display:flex;align-items:center;gap:4px;">
                <input
                  v-model.number="filters['iv' + stat.id]"
                  type="range"
                  min="0"
                  max="31" 
                  :style="{ 
                    flex: 1, 
                    accentColor: stat.color,
                    background: `linear-gradient(90deg, ${stat.color} ${ (filters['iv' + stat.id] / 31) * 100 }%, rgba(255,255,255,0.1) ${ (filters['iv' + stat.id] / 31) * 100 }%)`
                  }"
                >
                <span :style="{ fontSize: '10px', color: stat.color, width: '20px', textAlign: 'right' }">{{ filters['iv' + stat.id] }}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          style="width:100%; margin-top:12px; padding:10px; border-radius:12px; border:none; cursor:pointer; background:rgba(255,255,255,0.05); color:var(--gray); font-size:11px; transition:all 0.2s;" 
          @click="resetFilters"
        >
          ↺ Limpiar filtros
        </button>
      </div>
    </div>

    <!-- GRID -->
    <div
      v-if="gs.box?.length === 0"
      class="empty-state"
    >
      <span class="empty-icon">📦</span>La PC está vacía.
    </div>
    <div
      v-else-if="displayList.length === 0"
      class="empty-state"
    >
      <span class="empty-icon">🔍</span>Ningún Pokémon coincide.
    </div>
    <div
      v-else
      id="box-grid"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px;"
    >
      <div
        v-for="item in displayList"
        :key="item.index" 
        :class="['box-pokemon-card', { selected: rocketSelection.includes(item.index) }]"
        :style="{ 
          border: rocketSelection.includes(item.index) ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
          background: rocketSelection.includes(item.index) ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
          padding: '8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', position: 'relative'
        }"
        @click="handlePokemonClick(item.index)"
      >
        <!-- Badge Tier -->
        <div
          :style="{ color: getPokemonTier(item.p).color, background: getPokemonTier(item.p).bg }" 
          style="position:absolute;top:4px;right:4px;font-size:8px;padding:2px 4px;border-radius:4px;font-weight:bold;"
        >
          {{ getPokemonTier(item.p).tier }}
        </div>

        <img
          :src="getSpriteUrl(item.p.id, item.p.isShiny)"
          :class="{ 'shiny-anim': item.p.isShiny }" 
          style="width:50px;height:50px;image-rendering:pixelated;margin-bottom:4px;"
        >
        
        <div style="font-size:10px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          {{ item.p.name || item.p.id }}
        </div>
        
        <div style="font-size:9px;color:var(--gray);">
          Nv. {{ item.p.level }}
        </div>
        
        <!-- Barra HP mini -->
        <div style="height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:4px;overflow:hidden;">
          <div
            :style="{ width: (item.p.hp / item.p.maxHp * 100) + '%', background: (item.p.hp / item.p.maxHp > 0.5) ? 'var(--green)' : 'var(--red)' }"
            style="height:100%;"
          />
        </div>

        <!-- Indicador Rocket Selection -->
        <div
          v-if="isRocketMode"
          style="position:absolute;bottom:4px;right:4px;"
        >
          <span
            v-if="rocketSelection.includes(item.index)"
            style="color:#ef4444;font-size:12px;"
          >🚀</span>
          <div
            v-else
            style="width:12px;height:12px;border:1px solid rgba(255,255,255,0.2);border-radius:50%;"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.box-filter-btn {
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.1);
  color: #eee;
  transition: all 0.2s;
}
.box-filter-active {
  border-color: var(--purple-light) !important;
  background: rgba(199,125,255,0.2) !important;
  color: #fff !important;
}
.box-pokemon-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.box-pokemon-card:hover {
  background: rgba(255,255,255,0.05) !important;
  transform: translateY(-3px);
  border-color: rgba(199,125,255,0.3) !important;
}
.box-pokemon-card.selected {
  border: 2px solid #ef4444 !important;
  background: rgba(239,68,68,0.1) !important;
  box-shadow: 0 0 15px rgba(239,68,68,0.2);
}
.empty-state {
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--gray);
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
  border: 1px dashed rgba(255,255,255,0.05);
}
.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Animación de fade */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  height: 4px;
  border-radius: 5px;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0,0,0,0.3);
}
</style>
