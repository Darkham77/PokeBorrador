<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsNpcRow.vue
 * 
 * Atomic row component rendering a single NPC chance entry in the route spawns table.
 */
import { computed } from 'vue';
import type { NpcChanceInfo } from '@/logic/weather/weatherUtils';

const MAX_PROBABILITY_BAR_PERCENT = 100;
const PROBABILITY_SCALE_FACTOR = 2.5;

interface Props {
  npc: NpcChanceInfo;
}

const props = defineProps<Props>();

const NPC_EMOJIS: Record<string, string> = {
  rival: '👦',
  defender: '🛡️',
  guardian: '👹',
  trainer: '🎒'
};

const NPC_TAG_CLASSES: Record<string, string> = {
  rival: 'visitor',
  defender: 'exclusive',
  guardian: 'exclusive'
};

const NPC_ROLE_LABELS: Record<string, string> = {
  rival: 'RIVAL',
  defender: 'DEFENSOR',
  guardian: 'GUARDIÁN',
  trainer: 'ENTRENADOR'
};

const emoji = computed(() => NPC_EMOJIS[props.npc.type] || '👤');
const roleClass = computed(() => NPC_TAG_CLASSES[props.npc.type] || 'common');
const roleLabel = computed(() => NPC_ROLE_LABELS[props.npc.type] || props.npc.type);
const activeClass = computed(() => (props.npc.active ? 'exclusive' : 'common'));
const activeLabel = computed(() => (props.npc.active ? 'ACTIVO' : 'INACTIVO'));
const probWidth = computed(() => `${Math.min(MAX_PROBABILITY_BAR_PERCENT, props.npc.chance * PROBABILITY_SCALE_FACTOR)}%`);
</script>

<template>
  <div
    class="report-row"
    :class="{ 'gray-text': !npc.active }"
  >
    <!-- NPC Info (Icon/Emoji, Name) -->
    <div class="col-pokemon row-cell flex-align">
      <div class="mini-sprite-wrapper">
        <div class="emoji unknown-placeholder">
          {{ emoji }}
        </div>
      </div>
      <div class="poke-name-wrap">
        <span class="poke-name">{{ npc.name }}</span>
      </div>
    </div>

    <!-- Tipo / Rol -->
    <div class="col-types row-cell flex-align">
      <span
        class="status-tag"
        :class="roleClass"
      >
        {{ roleLabel }}
      </span>
    </div>

    <!-- Estado (Activo / Inactivo) -->
    <div class="col-type row-cell flex-align">
      <span
        class="status-tag"
        :class="activeClass"
      >
        {{ activeLabel }}
      </span>
    </div>

    <!-- Detalles -->
    <div class="col-multiplier row-cell flex-align text-center">
      <span class="mult-value neutral-text">{{ npc.details || '-' }}</span>
    </div>

    <!-- Probabilidad de Paso -->
    <div class="col-prob row-cell flex-align">
      <div class="prob-bar-wrapper">
        <div class="prob-numerical">
          <span class="active-prob">
            {{ npc.chance.toFixed(1) }}%
          </span>
        </div>
        <div class="prob-visual-progress">
          <div
            class="fill base-fill"
            :style="{ width: probWidth }"
          />
        </div>
      </div>
    </div>

    <!-- Stats placeholder -->
    <div class="col-stats row-cell flex-align text-center">
      <span class="neutral-text">-</span>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
