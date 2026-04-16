<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true }
})

const emit = defineEmits(['show-move'])

const p = computed(() => props.pokemon)
</script>

<template>
  <section class="moves-section">
    <h3 class="section-title">
      ⚔️ MOVIMIENTOS
    </h3>
    <div class="moves-grid">
      <button 
        v-for="(m, i) in p.moves" 
        :key="i" 
        class="move-slot"
        @click="emit('show-move', m.name)"
      >
        <div class="move-main">
          <span class="move-name">{{ m.name }}</span>
          <span
            class="move-type"
            :class="'type-' + (m.type || 'normal').toLowerCase()"
          >{{ m.type || '???' }}</span>
        </div>
        <div class="move-pp">
          PP {{ m.pp }}/{{ m.maxPP }}
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--purple-light);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
}

.move-slot {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.move-slot:hover { 
  background: rgba(255,255,255,0.1); 
  border-color: var(--blue-light);
}

.move-name { display: block; font-size: 11px; font-weight: bold; margin-bottom: 6px; }

.move-type { 
  font-size: 8px; 
  padding: 2px 6px; 
  border-radius: 4px; 
  text-transform: uppercase; 
  font-weight: 900; 
  display: inline-block;
}

.move-pp { display: block; margin-top: 10px; font-size: 10px; color: #888; font-weight: bold; }

/* Type Colors Utility (Normally in generic file, but scoped for safety here) */
.type-grass { background: #6BCB77; color: #fff; }
.type-fire { background: #FF3B3B; color: #fff; }
.type-water { background: #3B8BFF; color: #fff; }
/* ... (Add other types as needed or rely on global classes if available) */
</style>
