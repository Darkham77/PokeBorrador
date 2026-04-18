<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/logic/pokedexConstants'
import { usePokedex } from '@/composables/usePokedex'
import PokedexDetailModal from '@/components/pokedex/PokedexDetailModal.vue'

const gameStore = useGameStore()
const gs = computed(() => gameStore.state)

const currentGen = ref(1)
const selectedSpeciesId = ref(null)
const isModalOpen = ref(false)

const currentOrder = computed(() => currentGen.value === 1 ? PDEX_ORDER : GEN2_PDEX_ORDER)

const { searchQuery, sortBy, pokemonList } = usePokedex(gs, currentOrder, currentGen)

const stats = computed(() => {
  const caught = gs.value.pokedex || []
  const seen = gs.value.seenPokedex || []
  
  const currentGenTotal = currentOrder.value.length
  const currentGenSeen = currentOrder.value.filter(id => seen.includes(id) || caught.includes(id)).length
  const currentGenCaught = currentOrder.value.filter(id => caught.includes(id)).length

  return {
    seen: currentGenSeen,
    caught: currentGenCaught,
    total: currentGenTotal
  }
})

const openDetail = (p) => {
  if (!p.isSeen) return
  selectedSpeciesId.value = p.id
  isModalOpen.value = true
}
</script>

<template>
  <div class="pokedex-view custom-scrollbar">
    <!-- HEADER STATS -->
    <header class="pokedex-header glass-morphism">
      <div class="header-content">
        <div class="title-group">
          <h1>POKÉDEX NACIONAL</h1>
          <p class="subtitle">
            REGIÓN DE KANTO & JOHTO
          </p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">VISTOS</span>
            <span class="stat-value">{{ stats.seen }}</span>
          </div>
          <div class="stat-card highlight">
            <span class="stat-label">CAPTURADOS</span>
            <span class="stat-value">{{ stats.caught }} <small>/ {{ stats.total }}</small></span>
          </div>
        </div>
      </div>
    </header>

    <!-- CONTROLS -->
    <div class="pokedex-controls glass-morphism">
      <nav class="gen-tabs">
        <button 
          v-for="gen in [1, 2]"
          :key="gen"
          class="tab-btn" 
          :class="{ active: currentGen === gen }"
          @click="currentGen = gen"
        >
          GEN {{ gen }}
        </button>
      </nav>
      
      <div class="controls-right">
        <div class="sort-group">
          <span class="sort-label">ORDEN:</span>
          <button 
            class="sort-btn" 
            :class="{ active: sortBy === 'number' }"
            @click="sortBy = 'number'"
          >
            #
          </button>
          <button 
            class="sort-btn" 
            :class="{ active: sortBy === 'name' }"
            @click="sortBy = 'name'"
          >
            A-Z
          </button>
        </div>

        <div class="search-wrapper">
          <i class="search-icon">🔍</i>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar..."
            class="search-input"
          >
        </div>
      </div>
    </div>

    <!-- GRID -->
    <div class="pokedex-grid">
      <div 
        v-for="p in pokemonList" 
        :key="p.id" 
        class="pokemon-card"
        :class="{ 
          'is-caught': p.isCaught, 
          'is-unseen': !p.isSeen,
          'has-sprite': p.isSeen 
        }"
        @click="openDetail(p)"
      >
        <div class="card-bg" />
        <div class="dex-number">
          #{{ p.dexNum }}
        </div>
        
        <div class="sprite-container">
          <template v-if="p.isSeen">
            <img 
              :src="p.spriteUrl" 
              :alt="p.name"
              class="pokemon-sprite"
              :class="{ 'silhouette': !p.isCaught }"
            >
          </template>
          <div
            v-else
            class="unknown-placeholder"
          >
            ?
          </div>
        </div>

        <div class="card-footer">
          <span class="pokemon-name">{{ p.name }}</span>
          <div
            v-if="p.isCaught"
            class="caught-badge"
            title="Capturado"
          >
            <span class="star">★</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <PokedexDetailModal 
      v-if="selectedSpeciesId"
      :species-id="selectedSpeciesId"
      :is-open="isModalOpen"
      @close="isModalOpen = false"
    />
  </div>
</template>

