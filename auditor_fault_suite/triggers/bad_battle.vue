<template>
  <div class="battle-view-bad">
    <!-- Trigger: battle-ui-excessive-branching -->
    <div v-if="phase === 'intro'">Intro</div>
    <div v-else-if="phase === 'action_select'">
      <div v-if="subAction === 'moves'">Moves</div>
      <div v-else-if="subAction === 'items'">Items</div>
      <div v-else-if="subAction === 'pkmn'">Pkmn</div>
      <div v-else-if="subAction === 'flee'">Flee</div>
      <div v-else>Unknown</div>
    </div>
    <div v-else-if="phase === 'animating'">Animating</div>
    <div v-else-if="phase === 'ended'">Ended</div>
    <div v-else>Default</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Trigger: sim-direct-client-coupling (Direct simulation coupling in UI client view)
import { BattleSimulationEngine } from '../../showdown/sim/battle_sim_engine';

const phase = ref('intro');
const subAction = ref('moves');
const sim = new BattleSimulationEngine();
</script>

<style scoped>
.battle-view-bad {
  display: block;
}
</style>
