<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { MOVE_DATA } from '@/data/moves'
import { PDEX_TYPE_COLORS } from '@/logic/constants/pokedexConstants'
import { getMoveDescription } from '@/logic/pokemon/pokemonUtils'
import type { MoveBaseData } from '@/types/database'

interface Props {
  show?: boolean
  moveName?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  moveName: ''
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const md = computed(() => {
  if (!props.moveName) return null
  const data = MOVE_DATA as Record<string, MoveBaseData>
  return data[props.moveName] || null
})

const typeColor = computed(() => {
  if (!md.value) return '#aaa'
  const colors = PDEX_TYPE_COLORS as Record<string, string>
  return colors[md.value.type.toLowerCase()] || '#aaa'
})

const catInfo = computed(() => {
  if (!md.value) return { icon: '', text: '' }
  const cats: Record<string, { icon: string, text: string }> = {
    physical: { icon: '⚔️', text: 'Físico' },
    special: { icon: '✨', text: 'Especial' },
    status: { icon: '🔮', text: 'Estado' }
  }
  return cats[md.value.cat.toLowerCase()] || { icon: '', text: '' }
})

const description = computed(() => {
  if (!props.moveName || !md.value) return ''
  return getMoveDescription(props.moveName, md.value)
})

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || hex === '—') return `Rgba(255, 255, 255, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `Rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<template>
  <BaseModal
    :show="show && !!md"
    :title="moveName?.toUpperCase() || 'DETALLE'"
    max-width="420px"
    @close="emit('close')"
  >
    <div 
      v-if="md"
      class="move-detail-container"
      :style="{ 
        '--move-accent': typeColor,
        '--move-accent-alpha': hexToRgba(typeColor, 0.1)
      }"
    >
      <div class="type-cat-row">
        <PokemonTypeTag
          :type="md.type"
          size="md"
          class="pixelated"
        />
        <span class="cat-badge">
          <span class="icon">{{ catInfo.icon }}</span>
          <span class="text pixelated">{{ catInfo.text.toUpperCase() }}</span>
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-item glass-inset">
          <span class="label pixelated">POTENCIA</span>
          <span class="val">{{ md.power || '—' }}</span>
        </div>
        <div class="stat-item glass-inset">
          <span class="label pixelated">PRECISIÓN</span>
          <span class="val">{{ md.acc || '—' }}<small v-if="md.acc">%</small></span>
        </div>
      </div>

      <div class="pp-info glass-inset">
        <span class="label pixelated">PP MÁXIMOS</span>
        <span class="val">{{ md.pp }}</span>
      </div>

      <div class="description-box">
        <h4 class="desc-title pixelated">
          EFECTO EN COMBATE
        </h4>
        <p class="desc-text">
          {{ description }}
        </p>
      </div>
    </div>

    <template #footer>
      <button
        class="action-btn pixelated"
        @click.stop="emit('close')"
      >
        VOLVER
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.move-detail-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px 0;
}

.type-cat-row {
  display: flex;
  gap: 16px;
  align-items: center;
}


.cat-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: Rgba(255, 255, 255, 0.03);
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .icon { font-size: 14px; }
  .text {
    font-size: 9px;
    font-weight: bold;
    color: #888;
    letter-spacing: 0.5px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-item {
  background: Rgba(255, 255, 255, 0.02);
  padding: 20px;
  border-radius: 18px;
  text-align: center;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  

  &:hover {
    background: Rgba(255, 255, 255, 0.04);
    border-color: var(--move-accent);
    transform: Translatey(-2px);
  }

  .label {
    display: block;
    font-size: 8px;
    color: #666;
    margin-bottom: 10px;
    letter-spacing: 1px;
  }

  .val {
    font-size: 26px;
    font-weight: 900;
    color: $white;
    font-family: 'Outfit', sans-serif;
    
    small {
      font-size: 14px;
      margin-left: 2px;
      opacity: 0.5;
    }
  }
}

.pp-info {
  background: var(--move-accent-alpha);
  padding: 18px 24px;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--move-accent);
  }

  .label { 
    font-size: 9px; 
    color: #aaa; 
    font-weight: bold;
    letter-spacing: 1px;
  }
  
  .val { 
    font-size: 20px; 
    font-weight: 900; 
    color: var(--move-accent);
    text-shadow: 0 0 10px var(--move-accent-alpha);
  }
}

.description-box {
  background: Rgba(0, 0, 0, 0.2);
  padding: 24px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(5px);
  backdrop-filter: Blur(5px);
  @include gpu-layer;
}

.desc-title {
  font-size: 8px;
  color: var(--move-accent);
  margin-bottom: 14px;
  letter-spacing: 1.5px;
  opacity: 0.9;
}

.desc-text {
  font-size: 13px;
  line-height: 1.6;
  color: #eee;
  font-weight: 400;
  margin: 0;
  text-wrap: balance;
}

.action-btn {
  width: 100%;
  padding: 18px;
  background: Rgba(255, 255, 255, 0.03);
  color: #aaa;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  font-size: 10px;
  cursor: pointer;
  

  &:hover {
    background: var(--move-accent);
    color: $white;
    border-color: transparent;
    transform: Translatey(-3px);
    box-shadow: 0 10px 20px Rgba(0, 0, 0, 0.4), 0 0 15px var(--move-accent-alpha);
  }
}

:deep(.base-modal-card) {
  border-top: 1px solid var(--move-accent) !important;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: Translatex(-50%);
    width: 60px;
    height: 3px;
    background: var(--move-accent);
    border-radius: 0 0 4px 4px;
    box-shadow: 0 0 15px var(--move-accent);
  }
}

// Glass inset helper
.glass-inset {
  box-shadow: inset 0 2px 10px Rgba(0, 0, 0, 0.2);
}
</style>
