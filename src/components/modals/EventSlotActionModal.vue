<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getSubCompTitle, type Event as GameEvent, type SubCompetitionConfig, type ResolvedSubCompetition } from '@/logic/events/eventEngine'
import type { CompetitionParticipant } from '@/types/system/stores'
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex'

interface Props {
  show?: boolean
  event: GameEvent
  sub: ResolvedSubCompetition | SubCompetitionConfig
  participant: CompetitionParticipant
  onChange?: () => void
  onWithdraw?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  onChange: undefined,
  onWithdraw: undefined
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'change'): void
  (e: 'withdraw'): void
}>()

const categoryTitle = computed(() => getSubCompTitle(props.event.id, props.sub))

const pokemonSpriteUrl = computed(() => {
  if (props.participant.id && isPokemonSpeciesId(props.participant.id)) {
    return getAssetUrl(ASSET_TYPES.POKEMON, props.participant.id)
  }
  return ''
})

const handleClose = () => {
  emit('close')
}

const handleChange = () => {
  emit('change')
  if (props.onChange) {
    props.onChange()
  }
  emit('close')
}

const handleWithdraw = () => {
  emit('withdraw')
  if (props.onWithdraw) {
    props.onWithdraw()
  }
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    title="GESTIONAR INSCRIPCIÓN"
    max-width="420px"
    variant="modern"
    padding="raw"
    @close="handleClose"
  >
    <div class="slot-action-modal-body">
      <!-- Category Header Pill -->
      <div class="category-header-pill">
        <span class="title-icon">🏆</span>
        <span class="cat-label">{{ categoryTitle }}</span>
      </div>

      <!-- Enrolled Pokemon Card -->
      <div class="enrolled-pokemon-card">
        <div class="pokemon-sprite-box">
          <img
            v-if="pokemonSpriteUrl"
            :src="pokemonSpriteUrl"
            :alt="participant.name"
            class="pokemon-sprite-img"
          >
          <span
            v-if="participant.isShiny"
            class="shiny-badge"
          ><span class="emoji-inline">✨</span></span>
        </div>

        <div class="pokemon-details">
          <div class="pokemon-name-row">
            <span class="pokemon-name">{{ participant.nickname || participant.name }}</span>
            <span class="pokemon-level">Nv. {{ participant.level ?? 1 }}</span>
          </div>

          <div class="registered-value-row">
            <span class="metric-label">PUNTUACIÓN ACTUAL:</span>
            <span class="metric-val">{{ participant.displayValue || participant.score }}</span>
          </div>
        </div>
      </div>

      <p class="instruction-hint">
        ¿Qué acción deseas realizar con este Pokémon en el evento?
      </p>

      <!-- Action Buttons -->
      <div class="action-buttons-list">
        <button
          id="event-slot-change-btn"
          class="btn-change"
          @click.stop="handleChange"
        >
          <span class="btn-icon">🔄</span>
          CAMBIAR POKÉMON
        </button>

        <button
          id="event-slot-withdraw-btn"
          class="btn-withdraw"
          @click.stop="handleWithdraw"
        >
          <span class="btn-icon">❌</span>
          SACAR / DESINSCRIBIR POKÉMON
        </button>
      </div>
    </div>

    <template #footer>
      <div class="slot-action-modal-footer">
        <button
          id="event-slot-cancel-btn"
          class="btn-cancel"
          @click.stop="handleClose"
        >
          CANCELAR
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.slot-action-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.category-header-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: Rgba(250, 204, 21, 0.1);
  border: 1px solid Rgba(250, 204, 21, 0.3);
  padding: 6px 12px;
  border-radius: 8px;
  width: fit-content;

  .cat-label {
    @include pixelated;
    font-size: 8px;
    color: var(--yellow, #facc15);
    letter-spacing: 0.5px;
  }
}

.enrolled-pokemon-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(74, 222, 128, 0.3);
  border-radius: 10px;
  padding: 12px;

  .pokemon-sprite-box {
    width: 48px;
    height: 48px;
    background: Rgba(255, 255, 255, 0.05);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;

    .pokemon-sprite-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .shiny-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      font-size: 10px;
    }
  }

  .pokemon-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    .pokemon-name-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .pokemon-name {
        font-weight: bold;
        font-size: 12px;
        color: var(--white, #ffffff);
      }

      .pokemon-level {
        @include pixelated;
        font-size: 7px;
        color: var(--yellow, #facc15);
      }
    }

    .registered-value-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .metric-label {
        font-size: 8px;
        color: #94a3b8;
        font-weight: bold;
      }

      .metric-val {
        @include pixelated;
        font-size: 8px;
        color: var(--green-bright, #4ade80);
      }
    }
  }
}

.instruction-hint {
  font-size: 11px;
  color: #cbd5e1;
  line-height: 1.4;
  margin: 0;
}

.action-buttons-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .btn-change {
    @include btn-vicio('primary', 'sm', true);
  }

  .btn-withdraw {
    @include btn-vicio('danger', 'sm', true);
  }
}

.slot-action-modal-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;

  .btn-cancel {
    @include btn-vicio('neutral', 'sm', false);
  }
}
</style>
