<script setup>
import { computed } from 'vue';

const props = defineProps({
  guardian: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['battle']);

const name = computed(() => props.guardian.id.toUpperCase());
</script>

<template>
  <div class="guardian-overlay">
    <div class="alert-box">
      <div class="warning-icon">
        ⚠️
      </div>
      <h3 class="press-start">
        ¡GUARDIÁN DETECTADO!
      </h3>
      
      <div class="guardian-info">
        <p>Un <strong class="highlight">{{ name }}</strong> Nv. {{ guardian.lv }}</p>
        <p>está custodiando esta zona.</p>
      </div>

      <div class="reward-hint">
        Derrótalo o captúralo para reclamar los <span class="pts">{{ guardian.pts }} PT</span> de Dominancia.
      </div>

      <button
        class="battle-btn press-start"
        @click="emit('battle')"
      >
        ¡A LA BATALLA!
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.guardian-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.3s ease-out;
}

.press-start {
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  letter-spacing: 1px;
}

.alert-box {
  background: #111827;
  border: 3px solid #fbbf24;
  border-radius: 24px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 0 50px rgba(245, 158, 11, 0.2);
  animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.warning-icon {
  font-size: 40px;
  margin-bottom: 20px;
  animation: pulse 1s infinite;
}

h3 {
  color: #fbbf24;
  margin-bottom: 24px;
}

.guardian-info {
  font-size: 15px;
  color: #e2e8f0;
  line-height: 1.6;
  margin-bottom: 20px;

  .highlight {
    color: #fbbf24;
    font-weight: 800;
  }
}

.reward-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 32px;
  
  .pts {
    color: #4ade80;
    font-weight: 700;
  }
}

.battle-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border: none;
  border-radius: 16px;
  color: #000;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: scale(#{1.02});
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
  }

  &:active {
    transform: scale(#{0.98});
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes pulse {
  0% { transform: scale(#{1}); }
  50% { transform: scale(#{1.1}); }
  100% { transform: scale(#{1}); }
}
</style>
