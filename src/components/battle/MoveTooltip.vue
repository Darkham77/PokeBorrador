<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { useMoveTooltip } from '@/composables/battle/useMoveTooltip'
import MoveTooltipDamage from './MoveTooltipDamage.vue'
import MoveTooltipStatus from './MoveTooltipStatus.vue'
import MoveTooltipStatsGrid from './MoveTooltipStatsGrid.vue'
import MoveTooltipDetails from './MoveTooltipDetails.vue'
import MoveTooltipTactical from './MoveTooltipTactical.vue'
import { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

interface Props {
  move: Move
  playerInfo?: Pokemon | null
}

const props = defineProps<Props>()

const battleStore = useBattleStore()

const {
  activeDetails,
  parsedStatusEffect,
  moveDescriptionText
} = useMoveTooltip(() => props.move, () => props.playerInfo)

</script>


<template>
  <div class="move-tooltip-rich">
    <div class="move-desc">
      {{ moveDescriptionText }}
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
      <MoveTooltipStatsGrid :active-details="activeDetails" />

      <!-- Speed & Special Mechanics Section -->
      <MoveTooltipDetails
        :active-details="activeDetails"
        :move-id="props.move.id"
      />

      <!-- Tactical Modifiers Section (Assault Vest, Eviolite, Leech Seed, Foresight, Tera) -->
      <MoveTooltipTactical :active-details="activeDetails" />

      <!-- Status Effect Details -->
      <MoveTooltipStatus
        v-if="activeDetails.isStatus && parsedStatusEffect"
        :parsed-status-effect="parsedStatusEffect"
      />

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

      <!-- Live Equation Breakdown -->
      <div 
        v-if="!activeDetails.isStatus && activeDetails.power.base > 0"
        class="formula-breakdown-box"
      >
        <div class="calc-section-title">
          FÓRMULA DE POTENCIA
        </div>
        <div class="formula-text">
          BP ({{ activeDetails.power.base }})
          <template
            v-for="item in activeDetails.power.list"
            :key="item.label"
          >
            x <span :class="{ 'boosted': item.mult > 1, 'penalized': item.mult < 1 }">{{ item.label.split(' ')[0] }} (x{{ item.mult.toFixed(2).replace('.00', '') }})</span>
          </template>
          <span v-if="activeDetails.effectiveness">
            x <span :class="{ 'boosted': activeDetails.effectiveness.value > 1, 'penalized': activeDetails.effectiveness.value < 1 }">Ef. (x{{ activeDetails.effectiveness.value }})</span>
          </span>
          = <strong class="total-result">{{ Math.floor((activeDetails.power.final === '-' ? 0 : Number(activeDetails.power.final)) * (activeDetails.effectiveness?.value ?? 1)) }}</strong>
        </div>
      </div>

      <!-- Estimated Damage Section -->
      <MoveTooltipDamage :active-details="activeDetails" />
      <!-- Recovery Section (drain moves: Absorb, Drain Punch…) -->
      <div
        v-if="activeDetails.recovery && activeDetails.recovery.text"
        class="extra-effect-section recovery-section"
      >
        <div class="calc-section-title">
          RECUPERACIÓN
        </div>
        <div class="extra-effect-row">
          <span class="extra-effect-icon">💚</span>
          <span class="extra-effect-text boosted">{{ activeDetails.recovery.text }}</span>
        </div>
      </div>

      <!-- Recoil Section (flare blitz, take down…) -->
      <div
        v-if="activeDetails.recoil && activeDetails.recoil.text"
        class="extra-effect-section recoil-section"
      >
        <div class="calc-section-title">
          RETROCESO
        </div>
        <div class="extra-effect-row">
          <span class="extra-effect-icon">🔥</span>
          <span class="extra-effect-text penalized">{{ activeDetails.recoil.text }}</span>
        </div>
      </div>

      <!-- Field Conditions Section -->
      <div
        v-if="activeDetails.fieldConditions && activeDetails.fieldConditions.length > 0"
        class="extra-effect-section field-section"
      >
        <div class="calc-section-title">
          CONDICIONES DE CAMPO
        </div>
        <div
          v-for="cond in activeDetails.fieldConditions"
          :key="cond"
          class="field-condition-row"
        >
          <span class="field-condition-dot">◆</span>
          <span class="field-condition-text">{{ cond }}</span>
        </div>
      
        <!-- Smogon Calculator Description -->
        <div
          v-if="activeDetails.smogonDesc"
          class="formula-breakdown-box smogon-desc-box"
          style="margin-top: 4px;"
        >
          <div class="calc-section-title">
            ANÁLISIS COMPLETO (SMOGON)
          </div>
          <div
            class="formula-text smogon-desc-text"
            style="text-shadow: none; font-size: 7px; line-height: 1.2;"
          >
            {{ activeDetails.smogonDesc }}
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

.formula-breakdown-box {
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 5px 6px;
  border: 1px dashed Rgba(255, 255, 255, 0.08);

  .formula-text {
    font-size: 7.5px;
    color: #aeaebe;
    
    .boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
      font-weight: bold;
    }
    
    .penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
      font-weight: bold;
    }
    
    .total-result {
      color: var(--yellow);
      font-size: 9px;
      text-shadow: 0 0 3px Rgba(255, 214, 10, 0.3);
    }
  }
}

