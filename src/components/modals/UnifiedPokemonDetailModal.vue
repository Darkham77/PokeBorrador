<script setup lang="ts">
// Universal Pokémon info panel (Pokedex + Instance)
import { ref, computed, type MaybeRefOrGetter } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { usePokemonDetail } from '@/composables/pokemon/usePokemonDetail'
import { PDEX_TYPE_COLORS } from '@/logic/constants/pokedexConstants'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import PokemonDetailHeader from '@/components/pokemon-detail/PokemonDetailHeader.vue'
import PokemonDetailTabContent from '@/components/pokemon-detail/PokemonDetailTabContent.vue'
import PokemonActionFooter from '@/components/pokemon-detail/PokemonActionFooter.vue'
import type { Pokemon, PokemonStorageLocation, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { PokemonTagId } from '@/logic/constants/tags'


interface Props {
  show?: boolean
  speciesId?: PokemonSpeciesId
  pokemon?: Pokemon | null
  index?: number
  context?: PokemonSelectionSource
  extra?: { offerId?: string, price?: number, type?: string } | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  speciesId: undefined,
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
} = usePokemonDetail(props as Record<string, MaybeRefOrGetter<unknown>>) // open-record: Generic key-value data dictionary container

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

const handleToggleTag = (tagOrId: PokemonTagId | { id?: PokemonTagId, dbId?: PokemonTagId }) => {
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
        '--type-color': primaryTypeColor
      }"
    >
      <!-- Custom Content Header -->
      <PokemonDetailHeader
        :species="species"
        :target-pokemon="targetPokemon"
        :is-instance="isInstance"
        @edit-nickname="handleEditNickname"
      />

      <!-- TOP DISPLAY -->
      <div class="upd-main-display">
        <div class="upd-sprite-container">
          <PVSpriteFX
            :is-shiny="targetPokemon?.isShiny"
            :is-guardian="targetPokemon?.isGuardian"
          >
            <img
              :src="getSprite(targetSpeciesId, targetPokemon?.isShiny)"
              :alt="targetPokemon?.nickname || species?.name || 'Pokémon'"
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
      <PokemonDetailTabContent
        :active-tab="activeTab"
        :species="species"
        :clean-category="cleanCategory"
        :is-instance="isInstance"
        :instance-physical-data="instancePhysicalData"
        :target-pokemon="targetPokemon || null"
        :context="context"
        :target-species-id="targetSpeciesId"
        :capture-date-formatted="captureDateFormatted"
        :display-stats="displayStats"
        :current-moves="currentMoves"
        :move-details="moveDetails"
        :evolutions="evolutions"
        @reorder-moves="handleReorderMoves"
      />

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
