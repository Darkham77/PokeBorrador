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
</style>
