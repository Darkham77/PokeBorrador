<script setup>
import { ref, computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { PDEX_TYPE_COLORS, GAME_TMS, TM_COMPAT } from '@/data/pokedex'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const props = defineProps({
  speciesId: { type: String, required: true },
  isOpen: { type: Boolean, required: true }
})
const emit = defineEmits(['close'])

const activeTab = ref('summary')
const species = computed(() => pokemonDataProvider.getPokemonData(props.speciesId))

const tabs = [
  { id: 'summary', label: 'RESUMEN', icon: '📝' },
  { id: 'stats', label: 'STATS', icon: '📊' },
  { id: 'moves', label: 'NIVELES', icon: '⚔️' },
  { id: 'tms', label: 'MTs', icon: '💿' },
  { id: 'evolve', label: 'EVOL.', icon: '✨' }
]

const getSprite = (id) => getAssetUrl(ASSET_TYPES.POKEMON, id)

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
  const compat = TM_COMPAT[props.speciesId] || []
  return GAME_TMS.map(tm => ({ ...tm, isCompatible: compat.includes(tm.id) }))
})

const evolutions = computed(() => {
  const list = []
  if (EVOLUTION_TABLE[props.speciesId]) {
    const ev = EVOLUTION_TABLE[props.speciesId]
    list.push({ type: 'level', requirement: `Nv. ${ev.level}`, to: ev.to })
  }
  if (STONE_EVOLUTIONS[props.speciesId]) {
    const ev = STONE_EVOLUTIONS[props.speciesId]
    list.push({ type: 'stone', requirement: ev.stone, to: ev.to })
  }
  if (TRADE_EVOLUTIONS[props.speciesId]) list.push({ type: 'trade', requirement: 'Intercambio', to: TRADE_EVOLUTIONS[props.speciesId] })
  return list
})
</script>

<template>
  <div
    v-if="isOpen"
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
              >{{ t }}</span>
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
            :src="getSprite(props.speciesId)"
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

      <div class="detail-body custom-scrollbar-vicio">
        <div
          v-if="activeTab === 'summary'"
          class="tab-pane summary-pane"
        >
          <div class="info-grid">
            <div class="info-item">
              <span class="label">CATEGORÍA</span><span class="value">{{ species.category || 'Pokémon Desconocido' }}</span>
            </div>
            <div class="info-item">
              <span class="label">ALTURA</span><span class="value">{{ species.height || '???' }} m</span>
            </div>
            <div class="info-item">
              <span class="label">PESO</span><span class="value">{{ species.weight || '???' }} kg</span>
            </div>
          </div>
          <p class="description">
            {{ species.description || 'No hay datos disponibles en la Pokédex.' }}
          </p>
        </div>

        <div
          v-if="activeTab === 'stats'"
          class="tab-pane stats-pane"
        >
          <div
            v-for="s in baseStats"
            :key="s.label"
            class="stat-row"
          >
            <span class="stat-label">{{ s.label }}</span><span class="stat-value">{{ s.value }}</span>
            <div class="stat-bar-bg">
              <div
                class="stat-bar-fill"
                :style="{ width: (s.value/s.max*100) + '%', background: s.color }"
              />
            </div>
          </div>
          <div class="stat-total">
            <span class="label">TOTAL:</span><span class="value">{{ species.stats.hp + species.stats.attack + species.stats.defense + species.stats.spAttack + species.stats.spDefense + species.stats.speed }}</span>
          </div>
        </div>

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
              <span class="move-lv">Nv. {{ m.level }}</span><span class="move-name">{{ m.move }}</span>
            </div>
          </div>
        </div>

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
                <span class="tm-name">{{ tm.name }}</span><span class="tm-type">{{ tm.type }}</span>
              </div>
              <div class="tm-check">
                {{ tm.isCompatible ? '✓' : '✕' }}
              </div>
            </div>
          </div>
        </div>

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
                  :src="getSprite(props.speciesId)"
                  class="evo-sprite"
                >
              </div>
              <div class="evo-arrow">
                <span class="method">{{ evo.requirement }}</span><span class="arrow">➞</span>
              </div>
              <div class="evo-to">
                <img
                  :src="getSprite(evo.to)"
                  class="evo-sprite"
                ><span class="target-name">{{ evo.to }}</span>
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
@use "@/styles/components/pokedex-detail";
</style>
