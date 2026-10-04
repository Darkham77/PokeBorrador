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
  gap: 24px;
  padding: 10px 0;
}

.type-cat-row {
  display: flex;
  align-items: center;
  gap: 16px;
}


.cat-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 12px;
  background: Rgb(255 255 255 / 3%);

  .icon { font-size: 14px; }
  .text {
    color: #888;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
}

.stats-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}

.stat-item {
  padding: 20px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 18px;
  background: Rgb(255 255 255 / 2%);
  text-align: center;
  

  &:hover {
    background: Rgb(255 255 255 / 4%);
    transform: Translatey(-2px);
    border-color: var(--move-accent);
  }

  .label {
    display: block;
    color: #666;
    font-size: 8px;
    margin-bottom: 10px;
    letter-spacing: 1px;
  }

  .val {
    color: $white;
    font-family: Outfit, sans-serif;
    font-size: 26px;
    font-weight: 900;
    
    small {
      font-size: 14px;
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
  border-radius: 18px;
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
    color: #aaa; 
    font-size: 9px; 
    font-weight: bold;
    letter-spacing: 1px;
  }
  
  .val { 
    color: var(--move-accent); 
    font-size: 20px; 
    font-weight: 900;
    text-shadow: 0 0 10px Rgb(from var(--move-accent, #fff) r g b / 10%);
  }
}

.description-box {
  @include gpu-layer;

  padding: 24px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 20px;
  background: Rgb(0 0 0 / 20%);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(5px);
}

.desc-title {
  color: var(--move-accent);
  font-size: 8px;
  opacity: 0.9;
  margin-bottom: 14px;
  letter-spacing: 1.5px;
}

.desc-text {
  margin: 0;
  color: #eee;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
  text-wrap: balance;
}

.action-btn {
  width: 100%;
  padding: 18px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 16px;
  background: Rgb(255 255 255 / 3%);
  color: #aaa;
  font-size: 10px;
  cursor: pointer;
  

  &:hover {
    background: var(--move-accent);
    color: $white;
    transform: Translatey(-3px);
    border-color: transparent;
    box-shadow: 0 10px 20px Rgb(0 0 0 / 40%), 0 0 15px Rgb(from var(--move-accent, #fff) r g b / 10%);
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
    border-radius: 0 0 4px 4px;
    background: var(--move-accent);
    transform: Translatex(-50%);
    content: '';
    box-shadow: 0 0 15px var(--move-accent);
  }
}

// Glass inset helper
.glass-inset {
  box-shadow: inset 0 2px 10px Rgb(0 0 0 / 20%);
}
</style>
