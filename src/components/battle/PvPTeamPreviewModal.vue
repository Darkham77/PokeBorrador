<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { gsap } from 'gsap';
import BaseModal from '@/components/common/BaseModal.vue';
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { toPokemonType } from '@/data/battle/types';
import { validateAndResolveTeamPreviewPick } from '@/logic/pvp/pvpTeamPreviewHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PvpMatchFormat } from '@/types/battle/pvp';

interface Props {
  show?: boolean;
  myTeam: Pokemon[];
  enemyTeam: Pokemon[];
  enemyName?: string;
  format?: PvpMatchFormat;
  timeoutSeconds?: number;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  enemyName: 'Rival',
  format: '3v3',
  timeoutSeconds: 45
});

const emit = defineEmits<{
  (e: 'confirm', orderedPicks: Pokemon[]): void;
}>();

const selectedUids = ref<string[]>([]);
const remainingSeconds = ref<number>(props.timeoutSeconds);
const isConfirmed = ref(false);
let timerTween: gsap.core.Tween | null = null;

const requiredPickCount = computed(() => (props.format === '6v6' ? 1 : 3));

function toggleSelect(uid: string) {
  if (isConfirmed.value) return;
  const existingIdx = selectedUids.value.indexOf(uid);
  if (existingIdx !== -1) {
    selectedUids.value.splice(existingIdx, 1);
  } else {
    if (props.format === '6v6') {
      selectedUids.value = [uid];
    } else if (selectedUids.value.length < 3) {
      selectedUids.value.push(uid);
    }
  }
}

function getSelectionBadge(uid: string): string | null {
  const idx = selectedUids.value.indexOf(uid);
  if (idx === -1) return null;
  if (props.format === '6v6') return 'LEAD';
  if (idx === 0) return '#1 LEAD';
  return `#${idx + 1}`;
}

function handleConfirm() {
  if (isConfirmed.value) return;
  isConfirmed.value = true;
  if (timerTween) timerTween.kill();

  const resolved = validateAndResolveTeamPreviewPick(
    props.myTeam,
    selectedUids.value,
    props.format
  );
  emit('confirm', resolved);
}

function startTimer() {
  if (timerTween) timerTween.kill();
  remainingSeconds.value = props.timeoutSeconds;
  const timerObj = { sec: props.timeoutSeconds };
  timerTween = gsap.to(timerObj, {
    sec: 0,
    duration: props.timeoutSeconds,
    ease: 'none',
    onUpdate: () => {
      remainingSeconds.value = Math.ceil(timerObj.sec);
    },
    onComplete: () => {
      handleConfirm();
    }
  });
}

watch(
  () => props.show,
  (isShowing) => {
    if (isShowing) {
      isConfirmed.value = false;
      selectedUids.value = [];
      startTimer();
    } else {
      if (timerTween) timerTween.kill();
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.show) startTimer();
});

onUnmounted(() => {
  if (timerTween) timerTween.kill();
});

function getSprite(pokemon: Pokemon): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny });
}
</script>

