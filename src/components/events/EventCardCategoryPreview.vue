<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { CompetitionParticipant } from '@/types/system/stores'
import {
  resolveSubCompetitionDirection,
  getSubCompTitle,
  getSubCompDescription,
  getSubCompIcon,
  evaluatePokemonForSubCompetition,
  getEligiblePokemonForSubCompetition,
  isPokemonEnrolledInOtherSubCompetition,
  type Event as GameEvent,
  type SubCompetitionConfig,
  type ResolvedSubCompetition
} from '@/logic/events/eventEngine'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getServerInstant } from '@/logic/utils/timeUtils'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  event: GameEvent
  idPrefix?: string
  resolvedSubComps: ResolvedSubCompetition[]
  cardSpeciesList: PokemonSpeciesId[]
}

const props = withDefaults(defineProps<Props>(), {
  idPrefix: ''
})

const eventStore = useEventStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const getEntryForCategory = (catId: string) => {
  return eventStore.userEntries[`${props.event.id}:${catId}`] || (catId === 'ivs' ? eventStore.userEntries[props.event.id] : undefined)
}

const enrolledCategoriesCount = computed(() => {
  if (props.event.type !== 'competition') return 0
  let count = 0
  for (const sub of props.resolvedSubComps) {
    if (getParticipantForCategory(sub)) {
      count++
    }
  }
  return count
})

const getParticipantForCategory = (sub: SubCompetitionConfig): CompetitionParticipant | null => {
  const entry = getEntryForCategory(sub.id)
  if (!entry) return null
  const uid = entry.pokemon_uid
  const found = gameStore.getPokemonByUid(uid)

  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)

  if (found) {
    const evalRes = evaluatePokemonForSubCompetition(found, sub, dir)
    return {
      uid: found.uid,
      id: found.id,
      name: found.name,
      nickname: found.nickname,
      level: found.level,
      isShiny: found.isShiny,
      ivs: found.ivs,
      height: found.height,
      weight: found.weight,
      displayValue: evalRes.displayValue,
      score: evalRes.score
    }
  }

  const data = entry.data
  if (data && data.species && isPokemonSpeciesId(data.species)) {
    return {
      uid,
      id: data.species,
      name: pokemonDataProvider.resolveSpeciesName(data.species),
      nickname: data.nickname,
      level: data.level || 1,
      isShiny: Boolean(data.is_shiny),
      ivs: data.ivs as Pokemon['ivs'],
      height: data.height,
      weight: data.weight,
      displayValue: data.displayValue,
      score: data.score
    }
  }
  return null
}

const formatMetricLabel = (sub: ResolvedSubCompetition | SubCompetitionConfig): string => {
  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)
  if (sub.metric === 'total_ivs') return 'Mayor IVs'
  if (sub.metric === 'stat_iv' && sub.targetStat) return `Mayor ${sub.targetStat.toUpperCase()}`
  if (sub.metric === 'weight') return dir === 'max' ? 'Mayor Peso' : 'Menor Peso'
  if (sub.metric === 'height') return dir === 'max' ? 'Mayor Altura' : 'Menor Altura'
  if (sub.metric === 'level') return dir === 'max' ? 'Mayor Nivel' : 'Menor Nivel'
  if (sub.metric === 'friendship') return dir === 'max' ? 'Mayor Amistad' : 'Menor Amistad'
  return sub.name
}

