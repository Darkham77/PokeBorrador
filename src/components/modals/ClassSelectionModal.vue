<script setup lang="ts">
import { useUIStore } from '@/stores/ui';
import { computed } from 'vue';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { PLAYER_CLASSES, type PlayerClassId } from '@/data/player/playerClasses';
import BaseModal from '@/components/common/BaseModal.vue';
import ClassSelectionCard from './class/ClassSelectionCard.vue';
import type { RenderPlayerClass } from './class/classSelectionTypes.ts';

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: false
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

defineOptions({ inheritAttrs: false });

const classStore = usePlayerClassStore();
const ui = useUIStore();
const isSmallScreen = computed(() => ui.isSmallScreen);

const playerClassList = computed<RenderPlayerClass[]>(() => Object.values(PLAYER_CLASSES).map(cls => ({
  id: cls.id,
  name: cls.name,
  color: cls.color,
  description: cls.description,
  bonuses: cls.bonuses,
  penalties: cls.penalties,
  technicalBonuses: cls.technicalBonuses,
  technicalPenalties: cls.technicalPenalties,
  spriteId: cls.showdownSpriteId,
})));

const close = () => { 
  emit('close');
};

const handleSelect = async (id: PlayerClassId) => {
  const res = await classStore.selectClass(id);
  if (res.success) close();
};
</script>

<template>
  <BaseModal
    :show="show"
    emoji="⚡"
    title="ELEGÍ TU CLASE"
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
        <ClassSelectionCard
          v-for="cls in playerClassList"
          :key="cls.id"
          :cls="cls"
          :is-current="classStore.playerClass === cls.id"
          :current-player-class="classStore.playerClass"
          @select="handleSelect"
        />
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
}
</style>
