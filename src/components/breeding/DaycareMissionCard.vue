<script setup>
const props = defineProps({
  mission: { type: Object, required: true }
})

const emit = defineEmits(['deliver'])
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
      @click="emit('deliver')"
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
.mission-card-retro {
  background: #1c2128; 
  border: 1px solid rgba(255,255,255,0.06); 
  padding: 20px; 
  border-radius: 20px;
  display: flex; 
  flex-direction: column; 
  gap: 15px;
  
  &.completed { border-color: rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.03); }
  
  .mission-head {
    display: flex; gap: 15px;
    .avatar-retro { font-size: 24px; width: 48px; height: 48px; background: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .t-name { font-size: 10px; color: #64748b; margin-bottom: 5px; font-weight: bold; }
    .t-dialogue { font-size: 12px; color: #fff; font-style: italic; opacity: 0.8; }
  }
  
  .mission-request {
    background: rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; font-size: 10px;
    .req-label { color: #64748b; font-weight: bold; margin-right: 10px; }
    .req-val { color: #ffd700; font-weight: 900; }
  }

  .mission-reward-retro {
    display: flex; align-items: center; gap: 12px;
    .rew-icon { font-size: 24px; }
    .rew-label { font-size: 9px; color: #64748b; margin-bottom: 3px; }
    .rew-val { font-size: 12px; color: #22c55e; font-weight: 900; }
  }

  .deliver-btn-retro {
    padding: 14px; background: linear-gradient(135deg, #a855f7, #7e22ce); color: #fff; border: none; border-radius: 12px;
    font-family: 'Press Start 2P', monospace; font-size: 7px; cursor: pointer;
    box-shadow: 0 4px 0 #6d28d9;
    &:hover { filter: Brightness(1.1); }
  }
  .completed-banner { text-align: center; color: #22c55e; font-family: 'Press Start 2P', monospace; font-size: 7px; padding: 14px; }
}
</style>
