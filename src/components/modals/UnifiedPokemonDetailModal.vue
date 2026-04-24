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
import PVTooltip from '@/components/common/PVTooltip.vue'
import { POKEMON_TAGS, hasPokemonTag } from '@/logic/constants/tags'

import PokemonTmsTab from '@/components/pokemon-detail/PokemonTmsTab.vue'
import PokemonEvolutionsTab from '@/components/pokemon-detail/PokemonEvolutionsTab.vue'
import PokemonStatsTab from '@/components/pokemon-detail/PokemonStatsTab.vue'
import PokemonMovesTab from '@/components/pokemon-detail/PokemonMovesTab.vue'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import PokemonActionFooter from '@/components/pokemon-detail/PokemonActionFooter.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
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

// Normalize data source (Props or UI Store)
const uiData = computed(() => uiStore.modals?.PokemonDetail?.data || {})
const finalIndex = computed(() => props.index !== -1 ? props.index : (uiData.value.index ?? -1))
const finalContext = computed(() => (props.context && props.context !== 'pokedex') ? props.context : (uiData.value.context || 'pokedex'))

const targetPokemon = computed(() => {
  // Try to resolve from store first for reactivity
  if (finalIndex.value > -1) {
    if (finalContext.value === 'team') return gameStore.state.team[finalIndex.value]
    if (finalContext.value === 'box') return gameStore.state.box[finalIndex.value]
  }
  // Fallback to passed object (e.g. for markets or non-local sources)
  return props.pokemon || uiData.value.pokemon
})

const isInstance = computed(() => !!targetPokemon.value)

const targetSpeciesId = computed(() => {
  const id = isInstance.value ? targetPokemon.value.id : props.speciesId
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
  
  if (props.context === 'pokedex') {
    base.push({ id: 'tms', label: 'MTs', icon: '💿' })
    base.push({ id: 'evolve', label: 'EVOL.', icon: '✨' })
  }
  
  return base
})

const getSprite = (id, isShiny = false) => getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny: isShiny })

