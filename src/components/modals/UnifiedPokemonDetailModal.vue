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

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'

import PokemonSummaryTab from '@/components/pokemon-detail/PokemonSummaryTab.vue'
import PokemonTmsTab from '@/components/pokemon-detail/PokemonTmsTab.vue'
import PokemonEvolutionsTab from '@/components/pokemon-detail/PokemonEvolutionsTab.vue'
import PokemonStatsTab from '@/components/pokemon-detail/PokemonStatsTab.vue'
import PokemonMovesTab from '@/components/pokemon-detail/PokemonMovesTab.vue'
import PokemonTrophiesTab from '@/components/pokemon-detail/PokemonTrophiesTab.vue'
import PokemonActionFooter from '@/components/pokemon-detail/PokemonActionFooter.vue'
import type { Pokemon, PokemonStorageLocation } from '@/types/pokemon/pokemon'


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
              <span class="emoji">✏️</span>
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
          <span class="emoji">{{ tab.icon }}</span>
          <span class="tab-label pixelated">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- TAB BODY -->
      <div class="upd-core-body">
        <!-- Summary Tab -->
        <PokemonSummaryTab
          v-if="activeTab === 'summary'"
          :species="species"
          :clean-category="cleanCategory"
          :is-instance="isInstance"
          :instance-physical-data="instancePhysicalData"
          :target-pokemon="targetPokemon || null"
          :context="context"
          :target-species-id="targetSpeciesId"
          :capture-date-formatted="captureDateFormatted"
        />

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
