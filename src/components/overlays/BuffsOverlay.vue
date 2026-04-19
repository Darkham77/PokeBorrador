<script setup>
import { onMounted } from 'vue'
import { useBuffsStore } from '@/stores/buffs'

const buffsStore = useBuffsStore()

onMounted(() => {
  buffsStore.initTick()
})

const formatTime = (secs) => {
  if (secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="buffs-overlay">
    <transition-group
      name="list"
      tag="div"
      class="buffs-list"
    >
      <div 
        v-for="buff in buffsStore.activeBuffs" 
        :key="buff.id" 
        class="buff-badge"
        :title="buff.desc"
      >
        <img
          :src="buff.icon"
          :alt="buff.name"
          class="buff-icon"
        >
        <div class="buff-info">
          <span class="buff-name">{{ buff.name }}</span>
          <span class="buff-time">{{ formatTime(buff.secs) }}</span>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped lang="scss">
.buffs-overlay {
  position: absolute;
  top: 80px; /* Below user bar */
  left: 10px;
  z-index: 100;
  pointer-events: none; /* Let clicks pass through */
}

.buffs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.buff-badge {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px 10px;
  pointer-events: auto; /* Tooltip needs pointer */
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  cursor: help;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: var(--yellow, #ffd93d);
    transform: translateX(4px);
  }
}

.buff-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  margin-right: 8px;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));
}

.buff-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.buff-name {
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  font-family: 'Press Start 2P', monospace;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.buff-time {
  color: var(--yellow, #ffd93d);
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
