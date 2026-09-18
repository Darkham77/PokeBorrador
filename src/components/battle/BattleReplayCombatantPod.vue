<script setup lang="ts">
/**
 * src/components/battle/BattleReplayCombatantPod.vue
 * 
 * Reusable combatant pod for battle replays (used for both P1 and P2).
 */

import { computed } from 'vue';
import type { FogOfWarSideState } from '@/logic/battle/replay/tacticalReplayEngine.ts';
import BattleReplayCombatantSprite from './BattleReplayCombatantSprite.vue';
import BattleReplayFogInspectCard from './BattleReplayFogInspectCard.vue';

const DEFAULT_COMBATANT_LEVEL = 50;

const props = defineProps<{
  state: FogOfWarSideState | null;
  isPlayer?: boolean;
}>();

const activePokemon = computed(() => props.state?.activePokemon ?? null);
const pokemonList = computed(() => props.state?.pokemonList ?? []);

const displayName = computed(() => {
  const p = activePokemon.value;
  return p?.name ?? '???';
});

const displayLevel = computed(() => {
  return activePokemon.value?.level ?? DEFAULT_COMBATANT_LEVEL;
});

function getBallPipEmoji(fainted: boolean, active: boolean): string {
  if (fainted) return '💀';
  if (active) return '⭐';
  return '⚪';
}
</script>

<template>
  <div
    class="combatant-pod"
    :class="isPlayer ? 'player-pod' : 'enemy-pod'"
  >
    <!-- If player pod, sprite is on top -->
    <BattleReplayCombatantSprite
      v-if="isPlayer"
      :pokemon="activePokemon"
      :is-player="isPlayer"
    />

    <div class="pod-header">
      <span class="pod-species">{{ displayName }}</span>
      <span class="pod-lvl">LV. {{ displayLevel }}</span>
    </div>

    <div class="team-balls-row">
      <span
        v-for="(p, idx) in pokemonList"
        :key="idx"
        class="ball-pip emoji"
        :class="{ fainted: p.isFainted, active: p.isActive }"
        :title="p.name"
      >
        <span class="emoji">{{ getBallPipEmoji(p.isFainted, p.isActive) }}</span>
      </span>
    </div>

    <!-- If enemy pod, sprite is after balls row -->
    <BattleReplayCombatantSprite
      v-if="!isPlayer"
      :pokemon="activePokemon"
      :is-player="isPlayer"
    />

    <!-- Fog-of-War Revealed Details -->
    <BattleReplayFogInspectCard :pokemon="activePokemon" />
  </div>
</template>

<style scoped src="./BattleReplayModal.styles.scss" lang="scss"></style>

