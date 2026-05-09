<script setup lang="ts">
import { computed } from 'vue'

import type { Pokemon, Move } from '@/types/pokemon'

interface Props {
  pokemon: Pokemon
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'show-move', name: string): void
}>()

const pMoves = computed(() => (props.pokemon.moves || []).filter((m): m is Move => m !== null))
</script>

<template>
  <section class="moves-section">
    <h3 class="vp-section-title">
      ⚔️ MOVIMIENTOS
    </h3>
    <div class="moves-grid">
      <button 
        v-for="(m, i) in pMoves" 
        :key="i" 
        class="move-slot"
        @click.stop="emit('show-move', m.name)"
      >
        <div class="move-main">
          <span class="mg-move-name">{{ m.name }}</span>
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
.vp-section-title {
  @include pixelated;
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
  background: Rgba(255,255,255,0.05);
  border: 1px solid Rgba(255,255,255,0.1);
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
  background: Rgba(255,255,255,0.1); 
  border-color: var(--blue-light);
}

.mg-move-name { display: block; font-size: 11px; font-weight: bold; margin-bottom: 6px; }

.move-type { 
  font-size: 8px; 
  padding: 2px 6px; 
  border-radius: 4px; 
  text-transform: uppercase; 
  font-weight: 900; 
  display: inline-block;
}

.move-pp { display: block; margin-top: 10px; font-size: 10px; color: Rgba(136, 136, 136, 1); font-weight: bold; }

/* Type Colors Utility (Normally in generic file, but scoped for safety here) */
.type-grass { background: Rgba(107, 203, 119, 1); color: var(--white); }
.type-fire { background: Rgba(255, 59, 59, 1); color: var(--white); }
.type-water { background: Rgba(59, 139, 255, 1); color: var(--white); }
/* ... (Add other types as needed or rely on global classes if available) */
</style>
