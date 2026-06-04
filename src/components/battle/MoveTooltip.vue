<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">

import { useMoveTooltip } from '@/composables/useMoveTooltip'
import { useBattleStore } from '@/stores/battle'
import type { Move } from '@/types/pokemon'

interface Props {
  move: Move
}

const props = defineProps<Props>()

const battleStore = useBattleStore()

const {
  modifierInfo,
  activeDetails,
  parsedStatusEffect,
  moveDescriptionText
} = useMoveTooltip(() => props.move)
</script>

<template>
  <div class="move-tooltip-rich">
    <div class="move-desc">
      {{ moveDescriptionText }}
    </div>
    <div
      v-if="modifierInfo"
      class="move-modifier"
      :class="modifierInfo.type"
    >
      {{ modifierInfo.text }}
    </div>

    <!-- Advanced Combat Calculations Dashboard -->
    <div
      v-if="battleStore.isBattleActive && activeDetails"
      class="move-details-calc"
    >
      <div class="calc-section-title">
        ESTADÍSTICAS EN COMBATE
      </div>
      
      <!-- Premium Grid Layout for Stats -->
      <div class="combat-stats-grid">
        <!-- Power Box -->
        <div class="stat-box">
          <span class="stat-lbl">POTENCIA</span>
          <span
            class="stat-val"
            :class="activeDetails.power.class"
          >
            <template v-if="activeDetails.power.base === activeDetails.power.final || activeDetails.power.final === '-'">
              {{ activeDetails.power.final }}
            </template>
            <template v-else>
              {{ activeDetails.power.base }} ➔ {{ activeDetails.power.final }}
              <span
                v-if="activeDetails.power.class === 'boosted'"
                class="arrow up"
              >▲</span>
              <span
                v-if="activeDetails.power.class === 'penalized'"
                class="arrow down"
              >▼</span>
            </template>
          </span>
        </div>
        
        <!-- Accuracy Box -->
        <div class="stat-box">
          <span class="stat-lbl">PRECISIÓN</span>
          <span
            class="stat-val"
            :class="activeDetails.accuracy.class"
          >
            <template v-if="activeDetails.accuracy.base === activeDetails.accuracy.final">
              {{ activeDetails.accuracy.base === 1000 ? '♾️' : activeDetails.accuracy.base + '%' }}
            </template>
            <template v-else>
              {{ activeDetails.accuracy.base === 1000 ? '♾️' : activeDetails.accuracy.base + '%' }} ➔ 
              {{ activeDetails.accuracy.final === 1000 ? '♾️' : activeDetails.accuracy.final + '%' }}
              <span
                v-if="activeDetails.accuracy.class === 'boosted'"
                class="arrow up"
              >▲</span>
              <span
                v-if="activeDetails.accuracy.class === 'penalized'"
                class="arrow down"
              >▼</span>
            </template>
          </span>
        </div>

        <!-- Effectiveness Box -->
        <div
          v-if="!activeDetails.isStatus"
          class="stat-box"
        >
          <span class="stat-lbl">EF. CONTRA RIVAL</span>
          <span
            v-if="activeDetails.effectiveness !== null"
            class="stat-val"
            :class="activeDetails.effectiveness.class"
          >
            x{{ activeDetails.effectiveness.value }}
          </span>
          <span
            v-else
            class="stat-val"
          >-</span>
        </div>

        <!-- Critical Box -->
        <div
          v-if="!activeDetails.isStatus"
          class="stat-box"
        >
          <span class="stat-lbl">PROB. CRÍTICO</span>
          <span
            class="stat-val"
            :class="activeDetails.critChance.class"
          >
            {{ activeDetails.critChance.value }}%
          </span>
        </div>
      </div>

      <!-- Status Effect Details -->
      <div
        v-if="activeDetails.isStatus && parsedStatusEffect"
        class="status-effect-box"
      >
        <div class="calc-section-title">
          EFECTO DE ESTADO
        </div>
        
        <!-- Si es condición persistente/volátil (Envenenado, Drenadoras, etc.) -->
        <template v-if="parsedStatusEffect.isCondition">
          <div class="status-grid-2col">
            <!-- Box 1: Objetivo -->
            <div class="status-col-box">
              <span class="status-col-lbl">APLICADO A</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.isSelf ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.isSelf ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.targetName }}
              </span>
            </div>
            
            <!-- Box 2: Estado -->
            <div class="status-col-box">
              <span class="status-col-lbl">ESTADO</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.label }}
              </span>
            </div>
          </div>

          <!-- Description Box (Full Width) -->
          <div class="status-desc-box">
            <span class="status-col-lbl">DETALLE DE COMBATE</span>
            <div class="status-desc-text">
              {{ parsedStatusEffect.details }}
            </div>
          </div>
        </template>

        <!-- Si es cambio de estadísticas (Gruñido, Fortaleza, etc.) -->
        <template v-else>
          <div class="status-grid-2col">
            <!-- Box 1: Objetivo -->
            <div class="status-col-box">
              <span class="status-col-lbl">APLICADO A</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.isSelf ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.isSelf ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.targetName }}
              </span>
            </div>

            <!-- Box 2: Estadística -->
            <div class="status-col-box">
              <span class="status-col-lbl">ESTADÍSTICA</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.direction === 'up' ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.statName }}
              </span>
            </div>

            <!-- Box 3: RANGO (STAGE) -->
            <div class="status-col-box">
              <span class="status-col-lbl">RANGO (STAGE)</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.direction === 'up' ? 'boosted' : 'penalized'"
              >
                {{ (parsedStatusEffect.currentStage ?? 0) >= 0 ? '+' : '' }}{{ parsedStatusEffect.currentStage ?? 0 }} ➔ 
                {{ (parsedStatusEffect.finalStage ?? 0) >= 0 ? '+' : '' }}{{ parsedStatusEffect.finalStage ?? 0 }}
                <span
                  class="arrow"
                  :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
                </span>
              </span>
            </div>

            <!-- Box 4: Valor Neto -->
            <div
              v-if="parsedStatusEffect.stat !== 'all'"
              class="status-col-box"
            >
              <span class="status-col-lbl">VALOR NETO</span>
              <span class="status-col-val">
                {{ parsedStatusEffect.initialStatVal }} ➔ {{ parsedStatusEffect.finalStatVal }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- Active Modifiers Section -->
      <div 
        v-if="!activeDetails.isStatus && (activeDetails.power.list.length > 0 || activeDetails.accuracy.list.length > 0)" 
        class="modifiers-section"
      >
        <div class="calc-section-title">
          MODIFICADORES ACTIVOS
        </div>
        <div class="breakdown-list">
          <div
            v-for="item in activeDetails.power.list"
            :key="item.label"
            class="breakdown-item"
          >
            <span :class="item.mult > 1 ? 'boosted' : (item.mult < 1 ? 'penalized' : '')">
              {{ item.mult > 1 ? '▲' : (item.mult < 1 ? '▼' : '•') }}
            </span>
            POT: {{ item.label }} <span :class="item.mult > 1 ? 'boosted' : (item.mult < 1 ? 'penalized' : '')">x{{ item.mult.toFixed(2).replace('.00', '') }}</span>
          </div>
          <div
            v-for="item in activeDetails.accuracy.list"
            :key="item.label"
            class="breakdown-item"
          >
            <span :class="((typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%') ? 'boosted' : (typeof item.mult === 'number' && item.mult < 1 ? 'penalized' : '')">
              {{ ((typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%') ? '▲' : (typeof item.mult === 'number' && item.mult < 1 ? '▼' : '•') }}
            </span>
            PREC: {{ item.label }} <span :class="(typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%' ? 'boosted' : (typeof item.mult === 'number' && item.mult < 1 ? 'penalized' : '')">
              {{ typeof item.mult === 'number' ? `x${item.mult.toFixed(2).replace('.00', '')}` : item.mult }}
            </span>
          </div>
        </div>
      </div>

      <!-- Estimated Damage Section -->
      <div
        v-if="activeDetails.damageRange"
        class="damage-section"
      >
        <div class="calc-section-title">
          DAÑO ESTIMADO
        </div>
        <div class="damage-grid">
          <!-- Normal Damage Row -->
          <div class="dmg-label">
            NORMAL:
          </div>
          <div class="dmg-value-group">
            <span class="hp-range">{{ activeDetails.damageRange.normalMin }} - {{ activeDetails.damageRange.normalMax }} HP</span>
            <span class="pct-range">({{ activeDetails.damageRange.normalPctMin }}% - {{ activeDetails.damageRange.normalPctMax }}% de vida)</span>
          </div>

          <!-- Critical Damage Row -->
          <div class="dmg-label">
            CRÍTICO:
          </div>
          <div class="dmg-value-group crit">
            <span class="hp-range">{{ activeDetails.damageRange.critMin }} - {{ activeDetails.damageRange.critMax }} HP</span>
            <span class="pct-range">({{ activeDetails.damageRange.critPctMin }}% - {{ activeDetails.damageRange.critPctMax }}% de vida)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.move-tooltip-rich {
  @include pixelated;
  font-size: 9px;
  line-height: 1.5;
  color: Rgba(255, 255, 255, 0.95);
  max-width: 260px;
  min-width: 220px;
  padding: 2px;
}

.move-desc {
  word-break: break-word;
}

.move-modifier {
  @include pixelated;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid Rgba(255, 255, 255, 0.15);
  font-size: 8px;
  
  &.boosted { color: var(--yellow); }
  &.penalized { color: $red; }
}

.move-details-calc {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed Rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.calc-section-title {
  font-size: 7.5px;
  color: var(--yellow);
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.combat-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.stat-box {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .stat-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
  }

  .stat-val {
    font-size: 8px;
    font-weight: bold;
    color: white;
    white-space: nowrap;

    &.boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
    }

    &.penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
    }
  }
}

.modifiers-section {
  background: Rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 4px 6px;
  border: 1px dotted Rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 2px;
}

.breakdown-item {
  font-size: 7.5px;
  color: Rgba(255, 255, 255, 0.6);

  .boosted { color: #10B981; font-weight: bold; }
  .penalized { color: #EF4444; font-weight: bold; }
}

.damage-section {
  border-top: 1px dotted Rgba(255, 255, 255, 0.15);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.damage-grid {
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 4px 8px;
  align-items: center;
}

.dmg-label {
  font-size: 7.5px;
  color: Rgba(255, 255, 255, 0.6);
  font-weight: bold;
}

.dmg-value-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;

  .hp-range {
    font-size: 8px;
    font-weight: bold;
    color: white;
  }

  .pct-range {
    font-size: 6.5px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1;
    margin-top: 1px;
  }

  &.crit {
    .hp-range {
      color: #FBBF24;
      text-shadow: 0 0 3px Rgba(251, 191, 36, 0.3);
    }
  }
}

.status-effect-box {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-grid-2col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
  gap: 4px;
}

.status-col-box {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;

  .status-col-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .status-col-val {
    font-size: 8px;
    font-weight: bold;
    color: white;
    word-break: normal;
    overflow-wrap: break-word;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px;

    &.boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
    }

    &.penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
    }
  }
}

.status-desc-box {
  margin-top: 4px;
  background: Rgba(0, 0, 0, 0.15);
  border: 1px dotted Rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .status-col-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .status-desc-text {
    font-size: 7.5px;
    line-height: 1.3;
    color: Rgba(255, 255, 255, 0.8);
    word-break: break-word;
  }
}

.arrow {
  display: inline-flex;
  align-items: center;
  font-size: 8px;
  margin-right: 1px;
  
  &.up {
    color: #10B981;
    text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
  }
  
  &.down {
    color: #EF4444;
    text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
  }
}
</style>
