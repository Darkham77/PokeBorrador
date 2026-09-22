<script setup lang="ts">
import { computed } from 'vue'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import type { PokemonEgg } from '@/types/pokemon/pokemon'
import { getEggSpecies } from '@/logic/breeding/breedingEngine'
import EggSprite from '@/components/common/EggSprite.vue'
import { NPC_EGG_TINT } from '@/logic/constants/gameplay'

interface Props {
  egg: PokemonEgg
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'hatch', egg: PokemonEgg): void
}>()

const isReady = computed(() => props.egg.ready || props.egg.steps <= 0)

const eggTint = computed(() => props.egg.tint || (props.egg.isNpc ? NPC_EGG_TINT : undefined))

const eggName = computed(() => {
  const egg = props.egg
  if (egg.scanned || egg.predictedInfo) {
    const speciesId = getEggSpecies(egg.pokemonId || egg.id)
    return POKEMON_DB[speciesId]?.name || 'Huevo Pokémon'
  }
  if (egg.isNpc) {
    return 'Huevo Misterioso'
  }
  return 'Huevo Pokémon'
})

const progress = computed(() => {
  const egg = props.egg
  if (!egg.totalSteps) {
    return { walked: 0, total: egg.steps, percentage: 0, isLegacy: true }
  }
  const walked = Math.max(0, egg.totalSteps - egg.steps)
  return {
    walked,
    total: egg.totalSteps,
    percentage: Math.min(100, Math.max(0, (walked / egg.totalSteps) * 100)),
    isLegacy: false
  }
})
</script>

<template>
  <div
    class="egg-card"
    :class="{ ready: isReady, 'npc-egg-card': egg.isNpc }"
  >
    <!-- Upper Main Row (Sprite + Progress details) -->
    <div class="egg-main-row">
      <!-- Free-floating Egg Sprite -->
      <div class="egg-visual">
        <span class="egg-sprite">
          <EggSprite
            :tint="eggTint"
            size="38"
            class="egg-sprite-img"
          />
        </span>
        <span
          v-if="egg.isShiny"
          class="emoji shiny-star"
        >✨</span>
      </div>

      <!-- Progress and Info details -->
      <div class="egg-details">
        <div class="name-row">
          <div class="name">
            {{ eggName }}
          </div>
          <span
            v-if="egg.isNpc"
            class="npc-origin-badge"
          >
            REGALO NPC
          </span>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar-wrapper">
            <div
              class="progress-bar"
              :style="{ width: `${progress.percentage}%` }"
            />
          </div>
          <div class="progress-text">
            <span class="steps-val">
              <template v-if="progress.isLegacy">
                {{ Math.ceil(egg.steps).toLocaleString() }} pasos restantes
              </template>
              <template v-else>
                {{ Math.floor(progress.walked).toLocaleString() }} / {{ progress.total.toLocaleString() }} pasos
              </template>
            </span>
            <span class="pct-val">{{ progress.isLegacy ? '?' : Math.round(progress.percentage) + '%' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Footer Row (Status as footnote) -->
    <div class="egg-footer-status">
      <button
        v-if="isReady"
        v-gsap-loop="{ effect: 'pulse-shadow', color: 'rgba(34, 197, 94, 0.4)', duration: 2 }"
        class="btn-vicio-success hatch-btn"
        @click.stop="emit('hatch', egg)"
      >
        <span class="emoji">🐣</span> ECLOSIONAR HUEVO
      </button>
      <div
        v-else
        class="walking-label"
      >
        <span><span class="emoji">🚶</span> Caminando...</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.egg-card {
  background: Linear-Gradient(135deg, Rgba(30, 15, 26, 0.75) 0%, Rgba(15, 5, 12, 0.92) 100%);
  border: 1px solid Rgba(255, 51, 102, 0.15);
  border-radius: 16px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.35), inset 0 0 15px Rgba(255, 51, 102, 0.05);

  @media (max-width: 520px) {
    padding: 10px 12px;
    max-width: 320px;
  }

  &.ready {
    border-color: Rgba(34, 197, 94, 0.35);
    background: Linear-Gradient(135deg, Rgba(20, 35, 25, 0.75) 0%, Rgba(8, 18, 12, 0.92) 100%);
    box-shadow: 0 4px 15px Rgba(34, 197, 94, 0.1), inset 0 0 15px Rgba(34, 197, 94, 0.05);

    &:hover {
      border-color: Rgba(34, 197, 94, 0.65);
      background: Linear-Gradient(135deg, Rgba(26, 46, 33, 0.8) 0%, Rgba(12, 26, 18, 0.96) 100%);
      box-shadow: 0 6px 22px Rgba(34, 197, 94, 0.18), inset 0 0 15px Rgba(34, 197, 94, 0.08);
    }
  }

  &.npc-egg-card {
    border-color: Rgba(239, 68, 68, 0.35);
    background: linear-gradient(135deg, Rgba(38, 12, 16, 0.75) 0%, Rgba(20, 6, 8, 0.92) 100%);
    box-shadow: 0 4px 15px Rgba(239, 68, 68, 0.12), inset 0 0 15px Rgba(239, 68, 68, 0.05);

    &:hover {
      border-color: Rgba(239, 68, 68, 0.55);
      background: linear-gradient(135deg, Rgba(48, 16, 22, 0.8) 0%, Rgba(26, 8, 11, 0.96) 100%);
      box-shadow: 0 6px 20px Rgba(239, 68, 68, 0.2), inset 0 0 15px Rgba(239, 68, 68, 0.08);
    }
  }
}

.egg-main-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.egg-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  position: relative;
  filter: Drop-Shadow(0 4px 6px Rgba(0, 0, 0, 0.3));
  
  .egg-sprite {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .egg-sprite-img {
    width: 38px;
    height: 38px;
    @include pixelated;
  }

  .shiny-star {
    position: absolute;
    top: -2px;
    right: -2px;
    font-size: 11px;
    filter: Drop-Shadow(0 0 4px var(--yellow));
  }
}

.egg-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .name {
    font-size: 11px;
    @include pixelated;
    line-height: 1.45;
    padding-bottom: 2px;
    color: #ffffff;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .npc-origin-badge {
    font-size: 7.5px;
    font-weight: 700;
    color: #f87171;
    background: Rgba(239, 68, 68, 0.15);
    border: 1px solid Rgba(239, 68, 68, 0.4);
    padding: 1px 5px;
    border-radius: 99px;
    letter-spacing: 0.5px;
    @include pixelated;
    flex-shrink: 0;
  }
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar-wrapper {
  height: 8px;
  background: Rgba(0, 0, 0, 0.45);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 99px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: Linear-Gradient(90deg, #ff3366 0%, #a855f7 100%);
  border-radius: 99px;
}

.ready .progress-bar {
  background: Linear-Gradient(90deg, #22c55e 0%, #10b981 100%);
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8.5px;
  color: #94a3b8;
  @include pixelated;
  white-space: nowrap;
}

.egg-footer-status {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2px;
}

.hatch-btn {
  font-size: 7.5px;
  padding: 6px 12px;
  width: 100%;
  @include pixelated;
  box-shadow: 0 4px 12px Rgba(34, 197, 94, 0.2);
}

.walking-label {
  font-size: 8px;
  color: var(--gray, #94a3b8);
  @include pixelated;
  opacity: 0.8;
  display: inline-block;
  text-align: center;
  margin-top: 2px;
}
</style>
