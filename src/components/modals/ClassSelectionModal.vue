<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { computed } from 'vue';
import { gsap } from 'gsap';
import { usePlayerClassStore } from '@/stores/playerClass';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import BaseModal from '@/components/common/BaseModal.vue';

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
});

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'submit'): void
}>();

defineOptions({ inheritAttrs: false });

const classStore = usePlayerClassStore();
const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const close = () => { 
  emit('close');
};

const handleSelect = async (id: string) => {
  const res = await classStore.selectClass(id);
  if (res.success) close();
};

const getTrainerSprite = (id: string) => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id, { trainerSuffix: 'avatar' });
};

const getButtonVariant = (clsId: string) => {
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
      y: -10,
      rotateX: 2,
      borderColor: 'var(--yellow)',
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    });
    if (glow) {
      gsap.to(glow, {
        opacity: 0.2,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
    if (sprite) {
      gsap.to(sprite, {
        scale: 1.1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  } else {
    gsap.to(card, {
      y: 0,
      rotateX: 0,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,borderColor'
    });
    if (glow) {
      gsap.to(glow, {
        opacity: 0.05,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'opacity'
      });
    }
    if (sprite) {
      gsap.to(sprite, {
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform'
      });
    }
  }
};
</script>

<template>
  <BaseModal
    :show="show"
    title="⚡ ELEGÍ TU CLASE ⚡"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    title-color="var(--yellow)"
    header-background="Rgba(26, 28, 46, 1)"
    :max-width="isSmallScreen ? '100dvw' : '1230px'"
    variant="retro"
    @close="close"
  >
    <div class="class-selection-container">
      <header class="selection-header">
        <p class="selection-subtitle">
          Esta elección define cómo jugás. Podés cambiar más adelante por 10,000 Battle Coins.
        </p>
      </header>

      <div class="classes-grid">
        <div 
          v-for="cls in PLAYER_CLASSES" 
          :key="cls.id"
          class="class-card-premium"
          :style="{ '--cls-color': cls.color }"
          :class="{ 'is-current': classStore.playerClass === cls.id }"
          @mouseenter="onCardHover($event, true)"
          @mouseleave="onCardHover($event, false)"
        >
          <div class="card-glow" />
          
          <div class="avatar-circle-wrap">
            <div class="avatar-circle">
              <img 
                :src="getTrainerSprite(cls.showdownSpriteId || cls.id)"
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
              <h3><span class="icon">✅</span> VENTAJAS</h3>
              <ul>
                <li
                  v-for="(bonus, idx) in cls.bonuses"
                  :key="idx"
                >
                  {{ bonus }}
                </li>
              </ul>
            </div>

            <div class="stats-section cons">
              <h3><span class="icon">❌</span> PENALIZACIONES</h3>
              <ul>
                <li
                  v-for="(penalty, idx) in cls.penalties"
                  :key="idx"
                >
                  {{ penalty }}
                </li>
              </ul>
            </div>
          </div>

          <button 
            :class="['btn-vicio-' + getButtonVariant(cls.id), 'btn-vicio-full']"
            :disabled="classStore.playerClass === cls.id"
            @click.stop="handleSelect(cls.id)"
          >
            <div class="btn-label-stack">
              <span class="btn-label">
                {{ classStore.playerClass === cls.id ? 'CLASE ACTUAL' : (classStore.playerClass ? 'CAMBIAR' : 'ELEGIR') }}
              </span>
              <span
                v-if="classStore.playerClass && classStore.playerClass !== cls.id"
                class="btn-price"
              >10,000 BC</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.class-selection-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
  max-height: 85dvh;
  @include smooth-scroll;
}

.selection-header {
  text-align: center;
  .selection-subtitle {
    font-size: 12px;
    color: Rgba(255, 255, 255, 0.5);
    @include pixelated;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    @include pixelated;
  }
}

.classes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  perspective: 1000px;
}

.class-card-premium {
  position: relative;
  background: Rgba(30, 41, 59, 0.4);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(10px);
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  overflow: hidden;

  @include hover-neon-yellow(1px);

  &.is-current {
    border-color: Rgba(34, 197, 94, 1);
    &::after {
      content: 'ACTUAL';
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 8px;
      @include pixelated;
      color: Rgba(34, 197, 94, 1);
    }
  }

  .card-glow {
    position: absolute;
    inset: 0;
    background: Radial-Gradient(circle at center, var(--cls-color) 0%, transparent 70%);
    opacity: 0.05;
    
    pointer-events: none;
  }
}

.avatar-circle-wrap {
  margin-bottom: 20px;
  .avatar-circle {
    width: 90px;
    height: 90px;
    background: Rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--cls-color);
    box-shadow: 0 0 20px var(--cls-color)66;
    overflow: hidden;
  }
  .trainer-pixel-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    @include sprite-render;
  }
}

.card-glow {
  opacity: 0.05;
}

.class-title {
  @include pixelated;
  font-size: 14px;
  color: var(--cls-color);
  margin-bottom: 16px;
  text-align: center;
  line-height: 1.3;
  text-shadow: 0 0 10px var(--cls-color)66;
  @include pixelated;
}

.class-desc {
  font-size: 12px;
  color: Rgba(255, 255, 255, 0.6);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 24px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-comparison {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
  flex: 1;
  padding-right: 4px;

  .stats-section {
    h3 {
      font-size: 9px;
      @include pixelated;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      @include pixelated;
    }
    
    &.pros h3 { color: Rgba(34, 197, 94, 1); }
    &.cons h3 { color: Rgba(239, 68, 68, 1); }

    ul {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      li {
        font-size: 11px;
        color: Rgba(255, 255, 255, 0.7);
        line-height: 1.4;
        position: relative;
        padding-left: 12px;
        &::before {
          content: '•';
          position: absolute;
          left: 0;
          color: Rgba(255, 255, 255, 0.3);
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

@media (max-width: 1024px) {
  .classes-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .classes-grid { grid-template-columns: 1fr; }
}

@media (max-width: 950px) {
  .class-selection-container {
    padding: 16px;
    gap: 20px;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    @include smooth-scroll;
  }

  .class-card-premium {
    padding: 24px 16px;
    
    .class-desc {
      height: auto;
      margin-bottom: 16px;
    }
  }
}
</style>
