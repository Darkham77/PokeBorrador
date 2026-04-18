<script setup>
import { ref, computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { PDEX_TYPE_COLORS, GAME_TMS, TM_COMPAT, POKEMON_SPRITE_IDS } from '@/data/pokedex'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'

const props = defineProps({
  pokemonId: { type: String, required: true }
})

const emit = defineEmits(['close'])

const activeTab = ref('summary')
const species = computed(() => pokemonDataProvider.getPokemonData(props.pokemonId))

const tabs = [
  { id: 'summary', label: 'RESUMEN', icon: '📝' },
  { id: 'stats', label: 'STATS', icon: '📊' },
  { id: 'moves', label: 'NIVELES', icon: '⚔️' },
  { id: 'tms', label: 'MTs', icon: '💿' },
  { id: 'evolve', label: 'EVOL.', icon: '✨' }
]

const getSprite = (id) => {
  const spriteId = POKEMON_SPRITE_IDS[id]
  if (!spriteId) return ''
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
}

const baseStats = computed(() => {
  if (!species.value) return []
  const s = species.value.stats
  return [
    { label: 'HP', value: s.hp, max: 255, color: '#ff5959' },
    { label: 'ATK', value: s.attack, max: 190, color: '#f5ac78' },
    { label: 'DEF', value: s.defense, max: 230, color: '#fae078' },
    { label: 'SPA', value: s.spAttack, max: 194, color: '#9db7f5' },
    { label: 'SPD', value: s.spDefense, max: 230, color: '#a7db8d' },
    { label: 'SPE', value: s.speed, max: 180, color: '#fa92b2' }
  ]
})

const tms = computed(() => {
  const compat = TM_COMPAT[props.pokemonId] || []
  return GAME_TMS.map(tm => ({
    ...tm,
    isCompatible: compat.includes(tm.id)
  }))
})

const evolutions = computed(() => {
  const list = []
  
  // Normal level evolution
  if (EVOLUTION_TABLE[props.pokemonId]) {
    const ev = EVOLUTION_TABLE[props.pokemonId]
    list.push({ type: 'level', requirement: `Nv. ${ev.level}`, to: ev.to })
  }
  
  // Stone evolution
  if (STONE_EVOLUTIONS[props.pokemonId]) {
    const ev = STONE_EVOLUTIONS[props.pokemonId]
    list.push({ type: 'stone', requirement: ev.stone, to: ev.to })
  }
  
  // Trade evolution
  if (TRADE_EVOLUTIONS[props.pokemonId]) {
    list.push({ type: 'trade', requirement: 'Intercambio', to: TRADE_EVOLUTIONS[props.pokemonId] })
  }

  // Handle special Eevee cases if needed, but the current structure covers them partially
  
  return list
})
</script>

<template>
  <div
    class="pdex-detail-overlay"
    @click.self="emit('close')"
  >
    <div
      v-if="species"
      class="pdex-detail-card animate-pop"
    >
      <header
        class="detail-header"
        :style="{ '--type-color': PDEX_TYPE_COLORS[species.type[0].toLowerCase()] }"
      >
        <div class="header-main">
          <div class="species-meta">
            <span class="number">#{{ species.id.padStart(3, '0') }}</span>
            <div class="types">
              <span 
                v-for="t in species.type" 
                :key="t"
                class="type-pill"
                :style="{ background: PDEX_TYPE_COLORS[t.toLowerCase()] }"
              >
                {{ t }}
              </span>
            </div>
          </div>
          <h2 class="name">
            {{ species.name }}
          </h2>
        </div>
        <button
          class="close-btn"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="main-display">
        <div class="sprite-container">
          <img
            :src="getSprite(props.pokemonId)"
            class="main-sprite"
          >
          <div
            class="sprite-glow"
            :style="{ background: PDEX_TYPE_COLORS[species.type[0].toLowerCase()] }"
          />
        </div>
      </div>

      <nav class="detail-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="detail-body scrollbar">
        <!-- SUMMARY TAB -->
        <div
          v-if="activeTab === 'summary'"
          class="tab-pane summary-pane"
        >
          <div class="info-grid">
            <div class="info-item">
              <span class="label">CATEGORÍA</span>
              <span class="value">{{ species.category || 'Pokémon Desconocido' }}</span>
            </div>
            <div class="info-item">
              <span class="label">ALTURA</span>
              <span class="value">{{ species.height || '???' }} m</span>
            </div>
            <div class="info-item">
              <span class="label">PESO</span>
              <span class="value">{{ species.weight || '???' }} kg</span>
            </div>
          </div>
          <p class="description">
            {{ species.description || 'No hay datos disponibles en la Pokédex.' }}
          </p>
        </div>

        <!-- STATS TAB -->
        <div
          v-if="activeTab === 'stats'"
          class="tab-pane stats-pane"
        >
          <div
            v-for="s in baseStats"
            :key="s.label"
            class="stat-row"
          >
            <span class="stat-label">{{ s.label }}</span>
            <span class="stat-value">{{ s.value }}</span>
            <div class="stat-bar-bg">
              <div
                class="stat-bar-fill"
                :style="{ width: (s.value/s.max*100) + '%', background: s.color }"
              />
            </div>
          </div>
          <div class="stat-total">
            <span class="label">TOTAL:</span>
            <span class="value">{{ species.stats.hp + species.stats.attack + species.stats.defense + species.stats.spAttack + species.stats.spDefense + species.stats.speed }}</span>
          </div>
        </div>

        <!-- MOVES TAB -->
        <div
          v-if="activeTab === 'moves'"
          class="tab-pane moves-pane"
        >
          <div class="move-list">
            <div
              v-for="m in species.learnset"
              :key="m.move"
              class="move-item"
            >
              <span class="move-lv">Nv. {{ m.level }}</span>
              <span class="move-name">{{ m.move }}</span>
            </div>
          </div>
        </div>

        <!-- TMS TAB -->
        <div
          v-if="activeTab === 'tms'"
          class="tab-pane tms-pane"
        >
          <div class="tm-grid">
            <div 
              v-for="tm in tms" 
              :key="tm.id" 
              class="tm-item"
              :class="{ incompatible: !tm.isCompatible }"
            >
              <div
                class="tm-id"
                :style="{ background: PDEX_TYPE_COLORS[tm.type.toLowerCase()] }"
              >
                {{ tm.id }}
              </div>
              <div class="tm-info">
                <span class="tm-name">{{ tm.name }}</span>
                <span class="tm-type">{{ tm.type }}</span>
              </div>
              <div class="tm-check">
                {{ tm.isCompatible ? '✓' : '✕' }}
              </div>
            </div>
          </div>
        </div>

        <!-- EVOLUTION TAB -->
        <div
          v-if="activeTab === 'evolve'"
          class="tab-pane evolve-pane"
        >
          <div
            v-if="evolutions.length > 0"
            class="evo-chain"
          >
            <div
              v-for="evo in evolutions"
              :key="evo.to"
              class="evo-step"
            >
              <div class="evo-from">
                <img
                  :src="getSprite(props.pokemonId)"
                  class="evo-sprite"
                >
              </div>
              <div class="evo-arrow">
                <span class="method">{{ evo.requirement }}</span>
                <span class="arrow">➞</span>
              </div>
              <div class="evo-to">
                <img
                  :src="getSprite(evo.to)"
                  class="evo-sprite"
                >
                <span class="target-name">{{ evo.to }}</span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="no-evo"
          >
            <span>Este Pokémon no evoluciona.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pdex-detail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.pdex-detail-card {
  width: 100%;
  max-width: 480px;
  height: 80vh;
  background: #1a1a1a;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(0,0,0,0.8);
}

.detail-header {
  padding: 24px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.05), transparent);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-top: 4px solid var(--type-color);

  .header-main {
    .species-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      .number { font-family: 'Press Start 2P', cursive; font-size: 10px; color: #555; }
      .types { display: flex; gap: 6px; }
      .type-pill { 
        font-size: 9px; 
        font-weight: 900; 
        padding: 2px 8px; 
        border-radius: 6px; 
        color: #000; 
        text-transform: uppercase; 
      }
    }
    .name { font-size: 24px; font-weight: 900; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  }

  .close-btn {
    background: rgba(255,255,255,0.05);
    border: none;
    color: #444;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    &:hover { color: #fff; background: rgba(255,255,255,0.1); }
  }
}

