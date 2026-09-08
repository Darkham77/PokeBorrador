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
  padding: 20px;
  background: linear-gradient(180deg, Rgba(15, 23, 42, 0.98), Rgba(8, 12, 21, 0.99));
  border: 2px solid Rgba(251, 191, 36, 0.35);
  border-radius: 16px;
  box-shadow: 0 16px 40px Rgba(0, 0, 0, 0.8), inset 0 1px 0 Rgba(255, 255, 255, 0.1);
  max-width: 440px;
  width: 100%;
  color: #f8fafc;
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

  .header-icon {
    font-size: 28px;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .title {
      font-size: 11px;
      color: #fbbf24;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .event-name {
      font-size: 13px;
      font-weight: bold;
      color: #e2e8f0;
    }
  }
}

.pokemon-showcase {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: Rgba(30, 41, 59, 0.6);
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.08);

  .sprite-wrap {
    position: relative;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;

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
      font-size: 13px;
      color: #ffffff;
      font-weight: bold;
    }

    .pokemon-sub {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.3;
    }
  }
}

.single-category-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: Rgba(251, 191, 36, 0.08);
  border: 1px solid Rgba(251, 191, 36, 0.25);
  border-radius: 12px;

  .cat-header {
    display: flex;
    align-items: center;
    gap: 8px;

    .cat-icon {
      font-size: 18px;
    }

    .cat-title {
      font-size: 11px;
      color: #fbbf24;
    }
  }

  .score-comparison {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 10px;

    .score-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;

      .col-label {
        font-size: 10px;
        color: #94a3b8;
        text-transform: uppercase;
      }

      .col-value {
        font-size: 14px;
        font-weight: bold;
        color: #cbd5e1;

        &.highlight {
          color: #38bdf8;
          font-size: 16px;
        }
      }

      .delta-badge {
        font-size: 11px;
        font-weight: bold;
        color: #10b981;
        background: Rgba(16, 185, 129, 0.15);
        padding: 1px 6px;
        border-radius: 4px;
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
    font-size: 11px;
    color: #94a3b8;
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
    background: Rgba(30, 41, 59, 0.5);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      background: Rgba(30, 41, 59, 0.8);
      border-color: Rgba(251, 191, 36, 0.4);
    }

    &.active {
      background: Rgba(251, 191, 36, 0.12);
      border-color: #fbbf24;

      .radio-circle {
        border-color: #fbbf24;
        background: #fbbf24;
        box-shadow: inset 0 0 0 2px #0f172a;
      }
    }

    .card-radio {
      display: flex;
      align-items: center;

      .radio-circle {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #64748b;
      }
    }

    .card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .card-title-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .cat-icon {
          font-size: 14px;
        }

        .cat-title {
          font-size: 11px;
          color: #f1f5f9;
        }
      }

      .cat-score {
        font-size: 10px;
        color: #94a3b8;

        .score-num {
          color: #38bdf8;
          font-weight: bold;
        }
      }
    }

    .card-delta {
      .delta-pill {
        font-size: 10px;
        font-weight: bold;
        color: #10b981;
        background: Rgba(16, 185, 129, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
      }
    }
  }
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;

  .enroll-confirm-btn {
    flex: 2;
    padding: 10px 14px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #0f172a;
    font-weight: bold;
    font-size: 9px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px Rgba(245, 158, 11, 0.4);

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .enroll-dismiss-btn {
    flex: 1;
    padding: 10px 14px;
    background: Rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-size: 9px;
    border-radius: 8px;
    border: 1px solid Rgba(255, 255, 255, 0.12);
    cursor: pointer;

    &:hover {
      background: Rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
    }
  }
}
</style>
