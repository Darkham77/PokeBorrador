<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import type { PokemonEgg } from '@/types/pokemon/pokemon'
import EggSprite from '@/components/common/EggSprite.vue'

const gameStore = useGameStore()
const modalStore = useModalStore()

const eggs = computed<PokemonEgg[]>(() => gameStore.state.eggs || [])
const regularEggs = computed(() => eggs.value.filter(e => !e.isNpc))
const npcEggs = computed(() => eggs.value.filter(e => e.isNpc))

const getEggName = (egg: PokemonEgg) => {
  if (egg.scanned || egg.predictedInfo) {
    const speciesId = egg.pokemonId || egg.id
    return (POKEMON_DB as Record<string, { name: string }>)[speciesId]?.name || 'Huevo Pokémon'
  }
  return 'Huevo Pokémon'
}

const getProgress = (egg: PokemonEgg) => {
  if (!egg.totalSteps) {
    // Legacy egg: no original total saved, show as indeterminate
    return { walked: 0, total: egg.steps, percentage: 0, isLegacy: true }
  }
  const walked = Math.max(0, egg.totalSteps - egg.steps)
  return {
    walked,
    total: egg.totalSteps,
    percentage: Math.min(100, Math.max(0, (walked / egg.totalSteps) * 100)),
    isLegacy: false
  }
}

const hatchEgg = (egg: PokemonEgg) => {
  modalStore.open('HatchAnimation', { egg })
}
</script>

<template>
  <div class="incubating-eggs">
    <header class="incubating-header">
      <div class="info">
        <h3>Incubadora de Mochila</h3>
        <p>Huevos que llevas contigo en tu mochila (camina o gana batallas para eclosionarlos)</p>
      </div>
      <div class="actions">
        <div
          class="count-badge"
          :class="{ empty: regularEggs.length === 0 }"
        >
          {{ regularEggs.length }} / 6
          <template v-if="npcEggs.length > 0">
            <span class="npc-badge">+{{ npcEggs.length }} NPC</span>
          </template>
        </div>
      </div>
    </header>

    <div
      v-if="eggs.length === 0"
      class="empty-state"
    >
      <div class="icon">
        🎒
      </div>
      <p>No tienes huevos en tu mochila. ¡Recoge huevos del almacén de la guardería!</p>
    </div>

    <div
      v-else
      class="egg-grid"
    >
      <div
        v-for="egg in eggs"
        :key="egg.uid"
        class="egg-card"
        :class="{ ready: egg.ready || egg.steps <= 0 }"
      >
        <!-- Upper Main Row (Sprite + Progress details) -->
        <div class="egg-main-row">
          <!-- Free-floating Egg Sprite -->
          <div class="egg-visual">
            <span class="egg-sprite">
              <EggSprite
                :tint="egg.tint"
                size="38"
                class="egg-sprite-img"
              />
            </span>
            <span
              v-if="egg.isShiny"
              class="shiny-star"
            >✨</span>
          </div>

          <!-- Progress and Info details -->
          <div class="egg-details">
            <div class="name">
              {{ getEggName(egg) }}
            </div>
            
            <div class="progress-container">
              <div class="progress-bar-wrapper">
                <div
                  class="progress-bar"
                  :style="{ width: `${getProgress(egg).percentage}%` }"
                />
              </div>
              <div class="progress-text">
                <span class="steps-val">
                  <template v-if="getProgress(egg).isLegacy">
                    {{ Math.ceil(egg.steps).toLocaleString() }} pasos restantes
                  </template>
                  <template v-else>
                    {{ Math.floor(getProgress(egg).walked).toLocaleString() }} / {{ getProgress(egg).total.toLocaleString() }} pasos
                  </template>
                </span>
                <span class="pct-val">{{ getProgress(egg).isLegacy ? '?' : Math.round(getProgress(egg).percentage) + '%' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Footer Row (Status as footnote) -->
        <div class="egg-footer-status">
          <button
            v-if="egg.ready || egg.steps <= 0"
            v-gsap-loop="{ effect: 'pulse-shadow', color: 'rgba(34, 197, 94, 0.4)', duration: 2 }"
            class="btn-vicio-success hatch-btn"
            @click.stop="hatchEgg(egg)"
          >
            🐣 ECLOSIONAR HUEVO
          </button>
          <div
            v-else
            class="walking-label"
          >
            <span>🚶 Caminando...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.incubating-eggs {
  padding: 10px 0;
}

.incubating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;

  h3 {
    @include pixelated;
    font-size: 10px;
    color: var(--daycare-pink, #ff3366);
    margin-bottom: 6px;
  }
  p {
    font-size: 12px;
    color: var(--gray, #94a3b8);
    max-width: 500px;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .scanner-btn {
    font-size: 7px;
    padding: 8px 14px;
    @include pixelated;
  }
}

.count-badge {
  background: Rgba(255, 51, 102, 0.08);
  border: 1px solid Rgba(255, 51, 102, 0.3);
  color: #ff3366;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;

  .npc-badge {
    font-size: 9px;
    font-weight: 700;
    background: Rgba(56, 189, 248, 0.15);
    border: 1px solid Rgba(56, 189, 248, 0.4);
    color: #38bdf8;
    padding: 2px 6px;
    border-radius: 99px;
    @include pixelated;
  }

  &.empty {
    background: Rgba(148, 163, 184, 0.1);
    border-color: Rgba(148, 163, 184, 0.2);
    color: var(--gray, #94a3b8);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(148, 163, 184, 0.8);
  background: Rgba(0, 0, 0, 0.15);
  border: 1px dashed Rgba(255, 255, 255, 0.05);
  border-radius: 16px;

  .icon {
    font-size: 40px;
    margin-bottom: 12px;
    opacity: 0.3;
  }
  p {
    font-size: 13px;
    @include pixelated;
  }
}

.egg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  justify-content: center;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.egg-card {
  background: linear-gradient(135deg, Rgba(30, 15, 26, 0.75) 0%, Rgba(15, 5, 12, 0.92) 100%);
  border: 1px solid Rgba(255, 51, 102, 0.15);
  border-radius: 16px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column; /* Stack details row and status footer vertically */
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
    background: linear-gradient(135deg, Rgba(20, 35, 25, 0.75) 0%, Rgba(8, 18, 12, 0.92) 100%);
    box-shadow: 0 4px 15px Rgba(34, 197, 94, 0.1), inset 0 0 15px Rgba(34, 197, 94, 0.05);

    &:hover {
      border-color: Rgba(34, 197, 94, 0.65);
      background: linear-gradient(135deg, Rgba(26, 46, 33, 0.8) 0%, Rgba(12, 26, 18, 0.96) 100%);
      box-shadow: 0 6px 22px Rgba(34, 197, 94, 0.18), inset 0 0 15px Rgba(34, 197, 94, 0.08);
    }
  }
}

/* Main row for visual sprite and progress statistics */
.egg-main-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* Free-floating visual egg styling (No artificial backgrounds or squares) */
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

  .name {
    font-size: 11px;
    @include pixelated;
    color: #ffffff;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
  background: linear-gradient(90deg, #ff3366 0%, #a855f7 100%);
  border-radius: 99px;
  
}

.ready .progress-bar {
  background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
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

/* Footnote layout for breeding egg status */
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
  color: #64748b;
  @include pixelated;
  opacity: 0.8;
  display: inline-block;
  text-align: center;
  margin-top: 2px;
}
</style>
