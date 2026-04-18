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
  padding: 24px;
  background: #0f172a;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pokedex-header {
  padding: 32px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%);
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
  }

  .title-group {
    h1 {
      font-family: 'Press Start 2P', monospace;
      font-size: 20px;
      color: #fff;
      margin: 0 0 8px 0;
      text-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .subtitle {
      color: #64748b;
      font-size: 12px;
      letter-spacing: 2px;
      margin: 0;
    }
  }
}

.stats-grid {
  display: flex;
  gap: 16px;

  .stat-card {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px 24px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120px;

    .stat-label {
      font-size: 10px;
      color: #94a3b8;
      margin-bottom: 4px;
      font-family: 'Press Start 2P', monospace;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
      font-family: 'Press Start 2P', monospace;
      
      small { font-size: 12px; color: #64748b; }
    }

    &.highlight {
      background: rgba(234, 179, 8, 0.05);
      border-color: rgba(234, 179, 8, 0.2);
      .stat-value { color: #facc15; }
    }
  }
}

.pokedex-controls {
  padding: 16px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.gen-tabs {
  display: flex;
  background: rgba(0,0,0,0.2);
  padding: 4px;
  border-radius: 8px;
  
  .tab-btn {
    padding: 8px 20px;
    border: none;
    background: none;
    color: #64748b;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover { color: #fff; }
    &.active {
      background: #334155;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  }
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
}

.sort-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 4px 8px;
  border-radius: 8px;

  .sort-label {
    font-size: 8px;
    color: #475569;
    font-family: 'Press Start 2P', monospace;
  }

  .sort-btn {
    padding: 6px 10px;
    background: none;
    border: 1px solid transparent;
    color: #64748b;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover { color: #fff; }
    &.active {
      background: #334155;
      color: #fff;
      border-color: rgba(255,255,255,0.1);
    }
  }
}

.search-wrapper {
  position: relative;
  width: 240px;
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    opacity: 0.5;
  }
  
  .search-input {
    width: 100%;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 10px 10px 10px 36px;
    color: #fff;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: all 0.2s;

    &:focus {
      background: rgba(0,0,0,0.3);
      border-color: rgba(59, 130, 246, 0.5);
    }
  }
}

.pokedex-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
  padding-bottom: 40px;
}

.pokemon-card {
  position: relative;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 12px 24px rgba(0,0,0,0.3);
    
    .pokemon-sprite { transform: #{"Scale(1.1)"}; }
  }

  &.is-unseen {
    opacity: 0.5;
    cursor: default;
    filter: grayScale(100%);
    &:hover { transform: none; box-shadow: none; }
  }

  &.is-caught {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
    border-color: rgba(234, 179, 8, 0.2);
    
    &::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at center, rgba(234, 179, 8, 0.05) 0%, transparent 70%);
      pointer-events: none;
    }
  }

  .dex-number {
    position: absolute;
    top: 12px;
    left: 12px;
    font-size: 10px;
    color: #475569;
    font-family: 'Press Start 2P', monospace;
  }

  .sprite-container {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    z-index: 2;

    .pokemon-sprite {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      
      &.silhouette {
        filter: Brightness(0) Opacity(0.2);
      }
    }

    .unknown-placeholder {
      font-size: 32px;
      color: #334155;
      font-family: 'Press Start 2P', monospace;
    }
  }

  .card-footer {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    z-index: 2;

    .pokemon-name {
      color: #94a3b8;
      font-size: 9px;
      font-family: 'Press Start 2P', monospace;
      text-transform: uppercase;
      text-align: center;
      transition: color 0.2s;
    }

    .caught-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      background: rgba(234, 179, 8, 0.2);
      border-radius: 50%;
      
      .star {
        font-size: 10px;
        color: #facc15;
      }
    }
  }

  &:hover .pokemon-name { color: #fff; }
}

.glass-morphism {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.custom-scrollbar {
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    &:hover { background: rgba(255, 255, 255, 0.1); }
  }
}
</style>

