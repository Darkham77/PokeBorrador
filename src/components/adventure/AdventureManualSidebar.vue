<script setup lang="ts">
/**
 * src/components/adventure/AdventureManualSidebar.vue
 * 
 * Sidebar for adventure test simulator: HMs, bike, team passives, field moves, cheats, and logs.
 */

import AdventureCheatPanel from './AdventureCheatPanel.vue'
import type { ItemId } from '@/data/inventory/items'

interface ActivePassiveItem {
  label: string;
  desc: string;
}

interface ActiveMoveItem {
  pokemonUid: string;
  pokemonName: string;
  moveName: string;
  pp: number;
  maxPP: number;
}

interface Props {
  isBikeActive: boolean;
  activeHMs: Set<string>;
  moLabels: Record<string, string>;
  activeTeamPassives: { list: ActivePassiveItem[] };
  availableActiveMoves: ActiveMoveItem[];
  travelLog: string[];
  isTraveling: boolean;
  injectedItems: Set<ItemId>;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:isBikeActive', value: boolean): void;
  (e: 'update:injectedItems', value: Set<ItemId>): void;
  (e: 'toggle-hm', hm: string): void;
  (e: 'use-move', pokemonUid: string, moveName: string): void;
  (e: 'add-log', msg: string): void;
  (e: 'cancel-travel'): void;
}>();

const HMS = ['cut', 'surf', 'strength', 'flash', 'rock_smash', 'waterfall', 'fly'] as const;
</script>

<template>
  <div class="adv-manual-sidebar">
    <div class="adv-panel adv-column adv-inventory-column">
      <h3 class="adv-pixel-text adv-column-title">
        MOs e Items
      </h3>
      <label class="adv-toggle-control">
        <input
          :checked="isBikeActive"
          type="checkbox"
          @change="emit('update:isBikeActive', ($event.target as HTMLInputElement).checked)"
        >
        <span class="adv-toggle-label"><span class="emoji">🚲</span> Bicicleta</span>
      </label>
      <div class="adv-hm-list">
        <button
          v-for="hm in HMS"
          :key="hm"
          :class="['adv-hm-btn', { active: activeHMs.has(hm) }]"
          @click="emit('toggle-hm', hm)"
        >
          {{ (moLabels[hm] || hm) }}
        </button>
      </div>
    </div>
    
    <div
      class="adv-panel adv-column adv-team-passives-column"
      style="display: flex; flex-direction: column; gap: 8px;"
    >
      <h3
        class="adv-pixel-text adv-column-title"
        style="margin-bottom: 2px;"
      >
        Pasivas y Acciones
      </h3>
      <!-- Active Passives List -->
      <div
        class="adv-passives-list"
        style="display: flex; flex-direction: column; gap: 4px; font-size: 8px; font-family: var(--font-pixel);"
      >
        <div
          v-for="passive in activeTeamPassives.list"
          :key="passive.label"
          style="background: rgba(76,175,80,0.15); border: 1px solid #4caf50; padding: 4px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px;"
        >
          <span style="color: #4caf50; font-weight: bold;"><span class="emoji">🌟</span> {{ passive.label }}</span>
          <span style="font-size: 6px; color: #ccc;">{{ passive.desc }}</span>
        </div>
        <div
          v-if="activeTeamPassives.list.length === 0"
          style="color: #888; font-size: 6px; text-align: center; padding: 6px;"
        >
          No hay pasivas de equipo activas.
        </div>
      </div>

      <!-- Active Field Moves Buttons -->
      <div
        class="adv-active-moves-list"
        style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;"
      >
        <button
          v-for="move in availableActiveMoves"
          :key="move.pokemonUid + move.moveName"
          class="adv-hm-btn"
          style="display: flex; align-items: center; justify-content: space-between; font-size: 8px; font-family: var(--font-pixel); padding: 4px 6px; width: 100%; text-align: left;"
          :disabled="move.pp <= 0"
          @click="emit('use-move', move.pokemonUid, move.moveName)"
        >
          <span><span class="emoji">{{ move.moveName.toLowerCase().includes('tele') ? '🔮' : '🌸' }}</span> {{ move.moveName }} ({{ move.pokemonName }})</span>
          <span :style="{ color: move.pp > 0 ? '#ffcb05' : '#ef5350' }">PP {{ move.pp }}/{{ move.maxPP }}</span>
        </button>
      </div>
    </div>
    
    <!-- Sandbox Cheat Panel -->
    <AdventureCheatPanel
      :injected-items="injectedItems"
      @update:injected-items="emit('update:injectedItems', $event)"
      @add-log="emit('add-log', $event)"
    />
    
    <div class="adv-panel adv-column adv-console-column">
      <h3 class="adv-pixel-text adv-column-title">
        Logs
      </h3>
      <div class="adv-log-lines">
        <div
          v-for="(log, idx) in travelLog"
          :key="idx"
          class="adv-log-line"
        >
          {{ log }}
        </div>
      </div>
      <button
        v-if="isTraveling"
        class="adv-btn-danger"
        style="margin-top: 10px; width: 100%; padding: 8px; font-family: var(--font-pixel); font-size: 8px;"
        @click="emit('cancel-travel')"
      >
        Cancelar Viaje <span class="emoji">🛑</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/views/adventure/AdventureTestView.styles.manual.scss"></style>
