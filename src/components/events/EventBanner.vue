<script setup>
import { computed } from 'vue'
import { useEventStore } from '@/stores/events'

const eventStore = useEventStore()

const activeDisplayEvents = computed(() => {
  return eventStore.activeEvents.map(ev => ({
    id: ev.id,
    name: ev.name,
    icon: ev.icon || '🌟',
    description: ev.description,
    color: ev.config?.bannerColor || 'var(--purple)'
  }))
})
</script>

<template>
  <div
    v-if="activeDisplayEvents.length > 0"
    class="event-banner-container"
  >
    <TransitionGroup name="banner-slide">
      <div 
        v-for="event in activeDisplayEvents" 
        :key="event.id" 
        class="event-banner"
        :style="{ '--event-color': event.color }"
      >
        <div class="glow" />
        <div class="content">
          <span class="icon">{{ event.icon }}</span>
          <div class="text">
            <div class="name">
              {{ event.name }}
            </div>
            <div class="desc">
              {{ event.description }}
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss" scoped>
.event-banner-container {
  position: fixed;
  bottom: 80px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  pointer-events: none;
}

.event-banner {
  position: relative;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-left: 4px solid var(--event-color);
  padding: 12px 20px;
  border-radius: 0 12px 12px 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  min-width: 280px;
  
  .glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 60px;
    height: 100%;
    background: linear-gradient(90deg, var(--event-color) -100%, transparent 100%);
    opacity: 0.2;
    pointer-events: none;
  }

  .content {
    display: flex;
    align-items: center;
    gap: 15px;
    position: relative;
    z-index: 1;
    
    .icon {
      font-size: 1.5rem;
      filter: drop-shadow(0 0 5px var(--event-color));
      animation: pulse 2s infinite;
    }
    
    .text {
      .name {
        font-weight: 800;
        font-size: 0.85rem;
        letter-spacing: 0.5px;
        color: white;
      }
      .desc {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 2px;
      }
    }
  }
}

@keyframes pulse {
  0% { transform: Scale(1.0); opacity: 1; }
  50% { transform: Scale(1.1); opacity: 0.8; }
  100% { transform: Scale(1.0); opacity: 1; }
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}

.banner-slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.banner-slide-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
