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
  if (props.onChange) {
    props.onChange()
  } else {
    emit('change')
  }
  emit('close')
}

const handleWithdraw = () => {
  if (props.onWithdraw) {
    props.onWithdraw()
  } else {
    emit('withdraw')
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
        <span class="emoji">🏆</span>
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
          ><span class="emoji">✨</span></span>
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
          <span class="emoji">🔄</span>
          CAMBIAR POKÉMON
        </button>

        <button
          id="event-slot-withdraw-btn"
          class="btn-withdraw"
          @click.stop="handleWithdraw"
        >
          <span class="emoji">❌</span>
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
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.category-header-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 12px;
  border: 1px solid rgb(250 204 21 / 30%);
  border-radius: 8px;
  background: rgb(250 204 21 / 10%);

  .cat-label {
    @include pixelated;

    color: var(--yellow, #facc15);
    font-size: 8px;
    letter-spacing: 0.5px;
  }
}

.enrolled-pokemon-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgb(74 222 128 / 30%);
  border-radius: 10px;
  background: rgb(0 0 0 / 40%);

  .pokemon-sprite-box {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 48px;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 8px;
    background: rgb(255 255 255 / 5%);
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
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;

    .pokemon-name-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .pokemon-name {
        color: var(--white, #fff);
        font-size: 12px;
        font-weight: bold;
      }

      .pokemon-level {
        @include pixelated;

        color: var(--yellow, #facc15);
        font-size: 7px;
      }
    }

    .registered-value-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;

      .metric-label {
        color: #94a3b8;
        font-size: 8px;
        font-weight: bold;
      }

      .metric-val {
        @include pixelated;

        color: var(--green-bright, #4ade80);
        font-size: 8px;
      }
    }
  }
}

.instruction-hint {
  margin: 0;
  color: #cbd5e1;
  font-size: 11px;
  line-height: 1.4;
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
