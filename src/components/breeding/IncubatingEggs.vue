<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { POKEMON_DB } from '@/data/pokemonDB'
import type { PokemonEgg } from '@/types/pokemon'

const gameStore = useGameStore()
const modalStore = useModalStore()

const eggs = computed<PokemonEgg[]>(() => gameStore.state.eggs || [])

const getEggName = (egg: PokemonEgg) => {
  if (egg.scanned || egg.predictedInfo) {
    return (POKEMON_DB as Record<string, { name: string }>)[egg.id]?.name || 'Huevo Pokémon'
  }
  return 'Huevo Pokémon'
}

const getProgress = (egg: PokemonEgg) => {
  const totalSteps = 2500
  const walked = Math.max(0, totalSteps - egg.steps)
  return {
    walked,
    total: totalSteps,
    percentage: Math.min(100, Math.max(0, (walked / totalSteps) * 100))
  }
}

const openScanner = () => {
  modalStore.open('EggScanner')
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
        <button
          class="btn-vicio-secondary scanner-btn"
          @click.stop="openScanner"
        >
          🔍 ESCÁNER DE HUEVOS
        </button>
        <div
          class="count-badge"
          :class="{ empty: eggs.length === 0 }"
        >
          {{ eggs.length }} / 6
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
        <div class="egg-visual">
          <div class="egg-sprite">
            🥚
          </div>
          <div
            v-if="egg.isShiny"
            class="shiny-star"
          >
            ✨
          </div>
        </div>

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
              <span>{{ Math.floor(getProgress(egg).walked).toLocaleString() }} / {{ getProgress(egg).total.toLocaleString() }} pasos</span>
              <span>{{ Math.round(getProgress(egg).percentage) }}%</span>
            </div>
          </div>
        </div>

        <div class="action-zone">
          <button
            v-if="egg.ready || egg.steps <= 0"
            class="btn-vicio-success hatch-btn pulsing"
            @click.stop="hatchEgg(egg)"
          >
            🐣 ECLOSIONAR
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.egg-card {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &:hover {
    background: Rgba(255, 255, 255, 0.04);
    border-color: Rgba(255, 51, 102, 0.25);
    transform: Translatey(-2px);
  }

  &.ready {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.03);
    box-shadow: 0 0 15px Rgba(34, 197, 94, 0.05);

    &:hover {
      border-color: Rgba(34, 197, 94, 0.7);
      box-shadow: 0 0 20px Rgba(34, 197, 94, 0.1);
    }
  }
}

.egg-visual {
  width: 54px;
  height: 54px;
  background: Rgba(0, 0, 0, 0.25);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  position: relative;

  .shiny-star {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 12px;
    filter: Drop-Shadow(0 0 5px var(--yellow));
  }
}

.egg-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  .name {
    font-size: 13px;
    font-weight: 700;
    color: #f1f5f9;
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
  height: 6px;
  background: Rgba(255, 255, 255, 0.05);
  border-radius: 99px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff3366 0%, #a855f7 100%);
  border-radius: 99px;
  transition: width 0.4s ease-out;
}

.ready .progress-bar {
  background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #94a3b8;
  font-family: monospace;
}

.action-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
}

.hatch-btn {
  font-size: 7px;
  padding: 8px 12px;
  @include pixelated;
}

.pulsing {
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% {
    box-shadow: 0 0 0 0 Rgba(34, 197, 94, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px Rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 Rgba(34, 197, 94, 0);
  }
}

.walking-label {
  font-size: 9px;
  color: #94a3b8;
  @include pixelated;
  opacity: 0.8;
}
</style>
