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
        @click.stop="emit('battle')"
      >
        ¡A LA BATALLA!
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.guardian-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: Rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.3s ease-out;
  transform: translateZ(0);
}

.press-start {
  @include pixelated;
  font-size: 10px;
  letter-spacing: 1px;
}

.alert-box {
  background: Rgba(17, 24, 39, 1);
  border: 3px solid Rgba(251, 191, 36, 1);
  border-radius: 24px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 0 50px Rgba(245, 158, 11, 0.2);
  animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.warning-icon {
  font-size: 40px;
  margin-bottom: 20px;
  animation: pulse 1s infinite;
}

h3 {
  color: Rgba(251, 191, 36, 1);
  margin-bottom: 24px;
}

.guardian-info {
  font-size: 15px;
  color: Rgba(226, 232, 240, 1);
  line-height: 1.6;
  margin-bottom: 20px;

  .highlight {
    color: Rgba(251, 191, 36, 1);
    font-weight: 800;
  }
}

.reward-hint {
  font-size: 12px;
  color: Rgba(148, 163, 184, 1);
  margin-bottom: 32px;
  
  .pts {
    color: Rgba(74, 222, 128, 1);
    font-weight: 700;
  }
}

.battle-btn {
  width: 100%;
  padding: 16px;
  background: Linear-Gradient(135deg, Rgba(251, 191, 36, 1), Rgba(245, 158, 11, 1));
  border: none;
  border-radius: 16px;
  color: Rgba(0, 0, 0, 1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: Scale(1.02);
    box-shadow: 0 0 20px Rgba(245, 158, 11, 0.3);
  }

  &:active {
    transform: Scale(0.98);
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
  0% { transform: Scale(1.0); }
  50% { transform: Scale(1.1); }
  100% { transform: Scale(1.0); }
}
</style>
