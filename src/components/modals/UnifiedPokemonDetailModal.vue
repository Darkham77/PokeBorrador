<!-- [PureVue-Ignore-Length] -->
<script setup>
// Universal Pokémon info panel (Pokedex + Instance).
import { ref, computed } from 'vue'
import { useWindowListener } from '@/composables/useWindowListener'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { PDEX_TYPE_COLORS, POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'

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

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

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

const cleanCategory = computed(() => {
  if (!species.value?.category) return 'Desconocido'
  return species.value.category.replace(/^Pokémon\s+/i, '')
})

const tabs = computed(() => {
  const base = [
    { id: 'summary', label: 'RESUMEN', icon: '📝' },
    { id: 'stats', label: isInstance.value ? 'STATS+' : 'STATS', icon: '📊' },
    { id: 'moves', label: 'ATAQUES', icon: '⚔️' },
  ]
  
  if (props.context === 'pokedex') {
    base.push({ id: 'tms', label: 'MTs', icon: '💿' })
  }

  if (evolutions.value.length > 0) {
    base.push({ id: 'evolve', label: 'EVOL.', icon: '✨' })
  }
  
  return base
})

const getSprite = (id, isShiny = false) => getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny: isShiny })

// Stats Calculation
const displayStats = computed(() => {
  if (!species.value) return []
  const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE' }
  const colors = { 
    hp: 'Rgba(255, 89, 89, 1)', 
    atk: 'Rgba(245, 172, 120, 1)', 
    def: 'Rgba(250, 224, 120, 1)', 
    spa: 'Rgba(157, 183, 245, 1)', 
    spd: 'Rgba(167, 219, 141, 1)', 
    spe: 'Rgba(250, 146, 178, 1)' 
  }
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
  // Handle single and multi-evolutions (like Eevee)
  Object.keys(STONE_EVOLUTIONS).forEach(key => {
    if (key === id || key.startsWith(`${id}_`)) {
      const ev = STONE_EVOLUTIONS[key]
      list.push(enrichEvo({ type: 'stone', requirement: ev.stone, to: ev.to }))
    }
  })
  if (TRADE_EVOLUTIONS[id]) {
    list.push(enrichEvo({ type: 'trade', requirement: 'Intercambio', to: TRADE_EVOLUTIONS[id] }))
  }
  return list
})

