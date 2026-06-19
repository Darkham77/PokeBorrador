<script setup lang="ts">
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

export interface SpawnItem {
  id: string
  name: string
  sprite: string
  types: string[]
  spawnType: string
  statusClass: string
  multiplier: number
  percentage: number
  basePercentage: number
  diff: number
  totalStats: number
  isSeen: boolean
  isCaught: boolean
}

export interface ArchaeologyRewardItem {
  name: string
  sprite: string
  type: string
  statusClass: string
  description?: string
  percentage: number
  basePercentage: number
}

interface Props {
  title: string
  probability: number
  baseProbability: number
  items: Array<SpawnItem | ArchaeologyRewardItem | any>
  mode: 'pokemon' | 'item' | 'fishing' | 'npc'

  probClass: string
  weatherEmoji: string
  weatherLabel: string
  getStatusTooltip?: (spawnType: string) => { title: string; desc: string }
  getCategoryTooltip?: (type: string) => { title: string; desc: string }
  getTooltipData: (item: SpawnItem | ArchaeologyRewardItem) => Record<string, unknown>
}

defineProps<Props>()

defineEmits<{
  (e: 'select-pokemon', id: string, isSeen: boolean): void
}>()
</script>

<template>
  <div class="spawns-section">
    <h3 class="section-title-pixel">
      {{ title }}
      <span
        class="section-prob-badge"
        :class="probClass"
      >
        <template v-if="mode === 'npc'">(PROBABILIDAD: VARIABLE)</template>
        <template v-else>(PROBABILIDAD: {{ probability }}%)</template>
      </span>
    </h3>
    <div :class="['spawns-report-scroll', mode === 'fishing' ? 'fishing-table' : mode === 'item' ? 'archaeology-table' : mode === 'npc' ? 'npc-table' : '']">
      <!-- Headers -->
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
          {{ mode === 'pokemon' ? 'Clima' : 'Detalles' }}
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
        <!-- Pokémon Mode -->
        <template v-if="mode === 'pokemon'">
          <div
            v-for="poke in (items as SpawnItem[])"
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
                  :type="t"
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
                  {{ poke.spawnType }}
                </span>
              </PVTooltip>
            </div>

            <!-- Climate Multiplier -->
            <div class="col-multiplier row-cell flex-align text-center">
              <template v-if="poke.spawnType === 'Visitante' || poke.spawnType === 'Exclusivo'">
                <span :class="['status-tag', poke.statusClass]">{{ weatherEmoji }} {{ weatherLabel }}</span>
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
                v-bind="getTooltipData(poke)"
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
                    <template
                      v-if="poke.spawnType === 'Común'"
                    >
                      <div
                        class="fill base-fill"
                        :style="{ width: `${poke.percentage * 2.5}%` }"
                      />
                    </template>
                    <template
                      v-else
                    >
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

        <!-- NPC Mode -->
        <template v-else-if="mode === 'npc'">
          <div
            v-for="npc in (items as any[])"
            :key="npc.type"
            class="report-row"
            :class="{ 'gray-text': !npc.active }"
          >
            <!-- NPC Info (Icon/Emoji, Name) -->
            <div class="col-pokemon row-cell flex-align">
              <div class="mini-sprite-wrapper">
                <div class="unknown-placeholder">
                  {{ npc.type === 'rival' ? '👦' : npc.type === 'defender' ? '🛡️' : npc.type === 'guardian' ? '👹' : npc.type === 'trainer' ? '🎒' : '👤' }}
                </div>
              </div>
              <div class="poke-name-wrap">
                <span class="poke-name">{{ npc.name }}</span>
              </div>
            </div>

            <!-- Tipo / Rol -->
            <div class="col-types row-cell flex-align">
              <span
                class="status-tag"
                :class="npc.type === 'rival' ? 'visitor' : npc.type === 'defender' ? 'exclusive' : npc.type === 'guardian' ? 'exclusive' : 'common'"
              >
                {{ npc.type === 'rival' ? 'RIVAL' : npc.type === 'defender' ? 'DEFENSOR' : npc.type === 'guardian' ? 'GUARDIÁN' : npc.type === 'trainer' ? 'ENTRENADOR' : npc.type }}
              </span>
            </div>

            <!-- Estado (Activo / Inactivo) -->
            <div class="col-type row-cell flex-align">
              <span
                class="status-tag"
                :class="npc.active ? 'exclusive' : 'common'"
              >
                {{ npc.active ? 'ACTIVO' : 'INACTIVO' }}
              </span>
            </div>

            <!-- Detalles -->
            <div class="col-multiplier row-cell flex-align text-center">
              <span class="mult-value neutral-text">{{ npc.details || '-' }}</span>
            </div>

            <!-- Probabilidad de Paso -->
            <div class="col-prob row-cell flex-align">
              <div class="prob-bar-wrapper">
                <div class="prob-numerical">
                  <span class="active-prob">
                    {{ npc.chance.toFixed(1) }}%
                  </span>
                </div>
                <div class="prob-visual-progress">
                  <div
                    class="fill base-fill"
                    :style="{ width: `${Math.min(100, npc.chance * 2.5)}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Stats placeholder -->
            <div class="col-stats row-cell flex-align text-center">
              <span class="neutral-text">-</span>
            </div>
          </div>
        </template>

        <!-- Item Mode (Archaeology) -->
        <template v-else>
          <div
            v-for="reward in (items as ArchaeologyRewardItem[])"
            :key="reward.name"
            class="report-row"
            :class="reward.statusClass"
          >
            <!-- Item Info -->
            <div class="col-pokemon row-cell flex-align">
              <div class="mini-sprite-wrapper">
                <img
                  :src="reward.sprite"
                  class="mini-sprite"
                  style="object-fit: contain; width: 24px; height: 24px;"
                >
              </div>
              <div class="poke-name-wrap">
                <span
                  class="poke-name"
                  style="font-size: 11px; line-height: 1.4;"
                >
                  {{ reward.name }}
                </span>
              </div>
            </div>

            <!-- Category -->
            <div class="col-types row-cell flex-align">
              <PVTooltip
                v-if="getCategoryTooltip"
                :title="getCategoryTooltip(reward.type).title"
                :description="getCategoryTooltip(reward.type).desc"
              >
                <span
                  class="status-tag"
                  :class="reward.statusClass"
                  style="font-size: 9px; padding: 2px 4px;"
                >
                  {{ reward.type }}
                </span>
              </PVTooltip>
            </div>

            <!-- Details/Description -->
            <div
              class="col-multiplier row-cell flex-align"
              style="font-size: 9px; opacity: 0.8; white-space: normal; line-height: 1.2;"
            >
              {{ reward.description || 'Fósil desenterrable en la zona' }}
            </div>

            <!-- Probability -->
            <div class="col-prob row-cell flex-align">
              <PVTooltip
                v-bind="getTooltipData(reward)"
                tag="div"
                style="width: 100%;"
              >
                <div class="prob-bar-wrapper">
                  <div class="prob-numerical">
                    <span class="active-prob">
                      {{ reward.percentage.toFixed(1) }}%
                    </span>
                    <span
                      v-if="Math.abs(reward.percentage - reward.basePercentage) > 0.05"
                      class="delta-text"
                      :class="reward.percentage > reward.basePercentage ? 'positive' : 'negative'"
                      style="font-size: 8px; margin-left: 4px;"
                    >
                      ({{ (reward.percentage > reward.basePercentage ? '+' : '') }}{{ (reward.percentage - reward.basePercentage).toFixed(1) }}%)
                    </span>
                  </div>
                  <div class="prob-visual-progress">
                    <template v-if="Math.abs(reward.percentage - reward.basePercentage) < 0.05">
                      <div
                        class="fill base-fill"
                        :style="{ width: `${reward.percentage * 2.5}%` }"
                      />
                    </template>
                    <template v-else>
                      <div
                        v-if="reward.percentage >= reward.basePercentage"
                        class="fill base-fill"
                        :style="{ width: `${reward.basePercentage * 2.5}%` }"
                      />
                      <div
                        v-if="reward.percentage > reward.basePercentage"
                        class="fill extra-fill"
                        :style="{ width: `${(reward.percentage - reward.basePercentage) * 2.5}%` }"
                      />
                      <div
                        v-if="reward.percentage < reward.basePercentage"
                        class="fill base-fill-reduced"
                        :style="{ width: `${reward.percentage * 2.5}%` }"
                      />
                      <div
                        v-if="reward.percentage < reward.basePercentage"
                        class="fill lost-fill"
                        :style="{ width: `${(reward.basePercentage - reward.percentage) * 2.5}%` }"
                      />
                    </template>
                  </div>
                </div>
              </PVTooltip>
            </div>

            <!-- Stats placeholder alignment -->
            <div class="col-stats row-cell flex-align text-center">
              <span class="neutral-text">-</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