const openParticipationModal = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const targetSp = ('targetSpecies' in sub && sub.targetSpecies) ? sub.targetSpecies : null
  const allowedSpecies = targetSp
    ? [targetSp]
    : (props.cardSpeciesList.length > 0 ? props.cardSpeciesList : null)

  const allPokes = [...gameStore.allPokemonList] as Pokemon[]
  
  const eligible = getEligiblePokemonForSubCompetition(props.event, sub, allPokes, getServerInstant())
    .filter(p => !isPokemonEnrolledInOtherSubCompetition(eventStore.userEntries, props.event.id, sub.id, p.uid))

  if (eligible.length === 0) {
    const spNote = targetSp ? ` (${targetSp})` : ''
    uiStore.notify(`No tienes ningún Pokémon disponible para: ${getSubCompTitle(props.event.id, sub)}${spNote} (los ya inscritos en otra categoría no pueden repetir)`, '⚠️')
    return
  }

  const allowedIds = eligible.map(p => p.uid)
  const subtitle = `Elige un Pokémon para la categoría: ${getSubCompTitle(props.event.id, sub)}`
  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)
  const resolvedSub: ResolvedSubCompetition = {
    ...sub,
    order: dir,
    speciesScope: sub.speciesScope ?? 'global'
  }

  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    subCompetition: resolvedSub,
    allowedSpecies,
    allowedIds,
    onConfirm: async (selectedObjects: Pokemon[]) => {
      const pokemon = selectedObjects[0]
      if (pokemon) {
        await eventStore.submitCompetitionEntry(props.event.id, sub.id, pokemon.uid)
      }
    }
  })
}

const handleSlotChipClick = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const participant = getParticipantForCategory(sub)
  if (participant) {
    modalStore.open('EventSlotAction', {
      event: props.event,
      sub,
      participant,
      onChange: () => {
        openParticipationModal(sub)
      },
      onWithdraw: () => {
        eventStore.removeCompetitionEntry(props.event.id, sub.id)
      }
    })
  } else {
    openParticipationModal(sub)
  }
}

const isAutoFilling = ref(false)

const handleAutoFill = async () => {
  if (isAutoFilling.value) return
  isAutoFilling.value = true
  try {
    const enrolled = await eventStore.autoFillBestEntries(props.event.id)
    if (enrolled > 0) {
      uiStore.notify(`¡${enrolled} categoría(s) rellenada(s) con tus mejores Pokémon!`, '🏆')
    } else {
      uiStore.notify('No hay mejoras disponibles para inscribir automáticamente.', 'ℹ️')
    }
  } catch (_err) {
    uiStore.notify('Error al auto-rellenar inscripciones.', '❌')
  } finally {
    isAutoFilling.value = false
  }
}
</script>

<template>
  <div class="compact-competition-preview">
    <div class="comp-preview-header">
      <div class="header-title-group">
        <span class="comp-preview-title pixelated"><span class="emoji title-icon">🏆</span> CATEGORÍAS EN JUEGO</span>
        <span
          v-if="enrolledCategoriesCount > 0"
          class="comp-preview-badge pixelated enrolled"
        >
          <span class="emoji">✓</span> {{ enrolledCategoriesCount }} Inscripto{{ enrolledCategoriesCount === 1 ? '' : 's' }}
        </span>
      </div>
      <button
        :id="(idPrefix || '') + 'event-auto-fill-btn-' + event.id"
        class="retro-btn auto-fill-btn pixelated"
        type="button"
        :disabled="isAutoFilling"
        @click.stop="handleAutoFill"
      >
        <span class="emoji">⚡</span> AUTO-RELLENAR
      </button>
    </div>

    <div class="comp-categories-grid">
      <PVTooltip
        v-for="sub in resolvedSubComps"
        :key="sub.id"
        :title="getSubCompTitle(event.id, sub)"
        :description="getSubCompDescription(event.id, sub)"
        position="top"
      >
        <button
          :id="(idPrefix || '') + 'comp-slot-chip-' + event.id + '-' + sub.id"
          type="button"
          class="comp-slot-chip pixelated"
          :class="{ enrolled: Boolean(getParticipantForCategory(sub)) }"
          @click.stop="handleSlotChipClick(sub)"
        >
          <div class="chip-content">
            <!-- Pokémon Species Mini Sprite (or 🧬 icon for global IVs) -->
            <img
              v-if="sub.targetSpecies"
              :src="getAssetUrl(ASSET_TYPES.POKEMON, sub.targetSpecies)"
              class="chip-poke-sprite"
              :alt="sub.targetSpecies"
              draggable="false"
            >
            <span
              v-else
              class="chip-global-icon"
            ><span class="emoji">{{ sub.icon || getSubCompIcon(sub.metric) }}</span></span>
            
            <!-- Clean Metric Name (IVs / Peso / Altura) -->
            <span class="chip-metric">{{ formatMetricLabel(sub) }}</span>
          </div>

          <!-- Simple Status Badge (+ or ✓) -->
          <span class="chip-status-pill">
            <span class="emoji">{{ getParticipantForCategory(sub) ? '✓' : '+' }}</span>
          </span>
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/mixins" as *;

