<script setup>
// UnifiedPokemonDetailModal – Universal Pokémon info panel (Pokedex + Instance).
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { PDEX_TYPE_COLORS, POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

// Instance sub-components (reusing existing ones or adaptively including them)
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import PokemonActionFooter from '@/components/pokemon-detail/PokemonActionFooter.vue'
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PokemonTmsTab from '@/components/pokemon-detail/PokemonTmsTab.vue'
import PokemonEvolutionsTab from '@/components/pokemon-detail/PokemonEvolutionsTab.vue'

const props = defineProps({
  show: { type: Boolean, default: false }, // Sync with uiStore.open
  speciesId: { type: String, default: '' },
  pokemon: { type: Object, default: null },
  index: { type: Number, default: -1 },
  context: { type: String, default: 'pokedex' }, // 'team', 'box', 'market', 'pokedex'
  extra: { type: Object, default: null }
})

const emit = defineEmits(['close'])
const uiStore = useUIStore()
const gameStore = useGameStore()

const activeTab = ref('summary')

// Normalize data source
const isInstance = computed(() => !!props.pokemon)
const targetPokemon = computed(() => props.pokemon)
const targetSpeciesId = computed(() => {
  const id = isInstance.value ? props.pokemon.id : props.speciesId
  return String(id).toLowerCase()
})

const speciesRaw = computed(() => pokemonDataProvider.getPokemonData(targetSpeciesId.value))

const species = computed(() => {
  if (!speciesRaw.value) return null
  const s = speciesRaw.value
  const types = Array.isArray(s.type) ? s.type : [s.type]
  const nationalId = POKEMON_SPRITE_IDS[targetSpeciesId.value] || 0
  
  return {
    ...s,
    nationalId: nationalId.toString(),
    type: types,
    stats: {
      hp: s.hp || 0,
      atk: s.atk || 0,
      def: s.def || 0,
      spa: s.spa || 0,
      spd: s.spd || 0,
      spe: s.spe || 0
    }
  }
})

const tabs = computed(() => {
  const base = [
    { id: 'summary', label: 'RESUMEN', icon: '📝' },
    { id: 'stats', label: isInstance.value ? 'STATS+' : 'STATS', icon: '📊' },
    { id: 'moves', label: 'ATAQUES', icon: '⚔️' },
  ]
  
  // Only show TMs and Evolutions for Pokedex or generic view
  // Instance view has its own "Evolve" button in footer if applicable
  if (props.context === 'pokedex') {
    base.push({ id: 'tms', label: 'MTs', icon: '💿' })
    base.push({ id: 'evolve', label: 'EVOL.', icon: '✨' })
  }
  
  return base
})

const getSprite = (id) => getAssetUrl(ASSET_TYPES.POKEMON, id)

// Stats Calculation (Base vs Instance)
const displayStats = computed(() => {
  if (!species.value) return []
  
  const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE' }
  const colors = { hp: '#ff5959', atk: '#f5ac78', def: '#fae078', spa: '#9db7f5', spd: '#a7db8d', spe: '#fa92b2' }
  
  return Object.keys(species.value.stats).map(key => {
    const base = species.value.stats[key]
    const current = isInstance.value ? (targetPokemon.value[key] || base) : base
    const max = 255 // Reference max for bars
    
    return {
      id: key,
      label: labels[key],
      value: current,
      baseValue: base,
      max: max,
      color: colors[key],
      iv: isInstance.value ? targetPokemon.value.ivs?.[key] : null
    }
  })
})

const moveDetails = computed(() => {
  if (!species.value || !species.value.learnset) return []
  return species.value.learnset.map(m => {
    const data = MOVE_DATA[m.name] || {}
    return {
      level: m.lv,
      name: m.name,
      type: data.type || 'normal',
      power: data.power || '-',
      pp: data.pp || '-'
    }
  }).sort((a, b) => a.level - b.level)
})

const currentMoves = computed(() => {
  if (!isInstance.value || !targetPokemon.value.moves) return []
  return targetPokemon.value.moves.map(m => {
    const data = MOVE_DATA[m.name] || {}
    return { ...m, ...data }
  })
})


const evolutions = computed(() => {
  const list = []
  const id = targetSpeciesId.value
  const caught = gameStore.state.pokedex || []
  const seen = gameStore.state.seenPokedex || []

  const enrichEvo = (evo) => {
    const toId = evo.to.toLowerCase()
    const isCaught = caught.includes(toId)
    const isSeen = isCaught || seen.includes(toId)
    return { ...evo, isSeen, isCaught }
  }

  if (EVOLUTION_TABLE[id]) {
    const ev = EVOLUTION_TABLE[id]
    list.push(enrichEvo({ type: 'level', requirement: `Nv. ${ev.level}`, to: ev.to }))
  }
  if (STONE_EVOLUTIONS[id]) {
    const ev = STONE_EVOLUTIONS[id]
    list.push(enrichEvo({ type: 'stone', requirement: ev.stone, to: ev.to }))
  }
  if (TRADE_EVOLUTIONS[id]) {
    list.push(enrichEvo({ type: 'trade', requirement: 'Intercambio', to: TRADE_EVOLUTIONS[id] }))
  }
  return list
})

const formatRange = (val, unit, factor = 0.15) => {
  if (!val) return '—'
  if (Array.isArray(val)) return `${val[0]}${unit} - ${val[1]}${unit}`
  const min = (val * (1 - factor)).toFixed(1)
  const max = (val * (1 + factor)).toFixed(1)
  return `${min}${unit} - ${max}${unit}`
}

const instancePhysicalData = computed(() => {
  if (!isInstance.value || !species.value) return null
  
  const getRand = (seed, range) => {
    if (!range) return '0.0'
    const min = Array.isArray(range) ? range[0] : range * 0.85
    const max = Array.isArray(range) ? range[1] : range * 1.15
    
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    const normalized = (Math.abs(hash) % 100) / 100
    return (min + normalized * (max - min)).toFixed(1)
  }
  
  const p = props.pokemon
  const uid = p.uid || 'def'
  
  return {
    height: p.height || getRand(uid + 'h', species.value.height),
    weight: p.weight || getRand(uid + 'w', species.value.weight)
  }
})


// Actions ported from PokemonDetailModal
const handleToggleTag = (tag) => {
  if (typeof window.togglePokeTag === 'function') {
    window.togglePokeTag(props.context, props.index, tag)
    if (targetPokemon.value && targetPokemon.value.tags) {
       const idx = targetPokemon.value.tags.indexOf(tag)
       if (idx > -1) targetPokemon.value.tags.splice(idx, 1)
       else targetPokemon.value.tags.push(tag)
    }
  }
}

const handleBuy = () => {
  if (props.extra && typeof window.buyFromMarket === 'function') {
    window.buyFromMarket(props.extra.offerId, props.extra.price, props.extra.type)
    emit('close')
  }
}

const handleEvolve = () => {
  if (typeof window.showStonePicker === 'function') {
    emit('close')
    window.showStonePicker(props.index)
  }
}

// UI Helpers
const hexToRgb = (hex) => {
  if (!hex) return '255, 255, 255'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="750px"
    padding="raw"
    :hide-header="true"
    :show-close-button="false"
    custom-class="pokedex-detail-modal"
    @close="emit('close')"
  >
    <div
      v-if="species"
      class="pdex-detail-content"
      :class="{ 'instance-mode': isInstance }"
      :style="{ 
        '--type-color': PDEX_TYPE_COLORS[species.type[0].toLowerCase()],
        '--type-color-rgb': hexToRgb(PDEX_TYPE_COLORS[species.type[0].toLowerCase()])
      }"
    >
      <!-- Custom Content Header -->
      <header class="pdex-custom-header">
        <div class="poke-identity">
          <span class="p-id">#{{ species.nationalId.padStart(3, '0') }}</span>
          <h2 class="p-name">
            {{ isInstance ? targetPokemon.name : species.name }}
          </h2>
        </div>
        <button
          class="close-vicio"
          @click="emit('close')"
        >
          &times;
        </button>
      </header>

      <!-- BACKGROUND GLOW (Behind everything) -->
      <div class="pdex-bg-glow" />

      <!-- TOP DISPLAY (Only Sprite) -->
      <div class="pdex-main-display">
        <div class="sprite-container">
          <img
            :src="getSprite(targetSpeciesId)"
            class="main-sprite"
          >
        </div>
      </div>

      <!-- TABS NAVIGATION -->
      <nav class="pdex-detail-tabs premium-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="pdex-tab-btn"
          :class="{ active: activeTab === tab.id }"
          :style="{ '--tab-color': activeTab === tab.id ? 'var(--type-color)' : 'rgba(255,255,255,0.4)' }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label pixelated">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- TAB BODY -->
      <div class="pdex-detail-body custom-scrollbar-vicio">
        <!-- Summary Tab -->
        <div
          v-if="activeTab === 'summary'"
          class="pdex-summary-pane"
        >
          <div class="info-grid">
            <div class="info-item">
              <span class="pdex-label pixelated">CATEGORÍA</span>
              <span class="pdex-value pixelated">{{ species.category || 'Pokémon Desconocido' }}</span>
            </div>
            <div class="info-item">
              <span class="pdex-label pixelated">ALTURA</span>
              <span class="pdex-value pixelated">{{ isInstance ? instancePhysicalData.height + 'm' : formatRange(species.height, 'm') }}</span>
            </div>
            <div class="info-item">
              <span class="pdex-label pixelated">PESO</span>
              <span class="pdex-value pixelated">{{ isInstance ? instancePhysicalData.weight + 'kg' : formatRange(species.weight, 'kg') }}</span>
            </div>
          </div>
          <p class="description">
            {{ species.description || 'No hay datos disponibles en la Pokédex.' }}
          </p>

          <div
            v-if="isInstance"
            class="instance-status-section"
          >
            <PokemonStatusSection
              :pokemon="targetPokemon"
              :context="context"
            />
          </div>
          
          <div
            v-if="isInstance && targetPokemon.tags"
            class="tag-section"
          >
            <span class="pdex-label">ETIQUETAS:</span>
            <div class="tags-list">
              <span
                v-for="tag in targetPokemon.tags"
                :key="tag"
                class="tag-badge"
              >{{ tag }}</span>
              <span
                v-if="targetPokemon.tags.length === 0"
                class="no-tags"
              >Sin etiquetas</span>
            </div>
          </div>
        </div>

        <!-- Stats Tab (Enhanced for Instances) -->
        <div
          v-if="activeTab === 'stats'"
          class="pdex-stats-pane"
        >
          <PokemonStatBar
            v-for="s in displayStats"
            :key="s.id"
            :label="s.label"
            :value="s.value"
            :max="s.max"
            :color="s.color"
            :iv="s.iv"
          />
          
          <div class="stat-total">
            <span class="pdex-label pixelated">BST TOTAL:</span>
            <span class="pdex-value pixelated">{{ species.stats.hp + species.stats.atk + species.stats.def + species.stats.spa + species.stats.spd + species.stats.spe }}</span>
          </div>
        </div>

        <!-- Moves Tab (Enhanced for Instances) -->
        <div
          v-if="activeTab === 'moves'"
          class="pdex-moves-pane"
        >
          <div
            v-if="isInstance"
            class="current-moves-section"
          >
            <h4 class="section-title">
              MOVIMIENTOS ACTUALES
            </h4>
            <div class="moves-grid-vicio">
              <div
                v-for="m in currentMoves"
                :key="m.name"
                class="move-card-vicio"
                @click="uiStore.openMoveDetail(m.name)"
              >
                <span
                  class="m-type"
                  :style="{ background: PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'] }"
                />
                <span class="m-name pixelated">{{ m.name }}</span>
                <span class="m-pp pixelated">{{ m.pp }}/{{ m.maxPP }}</span>
              </div>
            </div>
          </div>

          <h4 class="section-title">
            APRENDIZAJE POR NIVEL
          </h4>
          <table class="moves-table">
            <thead>
              <tr>
                <th>NV</th>
                <th>ATAQUE</th>
                <th>TIPO</th>
                <th>POT</th>
                <th>PP</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in moveDetails"
                :key="m.name"
              >
                <td class="move-lv pixelated">
                  {{ m.level }}
                </td>
                <td
                  class="move-name pixelated"
                  @click="uiStore.openMoveDetail(m.name)"
                >
                  {{ m.name }}
                </td>
                <td class="move-type">
                  <span
                    class="type-tag pixelated"
                    :style="{ background: PDEX_TYPE_COLORS[m.type.toLowerCase()] }"
                  >
                    {{ m.type.toUpperCase() }}
                  </span>
                </td>
                <td class="move-power pixelated">
                  {{ m.power }}
                </td>
                <td class="move-pp pixelated">
                  {{ m.pp }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TMs Tab -->
        <PokemonTmsTab
          v-if="activeTab === 'tms'"
          :species-id="targetSpeciesId"
        />

        <!-- Evolution Tab -->
        <PokemonEvolutionsTab
          v-if="activeTab === 'evolve'"
          :evolutions="evolutions"
          :species-name="species.name"
          :species-id="targetSpeciesId"
        />
      </div>

      <!-- ACTION FOOTER (Only for Instance Mode) -->
      <PokemonActionFooter 
        v-if="isInstance"
        :context="context"
        :extra="extra"
        @buy="handleBuy"
        @evolve="handleEvolve"
        @toggle-tag="handleToggleTag"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokedex-detail";
@use "@/styles/components/unified-pokemon-detail";
</style>