<template>
  <BaseModal
    :show="show"
    type="center"
    max-width="720px"
    variant="retro"
    prevent-close
    accent-color="var(--blue-light)"
  >
    <template #header>
      <div class="team-preview-header">
        <div class="header-left">
          <span class="preview-badge">{{ format }}</span>
          <h2 class="title">
            VISTA PREVIA DE EQUIPOS
          </h2>
        </div>
        <div
          class="timer-badge"
          :class="{ 'is-urgent': remainingSeconds <= 10 }"
        >
          <span class="timer-icon"><span class="emoji">⏳</span></span>
          <span class="timer-val">{{ remainingSeconds }}s</span>
        </div>
      </div>
    </template>

    <div class="team-preview-body">
      <!-- Opponent Team Display -->
      <section class="team-section enemy-section">
        <div class="section-title">
          <span>EQUIPO RIVAL</span>
          <span class="trainer-tag">{{ enemyName }}</span>
        </div>
        <div class="preview-grid">
          <div
            v-for="mon in enemyTeam"
            :key="mon.uid || mon.id"
            class="preview-card is-enemy"
          >
            <img
              :src="getSprite(mon)"
              :alt="mon.name"
              class="sprite"
            >
            <span class="mon-name">{{ mon.name }}</span>
            <span class="mon-level">Nv. {{ mon.level }}</span>
            <div class="types-row">
              <PokemonTypeTag
                :type="toPokemonType(mon.type)"
                size="sm"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Player Team Selection -->
      <section class="team-section player-section">
        <div class="section-title">
          <span>TU EQUIPO</span>
          <span class="hint">
            {{ format === '6v6' ? 'Elige tu Pokémon inicial (Lead)' : `Selecciona 3 combatientes (${selectedUids.length}/3)` }}
          </span>
        </div>
        <div class="preview-grid">
          <div
            v-for="mon in myTeam"
            :key="mon.uid || mon.id"
            v-gsap-hover="{ scale: 1.03, y: -2 }"
            class="preview-card is-player"
            :class="{ 'is-selected': selectedUids.includes(mon.uid) }"
            @click="toggleSelect(mon.uid)"
          >
            <div
              v-if="getSelectionBadge(mon.uid)"
              class="selection-pill"
            >
              {{ getSelectionBadge(mon.uid) }}
            </div>
            <img
              :src="getSprite(mon)"
              :alt="mon.name"
              class="sprite"
            >
            <span class="mon-name">{{ mon.name }}</span>
            <span class="mon-level">Nv. {{ mon.level }}</span>
            <div class="types-row">
              <PokemonTypeTag
                :type="toPokemonType(mon.type)"
                size="sm"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="team-preview-footer">
        <button
          v-gsap-hover="'button'"
          class="confirm-btn"
          :disabled="isConfirmed || selectedUids.length < requiredPickCount"
          @click="handleConfirm"
        >
          {{ isConfirmed ? 'EQUIPO LISTO...' : (format === '6v6' ? 'CONFIRMAR LEAD' : 'CONFIRMAR EQUIPO') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.team-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .preview-badge {
      background: var(--blue-primary, #0288d1);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .title {
      font-size: 1.1rem;
      font-weight: 800;
      margin: 0;
      color: var(--text-primary, #fff);
      font-family: var(--font-pixel, monospace);
    }
  }

  .timer-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #fff);
    background: Rgba(0, 0, 0, 0.3);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    border: 1px solid Rgba(255, 255, 255, 0.15);

    &.is-urgent {
      color: #ff5252;
      border-color: #ff5252;
    }
  }
}

.team-preview-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;

  .team-section {
    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted, #aaa);
      letter-spacing: 0.05em;

      .trainer-tag, .hint {
        color: var(--gold, #ffd700);
        font-size: 0.75rem;
      }
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.5rem;

      @media (max-width: 600px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .preview-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: Rgba(0, 0, 0, 0.25);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.5rem 0.25rem;
      user-select: none;
      cursor: default;

      &.is-player {
        cursor: pointer;

        &:hover {
          background: Rgba(255, 255, 255, 0.05);
          border-color: Rgba(255, 255, 255, 0.3);
        }

        &.is-selected {
          border-color: var(--gold, #ffd700);
          background: Rgba(255, 215, 0, 0.12);
        }
      }

      .selection-pill {
        position: absolute;
        top: -6px;
        background: var(--gold, #ffd700);
        color: #111;
        font-size: 0.65rem;
        font-weight: 800;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px Rgba(0, 0, 0, 0.4);
      }

      .sprite {
        width: 48px;
        height: 48px;
        image-rendering: pixelated;
        object-fit: contain;
      }

      .mon-name {
        font-size: 0.75rem;
        font-weight: 700;
        color: #fff;
        margin-top: 0.2rem;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mon-level {
        font-size: 0.65rem;
        color: var(--text-muted, #aaa);
      }

      .types-row {
        margin-top: 0.25rem;
      }
    }
  }
}

.team-preview-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;

  .confirm-btn {
    background: var(--green-primary, #2e7d32);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.6rem 1.25rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-pixel, monospace);

    &:hover:not(:disabled) {
      filter: Brightness(1.15);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
