<script setup lang="ts">
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import PVTooltip from '@/components/common/PVTooltip.vue';
import { toPokemonType } from '@/data/battle/types';
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

interface Props {
  spawnItems: RouteSpawnMappedItem[];
  weatherEmoji: string;
  weatherLabel: string;
  getStatusTooltip: (spawnType: string) => { title: string; desc: string };
  getSpawnTooltip: (item: RouteSpawnMappedItem) => Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

defineProps<Props>();

defineEmits<{
  (e: 'select-pokemon', id: PokemonSpeciesId, isSeen: boolean): void;
}>();
</script>

<template>
  <div
    v-for="poke in spawnItems"
    :key="poke.id"
    class="report-row"
    :class="[poke.statusClass, { 'is-unseen': !poke.isSeen }]"
    :style="{ cursor: poke.isSeen ? 'pointer' : 'default' }"
    @click="$emit('select-pokemon', poke.id, poke.isSeen)"
  >
    <!-- Pokémon Info (Icon, Name, Caught) -->
    <div class="col-pokemon row-cell flex-align">
      <div class="mini-sprite-wrapper">
        <img
          v-if="poke.isSeen"
          :src="poke.sprite"
          class="mini-sprite"
          :class="{ 'spawn-silhouette': !poke.isCaught }"
        >
        <div
          v-else
          class="unknown-placeholder"
        >
          ?
        </div>
      </div>
      <div class="poke-name-wrap">
        <span class="poke-name">{{ poke.name }}</span>
        <span
          v-if="!poke.isSeen"
          class="unseen-tag"
        >? NO VISTO</span>
      </div>
    </div>

    <!-- Types -->
    <div class="col-types row-cell flex-align">
      <template v-if="poke.isSeen && poke.types.length">
        <PokemonTypeTag
          v-for="t in poke.types"
          :key="t"
          :type="toPokemonType(t)"
          size="ssm"
        />
      </template>
      <span
        v-else
        class="hidden-info-placeholder"
      >???</span>
    </div>

    <!-- Spawn Status Type -->
    <div class="col-type row-cell flex-align">
      <PVTooltip
        v-if="getStatusTooltip"
        :title="getStatusTooltip(poke.spawnType).title"
        :description="getStatusTooltip(poke.spawnType).desc"
      >
        <span :class="['status-tag', poke.statusClass]">
          <template v-if="poke.isEventBoosted">
            <template v-if="poke.eventShinyMult && poke.eventShinyMult > 1"><span class="emoji">✨</span> x{{ poke.eventShinyMult }} Shiny</template>
            <template v-else-if="poke.eventRateMult && poke.eventRateMult > 1"><span class="emoji">🎯</span> x{{ poke.eventRateMult }} Spawn</template>
            <template v-else><span class="emoji">🎉</span> Evento</template>
          </template>
          <template v-else>
            {{ poke.spawnType }}
          </template>
        </span>
      </PVTooltip>
    </div>

    <!-- Climate Multiplier / Event -->
    <div class="col-multiplier row-cell flex-align text-center">
      <template v-if="poke.isEventBoosted && poke.eventRateMult && poke.eventRateMult > 1">
        <span class="status-tag event-boosted">
          <span class="emoji">🎯</span> x{{ poke.eventRateMult }}
        </span>
      </template>
      <template v-else-if="poke.spawnType === 'Visitante' || poke.spawnType === 'Exclusivo'">
        <span :class="['status-tag', poke.statusClass]"><span class="emoji">{{ weatherEmoji }}</span> {{ weatherLabel }}</span>
      </template>
      <template v-else-if="poke.multiplier === 0">
        <span class="status-tag blocked">Bloqueado</span>
      </template>
      <template v-else-if="poke.multiplier !== 1">
        <span :class="['status-tag', poke.multiplier > 1 ? 'buffed' : 'debuffed']">
          x{{ poke.multiplier }}
        </span>
      </template>
      <template v-else>
        <span class="mult-value neutral-text">-</span>
      </template>
    </div>

    <!-- Probability -->
    <div class="col-prob row-cell flex-align">
      <PVTooltip
        v-bind="getSpawnTooltip(poke)"
        tag="div"
        style="width: 100%;"
      >
        <div class="prob-bar-wrapper">
          <div class="prob-numerical">
            <span class="active-prob">
              {{ poke.percentage.toFixed(1) }}%
              <span
                v-if="poke.diff !== 0 && poke.spawnType !== 'Común'"
                :class="['diff-text', poke.diff > 0 ? 'boosted' : 'debuffed']"
              >
                ({{ poke.diff > 0 ? '+' : '' }}{{ poke.diff.toFixed(1) }}%)
              </span>
            </span>
          </div>
          <div class="prob-visual-progress">
            <template v-if="poke.spawnType === 'Común'">
              <div
                class="fill base-fill"
                :style="{ width: `${poke.percentage * 2.5}%` }"
              />
            </template>
            <template v-else>
              <div
                v-if="poke.diff >= 0"
                class="fill base-fill"
                :style="{ width: `${poke.basePercentage * 2.5}%` }"
              />
              <div
                v-if="poke.diff > 0"
                class="fill extra-fill"
                :style="{ width: `${poke.diff * 2.5}%` }"
              />
              <div
                v-if="poke.diff < 0"
                class="fill base-fill-reduced"
                :style="{ width: `${poke.percentage * 2.5}%` }"
              />
              <div
                v-if="poke.diff < 0"
                class="fill lost-fill"
                :style="{ width: `${Math.abs(poke.diff) * 2.5}%` }"
              />
            </template>
          </div>
        </div>
      </PVTooltip>
    </div>

    <!-- Base Stats -->
    <div class="col-stats row-cell flex-align text-center">
      <span
        v-if="poke.isSeen"
        class="stat-total-value"
      >
        {{ poke.totalStats }}
      </span>
      <span
        v-else
        class="hidden-info-placeholder"
      >???</span>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
