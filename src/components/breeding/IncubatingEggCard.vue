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
  if ((egg.scanned || egg.predictedInfo) && egg.pokemonId) {
    const speciesId = getEggSpecies(egg.pokemonId)
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  padding: 10px 14px;
  border: 1px solid Rgb(255 51 102 / 15%);
  border-radius: 16px;
  background: Linear-Gradient(135deg, Rgb(30 15 26 / 75%) 0%, Rgb(15 5 12 / 92%) 100%);
  overflow: hidden;
  box-shadow: 0 4px 15px Rgb(0 0 0 / 35%), inset 0 0 15px Rgb(255 51 102 / 5%);

  @media (width <= 520px) {
    max-width: 320px;
    padding: 10px 12px;
  }

  &.ready {
    background: Linear-Gradient(135deg, Rgb(20 35 25 / 75%) 0%, Rgb(8 18 12 / 92%) 100%);
    border-color: Rgb(34 197 94 / 35%);
    box-shadow: 0 4px 15px Rgb(34 197 94 / 10%), inset 0 0 15px Rgb(34 197 94 / 5%);

    &:hover {
      background: Linear-Gradient(135deg, Rgb(26 46 33 / 80%) 0%, Rgb(12 26 18 / 96%) 100%);
      border-color: Rgb(34 197 94 / 65%);
      box-shadow: 0 6px 22px Rgb(34 197 94 / 18%), inset 0 0 15px Rgb(34 197 94 / 8%);
    }
  }

  &.npc-egg-card {
    background: Linear-Gradient(135deg, Rgb(38 12 16 / 75%) 0%, Rgb(20 6 8 / 92%) 100%);
    border-color: Rgb(239 68 68 / 35%);
    box-shadow: 0 4px 15px Rgb(239 68 68 / 12%), inset 0 0 15px Rgb(239 68 68 / 5%);

    &:hover {
      background: Linear-Gradient(135deg, Rgb(48 16 22 / 80%) 0%, Rgb(26 8 11 / 96%) 100%);
      border-color: Rgb(239 68 68 / 55%);
      box-shadow: 0 6px 20px Rgb(239 68 68 / 20%), inset 0 0 15px Rgb(239 68 68 / 8%);
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
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 48px;
  height: 48px;
  filter: Drop-Shadow(0 4px 6px Rgb(0 0 0 / 30%));
  
  .egg-sprite {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .egg-sprite-img {
    @include pixelated;

    width: 38px;
    height: 38px;
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;

  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .name {
    @include pixelated;

    color: #fff;
    font-size: 11px;
    line-height: 1.45;
    padding-bottom: 2px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .npc-origin-badge {
    @include pixelated;

    padding: 1px 5px;
    border: 1px solid Rgb(239 68 68 / 40%);
    border-radius: 99px;
    background: Rgb(239 68 68 / 15%);
    color: #f87171;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar-wrapper {
  position: relative;
  height: 8px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 99px;
  background: Rgb(0 0 0 / 45%);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 99px;
  background: Linear-Gradient(90deg, #f36 0%, #a855f7 100%);
}

.ready .progress-bar {
  background: Linear-Gradient(90deg, #22c55e 0%, #10b981 100%);
}

.progress-text {
  @include pixelated;

  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #94a3b8;
  font-size: 8.5px;
  white-space: nowrap;
}

.egg-footer-status {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 2px;
}

.hatch-btn {
  @include pixelated;

  width: 100%;
  padding: 6px 12px;
  font-size: 7.5px;
  box-shadow: 0 4px 12px Rgb(34 197 94 / 20%);
}

.walking-label {
  @include pixelated;

  display: inline-block;
  color: var(--gray, #94a3b8);
  font-size: 8px;
  text-align: center;
  opacity: 0.8;
  margin-top: 2px;
}
</style>
