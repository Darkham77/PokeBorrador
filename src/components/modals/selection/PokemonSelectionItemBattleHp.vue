<script setup lang="ts">
import { computed } from 'vue'
import { useBattleVisuals } from '@/composables/battle/useBattleVisuals'

const props = defineProps<{
  hp: number
  maxHp: number
}>()

const { getHpColor } = useBattleVisuals()

const hpPercent = computed(() => {
  if (props.maxHp <= 0) return 0
  return Math.max(0, Math.min(100, (props.hp / props.maxHp * 100)))
})

const barColor = computed(() => getHpColor(hpPercent.value))
</script>

<template>
  <div class="battle-hp-status">
    <span class="hp-label">HP</span>
    <div class="hp-bar-container">
      <div 
        class="hp-bar-fill" 
        :style="{ 
          width: hpPercent + '%',
          backgroundColor: barColor
        }"
      />
    </div>
    <span class="hp-text">{{ hp }} / {{ maxHp }}</span>
  </div>
</template>

<style scoped src="../PokemonSelectionItem.styles.scss" lang="scss"></style>
