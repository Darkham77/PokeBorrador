<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue';

interface PlayerClass {
  id: string
  name: string
  color: string
  bonuses: string[]
  bonusLevels: number[]
  penalties: string[]
  technicalBonuses?: string[]
  technicalPenalties?: string[]
}

defineProps<{
  cls: PlayerClass
  trainerLevel: number
}>()
</script>

<template>
  <div class="class-bonus-list">
    <section class="abilities-section">
      <div class="section-header">
        <div class="bar green" />
        <h3 class="press-start green-text">
          HABILIDADES DE CLASE
        </h3>
      </div>
    
      <div class="ability-list">
        <div 
          v-for="(bonus, i) in cls.bonuses" 
          :key="i"
          class="ability-item"
          :class="{ locked: trainerLevel < (cls.bonusLevels[i] || 1) }"
          :style="{ borderLeftColor: trainerLevel >= (cls.bonusLevels[i] || 1) ? cls.color : '#374151' }"
        >
          <span class="status-icon">{{ trainerLevel >= (cls.bonusLevels[i] || 1) ? '✅' : '🔒' }}</span>
          <div class="ability-content">
            <div class="ability-top">
              <span class="bonus-text">{{ bonus }}</span>
              <span
                v-if="(cls.bonusLevels[i] || 1) > 1"
                class="lv-req press-start"
              >Nv.{{ cls.bonusLevels[i] }}</span>
            
              <PVTooltip
                title="MECÁNICA"
                :description="cls.technicalBonuses?.[i] || 'Detalles no disponibles.'"
                position="top"
              >
                <div class="tooltip-trigger-vicio">
                  ❓
                </div>
              </PVTooltip>
            </div>
            <p
              v-if="trainerLevel < (cls.bonusLevels[i] || 1)"
              class="req-text"
            >
              Requiere Nivel de Entrenador {{ cls.bonusLevels[i] || 1 }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="penalties-section">
      <div class="section-header">
        <div class="bar red" />
        <h3 class="press-start red-text">
          LIMITACIONES
        </h3>
      </div>

      <div class="ability-list">
        <div 
          v-for="(penalty, i) in cls.penalties" 
          :key="i"
          class="ability-item penalty"
        >
          <span class="status-icon">❌</span>
          <div class="ability-content">
            <div class="ability-top">
              <span class="bonus-text">{{ penalty }}</span>
            
              <PVTooltip
                title="EFECTO NEGATIVO"
                :description="cls.technicalPenalties?.[i] || 'Detalles no disponibles.'"
                position="top"
              >
                <div class="tooltip-trigger-vicio">
                  ❓
                </div>
              </PVTooltip>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.class-bonus-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  .bar { width: 6px; height: 20px; border-radius: 3px; }
  .bar.green { background: rgba(34, 197, 94, 1); box-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
  .bar.red { background: rgba(239, 68, 68, 1); box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
  h3 { font-size: 11px; letter-spacing: 1.5px; }
}

.ability-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ability-item {
  background: rgba(0, 0, 0, 0.4);
  padding: 14px 16px;
  border-radius: 14px;
  border-left: 4px solid;
  display: flex;
  gap: 12px;
  align-items: center;

  &.locked { opacity: 0.6; .bonus-text { color: $muted; } }
  &.penalty { border-left-color: rgba(239, 68, 68, 0.4); }

  .status-icon { font-size: 16px; flex-shrink: 0; }
  .ability-content { flex: 1; min-width: 0; }
  .ability-top { display: flex; align-items: center; gap: 8px; }
  .bonus-text { font-size: 13px; color: rgba(226, 232, 240, 1); line-height: 1.4; flex-grow: 1; }
  .lv-req { font-size: 8px; background: rgba(255, 255, 255, 0.05); padding: 2px 6px; border-radius: 4px; color: $muted; }
  .req-text { font-size: 10px; color: rgba(71, 85, 105, 1); margin-top: 4px; }
}

.tooltip-trigger-vicio {
  cursor: help;
  color: rgba(71, 85, 105, 1);
  font-size: 12px;
  
  &:hover { color: $white; }
}

.press-start { @include pixelated; }
.green-text { color: rgba(34, 197, 94, 1); }
.red-text { color: rgba(239, 68, 68, 1); }
</style>