<style lang="scss" scoped>
.pokedex-view {
  height: 100%;
  padding: 32px;
  background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.pokedex-header {
  padding: 40px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 32px;
  }

  .title-group {
    h1 {
      font-family: 'Press Start 2P', monospace;
      font-size: 24px;
      color: #fff;
      margin: 0 0 12px 0;
      background: linear-gradient(to bottom, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 10px 20px rgba(0,0,0,0.3);
    }
    .subtitle {
      color: #64748b;
      font-size: 13px;
      letter-spacing: 4px;
      margin: 0;
      text-transform: uppercase;
      font-weight: 700;
    }
  }
}

.stats-grid {
  display: flex;
  gap: 20px;

  .stat-card {
    background: rgba(255, 255, 255, 0.02);
    padding: 20px 32px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 140px;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateY(-2px);
    }

    .stat-label {
      font-size: 9px;
      color: #475569;
      margin-bottom: 8px;
      font-family: 'Press Start 2P', monospace;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: #f8fafc;
      font-family: 'Press Start 2P', monospace;
      
      small { font-size: 12px; color: #475569; margin-left: 4px; }
    }

    &.highlight {
      background: rgba(234, 179, 8, 0.03);
      border-color: rgba(234, 179, 8, 0.15);
      .stat-value { color: #facc15; text-shadow: 0 0 15px rgba(234, 179, 8, 0.3); }
    }
  }
}

.pokedex-controls {
  padding: 20px;
  border-radius: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.gen-tabs {
  display: flex;
  background: rgba(0,0,0,0.2);
  padding: 6px;
  border-radius: 12px;
  
  .tab-btn {
    padding: 10px 24px;
    border: none;
    background: none;
    color: #64748b;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover { color: #fff; }
    &.active {
      background: #334155;
      color: #fff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transform: scale(1.05);
    }
  }
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  justify-content: flex-end;
}

.sort-group {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0,0,0,0.15);
  padding: 6px 12px;
  border-radius: 12px;

  .sort-label {
    font-size: 8px;
    color: #475569;
    font-family: 'Press Start 2P', monospace;
  }

  .sort-btn {
    padding: 8px 12px;
    background: none;
    border: 1px solid transparent;
    color: #475569;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover { color: #94a3b8; }
    &.active {
      background: rgba(255,255,255,0.05);
      color: #fff;
      border-color: rgba(255,255,255,0.1);
    }
  }
}

.search-wrapper {
  position: relative;
  width: 280px;
  
  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    opacity: 0.3;
    transition: opacity 0.2s;
  }
  
  .search-input {
    width: 100%;
    background: rgba(0,0,0,0.15);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 12px 16px 12px 44px;
    color: #fff;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: all 0.3s ease;

    &:focus {
      background: rgba(0,0,0,0.25);
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      
      & + .search-icon { opacity: 0.6; }
    }
  }
}

.pokedex-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 24px;
  padding-bottom: 60px;
}

.pokemon-card {
  position: relative;
  background: rgba(30, 41, 59, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    transform: translateY(-8px);
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    
    &::before { opacity: 1; }
    .pokemon-sprite { transform: scale(1.15) rotate(5deg); }
    .pokemon-name { color: #fff; }
  }

  &.is-unseen {
    opacity: 0.3;
    cursor: default;
    filter: grayscale(100%);
    &:hover { transform: none; box-shadow: none; &::before { opacity: 0; } }
  }

  &.is-caught {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
    border-color: rgba(234, 179, 8, 0.1);
    
    .caught-badge {
      animation: pulse-gold 2s infinite;
    }
  }

  .dex-number {
    position: absolute;
    top: 16px;
    left: 16px;
    font-size: 9px;
    color: #334155;
    font-family: 'Press Start 2P', monospace;
    font-weight: 700;
  }

  .sprite-container {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    z-index: 2;
    position: relative;

    .pokemon-sprite {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3));
      
      &.silhouette {
        filter: brightness(0) opacity(0.15);
      }
    }

    .unknown-placeholder {
      font-size: 40px;
      color: #1e293b;
      font-family: 'Press Start 2P', monospace;
      opacity: 0.5;
    }
  }

  .card-footer {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    z-index: 2;

    .pokemon-name {
      color: #64748b;
      font-size: 10px;
      font-family: 'Press Start 2P', monospace;
      text-transform: uppercase;
      text-align: center;
      transition: color 0.3s;
      letter-spacing: 1px;
    }

    .caught-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: rgba(234, 179, 8, 0.15);
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(234, 179, 8, 0.2);
      
      .star {
        font-size: 11px;
        color: #facc15;
      }
    }
  }
}

@keyframes pulse-gold {
  0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
  100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
}

.glass-morphism {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.custom-scrollbar {
  &::-webkit-scrollbar { width: 10px; }
  &::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    border: 3px solid transparent;
    background-clip: padding-box;
    &:hover { background: rgba(255, 255, 255, 0.1); background-clip: padding-box; }
  }
}
</style>

