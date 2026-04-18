<script setup>
import { onMounted, onUnmounted } from 'vue';
import { usePvPStore } from '@/stores/pvpStore';
import { useUIStore } from '@/stores/ui';

const props = defineProps({
  invite: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close']);
const pvpStore = usePvPStore();
const uiStore = useUIStore();

let timer = null;

onMounted(() => {
  timer = setTimeout(() => {
    emit('close');
  }, 30000); // 30s auto-dismiss
});

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});

const accept = async () => {
  // Lógica para aceptar vía RPC de Supabase
  pvpStore.connect(props.invite.id, false);
  emit('close');
};

const decline = async () => {
  // Lógica para rechazar vía RPC de Supabase
  emit('close');
};
</script>

<template>
  <div class="invite-notification card-glass">
    <div class="header press-start">
      ⚔️ ¡DESAFÍO PvP!
    </div>
    <div class="body">
      <span class="challenger">{{ invite.challenger_name || 'Un entrenador' }}</span>
      <p>te desafía a una batalla</p>
    </div>
    <div class="actions">
      <button
        class="accept-btn press-start"
        @click="accept"
      >
        ✓ ACEPTAR
      </button>
      <button
        class="decline-btn press-start"
        @click="decline"
      >
        ✕ RECHAZAR
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.invite-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 90%;
  max-width: 360px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.4);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
  animation: slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.press-start {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
}

.header {
  color: var(--purple);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.body {
  margin-bottom: 20px;
  
  .challenger {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
    display: block;
    margin-bottom: 4px;
  }

  p {
    font-size: 12px;
    color: var(--gray);
    margin: 0;
  }
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

button {
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;

  &:hover {
    transform: translateY(-2px);
  }
}

.accept-btn {
  background: rgba(107, 203, 119, 0.15);
  color: var(--green);
  border-color: rgba(107, 203, 119, 0.3);

  &:hover {
    background: rgba(107, 203, 119, 0.25);
  }
}

.decline-btn {
  background: rgba(255, 59, 59, 0.1);
  color: var(--red);
  border-color: rgba(255, 59, 59, 0.2);

  &:hover {
    background: rgba(255, 59, 59, 0.2);
  }
}

@keyframes slideDown {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>
