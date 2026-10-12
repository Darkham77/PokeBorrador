<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { AutoEnrollCandidateCategory } from '@/logic/events/eventAutoEnrollHelper'

interface Props {
  show?: boolean
  pokemon: Pokemon
  candidates: AutoEnrollCandidateCategory[]
  onComplete?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  onComplete: undefined
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'enrolled', categoryId: string): void
}>()

const eventStore = useEventStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const selectedCategoryId = ref<string>(props.candidates[0]?.categoryId || '')
const isSubmitting = ref(false)

const selectedCandidate = computed(() => {
  return props.candidates.find(c => c.categoryId === selectedCategoryId.value) || props.candidates[0]
})

const pokemonSpriteUrl = computed(() => {
  const species = requirePokemonSpeciesId(props.pokemon.id)
  return getAssetUrl(ASSET_TYPES.POKEMON, species, { isShiny: Boolean(props.pokemon.isShiny) })
})

const handleSelectCategory = (categoryId: string) => {
  selectedCategoryId.value = categoryId
}

const handleDismiss = () => {
  modalStore.close('EventAutoEnroll')
  emit('close')
  props.onComplete?.()
}

const handleConfirm = async () => {
  const candidate = selectedCandidate.value
  if (!candidate || isSubmitting.value) return

  isSubmitting.value = true
  try {
    await eventStore.submitCompetitionEntry(candidate.eventId, candidate.categoryId, props.pokemon.uid)
    uiStore.notify(`¡${props.pokemon.name} inscripto en ${candidate.categoryTitle}!`, '🏆')
    emit('enrolled', candidate.categoryId)
    modalStore.close('EventAutoEnroll')
    emit('close')
    props.onComplete?.()
  } catch (_err) {
    uiStore.notify('Error al registrar inscripción.', '❌')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    @close="handleDismiss"
  >
    <div
      id="event-auto-enroll-modal"
      class="event-auto-enroll-modal"
    >
      <!-- Header -->
      <div class="modal-header">
        <span class="header-icon emoji">{{ selectedCandidate?.icon || '🏆' }}</span>
        <div class="header-text">
          <h2 class="pixelated title">
            ¡NUEVO RÉCORD DE CONCURSO!
          </h2>
          <span class="event-name">{{ selectedCandidate?.eventName }}</span>
        </div>
      </div>

      <!-- Pokemon Showcase -->
      <div class="pokemon-showcase">
        <div class="sprite-wrap">
          <img
            :src="pokemonSpriteUrl"
            :alt="pokemon.name"
            class="pokemon-sprite pixelated"
            draggable="false"
          
            width="32"
            height="32"
          >
          <span
            v-if="pokemon.isShiny"
            class="shiny-sparkle emoji"
          >✨</span>
        </div>
        <div class="pokemon-meta">
          <span class="pokemon-name pixelated">{{ pokemon.name }}</span>
          <span class="pokemon-sub">¡Acabas de capturarlo y califica para el concurso!</span>
        </div>
      </div>

      <!-- Single Category Direct Display -->
      <div
        v-if="candidates.length === 1 && selectedCandidate"
        class="single-category-card"
      >
        <div class="cat-header">
          <span class="emoji cat-icon">{{ selectedCandidate.icon }}</span>
          <span class="cat-title pixelated">{{ selectedCandidate.categoryTitle }}</span>
        </div>
        <div class="score-comparison">
          <div
            v-if="!selectedCandidate.isFirstEntry"
            class="score-col prev"
          >
            <span class="col-label">Récord Anterior</span>
            <span class="col-value">{{ selectedCandidate.previousDisplayValue }}</span>
          </div>
          <div
            v-if="!selectedCandidate.isFirstEntry"
            class="arrow-col"
          >
            <span class="emoji">➔</span>
          </div>
          <div class="score-col next">
            <span class="col-label">{{ selectedCandidate.isFirstEntry ? 'Puntaje Obtenido' : 'Nuevo Récord' }}</span>
            <span class="col-value highlight">{{ selectedCandidate.newDisplayValue }}</span>
            <span class="delta-badge">{{ selectedCandidate.deltaLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Multiple Categories Selection Grid -->
      <div
        v-else-if="candidates.length > 1"
        class="multi-categories-wrap"
      >
        <span class="selection-hint">Selecciona la categoría a representar con este Pokémon:</span>
        <div class="categories-list">
          <div
            v-for="cat in candidates"
            :id="'enroll-category-card-' + cat.categoryId"
            :key="cat.categoryId"
            class="category-option-card"
            :class="{ active: selectedCategoryId === cat.categoryId }"
            @click="handleSelectCategory(cat.categoryId)"
          >
            <div class="card-radio">
              <span class="radio-circle" />
            </div>
            <div class="card-info">
              <div class="card-title-row">
                <span class="emoji cat-icon">{{ cat.icon }}</span>
                <strong class="cat-title pixelated">{{ cat.categoryTitle }}</strong>
              </div>
              <span class="cat-score">Puntaje: <span class="score-num">{{ cat.newDisplayValue }}</span></span>
            </div>
            <div class="card-delta">
              <span class="delta-pill">{{ cat.deltaLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button
          id="btn-enroll-confirm"
          type="button"
          class="retro-btn enroll-confirm-btn pixelated"
          :disabled="isSubmitting"
          @click="handleConfirm"
        >
          <span class="emoji">🏆</span>
          {{ selectedCandidate?.isFirstEntry ? 'INSCRIBIR POKÉMON' : 'ACTUALIZAR RÉCORD' }}
        </button>

        <button
          id="btn-enroll-dismiss"
          type="button"
          class="retro-btn enroll-dismiss-btn pixelated"
          :disabled="isSubmitting"
          @click="handleDismiss"
        >
          NO GRACIAS
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.event-auto-enroll-modal {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  width: 100%;
  max-width: 440px;
  padding: 20px;
  border: 2px solid Rgb(251 191 36 / 35%);
  border-radius: $radius-2xl;
  background: Linear-Gradient(180deg, Rgb(15 23 42 / 98%), Rgb(8 12 21 / 99%));
  color: var(--slate-50);
  box-shadow: var(--shadow-2xl);
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding-bottom: 12px;
  border-bottom: 1px solid Rgb(255 255 255 / 10%);

  .header-icon {
    font-size: var(--font-28);
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: $spacing-2xs;

    .title {
      margin: 0;
      color: var(--amber);
      font-size: var(--font-11);
      letter-spacing: 0.5px;
    }

    .event-name {
      color: var(--slate-200);
      font-size: var(--font-13);
      font-weight: bold;
    }
  }
}

.pokemon-showcase {
  display: flex;
  align-items: center;
  gap: $spacing-md-lg;
  padding: 10px 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-xl;
  background: Rgb(30 41 59 / 60%);

  .sprite-wrap {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 60px;
    height: 60px;

    .pokemon-sprite {
      width: 56px;
      height: 56px;
      object-fit: contain;
    }

    .shiny-sparkle {
      position: absolute;
      top: 0;
      right: 0;
      font-size: var(--font-14);
    }
  }

  .pokemon-meta {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .pokemon-name {
      color: var(--white);
      font-size: var(--font-13);
      font-weight: bold;
    }

    .pokemon-sub {
      color: var(--slate-400);
      font-size: var(--font-11);
      line-height: 1.3;
    }
  }
}

.single-category-card {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;
  padding: 12px 14px;
  border: 1px solid Rgb(251 191 36 / 25%);
  border-radius: $radius-xl;
  background: Rgb(251 191 36 / 8%);

  .cat-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .cat-icon {
      font-size: var(--font-18);
    }

    .cat-title {
      color: var(--amber);
      font-size: var(--font-11);
    }
  }

  .score-comparison {
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: $spacing-md-alt;

    .score-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-2xs;

      .col-label {
        color: var(--slate-400);
        font-size: var(--font-10);
        text-transform: uppercase;
      }

      .col-value {
        color: var(--slate-300);
        font-size: var(--font-14);
        font-weight: bold;

        &.highlight {
          color: var(--sky);
          font-size: var(--font-16);
        }
      }

      .delta-badge {
        padding: 1px 6px;
        border-radius: $radius-sm;
        background: Rgb(16 185 129 / 15%);
        color: var(--emerald-500);
        font-size: var(--font-11);
        font-weight: bold;
      }
    }

    .arrow-col {
      color: var(--slate-400);
      font-size: var(--font-16);
    }
  }
}

.multi-categories-wrap {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  .selection-hint {
    color: var(--slate-400);
    font-size: var(--font-11);
  }

  .categories-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm-alt;
    max-height: 180px;
    overflow-y: auto;
  }

  .category-option-card {
    display: flex;
    align-items: center;
    gap: $spacing-md-alt;
    padding: 8px 12px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: $radius-lg;
    background: Rgb(30 41 59 / 50%);
    cursor: pointer;

    &:hover {
      background: Rgb(30 41 59 / 80%);
      border-color: Rgb(251 191 36 / 40%);
    }

    &.active {
      background: Rgb(251 191 36 / 12%);
      border-color: var(--amber);

      .radio-circle {
        background: var(--amber);
        border-color: var(--amber);
        box-shadow: var(--shadow-card);
      }
    }

    .card-radio {
      display: flex;
      align-items: center;

      .radio-circle {
        width: 14px;
        height: 14px;
        border: 2px solid var(--slate-500);
        border-radius: 50%;
      }
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
      flex: 1;

      .card-title-row {
        display: flex;
        align-items: center;
        gap: $spacing-sm-alt;

        .cat-icon {
          font-size: var(--font-14);
        }

        .cat-title {
          color: var(--slate-100);
          font-size: var(--font-11);
        }
      }

      .cat-score {
        color: var(--slate-400);
        font-size: var(--font-10);

        .score-num {
          color: var(--sky);
          font-weight: bold;
        }
      }
    }

    .card-delta {
      .delta-pill {
        padding: 2px 6px;
        border-radius: $radius-sm;
        background: Rgb(16 185 129 / 15%);
        color: var(--emerald-500);
        font-size: var(--font-10);
        font-weight: bold;
      }
    }
  }
}

.modal-actions {
  display: flex;
  gap: $spacing-md-alt;
  margin-top: 4px;

  .enroll-confirm-btn {
    padding: 10px 14px;
    border: none;
    border-radius: $radius-lg;
    background: Linear-Gradient(135deg, var(--amber-dark), var(--amber-dark));
    color: var(--slate-900);
    font-size: var(--font-9);
    font-weight: bold;
    flex: 2;
    cursor: pointer;
    box-shadow: var(--shadow-card);

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .enroll-dismiss-btn {
    padding: 10px 14px;
    border: 1px solid Rgb(255 255 255 / 12%);
    border-radius: $radius-lg;
    background: Rgb(255 255 255 / 8%);
    color: var(--slate-400);
    font-size: var(--font-9);
    flex: 1;
    cursor: pointer;

    &:hover {
      background: Rgb(255 255 255 / 12%);
      color: var(--slate-300);
    }
  }
}
</style>
