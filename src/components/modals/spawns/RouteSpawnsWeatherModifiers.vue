<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsWeatherModifiers.vue
 * 
 * Subcomponent rendering weather appearance type modifiers (boost, debuff, block).
 */
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import type { PokemonType } from '@/data/battle/types';

interface WeatherModifiersData {
  boost?: readonly PokemonType[];
  debuff?: readonly PokemonType[];
  block?: readonly PokemonType[];
}

defineProps<{
  modifiers: WeatherModifiersData;
}>();
</script>

<template>
  <div class="weather-modifiers-section">
    <span class="weather-title-badge"><span class="emoji">⛅</span> APARICIÓN DE CLIMA</span>
    <div class="weather-type-modifiers">
      <div 
        v-if="modifiers.boost?.length" 
        class="modifier-group boost"
      >
        <span class="group-label"><span class="emoji">▲</span> BONIFICACIÓN:</span>
        <div class="tags-row">
          <PokemonTypeTag
            v-for="t in modifiers.boost"
            :key="t"
            :type="t"
            size="ssm"
          />
        </div>
      </div>

      <div 
        v-if="modifiers.debuff?.length" 
        class="modifier-group debuff"
      >
        <span class="group-label"><span class="emoji">▼</span> PENALIZACIÓN:</span>
        <div class="tags-row">
          <PokemonTypeTag
            v-for="t in modifiers.debuff"
            :key="t"
            :type="t"
            size="ssm"
          />
        </div>
      </div>

      <div 
        v-if="modifiers.block?.length" 
        class="modifier-group block"
      >
        <span class="group-label"><span class="emoji">🚫</span> BLOQUEADO:</span>
        <div class="tags-row">
          <PokemonTypeTag
            v-for="t in modifiers.block"
            :key="t"
            :type="t"
            size="ssm"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style src="../RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
<style src="@/styles/components/_route-spawns-tables.scss" scoped lang="scss"></style>
