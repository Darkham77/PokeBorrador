<script setup lang="ts">
/**
 * src/components/modals/class/ClassSelectionCard.vue
 *
 * Dedicated interactive card for trainer class preview and selection.
 */

import { gsap } from 'gsap';
import { type PlayerClassId } from '@/data/player/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import PVTooltip from '@/components/common/PVTooltip.vue';
import type { RenderPlayerClass } from './classSelectionTypes.ts';

interface Props {
  cls: RenderPlayerClass;
  isCurrent: boolean;
  currentPlayerClass: PlayerClassId | null;
}

defineProps<Props>();

defineEmits<{
  (e: 'select', id: PlayerClassId): void;
}>();

const CLASS_CARD_HOVER_Y_OFFSET_PX = -10;
const CLASS_HOVER_ROTATE_X_DEG = 2;
const CLASS_HOVER_SPRITE_SCALE = 1.1;
const GSAP_CARD_HOVER_DURATION_SEC = 0.25;
const GLOW_ACTIVE_OPACITY = 0.2;
const GLOW_BASE_OPACITY = 0.05;

function splitLeadingEmoji(text: string): { emoji: string | null; text: string } {
  const match = text.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u);
  if (match) {
    return { emoji: match[1] ?? null, text: match[2] ?? '' };
  }
  return { emoji: null, text };
}

const getTrainerSprite = (id: string) => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id, { trainerSuffix: 'avatar' });
};

const getButtonVariant = (clsId: PlayerClassId) => {
  switch (clsId) {
    case 'rocket': return 'danger';
    case 'cazabichos': return 'success';
    case 'entrenador': return 'info';
    case 'criador': return 'secondary';
    default: return 'primary';
  }
};

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none';
  }
};

