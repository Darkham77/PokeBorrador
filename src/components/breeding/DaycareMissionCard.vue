<script setup lang="ts">
import type { DaycareMission } from '@/logic/breeding/missionEngine'

interface Props {
  mission: DaycareMission
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'deliver'): void
}>()
</script>

<template>
  <div
    class="mission-card-retro"
    :class="{ completed: mission.completed }"
  >
    <div class="mission-head">
      <div class="avatar-retro">
        👤
      </div>
      <div class="trainer-box">
        <div class="t-name">
          {{ mission.trainerName.toUpperCase() }}
        </div>
        <div class="t-dialogue">
          "{{ mission.dialogue }}"
        </div>
      </div>
    </div>
    
    <div class="mission-request">
      <span class="req-label">PEDIDO:</span>
      <span class="req-val">{{ mission.targetId.toUpperCase() }} ({{ mission.reqText.toUpperCase() }})</span>
    </div>

    <div class="mission-reward-retro">
      <div class="rew-icon">
        {{ mission.reward.icon || '🎁' }}
      </div>
      <div class="rew-info">
        <div class="rew-label">
          RECOMPENSA
        </div>
        <div class="rew-val">
          {{ mission.reward.name.toUpperCase() }} X{{ mission.reward.qty }}
        </div>
      </div>
    </div>

    <button
      v-if="!mission.completed"
      class="deliver-btn-retro"
      @click.stop="emit('deliver')"
    >
      ENTREGAR
    </button>
    <div
      v-else
      class="completed-banner"
    >
      ✅ COMPLETADA
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.mission-card-retro {
  background: $card-dark; 
  border: 1px solid Rgba(255,255,255,0.06); 
  padding: 20px; 
  border-radius: 20px;
  display: flex; 
  flex-direction: column; 
  gap: 15px;
  
  &.completed { border-color: Rgba(34, 197, 94, 0.3); background: Rgba(34, 197, 94, 0.03); }
  
  .mission-head {
    display: flex; gap: 15px;
    .avatar-retro { font-size: 24px; width: 48px; height: 48px; background: Rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .t-name { font-size: 10px; color: $muted; margin-bottom: 5px; font-weight: bold; }
    .t-dialogue { font-size: 12px; color: $white; font-style: italic; opacity: 0.8; }
  }
  
  .mission-request {
    background: Rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; font-size: 10px;
    .req-label { color: $muted; font-weight: bold; margin-right: 10px; }
    .req-val { color: $coin-gold; font-weight: 900; }
  }

  .mission-reward-retro {
    display: flex; align-items: center; gap: 12px;
    .rew-icon { font-size: 24px; }
    .rew-label { font-size: 9px; color: $muted; margin-bottom: 3px; }
    .rew-val { font-size: 12px; color: Rgba(34, 197, 94, 1); font-weight: 900; }
  }

  .deliver-btn-retro {
    padding: 14px; background: Linear-Gradient(135deg, #a855f7, #7e22ce); color: $white; border: none; border-radius: 12px;
    @include pixelated; font-size: 7px; cursor: pointer;
    box-shadow: 0 4px 0 #6d28d9;
    &:hover { will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Brightness(1.1); }
  }
  .completed-banner { text-align: center; color: Rgba(34, 197, 94, 1); @include pixelated; font-size: 7px; padding: 14px; }
}
</style>
