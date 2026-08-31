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
import PokemonTrophiesTab from '@/components/pokemon-detail/PokemonTrophiesTab.vue'
import PokemonActionFooter from '@/components/pokemon-detail/PokemonActionFooter.vue'
import type { Pokemon, PokemonStorageLocation, PokemonCompetitionTrophy } from '@/types/pokemon/pokemon'
import { createSpeciesDimensionTooltip } from '@/logic/pokemon/physicalDimensionsMath'
import { useEventStore } from '@/stores/events'
import { resolveTrophyDisplayName } from '@/logic/events/eventEngine'


const DEFAULT_SPECIES_RANGE_VARIATION_FACTOR = 0.15;
const NATIONAL_ID_PADDING_LENGTH = 3;
const HEX_RGB_SUBSTRING_OFFSET = 2;

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
const eventStore = useEventStore()

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
const primaryTypeColor = computed(() => {
  const type = species.value?.type[0]
  return type ? PDEX_TYPE_COLORS[type] ?? '#888' : '#888'
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

  if (isInstance.value && targetPokemon.value?.trophies && targetPokemon.value.trophies.length > 0) {
    base.push({ id: 'trophies', label: 'TROFEOS', icon: '🏆' })
  }
  
  return base
})

const formatRange = (val: number | [number, number] | undefined, unit: string, factor = DEFAULT_SPECIES_RANGE_VARIATION_FACTOR) => {
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
  if (props.extra) {
    (Reflect.get(window, 'buyFromMarket') as ((offerId: string, price: number, type: string) => void) | undefined)?.(props.extra.offerId || '', props.extra.price || 0, props.extra.type || '')
    emit('close')
  }
}

const handleEvolve = () => {
  const inventoryStore = useInventoryStore()
  inventoryStore.activeMainTab = 'productos'
  inventoryStore.activeCategory = 'stones'
  emit('close')
  uiStore.toggleInventory(finalContext.value as PokemonStorageLocation, finalIndex.value)
}

const HEX_RGB_HEX_START_INDEX = 1

const DEFAULT_WHITE_RGB_FALLBACK = '255, 255, 255'

