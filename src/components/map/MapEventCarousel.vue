<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  events: { type: Array, default: () => [] },
  awards: { type: Array, default: () => [] }
})

const emit = defineEmits(['openEvent', 'openAward'])

const currentIndex = ref(0)
let timer = null

const slides = computed(() => {
  const result = []
  
  // Eventos activos
  props.events.forEach(ev => {
    result.push({
      id: ev.id,
      type: 'event',
      icon: ev.icon || '🎁',
      title: ev.name,
      content: ev.description || '¡Evento especial activo ahora!',
      color: '#fbbf24'
    })
  })

  // Premios
  props.awards.forEach(aw => {
     result.push({
       id: aw.event_id,
       type: 'award',
       icon: '🏆',
       title: '¡HAS GANADO!',
       content: `¡Reclamá tus premios de ${aw.event_name}!`,
       color: '#22c55e'
     })
  })

  return result
})

const startTimer = () => {
  if (slides.value.length <= 1) return
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % slides.value.length
  }, 5000)
}

onMounted(startTimer)
onUnmounted(() => clearInterval(timer))

const handleAction = (slide) => {
  if (slide.type === 'event') emit('openEvent', slide.id)
  else emit('openAward', slide.id)
}
</script>

<template>
  <div
    v-if="slides.length > 0"
    class="pc-banner pc-banner-carousel"
    :class="{ 'event-active': slides.length > 0 }"
  >
    <div
      v-for="(slide, i) in slides"
      :key="i"
      :class="['pc-carousel-slide', { active: currentIndex === i }]"
      @click="handleAction(slide)"
    >
      <div class="pc-banner-icon">
        {{ slide.icon }}
      </div>
      <div class="pc-banner-content">
        <div
          class="pc-banner-title"
          :style="{ color: slide.color }"
        >
          {{ slide.title }}
        </div>
        <div class="pc-banner-text">
          {{ slide.content }}
        </div>
      </div>
    </div>

    <!-- Dots -->
    <div
      v-if="slides.length > 1"
      class="pc-carousel-dots"
    >
      <div
        v-for="(_, i) in slides"
        :key="i"
        :class="['pc-dot', { active: currentIndex === i }]"
      />
    </div>
  </div>
</template>

<style scoped>
.pc-banner-carousel {
  position: relative;
  min-height: 80px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 12px;
}

.pc-banner-carousel.event-active {
  border-color: rgba(251, 191, 36, 0.3);
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.1);
}

.pc-carousel-slide {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 14px;
  padding: 14px;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
  cursor: pointer;
}

.pc-carousel-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.pc-banner-icon { font-size: 24px; }

.pc-banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  margin-bottom: 6px;
}

.pc-banner-text {
  font-size: 11px;
  color: #aaa;
  line-height: 1.4;
}

.pc-carousel-dots {
  position: absolute;
  bottom: 8px;
  right: 14px;
  display: flex;
  gap: 4px;
}

.pc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
}

.pc-dot.active {
  background: var(--yellow);
  width: 12px;
  border-radius: 4px;
}
</style>
