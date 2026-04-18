<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { PDEX_TYPE_COLORS, GAME_TMS, TM_COMPAT, POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  speciesId: {
    type: String,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const uiStore = useUIStore()

const p = computed(() => pokemonDataProvider.getPokemonData(props.speciesId) || { name: props.speciesId, learnset: [] })

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || '#94a3b8'

const getStatWidth = (val) => `${Math.min((val / 150) * 100, 100)}%`

const getStatColor = (val) => {
  if (val < 50) return '#ef4444' // Red
  if (val < 80) return '#f59e0b' // Amber
  if (val < 120) return '#10b981' // Emerald
  return '#06b6d4' // Cyan
}

const statsFields = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'spa', label: 'SPA' },
  { key: 'spd', label: 'SPD' },
  { key: 'spe', label: 'SPE' }
]

const tmList = computed(() => {
  if (!props.speciesId || !TM_COMPAT[props.speciesId]) return []
  const compat = TM_COMPAT[props.speciesId]
  return GAME_TMS.map(tm => ({
    ...tm,
    isCompatible: compat.includes(tm.id)
  }))
})

const getSpriteUrl = (id) => {
  const sid = POKEMON_SPRITE_IDS[id] || 0
  if (sid === 0) return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.webp'
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sid}.webp`
}

// LÓGICA DE EVOLUCIONES
const evolutionChain = computed(() => {
  if (!props.speciesId) return []
  
  // Encontrar la base de la cadena (el primer Pokémon)
  let start = props.speciesId
  let foundBase = true
  while (foundBase) {
    let base = null
    // Buscar en evoluciones por nivel
    for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
      if (data.to === start) base = from
    }
    // Buscar en evoluciones por piedra
    for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
      if (data.to === start) base = from
    }
    // Buscar en evoluciones por intercambio
    for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
      if (to === start) base = from
    }
    
    if (base && base !== start) start = base
    else foundBase = false
  }

  const nodes = []
  const traverse = (id, depth = 0) => {
    const pkmn = pokemonDataProvider.getPokemonData(id) || { name: id }
    const node = { id, name: pkmn.name, depth, evos: [] }
    
    // Buscar evoluciones directas
    // Nivel
    if (EVOLUTION_TABLE[id]) {
      node.evos.push({ to: EVOLUTION_TABLE[id].to, method: `LV ${EVOLUTION_TABLE[id].level}` })
    }
    // Piedras
    if (STONE_EVOLUTIONS[id]) {
      node.evos.push({ to: STONE_EVOLUTIONS[id].to, method: STONE_EVOLUTIONS[id].stone })
    }
    // Intercambio
    if (TRADE_EVOLUTIONS[id]) {
      node.evos.push({ to: TRADE_EVOLUTIONS[id], method: 'Intercambio' })
    }
    
    nodes.push(node)
    node.evos.forEach(e => traverse(e.to, depth + 1))
  }

  traverse(start)
  return nodes
})

const abilities = computed(() => {
  const list = pokemonDataProvider.getSpeciesAbilities(props.speciesId)
  return list.map(name => ({
    name,
    desc: pokemonDataProvider.getAbilityData(name)?.desc || 'Sin descripción disponible.'
  }))
})

const openMove = (moveName) => {
  uiStore.openMoveDetail(moveName)
}

const close = () => emit('close')

const handleEsc = (e) => {
  if (e.key === 'Escape' && props.isOpen) close()
}

onMounted(() => window.addEventListener('keydown', handleEsc))
onUnmounted(() => window.removeEventListener('keydown', handleEsc))
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="isOpen"
      class="pdex-modal-overlay"
      @click.self="close"
    >
      <div class="pdex-modal-container glass-morphism">
        <!-- HEADER SECTION -->
        <header class="modal-header">
          <div class="pokemon-summary">
            <div class="sprite-wrapper">
              <div class="sprite-bg" />
              <img 
                :src="getSpriteUrl(props.speciesId)" 
                :alt="p.name"
                class="pokemon-sprite pixelated"
              >
            </div>
            
            <div class="name-type-group">
              <div class="name-row">
                <span class="dex-num">#{{ String(POKEMON_SPRITE_IDS[props.speciesId] || 0).padStart(3, '0') }}</span>
                <h2 class="pokemon-name">
                  {{ p.name }}
                </h2>
              </div>
              
              <div class="type-badges">
                <span 
                  class="type-badge"
                  :style="{ backgroundColor: getTypeColor(p.type), boxShadow: `0 4px 12px ${getTypeColor(p.type)}44` }"
                >
                  {{ p.type?.toUpperCase() }}
                </span>
                <span 
                  v-if="p.type2"
                  class="type-badge"
                  :style="{ backgroundColor: getTypeColor(p.type2), boxShadow: `0 4px 12px ${getTypeColor(p.type2)}44` }"
                >
                  {{ p.type2?.toUpperCase() }}
                </span>
              </div>
            </div>
          </div>
          
          <button
            class="close-btn"
            aria-label="Cerrar"
            @click="close"
          >
            <span class="icon">×</span>
          </button>
        </header>

        <main class="modal-body custom-scrollbar">
          <!-- STATS SECTION -->
          <section class="info-section">
            <h3 class="section-title">
              BASE STATS
            </h3>
            <div class="stats-container">
              <div
                v-for="stat in statsFields"
                :key="stat.key"
                class="stat-row"
              >
                <div class="stat-meta">
                  <span class="label">{{ stat.label }}</span>
                  <span class="value">{{ p[stat.key] || 0 }}</span>
                </div>
                <div class="bar-container">
                  <div 
                    class="bar-fill" 
                    :style="{ 
                      width: getStatWidth(p[stat.key]), 
                      backgroundColor: getStatColor(p[stat.key]),
                      boxShadow: `0 0 10px ${getStatColor(p[stat.key])}aa`
                    }"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- ABILITIES SECTION -->
          <section class="info-section">
            <h3 class="section-title">
              HABILIDADES
            </h3>
            <div class="abilities-list">
              <div 
                v-for="ability in abilities" 
                :key="ability.name"
                class="ability-card"
              >
                <span class="ability-name">{{ ability.name }}</span>
                <p class="ability-desc">
                  {{ ability.desc }}
                </p>
              </div>
            </div>
          </section>

          <!-- EVOLUTIONS SECTION -->
          <section class="info-section">
            <h3 class="section-title">
              LÍNEA EVOLUTIVA
            </h3>
            <div class="evo-chain-container">
              <div 
                v-for="(node, idx) in evolutionChain" 
                :key="node.id"
                class="evo-node-wrapper"
              >
                <div 
                  class="evo-node" 
                  :class="{ 'is-current': node.id === props.speciesId }"
                  @click="node.id !== props.speciesId && $emit('update:speciesId', node.id)"
                >
                  <img
                    :src="getSpriteUrl(node.id)"
                    class="evo-sprite pixelated"
                  >
                  <span class="evo-name">{{ node.name }}</span>
                </div>
                <div
                  v-if="node.evos.length > 0"
                  class="evo-arrows"
                >
                  <div
                    v-for="evo in node.evos"
                    :key="evo.to"
                    class="evo-arrow"
                  >
                    <span class="arrow-icon">→</span>
                    <span class="arrow-method">{{ evo.method }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- LEARNSET SECTION -->
          <section class="info-section">
            <h3 class="section-title">
              APRENDIZAJE POR NIVEL
            </h3>
            <div class="moves-table-wrapper">
              <table class="moves-table">
                <thead>
                  <tr>
                    <th class="col-lvl">
                      LVL
                    </th>
                    <th class="col-name">
                      MOVIMIENTO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="m in p.learnset"
                    :key="m.name"
                    class="move-row"
                    @click="openMove(m.name)"
                  >
                    <td class="lvl-cell">
                      {{ m.lv === 1 ? '—' : m.lv }}
                    </td>
                    <td class="name-cell">
                      {{ m.name }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- TM SECTION -->
          <section class="info-section">
            <h3 class="section-title">
              COMPATIBILIDAD MT
            </h3>
            <div class="tm-grid">
              <div 
                v-for="tm in tmList" 
                :key="tm.id" 
                class="tm-cell"
                :class="{ 'incompatible': !tm.isCompatible }"
                @click="tm.isCompatible && openMove(tm.name)"
              >
                <span class="tm-id">{{ tm.id.replace('TM', '') }}</span>
                <div
                  v-if="tm.isCompatible"
                  class="compatible-marker"
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.pdex-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.pdex-modal-container {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .pokemon-summary {
    display: flex;
    gap: 24px;
    align-items: center;
  }

  .sprite-wrapper {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;

    .sprite-bg {
      position: absolute;
      inset: 10px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      border-radius: 50%;
    }

    .pokemon-sprite {
      width: 120%;
      height: 120%;
      z-index: 2;
      filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
    }
  }

  .name-type-group {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .name-row {
      display: flex;
      flex-direction: column;
      
      .dex-num {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #475569;
        margin-bottom: 4px;
      }
      
      .pokemon-name {
        margin: 0;
        font-family: 'Press Start 2P', monospace;
        font-size: 20px;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: -0.02em;
      }
    }

    .type-badges {
      display: flex;
      gap: 8px;
    }

    .type-badge {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      padding: 6px 12px;
      border-radius: 6px;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
    }
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .icon { font-size: 24px; line-height: 0; }
  }
}

.modal-body {
  padding: 32px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #64748b;
  margin-bottom: 20px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 12px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%);
  }
}

/* Stats */
.stats-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stat-row {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .stat-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    
    .label {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      color: #94a3b8;
    }
    .value {
      font-family: 'Press Start 1P', monospace;
      font-size: 11px;
      font-weight: bold;
      color: #fff;
    }
  }

  .bar-container {
    height: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.03);
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

/* Moves Table */
.moves-table-wrapper {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.moves-table {
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    background: rgba(255,255,255,0.02);
    padding: 12px 16px;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #475569;
  }

  td {
    padding: 12px 16px;
    border-top: 1px solid rgba(255,255,255,0.03);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #e2e8f0;
  }

  .lvl-cell {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    color: #64748b;
    width: 60px;
  }
}

/* TM Grid */
.tm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 8px;
}

.tm-cell {
  aspect-ratio: 1;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
  border: 1px solid rgba(255,255,255,0.1);

  .tm-id {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #fff;
    font-weight: bold;
  }

  .compatible-marker {
    position: absolute;
    bottom: 4px;
    width: 4px;
    height: 4px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 8px #fff;
  }

  &.incompatible {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.05);
    
    .tm-id { color: #334155; }
  }

  &:hover:not(.incompatible) {
    transform: #{"Scale(1.1)"};
    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
    z-index: 2;
  }
}

/* Abilities */
.abilities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ability-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .ability-name {
    display: block;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    color: #3b82f6;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .ability-desc {
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #94a3b8;
  }
}

/* Evolution Chain */
.evo-chain-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.evo-node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.evo-node {
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100px;

  &.is-current {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    cursor: default;
  }

  &:hover:not(.is-current) {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-4px);
  }

  .evo-sprite {
    width: 64px;
    height: 64px;
  }

  .evo-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    color: #fff;
    text-transform: uppercase;
    text-align: center;
  }
}

.evo-arrows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evo-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #475569;

  .arrow-icon { font-size: 20px; }
  .arrow-method {
    font-family: 'Press Start 2P', monospace;
    font-size: 6px;
    text-transform: uppercase;
  }
}

.move-row {
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
  .pdex-modal-container { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  .pdex-modal-container { transform: #{"Scale(0.9)"} translateY(20px); }
}

/* Utilities */
.pixelated {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: pixelated;
  image-rendering: optimize-speed;
}

.glass-morphism {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.custom-scrollbar {
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    &:hover { background: rgba(255, 255, 255, 0.1); }
  }
}
</style>

