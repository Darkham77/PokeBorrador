<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const gs = computed(() => gameStore.state)

// Categoría actual (Gen 1 por defecto)
const currentCategory = ref('gen1')

// Órdenes de la Pokédex (Legacy)
const getOrder = () => {
  if (currentCategory.value === 'gen1') return window.PDEX_ORDER || []
  return window.GEN2_PDEX_ORDER || []
}

const getPokemonDb = () => window.POKEMON_DB || {}
const getSpriteIds = () => window.POKEMON_SPRITE_IDS || {}

// Estadísticas filtradas por generación
const stats = computed(() => {
  const caught = gs.value.pokedex || []
  const seen = gs.value.seenPokedex || []
  const order = getOrder()
  
  if (!Array.isArray(caught) || !Array.isArray(seen)) {
    return { seen: 0, caught: 0, total: order.length }
  }

  const totalSeen = seen.filter(id => order.includes(id))
  const totalCaught = caught.filter(id => order.includes(id))
  
  return {
    seen: totalSeen.length,
    caught: totalCaught.length,
    total: order.length
  }
})

// Lista de Pokémon para el grid
const pokemonList = computed(() => {
  const caught = Array.isArray(gs.value.pokedex) ? gs.value.pokedex : []
  const seen = Array.isArray(gs.value.seenPokedex) ? gs.value.seenPokedex : []
  const order = getOrder()
  const db = getPokemonDb()
  const spriteIds = getSpriteIds()
  
  if (!order || order.length === 0) return []

  return order.map((id, index) => {
    const isCaught = caught.includes(id)
    const isSeen = seen.includes(id) || isCaught
    const pData = db[id]
    
    // Número de Dex (Gen 1: 1-151, Gen 2: 152-251)
    const dexNumValue = (currentCategory.value === 'gen1' ? index + 1 : index + 152)
    const dexNumStr = String(dexNumValue).padStart(3, '0')
    
    // Resolución de Sprite
    const spriteId = spriteIds[id]
    let spriteUrl = ''
    if (isSeen) {
      if (spriteId) {
        spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
      } else {
        spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumValue}.png`
      }
    }

    const displayName = (isSeen && pData) ? pData.name : id.charAt(0).toUpperCase() + id.slice(1)

    return {
      id,
      dexNum: dexNumStr,
      name: isSeen ? displayName : '???',
      isSeen,
      isCaught,
      spriteUrl,
      hasData: !!pData
    }
  })
})

const switchCategory = (cat) => {
  currentCategory.value = cat
}

const handleShowDetail = (pokemon) => {
  if (pokemon.isSeen && pokemon.hasData && typeof window.showPokedexDetail === 'function') {
    window.showPokedexDetail(pokemon.id)
  }
}

// Fallback para imágenes rotas
const handleImageError = (e) => {
  e.target.style.display = 'none'
  const parent = e.target.parentElement
  if (parent) {
    parent.innerHTML = '<div style="font-size:20px;color:#333;">?</div>'
  }
}

</script>

<template>
  <div class="team-section">
    <div class="section-title">📖 Pokédex Nacional</div>
    
    <!-- FILTROS Y CONTADORES -->
    <div class="pokedex-header">
      <div class="pokedex-filters">
        <button 
          @click="switchCategory('gen1')"
          :class="['pdex-filter-btn', { active: currentCategory === 'gen1' }]"
        >
          GEN 1
        </button>
        <button 
          @click="switchCategory('gen2')"
          :class="['pdex-filter-btn', { active: currentCategory === 'gen2' }]"
        >
          GEN 2
        </button>
      </div>
      
      <div class="pokedex-stats">
        <span class="stat-item">Vistos: <span class="stat-val highlight-white">{{ stats.seen }}</span></span>
        <span class="stat-item">Capturados: <span class="stat-val highlight-yellow">{{ stats.caught }}</span>/<span class="stat-val">{{ stats.total }}</span></span>
      </div>
    </div>

    <!-- GRID DE POKEMON -->
    <div id="pokedex-grid" class="pokedex-grid-container">
      <div 
        v-for="p in pokemonList" 
        :key="p.id"
        class="pokedex-card"
        :class="{ 'is-caught': p.isCaught, 'is-seen': p.isSeen }"
        @click="handleShowDetail(p)"
      >
        <div class="pdex-num">#{{ p.dexNum }}</div>
        
        <div class="pdex-sprite-box">
          <img 
            v-if="p.isSeen && p.spriteUrl" 
            :src="p.spriteUrl" 
            :alt="p.id"
            @error="handleImageError"
            :class="{ 'sprite-silhouette': !p.isCaught }"
          >
          <div v-else class="pdex-placeholder">?</div>
        </div>
        
        <div class="pdex-name" :class="{ 'name-unknown': !p.isSeen }">
          {{ p.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pokedex-header {
  font-size: 11px;
  color: var(--gray);
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.pokedex-filters {
  display: flex;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 12px;
}

.pdex-filter-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  color: var(--gray);
  transition: all 0.2s ease;
}

.pdex-filter-btn.active {
  background: var(--yellow);
  color: #000;
  box-shadow: 0 4px 12px rgba(255, 214, 10, 0.2);
}

.pokedex-stats {
  display: flex;
  gap: 15px;
  font-weight: 700;
}

.stat-val {
  transition: color 0.3s ease;
}

.highlight-white { color: #fff; }
.highlight-yellow { color: var(--yellow); }

.pokedex-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
  gap: 12px;
  padding-bottom: 40px;
}

.pokedex-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: default;
  transition: all 0.2s ease;
}

.pokedex-card.is-seen {
  cursor: pointer;
}

.pokedex-card.is-seen:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.pokedex-card.is-caught {
  border-color: rgba(255, 214, 10, 0.25);
  background: radial-gradient(circle at 50% 0%, rgba(255, 214, 10, 0.05), transparent 70%);
}

.pdex-num {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 6px;
  font-family: 'Press Start 2P', monospace;
}

.pdex-sprite-box {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.pdex-sprite-box img {
  width: 56px;
  height: 56px;
  image-rendering: pixelated;
  transition: transform 0.2s ease;
}

.sprite-silhouette {
  filter: brightness(0) opacity(0.4);
}

.pokedex-card:hover .pdex-sprite-box img {
  transform: scale(1.1);
}

.pdex-placeholder {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.1);
  font-weight: 900;
}

.pdex-name {
  font-size: 10px;
  font-weight: 700;
  color: #aaa;
  text-align: center;
  text-transform: capitalize;
  line-height: 1.2;
}

.is-caught .pdex-name {
  color: var(--yellow);
}

.name-unknown {
  color: #444;
}

/* Scrollbar para el grid */
#pokedex-grid::-webkit-scrollbar {
  width: 6px;
}
#pokedex-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
