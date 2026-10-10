<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getMoveDescription } from '@/logic/pokemon/pokemonUtils'
import { toPokemonType } from '@/data/battle/types'
import { PDEX_TYPE_COLORS as TYPE_COLORS } from '@/logic/constants/pokedexConstants'

import { isPokemonMoveId, type PokemonMoveId } from '@/data/battle/moves'

interface Props {
  show?: boolean
  moveId?: PokemonMoveId
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  moveId: undefined
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const md = computed(() => {
  if (!props.moveId || !isPokemonMoveId(props.moveId)) return null
  const mData = pokemonDataProvider.getMoveData(props.moveId)
  if (!mData) throw new Error(`[MoveDetailModal] No se encontró información en la base de datos para el movimiento: ${props.moveId}`)
  return mData
})

const typeColor = computed(() => {
  if (!md.value) return '#aaa'
  return TYPE_COLORS[moveType.value] || '#aaa'
})

const moveType = computed(() => toPokemonType(md.value?.type || 'normal'))

const catInfo = computed(() => {
  if (!md.value) return { icon: '', text: '' }
  const cats: Record<string, { icon: string, text: string }> = {
    physical: { icon: '⚔️', text: 'Físico' },
    special: { icon: '✨', text: 'Especial' },
    status: { icon: '🔮', text: 'Estado' }
  }
  return cats[md.value.cat] ?? { icon: '', text: '' }
})

const description = computed(() => {
  if (!props.moveId || !md.value) return ''
  return getMoveDescription(props.moveId, md.value)
})
</script>

<template>
  <BaseModal
    :show="show && !!md"
    :title="md?.name?.toUpperCase() || 'DETALLE'"
    max-width="420px"
    @close="emit('close')"
  >
    <div 
      v-if="md"
      class="move-detail-container"
      :style="{ 
        '--move-accent': typeColor
      }"
    >
      <div class="type-cat-row">
        <PokemonTypeTag
          :type="moveType"
          size="md"
          class="pixelated"
        />
        <span class="cat-badge">
          <span class="emoji icon">{{ catInfo.icon }}</span>
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
        id="move-detail-close-btn"
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
  gap: $spacing-2xl;
  padding: 10px 0;
}

.type-cat-row {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
}

.cat-badge {
  display: flex;
  align-items: center;
  gap: $spacing-md-alt;
  padding: 8px 16px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 3%);

  .icon { font-size: var(--font-14); }
  .text {
    color: var(--slate-400);
    font-size: var(--font-9);
    font-weight: bold;
    letter-spacing: 0.5px;
  }
}

.stats-grid {
  display: grid;
  gap: $spacing-lg;
  grid-template-columns: 1fr 1fr;
}

.stat-item {
  padding: 20px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-2xl-alt;
  background: Rgb(255 255 255 / 2%);
  text-align: center;
  

  &:hover {
    background: Rgb(255 255 255 / 4%);
    transform: Translatey(-2px);
    border-color: var(--move-accent);
  }

  .label {
    display: block;
    color: var(--slate-500);
    font-size: var(--font-8);
    margin-bottom: 10px;
    letter-spacing: 1px;
  }

  .val {
    color: $white;
    font-family: $font-family-ui;
    font-size: var(--font-26);
    font-weight: 900;
    
    small {
      font-size: var(--font-14);
      opacity: 0.5;
      margin-left: 2px;
    }
  }
}

.pp-info {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-2xl-alt;
  background: Rgb(from var(--move-accent, #fff) r g b / 10%);
  overflow: hidden;

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    background: var(--move-accent);
    content: '';
  }

  .label { 
    color: var(--slate-300); 
    font-size: var(--font-9); 
    font-weight: bold;
    letter-spacing: 1px;
  }
  
  .val { 
    color: var(--move-accent); 
    font-size: var(--font-20); 
    font-weight: 900;
    text-shadow: 0 0 10px Rgb(from var(--move-accent, #fff) r g b / 10%);
  }
}

.description-box {
  @include gpu-layer;

  padding: 24px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-3xl;
  background: Rgb(0 0 0 / 20%);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(5px);
}

.desc-title {
  color: var(--move-accent);
  font-size: var(--font-8);
  opacity: 0.9;
  margin-bottom: 14px;
  letter-spacing: 1.5px;
}

.desc-text {
  margin: 0;
  color: var(--slate-100);
  font-size: var(--font-13);
  font-weight: 400;
  line-height: 1.6;
  text-wrap: balance;
}

.action-btn {
  width: 100%;
  padding: 18px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-2xl;
  background: Rgb(255 255 255 / 3%);
  color: var(--slate-300);
  font-size: var(--font-10);
  cursor: pointer;
  

  &:hover {
    background: var(--move-accent);
    color: $white;
    transform: Translatey(-3px);
    border-color: transparent;
    box-shadow: var(--shadow-xl);
  }
}

:deep(.base-modal-card) {
  border-top: 1px solid var(--move-accent) !important;
  
  &::after {
    position: absolute;
    top: 0;
    left: 50%;
    width: 60px;
    height: 3px;
    border-radius: 0 0 $radius-sm $radius-sm;
    background: var(--move-accent);
    transform: Translatex(-50%);
    content: '';
    box-shadow: var(--shadow-glow-amber);
  }
}

// Glass inset helper
.glass-inset {
  box-shadow: var(--shadow-inset-md);
}
</style>