const onCardHover = (event: MouseEvent, isEntering: boolean) => {
  const card = event.currentTarget as HTMLElement;
  if (!card) return;
  const glow = card.querySelector('.card-glow');
  const sprite = card.querySelector('.trainer-pixel-art');

  if (isEntering) {
    gsap.to(card, {
      y: CLASS_CARD_HOVER_Y_OFFSET_PX,
      rotateX: CLASS_HOVER_ROTATE_X_DEG,
      borderColor: 'var(--yellow)',
      duration: GSAP_CARD_HOVER_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    });
    if (glow) {
      gsap.to(glow, {
        opacity: GLOW_ACTIVE_OPACITY,
        duration: GSAP_CARD_HOVER_DURATION_SEC,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
    if (sprite) {
      gsap.to(sprite, {
        scale: CLASS_HOVER_SPRITE_SCALE,
        duration: GSAP_CARD_HOVER_DURATION_SEC,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  } else {
    gsap.to(card, {
      y: 0,
      rotateX: 0,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      duration: GSAP_CARD_HOVER_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,borderColor'
    });
    if (glow) {
      gsap.to(glow, {
        opacity: GLOW_BASE_OPACITY,
        duration: GSAP_CARD_HOVER_DURATION_SEC,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'opacity'
      });
    }
    if (sprite) {
      gsap.to(sprite, {
        scale: 1,
        duration: GSAP_CARD_HOVER_DURATION_SEC,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform'
      });
    }
  }
};
</script>

<template>
  <div
    class="class-card-premium"
    :style="{ '--cls-color': cls.color }"
    :class="{ 'is-current': isCurrent }"
    @mouseenter="onCardHover($event, true)"
    @mouseleave="onCardHover($event, false)"
  >
    <div class="card-glow" />

    <div class="avatar-circle-wrap">
      <div class="avatar-circle">
        <img
          :src="getTrainerSprite(cls.spriteId)"
          :alt="cls.name || 'Entrenador'"
          class="trainer-pixel-art"
          @error="handleImageError"
        >
      </div>
    </div>

    <h2 class="class-title">
      {{ cls.name }}
    </h2>
    <div class="class-desc">
      <span>{{ cls.description }}</span>
    </div>

    <div class="stats-comparison">
      <div class="stats-section pros">
        <h3><span class="emoji">✅</span> VENTAJAS</h3>
        <ul>
          <li
            v-for="(bonus, idx) in cls.bonuses"
            :key="idx"
          >
            <PVTooltip
              :description="cls.technicalBonuses?.[idx] || 'Información no disponible.'"
              position="top"
              :delay="100"
              style="cursor: help;"
            >
              <span class="bullet-item-flex">
                <span
                  v-if="splitLeadingEmoji(bonus).emoji"
                  class="emoji bullet-icon"
                >{{ splitLeadingEmoji(bonus).emoji }}</span>
                <span class="bullet-text">{{ splitLeadingEmoji(bonus).text }}</span>
              </span>
            </PVTooltip>
          </li>
        </ul>
      </div>

      <div class="stats-section cons">
        <h3><span class="emoji">❌</span> PENALIZACIONES</h3>
        <ul>
          <li
            v-for="(penalty, idx) in cls.penalties"
            :key="idx"
          >
            <PVTooltip
              :description="cls.technicalPenalties?.[idx] || 'Información no disponible.'"
              position="top"
              :delay="100"
              style="cursor: help;"
            >
              <span class="bullet-item-flex">
                <span
                  v-if="splitLeadingEmoji(penalty).emoji"
                  class="emoji bullet-icon"
                >{{ splitLeadingEmoji(penalty).emoji }}</span>
                <span class="bullet-text">{{ splitLeadingEmoji(penalty).text }}</span>
              </span>
            </PVTooltip>
          </li>
        </ul>
      </div>
    </div>

    <button
      :class="['btn-vicio-' + getButtonVariant(cls.id), 'btn-vicio-full']"
      :disabled="isCurrent"
      @click.stop="$emit('select', cls.id)"
    >
      <span class="btn-label-stack">
        <span class="btn-label">
          {{ isCurrent ? 'CLASE ACTUAL' : (currentPlayerClass ? 'CAMBIAR' : 'ELEGIR') }}
        </span>
        <span
          v-if="currentPlayerClass && !isCurrent"
          class="btn-price"
        >10,000 BC</span>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.class-card-premium {
  @include gpu-layer;
  @include hover-neon-yellow(1px);

  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 24px 16px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: Rgb(30 41 59 / 40%);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(10px);
  overflow: hidden;

  &.is-current {
    border-color: Rgb(34 197 94 / 100%);
    &::after {
      @include pixelated;

      position: absolute;
      top: 12px;
      right: 12px;
      color: Rgb(34 197 94 / 100%);
      font-size: 8px;
      content: 'ACTUAL';
    }
  }

  .card-glow {
    position: absolute;
    background: Radial-Gradient(circle at center, var(--cls-color) 0%, transparent 70%);
    opacity: 0.05;
    inset: 0;
    pointer-events: none;
  }
}

.avatar-circle-wrap {
  margin-bottom: 20px;
  .avatar-circle {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 90px;
    height: 90px;
    border: 3px solid var(--cls-color);
    border-radius: 50%;
    background: Rgb(0 0 0 / 50%);
    box-shadow: 0 0 20px var(--cls-color)66;
    overflow: hidden;
  }
  .trainer-pixel-art {
    @include sprite-render;

    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.class-title {
  @include pixelated;

  color: var(--cls-color);
  font-size: 14px;
  line-height: 1.3;
  text-align: center;
  margin-bottom: 16px;
  text-shadow: 0 0 10px var(--cls-color)66;
}

.class-desc {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 72px;
  color: Rgb(255 255 255 / 60%);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
  margin-bottom: 24px;
}

.stats-comparison {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
  flex: 1;
  padding-right: 4px;

  .stats-section {
    h3 {
      @include pixelated;

      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 9px;
      margin-bottom: 12px;
    }

    &.pros h3 { color: Rgb(34 197 94 / 100%); }
    &.cons h3 { color: Rgb(239 68 68 / 100%); }

    ul {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0;
      list-style: none;
      li {
        position: relative;
        padding: 0;
        color: Rgb(255 255 255 / 85%);
        font-size: 11px;
        line-height: 1.4;

        :deep(.pv-tooltip-wrapper) {
          display: flex !important;
          width: 100%;
          line-height: 1.4 !important;
        }

        .bullet-item-flex {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          width: 100%;
          line-height: 1.4;

          .bullet-icon {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            width: 16px;
            height: 16px;
            font-size: 13px;
            line-height: 1.4;
            flex-shrink: 0;
          }

          .bullet-text {
            flex: 1;
          }
        }
      }
    }
  }
}

// Standardized Button Overrides for Price Labels
[class^="btn-vicio-"] {
  width: 100%;

  .btn-price {
    font-size: 8px;
    opacity: 0.8;
  }
}

@media (width <= 950px) {
  .class-card-premium {
    padding: 24px 16px;

    .class-desc {
      height: auto;
      margin-bottom: 16px;
    }
  }
}
</style>
