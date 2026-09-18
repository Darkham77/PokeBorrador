<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsWeatherDescLine.vue
 * 
 * Subcomponent rendering a single line of combat weather effect with inline type tags.
 */
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import { toPokemonType } from '@/data/battle/types';

interface ParsedDescriptionSegment {
  text: string;
  isType: boolean;
  type: string;
}

interface ParsedDescriptionLine {
  segments: ParsedDescriptionSegment[];
  typeClass: string;
  icon: string;
  label: string;
}

defineProps<{
  line: ParsedDescriptionLine;
}>();
</script>

<template>
  <div :class="['weather-desc-line', line.typeClass]">
    <div
      v-if="line.label"
      class="desc-line-label"
    >
      <span class="emoji desc-line-icon">
        {{ line.icon === 'block' ? '🚫 ' : line.icon }}
      </span>
      <span class="desc-line-text">{{ line.label }}</span>
    </div>

    <div :class="[line.label ? 'desc-line-value' : 'desc-line-full']">
      <template
        v-for="(segment, idx) in line.segments"
        :key="idx"
      >
        <PokemonTypeTag
          v-if="segment.isType"
          :type="toPokemonType(segment.type)"
          size="ssm"
          class="inline-type-tag"
        />
        <span v-else>{{ segment.text }}</span>
      </template>
    </div>
  </div>
</template>

<style src="../RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
<style src="@/styles/components/_route-spawns-tables.scss" scoped lang="scss"></style>
