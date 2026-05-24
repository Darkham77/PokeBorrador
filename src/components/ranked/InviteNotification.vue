<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { useLivePvPStore } from '@/stores/livePvP';

export interface PvPInvite {
  id: string
  challenger_name: string
  challenger_id: string
  rules?: string
}

interface Props {
  invite: PvPInvite
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void
}>();

const livePvP = useLivePvPStore();
const containerRef = ref<HTMLElement | null>(null);

let timer: gsap.core.Tween | null = null;

onMounted(() => {
  if (containerRef.value) {
    gsap.fromTo(containerRef.value,
      { y: -120, opacity: 0, xPercent: -50 },
      { y: 0, opacity: 1, xPercent: -50, duration: 0.4, ease: 'back.out(1.275)' }
    );
  }
  timer = gsap.delayedCall(30, () => {
    emit('close');
  }); // 30s auto-dismiss
});

onUnmounted(() => {
  if (timer) timer.kill();
});

const accept = async () => {
  // Lógica para aceptar e iniciar batalla
  await livePvP.acceptInvite(props.invite.id, false);
  emit('close');
};

const decline = async () => {
  // Lógica para rechazar vía RPC de Supabase
  emit('close');
};
</script>

<template>
  <div
    ref="containerRef"
    class="invite-notification card-glass"
  >
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
        @click.stop="accept"
      >
        ✓ ACEPTAR
      </button>
      <button
        class="decline-btn press-start"
        @click.stop="decline"
      >
        ✕ RECHAZAR
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.invite-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: Translatex(-50%) Translatez(0);
  z-index: var(--z-toast);
  width: 90%;
  max-width: 360px;
  background: Rgba(15, 23, 42, 0.95);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(12px);
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  border: 1px solid Rgba(139, 92, 246, 0.4);
  box-shadow: 0 10px 40px Rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
  @include gpu-layer;
}

.press-start {
  @include pixelated;
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
    color: var(--white);
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
  
  border: 1px solid;

  &:hover {
    transform: Translatey(-2px);
  }
}

.accept-btn {
  background: Rgba(107, 203, 119, 0.15);
  color: var(--green);
  border-color: Rgba(107, 203, 119, 0.3);

  &:hover {
    background: Rgba(107, 203, 119, 0.25);
  }
}

.decline-btn {
  background: Rgba(255, 59, 59, 0.1);
  color: var(--red);
  border-color: Rgba(255, 59, 59, 0.2);

  &:hover {
    background: Rgba(255, 59, 59, 0.2);
  }
}
</style>
