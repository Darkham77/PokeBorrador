<script setup lang="ts">
import { computed } from 'vue';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import {
  formatCosmeticRequirement,
  type LockableCosmeticStyle
} from './cosmeticsFilterHelper';

const props = withDefaults(defineProps<{
  styleData: LockableCosmeticStyle;
  isActive?: boolean;
  isLocked?: boolean;
  playerClass?: string | null;
  trainerLevel?: number | null;
  gender?: string | null;
}>(), {
  isActive: false,
  isLocked: false,
  playerClass: undefined,
  trainerLevel: undefined,
  gender: undefined
});

const emit = defineEmits<{
  (e: 'select'): void;
}>();

const hasRequirements = computed(() => {
  return Boolean(props.styleData.requiredRole || props.styleData.requiredClass || props.styleData.requiredFaction);
});

const requirementLabel = computed(() => {
  return formatCosmeticRequirement(props.styleData);
});
</script>

<template>
  <div
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
    <div class="style-meta">
      <span class="style-name">{{ styleData.name }}</span>
      <span
        v-if="isLocked"
        class="lock-tag locked"
        :class="[styleData.requiredClass, styleData.requiredFaction]"
      >
        <span class="emoji">🔒</span> {{ requirementLabel }}
      </span>
      <span
        v-else-if="hasRequirements"
        v-gsap-loop="{ effect: 'pulse-shadow', color: 'rgba(74, 222, 128, 0.4)', boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)', duration: 2 }"
        class="lock-tag unlocked"
        :class="[styleData.requiredClass, styleData.requiredFaction]"
      >
        <span class="emoji">🔓</span> {{ requirementLabel }}
      </span>
      <span
        v-if="isActive"
        class="status-tag"
      >EQUIPADO</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_cosmetics-shared.scss";

.avatar-preview-box {
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
