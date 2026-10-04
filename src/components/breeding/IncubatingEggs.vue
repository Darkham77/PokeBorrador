<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import type { PokemonEgg } from '@/types/pokemon/pokemon'
import IncubatingEggCard from './IncubatingEggCard.vue'

const gameStore = useGameStore()
const modalStore = useModalStore()

const eggs = computed<PokemonEgg[]>(() => gameStore.state.eggs || [])
const regularEggs = computed(() => eggs.value.filter(e => !e.isNpc))
const npcEggs = computed(() => eggs.value.filter(e => e.isNpc))

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
      <div class="emoji icon">
        🎒
      </div>
      <p>No tienes huevos en tu mochila. ¡Recoge huevos del almacén de la guardería!</p>
    </div>

    <div
      v-else
      class="egg-grid"
    >
      <IncubatingEggCard
        v-for="egg in eggs"
        :key="egg.uid"
        :egg="egg"
        @hatch="hatchEgg"
      />
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
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  h3 {
    @include pixelated;

    color: var(--daycare-pink, #f36);
    font-size: 10px;
    margin-bottom: 6px;
  }
  p {
    max-width: 500px;
    color: var(--gray, #94a3b8);
    font-size: 12px;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.count-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgb(255 51 102 / 30%);
  border-radius: 99px;
  background: rgb(255 51 102 / 8%);
  color: #f36;
  font-size: 12px;
  font-weight: 800;

  .npc-badge {
    @include pixelated;

    padding: 2px 6px;
    border: 1px solid rgb(56 189 248 / 40%);
    border-radius: 99px;
    background: rgb(56 189 248 / 15%);
    color: #38bdf8;
    font-size: 9px;
    font-weight: 700;
  }

  &.empty {
    background: rgb(148 163 184 / 10%);
    color: var(--gray, #94a3b8);
    border-color: rgb(148 163 184 / 20%);
  }
}

.empty-state {
  padding: 40px 20px;
  border: 1px dashed rgb(255 255 255 / 5%);
  border-radius: 16px;
  background: rgb(0 0 0 / 15%);
  color: rgb(148 163 184 / 80%);
  text-align: center;

  .icon {
    font-size: 40px;
    opacity: 0.3;
    margin-bottom: 12px;
  }
  p {
    @include pixelated;

    font-size: 13px;
  }
}

.egg-grid {
  display: grid;
  justify-content: center;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));

  @media (width <= 600px) {
    grid-template-columns: 1fr;
  }
}
</style>
