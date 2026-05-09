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
        v-for="(event, index) in activeDisplayEvents" 
        :key="event.id" 
        class="event-banner"
        :style="{ '--event-color': event.color, '--event-seed': index * 0.33 }"
      >
        <div class="glow" />
        <div class="event-banner-content">
          <div class="event-banner-header">
            <span class="icon">{{ event.icon }}</span>
            <div class="name">
              {{ event.name }}
            </div>
          </div>
          <div class="event-banner-body">
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
@use "@/styles/core/tools" as *;

.event-banner-container {
  position: fixed;
  bottom: 80px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: Var(--z-hud);
  pointer-events: none;
  transform: TranslateZ(0);
}

.event-banner {
  position: relative;
  background: Rgba(0, 0, 0, 0.7);
  -webkit-backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  @include gpu-layer;
  border-left: 4px solid Var(--event-color);
  padding: 12px 20px;
  border-radius: 0 12px 12px 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.3);
  min-width: 280px;
  @include gpu-layer;
  
  .glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 60px;
    height: 100%;
    background: Linear-Gradient(90deg, Var(--event-color) -100%, transparent 100%);
    opacity: 0.2;
    pointer-events: none;
  }

  .event-banner-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: Var(--z-base);
    width: 100%;
    
    .event-banner-header {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .icon {
        font-size: 1.2rem;
        filter: Drop-Shadow(0 0 5px Var(--event-color));
        animation: pulse 2s infinite;
        animation-delay: Calc(Var(--event-seed, 0) * -2s);
        flex-shrink: 0;
      }
      
      .name {
        font-weight: 800;
        font-size: 0.8rem;
        letter-spacing: 0.5px;
        color: white;
        text-transform: uppercase;
        @include pixelated;
        @include pixelated;
      }
    }

    .event-banner-body {
      .desc {
        font-size: 0.7rem;
        color: Rgba(255, 255, 255, 0.8);
        line-height: 1.4;
        white-space: normal;
        max-width: 100%;
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
  transition: all 0.5s cubic-Bezier(0.19, 1, 0.22, 1);
}

.banner-slide-enter-from {
  transform: TranslateX(-100%);
  opacity: 0;
}

.banner-slide-leave-to {
  transform: TranslateX(-20px);
  opacity: 0;
}
</style>