const hexToRgb = (hex: string) => {
  if (!hex) return DEFAULT_WHITE_RGB_FALLBACK
  const r = parseInt(hex.slice(HEX_RGB_HEX_START_INDEX, HEX_RGB_HEX_START_INDEX + HEX_RGB_SUBSTRING_OFFSET), 16)
  const g = parseInt(hex.slice(HEX_RGB_HEX_START_INDEX + HEX_RGB_SUBSTRING_OFFSET, HEX_RGB_HEX_START_INDEX + HEX_RGB_SUBSTRING_OFFSET * 2), 16)
  const b = parseInt(hex.slice(HEX_RGB_HEX_START_INDEX + HEX_RGB_SUBSTRING_OFFSET * 2, HEX_RGB_HEX_START_INDEX + HEX_RGB_SUBSTRING_OFFSET * 3), 16)
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

const getTrophyMedal = (rank?: string) => {
  if (rank === 'first') return '🥇'
  if (rank === 'second') return '🥈'
  if (rank === 'third') return '🥉'
  return '🏆'
}

const getTrophyRankLabel = (rank?: string) => {
  if (rank === 'first') return '1º LUGAR'
  if (rank === 'second') return '2º LUGAR'
  if (rank === 'third') return '3º LUGAR'
  return 'GANADOR'
}

const getTrophyRankClass = (rank?: string) => {
  if (rank === 'first') return 'rank-gold'
  if (rank === 'second') return 'rank-silver'
  if (rank === 'third') return 'rank-bronze'
  return 'rank-default'
}

const resolveTrophyEventName = (trophy: PokemonCompetitionTrophy) => {
  return resolveTrophyDisplayName(
    trophy,
    eventStore.allEvents,
    targetSpeciesId.value
  )
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
        '--type-color': primaryTypeColor,
        '--type-color-rgb': hexToRgb(primaryTypeColor)
      }"
    >
      <!-- Custom Content Header -->
      <header class="pdex-custom-header">
        <div
          class="poke-identity"
          :class="{ 'has-nickname': targetPokemon?.nickname }"
        >
          <span class="p-id">#{{ species.nationalId.padStart(NATIONAL_ID_PADDING_LENGTH, '0') }}</span>
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
              <span class="btn-emoji">✏️</span>
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
              :title="isInstance && instancePhysicalData ? 'ALTURA: ' + instancePhysicalData.height + 'm (' + instancePhysicalData.heightTier.label + ')' : 'ALTURA (ESPECIE)'"
              :description="isInstance && instancePhysicalData ? instancePhysicalData.heightTooltip : createSpeciesDimensionTooltip('ALTURA', 'm', species.height)"
              position="top"
              tag="div"
              class="info-item"
            >
              <span class="upd-info-label pixelated">ALTURA</span>
              <div class="physical-val-wrapper">
                <span class="ps-info-value pixelated">{{ isInstance && instancePhysicalData ? instancePhysicalData.height + 'm' : formatRange(species.height || undefined, 'm') }}</span>
                <span
                  v-if="isInstance && instancePhysicalData?.heightTier"
                  class="physical-tier-badge pixelated"
                  :class="instancePhysicalData.heightTier.cssClass"
                >{{ instancePhysicalData.heightTier.label }}</span>
              </div>
            </PVTooltip>

            <PVTooltip
              :title="isInstance && instancePhysicalData ? 'PESO: ' + instancePhysicalData.weight + 'kg (' + instancePhysicalData.weightTier.label + ')' : 'PESO (ESPECIE)'"
              :description="isInstance && instancePhysicalData ? instancePhysicalData.weightTooltip : createSpeciesDimensionTooltip('PESO', 'kg', species.weight)"
              position="top"
              tag="div"
              class="info-item"
            >
              <span class="upd-info-label pixelated">PESO</span>
              <div class="physical-val-wrapper">
                <span class="ps-info-value pixelated">{{ isInstance && instancePhysicalData ? instancePhysicalData.weight + 'kg' : formatRange(species.weight || undefined, 'kg') }}</span>
                <span
                  v-if="isInstance && instancePhysicalData?.weightTier"
                  class="physical-tier-badge pixelated"
                  :class="instancePhysicalData.weightTier.cssClass"
                >{{ instancePhysicalData.weightTier.label }}</span>
              </div>
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

          <!-- Competition Trophies History Section in Summary (After description, before DB IDs) -->
          <div
            v-if="isInstance"
            class="summary-trophies-section"
          >
            <div class="summary-trophies-header pixelated">
              <span class="trophies-header-icon">🏆</span>
              <span class="trophies-header-title">HISTORIAL DE COMPETENCIAS</span>
              <span
                v-if="targetPokemon?.trophies && targetPokemon.trophies.length > 0"
                class="trophies-count-tag pixelated"
              >
                {{ targetPokemon.trophies.length }}
              </span>
            </div>

            <!-- Empty State in Summary -->
            <div
              v-if="!targetPokemon?.trophies || targetPokemon.trophies.length === 0"
              class="summary-trophies-empty pixelated"
            >
              Sin trofeos ni podios de competencias registrados.
            </div>

            <!-- Trophies List in Summary -->
            <div
              v-else
              class="summary-trophies-list"
            >
              <div
                v-for="(trophy, idx) in targetPokemon.trophies"
                :key="`${trophy.eventId}-${trophy.categoryId}-${trophy.awardedAt}-${idx}`"
                class="summary-trophy-card"
                :class="getTrophyRankClass(trophy.rank)"
              >
                <span class="trophy-medal-symbol">{{ getTrophyMedal(trophy.rank) }}</span>
                <div class="trophy-info-compact">
                  <div class="trophy-top-line">
                    <span class="trophy-event-name pixelated">{{ resolveTrophyEventName(trophy) }}</span>
                    <span class="trophy-rank-label pixelated">{{ getTrophyRankLabel(trophy.rank) }}</span>
                  </div>
                  <div class="trophy-bottom-line">
                    <span class="trophy-category-name pixelated">{{ trophy.categoryName }}</span>
                    <span
                      v-if="trophy.score !== undefined"
                      class="trophy-score-value pixelated"
                    >{{ trophy.score }} pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

        <!-- Trophies Tab -->
        <PokemonTrophiesTab
          v-if="activeTab === 'trophies'"
          :trophies="targetPokemon?.trophies"
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