.ko-chance-badge {
  font-size: 7px;
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: bold;
  
  &.ko-ohko {
    color: #ff453a;
    background: Rgba(255, 69, 58, 0.15);
    border: 1px solid Rgba(255, 69, 58, 0.25);
    text-shadow: 0 0 3px Rgba(255, 69, 58, 0.3);
  }
  
  &.ko-ohko-possible {
    color: #ff9f0a;
    background: Rgba(255, 159, 10, 0.15);
    border: 1px solid Rgba(255, 159, 10, 0.25);
  }

  &.ko-2hko {
    color: #ffd60a;
    background: Rgba(255, 214, 10, 0.15);
    border: 1px solid Rgba(255, 214, 10, 0.25);
  }

  &.ko-3hko {
    color: #30d158;
    background: Rgba(48, 209, 88, 0.1);
    border: 1px solid Rgba(48, 209, 88, 0.25);
  }

  &.ko-neutral {
    color: #aeaebe;
  }
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
    line-height: 1.2;
    margin-top: 1px;
    white-space: nowrap;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.status-col-box {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0; // Previene desbordamiento flex/grid

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

// ── New sections: recovery / recoil / field conditions ─────────────────────

.extra-effect-section {
  border-radius: 6px;
  padding: 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;

  &.recovery-section {
    background: Rgba(16, 185, 129, 0.06);
    border: 1px solid Rgba(16, 185, 129, 0.18);
  }

  &.recoil-section {
    background: Rgba(239, 68, 68, 0.06);
    border: 1px solid Rgba(239, 68, 68, 0.18);
  }

  &.field-section {
    background: Rgba(99, 102, 241, 0.06);
    border: 1px solid Rgba(99, 102, 241, 0.18);
  }

  &.speed-section {
    background: Rgba(245, 158, 11, 0.06);
    border: 1px solid Rgba(245, 158, 11, 0.18);
  }

  &.mechanics-section {
    background: Rgba(16, 185, 129, 0.04);
    border: 1px dashed Rgba(16, 185, 129, 0.18);
  }

  &.tactical-section {
    background: Rgba(239, 68, 68, 0.04);
    border: 1px solid Rgba(239, 68, 68, 0.18);
  }
}

.extra-effect-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.extra-effect-icon {
  font-size: 8px;
  flex-shrink: 0;
}

.extra-effect-text {
  font-size: 7.5px;
  font-weight: bold;
  line-height: 1.3;

  &.boosted  { color: #10B981; text-shadow: 0 0 3px Rgba(16, 185, 129, 0.3); }
  &.penalized { color: #EF4444; text-shadow: 0 0 3px Rgba(239, 68, 68, 0.3); }
}

.field-condition-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-condition-dot {
  font-size: 5px;
  color: #818CF8;
  flex-shrink: 0;
}

.field-condition-text {
  font-size: 7px;
  color: Rgba(199, 210, 254, 0.85);
  line-height: 1.3;
}
</style>
