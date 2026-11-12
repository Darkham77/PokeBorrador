<script setup lang="ts">
interface StyleData {
  readonly name: string;
  readonly requiredClass?: string;
  readonly requiredFaction?: string;
}

interface Props {
  readonly styleData: StyleData;
  readonly isLocked: boolean;
  readonly hasRequirements: boolean;
  readonly requirementLabel: string;
  readonly isActive: boolean;
}

defineProps<Props>();
</script>

<template>
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
      v-gsap-loop="{
        effect: 'pulse-shadow',
        color: 'rgba(74, 222, 128, 0.4)',
        boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)',
        duration: 2
      }"
      class="lock-tag unlocked"
      :class="[styleData.requiredClass, styleData.requiredFaction]"
    >
      <span class="emoji">🔓</span> {{ requirementLabel }}
    </span>
    <span v-if="isActive" class="status-tag">EQUIPADO</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/components/_cosmetics-shared';
</style>