// Stats Calculation
const displayStats = computed(() => {
  if (!species.value) return []
  const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE' }
  const colors = { hp: '#ff5959', atk: '#f5ac78', def: '#fae078', spa: '#9db7f5', spd: '#a7db8d', spe: '#fa92b2' }
  return Object.keys(species.value.stats).map(key => {
    const base = species.value.stats[key]
    const current = isInstance.value ? (targetPokemon.value[key] || base) : base
    return {
      id: key,
      label: labels[key],
      value: current,
      baseValue: base,
      max: 255,
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
      cat: data.cat || 'physical',
      power: data.power || '-',
      acc: data.acc || '-',
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
  const p = props.pokemon
  const uid = p.uid || 'def'
  const getRand = (seed, range) => {
    if (!range) return '0.0'
    const min = Array.isArray(range) ? range[0] : range * 0.85
    const max = Array.isArray(range) ? range[1] : range * 1.15
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    const normalized = (Math.abs(hash) % 100) / 100
    return (min + normalized * (max - min)).toFixed(1)
  }
  return {
    height: p.height || getRand(uid + 'h', species.value.height),
    weight: p.weight || getRand(uid + 'w', species.value.weight)
  }
})

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

const hexToRgb = (hex) => {
  if (!hex) return '255, 255, 255'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const hasTag = (tagId) => {
  return hasPokemonTag(targetPokemon.value, tagId)
}

const handleToggleTag = (tag) => {
  const dbId = tag.dbId || tag.id
  console.log(`[Tag] Toggling ${dbId} for context: ${finalContext.value}, index: ${finalIndex.value}`)
  if (isInstance.value && finalIndex.value > -1 && typeof window.togglePokeTag === 'function') {
    window.togglePokeTag(finalContext.value, finalIndex.value, dbId)
  } else {
    console.warn('[Tag] Toggle conditions not met:', { isInstance: isInstance.value, index: finalIndex.value, hasBridge: typeof window.togglePokeTag === 'function' })
  }
}

const handleEditNickname = () => {
  if (!isInstance.value) return
  
  uiStore.openPrompt({
    title: 'Cambiar Apodo',
    message: `Introduce un nuevo nombre para tu ${species.value.name}:`,
    initialValue: targetPokemon.value.nickname || species.value.name,
    confirmText: 'Guardar',
    onConfirm: (val) => {
      const newNick = val?.trim() || null
      targetPokemon.value.nickname = newNick
      uiStore.notify(`¡Apodo cambiado a ${newNick || species.value.name}!`, '✨')
      gameStore.save(false)
    }
  })
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="750px"
    padding="raw"
    :hide-header="true"
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
        <div
          class="poke-identity"
          :class="{ 'has-nickname': targetPokemon?.nickname }"
        >
          <span class="p-id">#{{ species.nationalId.padStart(3, '0') }}</span>
          <div class="name-container">
            <h2 class="p-name">
              {{ (targetPokemon?.nickname || species.name).toUpperCase() }}
              <button 
                v-if="isInstance" 
                class="edit-nick-btn" 
                title="Cambiar apodo"
                @click.stop="handleEditNickname"
              >
                ✏️
              </button>
            </h2>
            <span
              v-if="targetPokemon?.nickname"
              class="p-species-subtitle"
            >
              {{ species.name.toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="header-right">
          <div class="p-types">
            <span
              v-for="t in species.type"
              :key="t"
              class="m-type-tag pixelated"
              :style="{ background: PDEX_TYPE_COLORS[t.toLowerCase()] }"
            >
              {{ t.toUpperCase() }}
            </span>
          </div>
        </div>
      </header>

      <!-- BACKGROUND GLOW -->
      <div class="pdex-bg-glow" />

      <!-- TOP DISPLAY -->
      <div class="pdex-main-display">
        <div 
          class="sprite-container"
          :class="{ 'is-guardian': targetPokemon?.isGuardian, 'is-shiny': targetPokemon?.isShiny }"
        >
          <img
            :src="getSprite(targetSpeciesId, targetPokemon?.isShiny)"
            class="main-sprite"
            @error="e => e.target.style.display = 'none'"
          >
          
          <!-- Standardized Shiny FX -->
          <div
            v-if="targetPokemon?.isShiny"
            class="shiny-sparkles"
          >
            <div
              v-for="i in 5"
              :key="i"
              class="sparkle"
            />
          </div>
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
      <div class="pdex-detail-body">
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
          
          <!-- Interactive Tags -->
          <div
            v-if="isInstance"
            class="tag-section"
          >
            <span class="pdex-label">ETIQUETAS:</span>
            <div class="tags-list">
              <PVTooltip
                v-for="t in POKEMON_TAGS"
                :key="t.id"
                :title="t.label"
                :description="t.desc"
                position="top"
              >
                <button
                  class="tag-emoji-btn"
                  :class="{ active: hasTag(t.id) }"
                  :style="hasTag(t.id) ? { 
                    background: `rgba(${hexToRgb(t.color)}, 0.15)`, 
                    borderColor: `rgba(${hexToRgb(t.color)}, 0.4)`,
                    color: t.color,
                    boxShadow: `0 4px 15px rgba(${hexToRgb(t.color)}, 0.2)`
                  } : {}"
                  @click.stop="handleToggleTag(t)"
                >
                  <span class="t-icon">{{ t.icon }}</span>
                  <span class="t-label pixelated">{{ t.shortLabel }}</span>
                </button>
              </PVTooltip>
            </div>
          </div>

          <!-- DB Info (UID) -->
          <div
            v-if="isInstance"
            class="db-info-section"
          >
            <div class="uid-display">
              <span class="pdex-label pixelated">ID ÚNICO DB:</span>
              <span class="uid-value pixelated">{{ targetPokemon.uid }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Tab -->
        <PokemonStatsTab
          v-if="activeTab === 'stats'"
          :display-stats="displayStats"
          :species="species"
          :is-instance="isInstance"
        />

        <!-- Moves Tab -->
        <PokemonMovesTab
          v-if="activeTab === 'moves'"
          :is-instance="isInstance"
          :current-moves="currentMoves"
          :move-details="moveDetails"
        />

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

      <PokemonActionFooter
        v-if="isInstance"
        :context="context"
        :extra="extra"
        @buy="handleBuy"
        @evolve="handleEvolve"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokedex-detail" as *;
@use "@/styles/components/unified-pokemon-detail" as *;
</style>
