<script setup>
import { ref, computed } from 'vue'
import { getSpriteUrl } from '@/data/spriteMapping'

const props = defineProps({
  show: Boolean,
  side: String, // 'offer' or 'request'
  title: String,
  pokemonList: {
    type: Array,
    default: () => []
  },
  lockedUids: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['close', 'select'])

const filters = ref({
  search: '',
  fav: false,
  breed: false,
  iv31: false,
  location: 'all' // 'all', 'team', 'box'
})

const filteredList = computed(() => {
  return props.pokemonList.filter(p => {
    // Name/ID filter
    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
    }
    
    // Tag filters
    const tags = p.tags || []
    if (filters.value.fav && !tags.includes('fav')) return false
    if (filters.value.breed && !tags.includes('breed')) return false
    if (filters.value.iv31 && !tags.includes('iv31')) return false
    
    // Location filter
    if (filters.value.location === 'team' && p._source !== 'team') return false
    if (filters.value.location === 'box' && p._source !== 'box') return false
    
    return true
  })
})

const getIVTotal = (ivs) => {
  return Object.values(ivs || {}).reduce((s, v) => s + (v || 0), 0)
}

const getIVColor = (val) => {
  if (val >= 28) return '#4ade80'
  if (val >= 15) return '#fbbf24'
  return '#f87171'
}

const select = (poke) => {
  if (props.lockedUids.has(poke.uid)) return
  emit('select', poke)
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="selector-overlay"
      @click.self="$emit('close')"
    >
      <div
        class="selector-card animate-slide-up"
        :class="side"
      >
        <header class="card-header">
          <div class="title">
            {{ title }}
          </div>
          <button
            class="close-btn"
            @click="$emit('close')"
          >
            ✕
          </button>
        </header>

        <!-- FILTERS -->
        <div class="filters-section">
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Buscar por nombre o ID..." 
            class="search-input"
          >
          
          <div class="tag-filters">
            <button 
              class="filter-btn fav" 
              :class="{ active: filters.fav }"
              @click="filters.fav = !filters.fav"
            >
              ⭐ Fav
            </button>
            <button 
              class="filter-btn breed" 
              :class="{ active: filters.breed }"
              @click="filters.breed = !filters.breed"
            >
              ❤️ Crianza
            </button>
            <button 
              class="filter-btn iv31" 
              :class="{ active: filters.iv31 }"
              @click="filters.iv31 = !filters.iv31"
            >
              🧬 IV 31
            </button>
          </div>

          <div class="location-filters">
            <label>
              <input
                v-model="filters.location"
                type="radio"
                value="all"
              >
              <span>Todo</span>
            </label>
            <label>
              <input
                v-model="filters.location"
                type="radio"
                value="team"
              >
              <span>Equipo</span>
            </label>
            <label>
              <input
                v-model="filters.location"
                type="radio"
                value="box"
              >
              <span>PC</span>
            </label>
          </div>
        </div>

        <!-- LIST -->
        <div class="pokemon-list scrollbar">
          <div 
            v-for="poke in filteredList" 
            :key="poke.uid"
            class="poke-row"
            :class="{ locked: lockedUids.has(poke.uid) }"
            @click="select(poke)"
          >
            <div class="poke-main">
              <div class="sprite-wrapper">
                <img
                  :src="getSpriteUrl(poke.id, poke.isShiny)"
                  :class="{ shiny: poke.isShiny }"
                >
                <span
                  v-if="poke.isShiny"
                  class="shiny-star"
                >✨</span>
              </div>
              
              <div class="poke-info">
                <div class="name-row">
                  <span class="name">{{ poke.name || poke.id }}</span>
                  <span
                    class="source-badge"
                    :class="poke._source"
                  >{{ poke._source === 'team' ? 'Equipo' : 'PC' }}</span>
                </div>
                <div class="meta">
                  Nv. {{ poke.level }} · {{ poke.nature }}
                </div>
                
                <div class="tags">
                  <span
                    v-if="poke.tags?.includes('fav')"
                    class="tag fav"
                  >⭐</span>
                  <span
                    v-if="poke.tags?.includes('breed')"
                    class="tag breed"
                  >❤️</span>
                  <span
                    v-if="poke.tags?.includes('iv31')"
                    class="tag iv"
                  >🧬</span>
                </div>
              </div>
            </div>

            <div class="poke-stats">
              <div class="iv-grid">
                <div
                  v-for="(val, stat) in poke.ivs"
                  :key="stat"
                  class="iv-bar-wrap"
                >
                  <div
                    class="iv-fill"
                    :style="{ width: (val/31*100) + '%', background: getIVColor(val) }"
                  />
                </div>
              </div>
              <div class="iv-total">
                IV: {{ getIVTotal(poke.ivs) }}/186
              </div>
            </div>

            <button
              class="select-row-btn"
              :disabled="lockedUids.has(poke.uid)"
            >
              {{ lockedUids.has(poke.uid) ? 'BLOQUEADO' : 'SELECCIONAR' }}
            </button>
          </div>

          <div
            v-if="filteredList.length === 0"
            class="empty-list"
          >
            No se encontraron Pokémon con estos filtros.
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 11000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(8px);
}

