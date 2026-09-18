<script setup lang="ts">
import { computed } from 'vue';
import {
  formatCosmeticRequirement,
  type LockableCosmeticStyle
} from './cosmeticsFilterHelper';

const props = withDefaults(defineProps<{
  styleData: LockableCosmeticStyle;
  previewUsername: string;
  isActive?: boolean;
  isLocked?: boolean;
}>(), {
  isActive: false,
  isLocked: false
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
    class="style-card"
    :class="{ 
      active: isActive,
      locked: isLocked,
      unlocked: !isLocked && hasRequirements
    }"
    @click.stop="emit('select')"
  >
    <div class="preview-area">
      <span
        v-gsap-nick="styleData.class"
        class="preview-nick"
        :class="styleData.class"
      >{{ previewUsername }}</span>
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
</style>
