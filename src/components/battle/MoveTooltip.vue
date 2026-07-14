<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">

import { useMoveTooltip } from '@/composables/battle/useMoveTooltip'
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

const getKoColorClass = (text?: string) => {
  if (!text) return 'ko-neutral';
  if (text.includes('OHKO') && text.includes('garantizado')) return 'ko-ohko';
  if (text.includes('OHKO')) return 'ko-ohko-possible';
  if (text.includes('2HKO') && text.includes('garantizado')) return 'ko-2hko';
  if (text.includes('2HKO')) return 'ko-2hko';
  if (text.includes('3HKO')) return 'ko-3hko';
  return 'ko-neutral';
};
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

        <!-- Attacker Stat Box -->
        <div
          v-if="activeDetails.attackerStat"
          class="stat-box"
        >
          <span class="stat-lbl">{{ activeDetails.attackerStat.name }}</span>
          <span
            class="stat-val"
            :class="activeDetails.attackerStat.class"
          >
            <template v-if="activeDetails.attackerStat.base === activeDetails.attackerStat.final">
              {{ activeDetails.attackerStat.base }}
            </template>
            <template v-else>
              {{ activeDetails.attackerStat.base }} ➔ {{ activeDetails.attackerStat.final }}
              <span
                v-if="activeDetails.attackerStat.stage > 0"
                class="arrow up"
              >▲</span>
              <span
                v-if="activeDetails.attackerStat.stage < 0"
                class="arrow down"
              >▼</span>
            </template>
          </span>
        </div>

        <!-- Defender Stat Box -->
        <div
          v-if="activeDetails.defenderStat"
          class="stat-box"
        >
          <span class="stat-lbl">{{ activeDetails.defenderStat.name }}</span>
          <span
            class="stat-val"
            :class="activeDetails.defenderStat.class"
          >
            <template v-if="activeDetails.defenderStat.base === activeDetails.defenderStat.final">
              {{ activeDetails.defenderStat.base }}
            </template>
            <template v-else>
              {{ activeDetails.defenderStat.base }} ➔ {{ activeDetails.defenderStat.final }}
              <span
                v-if="activeDetails.defenderStat.stage < 0"
                class="arrow up"
              >▲</span>
              <span
                v-if="activeDetails.defenderStat.stage > 0"
                class="arrow down"
              >▼</span>
            </template>
          </span>
        </div>
      </div>

      <!-- Speed Matchup Section -->
      <div
        v-if="activeDetails.speedInfo"
        class="extra-effect-section speed-section"
      >
        <div class="calc-section-title">
          ORDEN DE TURNO
        </div>
        <div class="extra-effect-row">
          <span class="extra-effect-icon">{{ activeDetails.speedInfo.priority > 0 ? '⚡' : (activeDetails.speedInfo.outspeeds ? '▶️' : '⏱️') }}</span>
          <span
            class="extra-effect-text"
            :class="activeDetails.speedInfo.outspeeds || activeDetails.speedInfo.priority > 0 ? 'boosted' : 'penalized'"
          >
            {{ activeDetails.speedInfo.priority > 0 ? `Prioridad +${activeDetails.speedInfo.priority}` : (activeDetails.speedInfo.outspeeds ? '¡Mueves primero!' : 'Rival mueve primero') }}
          </span>
          <span
            class="speed-values"
            style="color: rgba(255, 255, 255, 0.4); font-size: 6.5px; margin-left: 2px;"
          >
            ({{ activeDetails.speedInfo.attackerSpeed }} vs {{ activeDetails.speedInfo.defenderSpeed }} Vel)
          </span>
        </div>
      </div>

      <!-- Special Mechanics & Weights Section -->
      <div
        v-if="activeDetails.tacticalInfo && (activeDetails.tacticalInfo.overrideOffensiveStat || activeDetails.tacticalInfo.overrideDefensiveStat || activeDetails.tacticalInfo.ignoreDefensive || activeDetails.tacticalInfo.breaksProtect || activeDetails.tacticalInfo.hasCrashDamage || activeDetails.tacticalInfo.terrainReductions.length > 0)"
        class="extra-effect-section mechanics-section"
      >
        <div class="calc-section-title">
          PROPIEDADES ESPECIALES
        </div>
        
        <!-- Weights -->
        <div
          v-if="['lowkick', 'grassknot', 'heavyslam', 'heatcrash'].includes(props.move.id ?? '')"
          class="field-condition-row"
        >
          <span class="field-condition-dot">⚖️</span>
          <span class="field-condition-text">Peso: Tu {{ activeDetails.tacticalInfo.attackerWeight }}kg vs Rival {{ activeDetails.tacticalInfo.defenderWeight }}kg</span>
        </div>

        <!-- Override Offensive Stat -->
        <div
          v-if="activeDetails.tacticalInfo.overrideOffensiveStat"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🧠</span>
          <span class="field-condition-text">Usa tu DEFENSA para atacar</span>
        </div>

        <!-- Override Defensive Stat -->
        <div
          v-if="activeDetails.tacticalInfo.overrideDefensiveStat"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🧠</span>
          <span class="field-condition-text">Ataca contra la DEFENSA FÍSICA del rival</span>
        </div>

        <!-- Ignore Defensive boosts -->
        <div
          v-if="activeDetails.tacticalInfo.ignoreDefensive"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🛡️</span>
          <span class="field-condition-text">Ignora aumentos de defensa del rival</span>
        </div>

        <!-- Breaks Protect -->
        <div
          v-if="activeDetails.tacticalInfo.breaksProtect"
          class="field-condition-row"
        >
          <span class="field-condition-dot">💥</span>
          <span class="field-condition-text">Rompe la Protección del rival</span>
        </div>

        <!-- Has Crash Damage -->
        <div
          v-if="activeDetails.tacticalInfo.hasCrashDamage"
          class="field-condition-row"
        >
          <span class="field-condition-dot">⚠️</span>
          <span class="field-condition-text">Daño por colisión si falla</span>
        </div>

        <!-- Terrain reductions -->
        <div
          v-for="warning in activeDetails.tacticalInfo.terrainReductions"
          :key="warning"
          class="field-condition-row"
        >
          <span class="field-condition-dot">💥</span>
          <span class="field-condition-text penalized">{{ warning }}</span>
        </div>
      </div>

      <!-- Tactical Modifiers Section (Assault Vest, Eviolite, Leech Seed, Foresight, Tera) -->
      <div
        v-if="activeDetails.tacticalInfo && (activeDetails.tacticalInfo.hasAssaultVest || activeDetails.tacticalInfo.hasEviolite || activeDetails.tacticalInfo.isLeechSeedActive || activeDetails.tacticalInfo.isForesightActive || activeDetails.tacticalInfo.attackerTera || activeDetails.tacticalInfo.defenderTera)"
        class="extra-effect-section tactical-section"
      >
        <div class="calc-section-title">
          MODIFICADORES TÁCTICOS
        </div>

        <!-- Assault Vest -->
        <div
          v-if="activeDetails.tacticalInfo.hasAssaultVest"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🛡️</span>
          <span class="field-condition-text penalized">Chaleco Asalto Rival: Activo (↓ daño especial)</span>
        </div>

        <!-- Eviolite -->
        <div
          v-if="activeDetails.tacticalInfo.hasEviolite"
          class="field-condition-row"
        >
          <span class="field-condition-dot">💎</span>
          <span class="field-condition-text penalized">Mineral Evolutivo Rival: Activo (↑ defensas)</span>
        </div>

        <!-- Leech Seed -->
        <div
          v-if="activeDetails.tacticalInfo.isLeechSeedActive"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🌱</span>
          <span class="field-condition-text boosted">Drenadoras Activas (Drenaje pasivo)</span>
        </div>

        <!-- Foresight -->
        <div
          v-if="activeDetails.tacticalInfo.isForesightActive"
          class="field-condition-row"
        >
          <span class="field-condition-dot">👁️</span>
          <span class="field-condition-text boosted">Gran Ojo / Profecía Activo (Ignora inmunidad Fantasma)</span>
        </div>

        <!-- Attacker Tera -->
        <div
          v-if="activeDetails.tacticalInfo.attackerTera"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🌟</span>
          <span class="field-condition-text boosted">Tu Tipo Tera: {{ activeDetails.tacticalInfo.attackerTera }}</span>
        </div>

        <!-- Defender Tera -->
        <div
          v-if="activeDetails.tacticalInfo.defenderTera"
          class="field-condition-row"
        >
          <span class="field-condition-dot">🌟</span>
          <span class="field-condition-text penalized">Tipo Tera Rival: {{ activeDetails.tacticalInfo.defenderTera }}</span>
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

          <!-- KO Probability Row -->
          <div
            v-if="activeDetails.damageRange.koChanceText"
            class="dmg-label"
          >
            PROB. KO:
          </div>
          <div
            v-if="activeDetails.damageRange.koChanceText"
            class="dmg-value-group"
          >
            <span
              class="ko-chance-badge"
              :class="getKoColorClass(activeDetails.damageRange.koChanceText)"
            >
              {{ activeDetails.damageRange.koChanceText }}
            </span>
          </div>
        </div>
      </div>
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
