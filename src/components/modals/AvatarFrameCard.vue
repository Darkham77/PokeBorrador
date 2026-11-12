<script setup lang="ts">
import { computed } from 'vue';

import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';

import CosmeticsCardMeta from './CosmeticsCardMeta.vue';
import { formatCosmeticRequirement, type LockableCosmeticStyle } from './cosmeticsFilterHelper';

const props = withDefaults(
  defineProps<{
    styleData: LockableCosmeticStyle;
    isActive?: boolean;
    isLocked?: boolean;
    playerClass?: string | null;
    trainerLevel?: number | null;
    gender?: string | null;
  }>(),
  {
    isActive: false,
    isLocked: false,
    playerClass: undefined,
    trainerLevel: undefined,
    gender: undefined
  }
);

const emit = defineEmits<{
  (e: 'select'): void;
}>();

const hasRequirements = computed(() => {
  return Boolean(
    props.styleData.requiredRole || props.styleData.requiredClass || props.styleData.requiredFaction
  );
});

const requirementLabel = computed(() => {
  return formatCosmeticRequirement(props.styleData);
});
</script>

<template>
  <div
    id="avatar-frame-card-div-1"
    role="button"
    tabindex="0"
    class="style-card avatar-item"
    :class="{
      active: isActive,
      locked: isLocked,
      unlocked: !isLocked && hasRequirements
    }"
    @click.stop="emit('select')"
  >
    <div class="avatar-preview-box">
      <TrainerAvatar
        :size="64"
        :avatar-style="styleData.class"
        :player-class="playerClass"
        :level="trainerLevel ?? undefined"
        :gender="gender"
      />
    </div>
    <CosmeticsCardMeta
      :style-data="styleData"
      :is-locked="isLocked"
      :has-requirements="hasRequirements"
      :requirement-label="requirementLabel"
      :is-active="isActive"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/components/_cosmetics-shared';

.avatar-preview-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}
</style>