.compact-competition-preview {
  background: Rgba(0, 0, 0, 0.25);
  border: 1px solid Rgba(250, 204, 21, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  box-sizing: border-box;
  width: 100%;

  &:hover {
    background: Rgba(250, 204, 21, 0.05);
    border-color: Rgba(250, 204, 21, 0.4);
  }

  .comp-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    gap: 6px;
    box-sizing: border-box;
    width: 100%;

    .header-title-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .comp-preview-title {
      font-size: 7.5px;
      color: var(--yellow);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      min-width: 0;
    }

    .comp-preview-badge {
      font-size: 6.5px;
      padding: 2px 5px;
      border-radius: 4px;
      background: Rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      border: 1px solid Rgba(255, 255, 255, 0.1);
      white-space: nowrap;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      line-height: 1.35;
      box-sizing: border-box;

      &.enrolled {
        background: Rgba(74, 222, 128, 0.15);
        color: var(--green-bright);
        border-color: Rgba(74, 222, 128, 0.4);
      }
    }

    .auto-fill-btn {
      @include pixelated;
      font-size: 7px;
      padding: 4px 8px;
      border-radius: 4px;
      background: Rgba(250, 204, 21, 0.15);
      border: 1px solid Rgba(250, 204, 21, 0.4);
      color: var(--yellow, #facc15);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;

      &:hover:not(:disabled) {
        background: Rgba(250, 204, 21, 0.25);
        border-color: var(--yellow, #facc15);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .comp-categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 6px;

    :deep(.pv-tooltip-wrapper) {
      width: 100%;
      display: flex;
    }

    .comp-slot-chip {
      @include pixelated;
      background: Rgba(255, 255, 255, 0.04);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 4px 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      cursor: pointer;
      width: 100%;
      box-sizing: border-box;
      color: Rgba(255, 255, 255, 0.85);
      font-size: 8px;
      will-change: transform, background-color, border-color;

      .chip-content {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;

        .chip-poke-sprite {
          width: 18px;
          height: 18px;
          object-fit: contain;
          flex-shrink: 0;
          filter: Drop-Shadow(0 1px 2px Rgba(0, 0, 0, 0.5));
          image-rendering: pixelated;
        }

        .chip-global-icon {
          font-size: 11px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .chip-metric {
          font-size: 7px;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
      }

      .chip-status-pill {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: bold;
        background: Rgba(250, 204, 21, 0.15);
        color: var(--yellow);
        border: 1px solid Rgba(250, 204, 21, 0.35);
        flex-shrink: 0;
      }

      &:hover {
        background: Rgba(250, 204, 21, 0.15);
        border-color: var(--yellow);
        transform: Translatey(-1px);
      }

      &.enrolled {
        background: Rgba(74, 222, 128, 0.08);
        border-color: Rgba(74, 222, 128, 0.4);
        color: #86efac;

        .chip-status-pill {
          background: Rgba(74, 222, 128, 0.2);
          color: var(--green-bright);
          border-color: var(--green-bright);
        }

        &:hover {
          background: Rgba(74, 222, 128, 0.18);
          border-color: var(--green-bright);
        }
      }
    }
  }
}
</style>
