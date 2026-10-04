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
  gap: 16px;
  width: 100%;
  max-width: 440px;
  padding: 20px;
  border: 2px solid Rgb(251 191 36 / 35%);
  border-radius: 16px;
  background: Linear-Gradient(180deg, Rgb(15 23 42 / 98%), Rgb(8 12 21 / 99%));
  color: #f8fafc;
  box-shadow: 0 16px 40px Rgb(0 0 0 / 80%), inset 0 1px 0 Rgb(255 255 255 / 10%);
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid Rgb(255 255 255 / 10%);

  .header-icon {
    font-size: 28px;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .title {
      margin: 0;
      color: #fbbf24;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    .event-name {
      color: #e2e8f0;
      font-size: 13px;
      font-weight: bold;
    }
  }
}

.pokemon-showcase {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 12px;
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
      font-size: 14px;
    }
  }

  .pokemon-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .pokemon-name {
      color: #fff;
      font-size: 13px;
      font-weight: bold;
    }

    .pokemon-sub {
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.3;
    }
  }
}

.single-category-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid Rgb(251 191 36 / 25%);
  border-radius: 12px;
  background: Rgb(251 191 36 / 8%);

  .cat-header {
    display: flex;
    align-items: center;
    gap: 8px;

    .cat-icon {
      font-size: 18px;
    }

    .cat-title {
      color: #fbbf24;
      font-size: 11px;
    }
  }

  .score-comparison {
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: 10px;

    .score-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;

      .col-label {
        color: #94a3b8;
        font-size: 10px;
        text-transform: uppercase;
      }

      .col-value {
        color: #cbd5e1;
        font-size: 14px;
        font-weight: bold;

        &.highlight {
          color: #38bdf8;
          font-size: 16px;
        }
      }

      .delta-badge {
        padding: 1px 6px;
        border-radius: 4px;
        background: Rgb(16 185 129 / 15%);
        color: #10b981;
        font-size: 11px;
        font-weight: bold;
      }
    }

    .arrow-col {
      color: #94a3b8;
      font-size: 16px;
    }
  }
}

.multi-categories-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .selection-hint {
    color: #94a3b8;
    font-size: 11px;
  }

  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 180px;
    overflow-y: auto;
  }

  .category-option-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: 8px;
    background: Rgb(30 41 59 / 50%);
    cursor: pointer;

    &:hover {
      background: Rgb(30 41 59 / 80%);
      border-color: Rgb(251 191 36 / 40%);
    }

    &.active {
      background: Rgb(251 191 36 / 12%);
      border-color: #fbbf24;

      .radio-circle {
        background: #fbbf24;
        border-color: #fbbf24;
        box-shadow: inset 0 0 0 2px #0f172a;
      }
    }

    .card-radio {
      display: flex;
      align-items: center;

      .radio-circle {
        width: 14px;
        height: 14px;
        border: 2px solid #64748b;
        border-radius: 50%;
      }
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;

      .card-title-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .cat-icon {
          font-size: 14px;
        }

        .cat-title {
          color: #f1f5f9;
          font-size: 11px;
        }
      }

      .cat-score {
        color: #94a3b8;
        font-size: 10px;

        .score-num {
          color: #38bdf8;
          font-weight: bold;
        }
      }
    }

    .card-delta {
      .delta-pill {
        padding: 2px 6px;
        border-radius: 4px;
        background: Rgb(16 185 129 / 15%);
        color: #10b981;
        font-size: 10px;
        font-weight: bold;
      }
    }
  }
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;

  .enroll-confirm-btn {
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background: Linear-Gradient(135deg, #f59e0b, #d97706);
    color: #0f172a;
    font-size: 9px;
    font-weight: bold;
    flex: 2;
    cursor: pointer;
    box-shadow: 0 4px 12px Rgb(245 158 11 / 40%);

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .enroll-dismiss-btn {
    padding: 10px 14px;
    border: 1px solid Rgb(255 255 255 / 12%);
    border-radius: 8px;
    background: Rgb(255 255 255 / 8%);
    color: #94a3b8;
    font-size: 9px;
    flex: 1;
    cursor: pointer;

    &:hover {
      background: Rgb(255 255 255 / 12%);
      color: #cbd5e1;
    }
  }
}
</style>
