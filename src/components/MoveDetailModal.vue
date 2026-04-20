<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  moveName: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const TYPE_COLORS = {
  normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
  electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
  ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
  rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
}

const md = computed(() => {
  if (!props.moveName) return null
  return window.MOVE_DATA?.[props.moveName] || null
})

const typeColor = computed(() => {
  if (!md.value) return '#aaa'
  return TYPE_COLORS[md.value.type.toLowerCase()] || '#aaa'
})

const catInfo = computed(() => {
  if (!md.value) return { icon: '', text: '' }
  const cats = {
    physical: { icon: '⚔️', text: 'Físico' },
    special: { icon: '✨', text: 'Especial' },
    status: { icon: '🔮', text: 'Estado' }
  }
  return cats[md.value.cat.toLowerCase()] || { icon: '', text: '' }
})

const description = computed(() => {
  if (!props.moveName || !md.value) return ''
  if (typeof window.getMoveDescription === 'function') {
    return window.getMoveDescription(props.moveName, md.value)
  }
  return "Causa daño al oponente sin efectos secundarios adicionales."
})
</script>

<template>
  <BaseModal
    :show="show && !!md"
    :title="moveName || 'DETALLE'"
    max-width="400px"
    @close="emit('close')"
  >
    <div 
      v-if="md"
      class="move-detail-container"
      :style="{ '--move-accent': typeColor }"
    >
      <div class="type-cat-row">
        <span
          class="type-badge"
          :class="'type-' + md.type.toLowerCase()"
        >{{ md.type }}</span>
        <span class="cat-badge">
          <span class="icon">{{ catInfo.icon }}</span>
          <span class="text">{{ catInfo.text }}</span>
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <span class="label">Potencia</span>
          <span class="val">{{ md.power || '—' }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Precisión</span>
          <span class="val">{{ md.acc || '—' }}%</span>
        </div>
      </div>

      <div class="pp-info glass-inset">
        <span class="label">PP Máximos</span>
        <span class="val">{{ md.pp }}</span>
      </div>

      <div class="description-box">
        <h4 class="desc-title">
          DESCRIPCIÓN EN BATALLA
        </h4>
        <p class="desc-text">
          {{ description }}
        </p>
      </div>
    </div>

    <template #footer>
      <button
        class="action-btn"
        @click="emit('close')"
      >
        CERRAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.move-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 0;
}

.type-cat-row {
  display: flex;
  gap: 12px;
}

.cat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: bold;
  color: #aaa;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .label {
    display: block;
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .val {
    font-size: 20px;
    font-weight: 900;
    color: #fff;
  }
}

.pp-info {
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; }
  .val { font-size: 18px; font-weight: bold; color: var(--yellow); }
}

.description-box {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02), transparent);
  padding: 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 4px solid var(--move-accent);
}

.desc-title {
  font-family: 'Press Start 2P', cursive;
  font-size: 7px;
  color: var(--move-accent);
  margin-bottom: 12px;
  opacity: 0.8;
}

.desc-text {
  font-size: 12px;
  line-height: 1.6;
  color: #ccc;
  font-weight: 500;
  margin: 0;
}

.action-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: #888;
  border: none;
  border-radius: 14px;
  font-family: 'Press Start 2P', cursive;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  @include pixelated;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: translateY(-2px);
  }
}

:deep(.base-modal-card) {
  border-top: 4px solid var(--move-accent) !important;
}
</style>
