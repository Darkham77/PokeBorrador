<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

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
      color: '#ffcc00'
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
       color: '#00ff00'
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
    class="legacy-carousel legacy-panel"
    :class="{ 'event-active': slides.length > 0 }"
  >
    <div
      v-for="(slide, i) in slides"
      :key="i"
      :class="['carousel-slide', { active: currentIndex === i }]"
      @click="handleAction(slide)"
    >
      <div class="slide-icon">
        {{ slide.icon }}
      </div>
      <div class="slide-content">
        <div
          class="slide-title"
          :style="{ color: slide.color }"
        >
          {{ slide.title }}
        </div>
        <div class="slide-text">
          {{ slide.content }}
        </div>
      </div>
    </div>

    <!-- Dots -->
    <div
      v-if="slides.length > 1"
      class="carousel-dots"
    >
      <div
        v-for="(_, i) in slides"
        :key="i"
        :class="['carousel-dot', { active: currentIndex === i }]"
      />
    </div>
  </div>
</template>

<style scoped>
.legacy-carousel {
  position: relative;
  min-height: 80px;
  background: #111;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
  overflow: hidden;
  margin-bottom: 20px;
}

.legacy-carousel.event-active {
  border-color: #ffcc00;
}

.carousel-slide {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 15px;
  padding: 15px;
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
}

.carousel-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.slide-icon { font-size: 24px; display: flex; align-items: center; }

.slide-content { display: flex; flex-direction: column; justify-content: center; }

.slide-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  margin-bottom: 8px;
  text-shadow: 2px 2px #000;
}

.slide-text {
  font-size: 11px;
  color: #888;
  line-height: 1.4;
}

.carousel-dots {
  position: absolute;
  bottom: 10px;
  right: 15px;
  display: flex;
  gap: 5px;
}

.carousel-dot {
  width: 6px;
  height: 6px;
  background: #444;
  border: 1px solid #000;
}

.carousel-dot.active {
  background: #ffcc00;
}
</style>