.selector-card {
  width: min(500px, 100%);
  background: #0f172a;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);

  &.offer { border-color: rgba(168, 85, 247, 0.3); }
  &.request { border-color: rgba(251, 191, 36, 0.3); }
}

.card-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  
  .title {
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    color: var(--yellow, #facc15);
  }

  .close-btn {
    background: none; border: none; color: #666; font-size: 20px; cursor: pointer;
    &:hover { color: white; }
  }
}

.filters-section {
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 12px;
    color: white;
    font-size: 14px;
    outline: none;
    &:focus { border-color: var(--yellow); }
  }

  .tag-filters {
    display: flex;
    gap: 8px;

    .filter-btn {
      flex: 1;
      padding: 8px;
      font-size: 10px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
      color: #888;
      cursor: pointer;
      transition: all 0.2s;

      &.active {
        &.fav { border-color: #fbbf24; background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
        &.breed { border-color: #f87171; background: rgba(248, 113, 113, 0.1); color: #f87171; }
        &.iv31 { border-color: #4ade80; background: rgba(74, 222, 128, 0.1); color: #4ade80; }
      }
    }
  }

  .location-filters {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: #666;

    label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      &:hover { color: white; }
    }
    input { cursor: pointer; }
  }
}

.pokemon-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poke-row {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover:not(.locked) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  &.locked {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(1);
  }
}

.poke-main {
  display: flex;
  gap: 16px;
  align-items: center;

  .sprite-wrapper {
    width: 48px;
    height: 48px;
    position: relative;
    
    img {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      &.shiny { filter: drop-shadow(0 0 5px rgba(255, 255, 0, 0.5)); }
    }

    .shiny-star {
      position: absolute;
      top: -4px;
      right: -4px;
      font-size: 12px;
    }
  }

  .poke-info {
    flex: 1;
    .name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
      
      .name { font-weight: 800; font-size: 14px; }
      .source-badge {
        font-size: 8px;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        &.team { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        &.box { background: rgba(255, 255, 255, 0.05); color: #888; }
      }
    }
    .meta { font-size: 11px; color: #666; }
    .tags { display: flex; gap: 4px; margin-top: 4px; }
  }
}

.poke-stats {
  .iv-grid {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;

    .iv-bar-wrap {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
      overflow: hidden;
      .iv-fill { height: 100%; transition: width 0.3s; }
    }
  }
  .iv-total { font-size: 10px; color: #555; font-weight: 800; }
}

.select-row-btn {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  border: none;
  background: var(--yellow, #facc15);
  color: #000;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  font-weight: 900;
  cursor: pointer;
  
  &:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
  }
}

.empty-list {
  text-align: center;
  padding: 40px 20px;
  color: #555;
  font-size: 14px;
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slideUp 0.3s ease-out; }

.scrollbar::-webkit-scrollbar { width: 4px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
</style>
