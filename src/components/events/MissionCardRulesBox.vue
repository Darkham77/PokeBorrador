<script setup lang="ts">
/**
 * src/components/events/MissionCardRulesBox.vue
 * 
 * Subcomponent rendering the deployment requirements and reward condition rules in MissionCard.
 */

defineProps<{
  activationReq?: string;
  rewardConditions?: string;
  rulesText?: string;
}>();
</script>

<template>
  <div
    v-if="activationReq || rewardConditions || rulesText"
    class="rules-box"
  >
    <div
      v-if="activationReq"
      class="rules-section-block"
    >
      <span class="rules-badge deploy-badge">REQUISITO DE DESPLIEGUE</span>
      <p class="rules-desc">
        {{ activationReq }}
      </p>
    </div>

    <div
      v-if="rewardConditions"
      class="rules-section-block"
    >
      <span class="rules-badge reward-badge">CÓMO SE GANAN LAS RECOMPENSAS</span>
      <p class="rules-desc">
        {{ rewardConditions }}
      </p>
    </div>

    <div
      v-else-if="rulesText"
      class="rules-section-block"
    >
      <span class="rules-badge">REGLAS / REQUISITOS</span>
      <p class="rules-desc">
        {{ rulesText }}
      </p>
    </div>
  </div>
</template>

<style scoped src="./MissionCard.styles.scss" lang="scss"></style>
