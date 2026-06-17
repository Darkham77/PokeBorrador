<script setup lang="ts">
// Universal Pokémon info panel (Pokedex + Instance)
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { usePokemonDetail } from '@/composables/pokemon/usePokemonDetail'
import { PDEX_TYPE_COLORS } from '@/logic/constants/pokedexConstants'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'

import PokemonTmsTab from '@/components/pokemon-detail/PokemonTmsTab.vue'
import PokemonEvolutionsTab from '@/components/pokemon-detail/PokemonEvolutionsTab.vue'
import PokemonStatsTab from '@/components/pokemon-detail/PokemonStatsTab.vue'
import PokemonMovesTab from '@/components/pokemon-detail/PokemonMovesTab.vue'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import PokemonActionFooter from '@/components/pokemon-detail/PokemonActionFooter.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'


interface Props {
  show?: boolean
  speciesId?: string
  pokemon?: Pokemon | null
  index?: number
  context?: string // 'team', 'box', 'market', 'pokedex'
  extra?: { offerId?: string, price?: number, type?: string } | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  speciesId: '',
  pokemon: null,
  index: -1,
  context: 'pokedex',
  extra: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUIStore()
const gameStore = useGameStore()

// --- COMPOSABLE LOGIC ---
const {
  targetPokemon,
  isInstance,
  targetSpeciesId,
  species,
  cleanCategory,
  evolutions,
  displayStats,
  moveDetails,
  currentMoves,
  canStoneEvolve,
  instancePhysicalData,
  captureDateFormatted,
  getSprite,
  finalIndex,
  finalContext
} = usePokemonDetail(props as { pokemon: Pokemon | null, speciesId: string })

// --- LOCAL UI STATE ---
const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const activeTab = ref('summary')

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

const formatRange = (val: number | [number, number] | undefined, unit: string, factor = 0.15) => {
  if (!val) return '—'
  if (Array.isArray(val)) return `${val[0]}${unit} - ${val[1]}${unit}`
  const min = (val * (1 - factor)).toFixed(1)
  const max = (val * (1 + factor)).toFixed(1)
  return `${min}${unit} - ${max}${unit}`
}

const getCategoryDescription = (cat: string) => {
  const c = cat.toLowerCase()
  if (c.includes('nueva especie')) return 'Pokémon extremadamente raro que contiene el ADN de todos los demás Pokémon. Se creía puramente mitológico.'
  if (c.includes('genético')) return 'Pokémon creado artificialmente mediante manipulación avanzada de ADN y experimentos científicos.'
  if (c.includes('legendario')) return 'Pokémon de gran poder que aparece en los mitos y leyendas. Suele ser único en su especie.'
  if (c.includes('mítico')) return 'Pokémon tan singular que su existencia es cuestionada por muchos científicos y exploradores.'
  if (c.includes('inicial')) return 'Pokémon que suele entregarse a los entrenadores que comienzan su aventura regional.'
  if (c.includes('fósil')) return 'Pokémon prehistórico resucitado a partir de material genético preservado en fósiles.'
  
  return `Clasificación: ${cat}. Define los rasgos biológicos principales y el comportamiento predominante de esta especie.`
}

// --- HANDLERS ---
const handleBuy = () => {
  const win = window as unknown as { 
    buyFromMarket?: (offerId: string, price: number, type: string) => void 
  }
  if (props.extra && typeof win.buyFromMarket === 'function') {
    win.buyFromMarket(props.extra.offerId || '', props.extra.price || 0, props.extra.type || '')
    emit('close')
  }
}

const handleEvolve = () => {
  const inventoryStore = useInventoryStore()
  inventoryStore.activeMainTab = 'productos'
  inventoryStore.activeCategory = 'stones'
  emit('close')
  uiStore.toggleInventory(finalContext.value as 'team' | 'box', finalIndex.value)
}

const hexToRgb = (hex: string) => {
  if (!hex) return '255, 255, 255'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const handleToggleTag = (tagOrId: string | { id?: string, dbId?: string }) => {
  const tagId = typeof tagOrId === 'string' ? tagOrId : (tagOrId.id || tagOrId.dbId)
  if (tagId && isInstance.value && finalIndex.value > -1) {
    const ctx = finalContext.value
    if (ctx === 'team' || ctx === 'box') {
      gameStore.togglePokeTag(ctx, finalIndex.value, tagId)
    }
  }
}

const handleEditNickname = () => {
  if (!isInstance.value || !targetPokemon.value) return
  
  uiStore.openPrompt({
    title: 'Cambiar Apodo',
    message: `Introduce un nuevo nombre para tu ${species.value?.name || 'Pokémon'}:`,
    initialValue: targetPokemon.value.nickname || species.value?.name || '',
    confirmText: 'Guardar',
    onConfirm: (val: string) => {
      const newNick = val?.trim() || null
      if (targetPokemon.value) targetPokemon.value.nickname = newNick
      uiStore.notify(`¡Apodo cambiado a ${newNick || species.value?.name || 'Pokémon'}!`, '✨')
      gameStore.save(false)
    }
  })
}

const handleReorderMoves = (from: number, to: number) => {
  if (isInstance.value && targetPokemon.value) {
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
        '--type-color': (PDEX_TYPE_COLORS as Record<string, string>)[species.type[0].toLowerCase()] || '#888',
        '--type-color-rgb': hexToRgb((PDEX_TYPE_COLORS as Record<string, string>)[species.type[0].toLowerCase()] || '#888')
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
            <PokemonTypeTag
              v-for="t in species.type"
              :key="t"
              :type="t"
              size="md"
            />
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
              @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
            >
          </PVSpriteFX>
        </div>

        <!-- Píldora de Insignias Global (Fuera de tabs) -->
        <div
          v-if="isInstance && targetPokemon"
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
              <span class="ps-info-value pixelated">{{ isInstance && instancePhysicalData ? instancePhysicalData.height + 'm' : formatRange(species.height || undefined, 'm') }}</span>
            </PVTooltip>

            <PVTooltip
              title="PESO"
              description="El peso promedio de esta especie de Pokémon."
              position="top"
              tag="div"
              class="info-item"
            >
              <span class="upd-info-label pixelated">PESO</span>
              <span class="ps-info-value pixelated">{{ isInstance && instancePhysicalData ? instancePhysicalData.weight + 'kg' : formatRange(species.weight || undefined, 'kg') }}</span>
            </PVTooltip>
          </div>
          <div
            v-if="isInstance"
            class="instance-status-section"
          >
            <PokemonStatusSection
              v-if="targetPokemon"
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
              <span class="uid-value pixelated">{{ targetPokemon?.uid || 'N/A' }}</span>
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
        :context="finalContext"
        :extra="extra"
        :can-evolve-stone="canStoneEvolve"
        @buy="handleBuy"
        @evolve="handleEvolve"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
