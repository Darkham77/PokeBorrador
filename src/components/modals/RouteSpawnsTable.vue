<script setup lang="ts">
import { computed } from 'vue';
import RouteSpawnsPokemonRows from './spawns/RouteSpawnsPokemonRows.vue';
import RouteSpawnsNpcRows from './spawns/RouteSpawnsNpcRows.vue';
import RouteSpawnsItemRows from './spawns/RouteSpawnsItemRows.vue';
import type { NpcChanceInfo } from '@/logic/weather/weatherUtils';
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers';
import type { ArchaeologyRewardData } from '@/composables/modals/useRouteSpawnsArchaeology';

type SpawnTableItem = RouteSpawnMappedItem | NpcChanceInfo | ArchaeologyRewardData;

interface Props {
  title: string;
  emoji?: string;
  probability: number;
  baseProbability: number;
  items: SpawnTableItem[];
  mode: 'pokemon' | 'item' | 'fishing' | 'npc';

  probClass: string;
  weatherEmoji: string;
  weatherLabel: string;
  eventMultiplier?: number;
  getStatusTooltip?: (spawnType: string) => { title: string; desc: string };
  getCategoryTooltip?: (type: string) => { title: string; desc: string };
  getSpawnTooltip?: (item: RouteSpawnMappedItem) => Record<string, unknown>; // open-record
  getItemTooltip?: (item: ArchaeologyRewardData) => Record<string, unknown>; // open-record
}

const props = withDefaults(defineProps<Props>(), {
  emoji: '',
  probClass: 'info',
  weatherEmoji: '',
  weatherLabel: '',
  eventMultiplier: 1,
  getStatusTooltip: () => ({ title: '', desc: '' }),
  getCategoryTooltip: () => ({ title: '', desc: '' }),
  getSpawnTooltip: () => ({}),
  getItemTooltip: () => ({})
});

// Type-safe narrowing: each type has a unique discriminant field
const spawnItems = computed(() => props.items.filter((i): i is RouteSpawnMappedItem => 'isSeen' in i));
const npcItems = computed(() => props.items.filter((i): i is NpcChanceInfo => 'active' in i && 'chance' in i && !('isSeen' in i)));
const archaeologyItems = computed(() => props.items.filter((i): i is ArchaeologyRewardData => 'sprite' in i && !('isSeen' in i) && !('active' in i)));

defineEmits<{
  (e: 'select-pokemon', id: string, isSeen: boolean): void;
}>();
</script>

<template>
  <div class="spawns-section">
    <h3 class="section-title-pixel">
      <span
        v-if="emoji"
        class="emoji title-emoji"
      >{{ emoji }}</span>
      <span class="title-text">{{ title }}</span>
      <span
        class="section-prob-badge"
        :class="probClass"
      >
        <template v-if="mode === 'npc'">(PROBABILIDAD: VARIABLE)</template>
        <template v-else>
          (PROBABILIDAD: {{ probability }}%<template v-if="eventMultiplier && eventMultiplier > 1"> · <span class="emoji">✨</span> EVENTO x{{ eventMultiplier }}</template>)
        </template>
      </span>
    </h3>
    <div :class="['spawns-report-scroll', mode === 'fishing' ? 'fishing-table' : mode === 'item' ? 'archaeology-table' : mode === 'npc' ? 'npc-table' : '']">
      <!-- Headers -->
      <div class="report-table-header">
        <div class="col-pokemon">
          {{ mode === 'pokemon' ? 'Pokémon' : mode === 'item' ? 'Objeto' : 'Encuentro' }}
        </div>
        <div class="col-types">
          {{ mode === 'pokemon' ? 'Tipos' : mode === 'item' ? 'Categoría' : 'Tipo / Rol' }}
        </div>
        <div
          v-if="mode === 'pokemon' || mode === 'npc'"
          class="col-type"
        >
          Estado
        </div>
        <div class="col-multiplier">
          {{ mode === 'pokemon' ? 'Clima / Mod' : 'Detalles' }}
        </div>
        <div class="col-prob">
          {{ mode === 'npc' ? 'Prob. Paso' : 'Prob. Real' }}
        </div>
        <div class="col-stats">
          {{ mode === 'pokemon' ? 'Stats' : '-' }}
        </div>
      </div>

      <!-- Rows -->
      <div class="report-rows">
        <RouteSpawnsPokemonRows
          v-if="mode === 'pokemon'"
          :spawn-items="spawnItems"
          :weather-emoji="weatherEmoji"
          :weather-label="weatherLabel"
          :get-status-tooltip="getStatusTooltip"
          :get-spawn-tooltip="getSpawnTooltip"
          @select-pokemon="(id, isSeen) => $emit('select-pokemon', id, isSeen)"
        />

        <RouteSpawnsNpcRows
          v-else-if="mode === 'npc'"
          :npc-items="npcItems"
        />

        <RouteSpawnsItemRows
          v-else
          :archaeology-items="archaeologyItems"
          :get-category-tooltip="getCategoryTooltip"
          :get-item-tooltip="getItemTooltip"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