.main-display {
  padding: 20px;
  display: flex;
  justify-content: center;
  position: relative;
  
  .sprite-container {
    position: relative;
    z-index: 1;
    .main-sprite { width: 140px; height: 140px; image-rendering: pixelated; position: relative; z-index: 2; }
    .sprite-glow {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 100px; height: 100px;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.3;
      z-index: 1;
    }
  }
}

.detail-tabs {
  display: flex;
  background: rgba(0,0,0,0.2);
  padding: 0 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);

  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: #555;
    cursor: pointer;
    transition: all 0.2s;
    
    .tab-icon { font-size: 14px; }
    .tab-label { font-size: 8px; font-weight: 800; }
    
    &:hover { color: #888; }
    &.active {
      color: var(--yellow);
      background: rgba(255, 214, 10, 0.05);
      .tab-label { font-weight: 900; }
    }
  }
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Tab Panes */
.summary-pane {
  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
    
    .info-item {
      background: rgba(255,255,255,0.03);
      padding: 12px;
      border-radius: 12px;
      text-align: center;
      .label { display: block; font-size: 8px; color: #555; margin-bottom: 4px; font-weight: 800; }
      .value { font-size: 11px; font-weight: 900; color: #ddd; }
    }
  }
  .description { font-size: 13px; line-height: 1.6; color: #94a3b8; font-style: italic; }
}

.stats-pane {
  .stat-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    
    .stat-label { width: 40px; font-size: 10px; font-weight: 900; color: #555; }
    .stat-value { width: 30px; font-size: 12px; font-weight: 900; color: #fff; text-align: right; }
    .stat-bar-bg { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
    .stat-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease-out; }
  }
  .stat-total {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    align-items: center;
    .label { font-size: 10px; font-weight: 900; color: #555; }
    .value { font-family: 'Press Start 2P', cursive; font-size: 14px; color: var(--yellow); }
  }
}

.moves-pane {
  .move-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .move-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      .move-lv { color: var(--yellow); font-family: 'Press Start 2P', cursive; font-size: 8px; }
      .move-name { color: #fff; text-transform: uppercase; }
    }
  }
}

.tms-pane {
  .tm-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    .tm-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      &.incompatible { opacity: 0.3; }
      .tm-id { width: 40px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 9px; font-weight: 900; color: #000; }
      .tm-info { flex: 1; display: flex; flex-direction: column; .tm-name { font-size: 12px; font-weight: 800; color: #fff; } .tm-type { font-size: 9px; color: #555; text-transform: uppercase; } }
      .tm-check { font-size: 14px; font-weight: 900; }
    }
  }
}

.evolve-pane {
  .evo-chain {
    display: flex;
    flex-direction: column;
    gap: 20px;
    .evo-step {
      display: flex;
      align-items: center;
      justify-content: space-around;
      background: rgba(255,255,255,0.02);
      padding: 16px;
      border-radius: 20px;
      .evo-sprite { width: 64px; height: 64px; image-rendering: pixelated; }
      .evo-arrow {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        .method { font-size: 8px; font-weight: 800; color: var(--yellow); text-transform: uppercase; }
        .arrow { font-size: 20px; color: #444; }
      }
      .evo-to {
        display: flex;
        flex-direction: column;
        align-items: center;
        .target-name { font-size: 10px; font-weight: 900; color: #fff; text-transform: uppercase; margin-top: 4px; }
      }
    }
  }
  .no-evo { text-align: center; padding: 40px; color: #444; font-weight: 800; font-size: 14px; }
}

.scrollbar::-webkit-scrollbar { width: 4px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