const canStoneEvolve = computed(() => {
  const id = targetSpeciesId.value
  return Object.keys(STONE_EVOLUTIONS).some(key => key === id || key.startsWith(`${id}_`))
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

const handleToggleTag = (tagOrId) => {
  const tagId = typeof tagOrId === 'string' ? tagOrId : (tagOrId.id || tagOrId.dbId)
  if (isInstance.value && finalIndex.value > -1 && typeof window.togglePokeTag === 'function') {
    window.togglePokeTag(finalContext.value, finalIndex.value, tagId)
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

const captureDateFormatted = computed(() => {
  const p = targetPokemon.value
  if (!p) return null
  const dateVal = p.captureDate || p.timestamp || p.date || p.created_at || p.obtainedAt
  
  if (!dateVal) return isInstance.value ? 'SIN FECHA' : null
  
  try {
    const date = new Date(dateVal)
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (_) {
    return null
  }
})

const getCategoryDescription = (cat) => {
  const c = cat.toLowerCase()
  if (c.includes('nueva especie')) return 'Pokémon extremadamente raro que contiene el ADN de todos los demás Pokémon. Se creía puramente mitológico.'
  if (c.includes('genético')) return 'Pokémon creado artificialmente mediante manipulación avanzada de ADN y experimentos científicos.'
  if (c.includes('legendario')) return 'Pokémon de gran poder que aparece en los mitos y leyendas. Suele ser único en su especie.'
  if (c.includes('mítico')) return 'Pokémon tan singular que su existencia es cuestionada por muchos científicos y exploradores.'
  if (c.includes('inicial')) return 'Pokémon que suele entregarse a los entrenadores que comienzan su aventura regional.'
  if (c.includes('fósil')) return 'Pokémon prehistórico resucitado a partir de material genético preservado en fósiles.'
  
  return `Clasificación: ${cat}. Define los rasgos biológicos principales y el comportamiento predominante de esta especie.`
}

const handleReorderMoves = (from, to) => {
  if (isInstance.value) {
    gameStore.reorderMoves(targetPokemon.value, from, to)
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :width="isSmallScreen ? '100dvw' : '700px'"
    :max-width="isSmallScreen ? '100dvw' : '700px'"
    padding="raw"
    :hide-header="true"
    custom-class="pokedex-detail-modal"
    @close="emit('close')"
  >
    <div
      v-if="species"
      class="upd-core-container"
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
          <div
            class="name-with-edit"
            style="display: flex; align-items: center; gap: 8px;"
          >
            <button 
              v-if="isInstance" 
              class="edit-nick-btn" 
              style="font-size: 10px; padding: 0; opacity: 0.5; cursor: pointer; flex-shrink: 0;"
              @click.stop="handleEditNickname"
            >
              ✏️
            </button>
            <div class="name-container">
              <span
                v-if="targetPokemon?.nickname"
                class="p-nickname-prefix"
              >
                {{ targetPokemon.nickname }}
              </span>
              <h2
                class="p-name"
                style="margin: 0;"
              >
                {{ species.name.toUpperCase() }}
              </h2>
            </div>
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

      <!-- TOP DISPLAY -->
      <div class="upd-main-display">
        <div class="upd-sprite-container">
          <PVSpriteFX
            :is-shiny="targetPokemon?.isShiny"
            :is-guardian="targetPokemon?.isGuardian"
          >
            <img
              :src="getSprite(targetSpeciesId, targetPokemon?.isShiny)"
              class="main-sprite"
              @error="e => e.target.style.display = 'none'"
            >
          </PVSpriteFX>
        </div>

        <!-- Píldora de Insignias Global (Fuera de tabs) -->
        <div
          v-if="isInstance"
          class="upd-floating-tags"
        >
          <UnifiedBadgePill
            :pokemon="targetPokemon"
            :vertical="false"
            size="xl"
            editable
            show-all
            top="0"
            left="0"
            style="position: relative;"
            @toggle-tag="handleToggleTag"
          />
        </div>
      </div>


      <!-- TABS NAVIGATION -->
      <nav class="pdex-detail-tabs premium-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="upd-tab-btn"
          :class="{ active: activeTab === tab.id }"
          :style="{ '--tab-color': activeTab === tab.id ? 'var(--type-color)' : 'Rgba(255,255,255,0.4)' }"
          @click.stop="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label pixelated">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- TAB BODY -->
      <div class="upd-core-body">
        <!-- Summary Tab -->
        <div
          v-if="activeTab === 'summary'"
          class="pdex-summary-pane"
        >
          <div class="info-grid">
            <PVTooltip
              :title="'CATEGORÍA: ' + cleanCategory"
              :description="getCategoryDescription(cleanCategory)"
              position="top"
              tag="div"
              class="info-item"
            >
              <span class="upd-info-label pixelated">CATEGORÍA</span>
              <span class="ps-info-value pixelated">{{ cleanCategory }}</span>
            </PVTooltip>

            <PVTooltip
              title="ALTURA"
              description="La altura promedio de esta especie de Pokémon."
              position="top"
              tag="div"
              class="info-item"
            >
              <span class="upd-info-label pixelated">ALTURA</span>
              <span class="ps-info-value pixelated">{{ isInstance ? instancePhysicalData.height + 'm' : formatRange(species.height, 'm') }}</span>
            </PVTooltip>

            <PVTooltip
              title="PESO"
              description="El peso promedio de esta especie de Pokémon."
              position="top"
              tag="div"
              class="info-item"
            >
              <span class="upd-info-label pixelated">PESO</span>
              <span class="ps-info-value pixelated">{{ isInstance ? instancePhysicalData.weight + 'kg' : formatRange(species.weight, 'kg') }}</span>
            </PVTooltip>
          </div>
          <div
            v-if="isInstance"
            class="instance-status-section"
          >
            <PokemonStatusSection
              :pokemon="targetPokemon"
              :context="context"
            />
          </div>

          <p class="description">
            {{ species.description || 'No hay datos disponibles en la Pokédex.' }}
          </p>

          <!-- DB Info (UID + Capture Date) -->
          <div
            v-if="isInstance"
            class="db-info-section"
          >
            <div class="uid-display">
              <span class="upd-info-label pixelated">ID ÚNICO DB:</span>
              <span class="uid-value pixelated">{{ targetPokemon.uid }}</span>
            </div>
            <div
              v-if="captureDateFormatted"
              class="capture-date-display"
            >
              <span class="upd-info-label pixelated">CAPTURADO EL:</span>
              <span class="date-value pixelated">{{ captureDateFormatted.toUpperCase() }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Tab -->
        <PokemonStatsTab
          v-if="activeTab === 'stats'"
          :display-stats="displayStats"
          :species="species"
          :is-instance="isInstance"
          :pokemon="targetPokemon"
        />

        <!-- Moves Tab -->
        <PokemonMovesTab
          v-if="activeTab === 'moves'"
          :is-instance="isInstance"
          :current-moves="currentMoves"
          :move-details="moveDetails"
          @reorder-moves="handleReorderMoves"
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
        :can-evolve-stone="canStoneEvolve"
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
