<script setup lang="ts">
import type { NpcChanceInfo } from '@/logic/weather/weatherUtils';

interface Props {
  npcItems: NpcChanceInfo[];
}

defineProps<Props>();
</script>

<template>
  <div
    v-for="npc in npcItems"
    :key="npc.type"
    class="report-row"
    :class="{ 'gray-text': !npc.active }"
  >
    <!-- NPC Info (Icon/Emoji, Name) -->
    <div class="col-pokemon row-cell flex-align">
      <div class="mini-sprite-wrapper">
        <div class="emoji unknown-placeholder">
          {{ npc.type === 'rival' ? '👦' : npc.type === 'defender' ? '🛡️' : npc.type === 'guardian' ? '👹' : npc.type === 'trainer' ? '🎒' : '👤' }}
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
        :class="npc.type === 'rival' ? 'visitor' : npc.type === 'defender' ? 'exclusive' : npc.type === 'guardian' ? 'exclusive' : 'common'"
      >
        {{ npc.type === 'rival' ? 'RIVAL' : npc.type === 'defender' ? 'DEFENSOR' : npc.type === 'guardian' ? 'GUARDIÁN' : npc.type === 'trainer' ? 'ENTRENADOR' : npc.type }}
      </span>
    </div>

    <!-- Estado (Activo / Inactivo) -->
    <div class="col-type row-cell flex-align">
      <span
        class="status-tag"
        :class="npc.active ? 'exclusive' : 'common'"
      >
        {{ npc.active ? 'ACTIVO' : 'INACTIVO' }}
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
            :style="{ width: `${Math.min(100, npc.chance * 2.5)}%` }"
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
