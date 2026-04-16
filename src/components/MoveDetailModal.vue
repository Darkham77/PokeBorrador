<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const moveName = computed(() => uiStore.selectedMove)
const isOpen = computed(() => uiStore.isMoveDetailOpen)

const TYPE_COLORS = {
  normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
  electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
  ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
  rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
}

const md = computed(() => {
  if (!moveName.value) return null
  return window.MOVE_DATA?.[moveName.value] || null
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
  if (!moveName.value || !md.value) return ''
  if (typeof window.getMoveDescription === 'function') {
    return window.getMoveDescription(moveName.value, md.value)
  }
  return "Causa daño al oponente sin efectos secundarios adicionales."
})
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="isOpen && md" 
      class="modal-overlay"
      @click.self="uiStore.closeMoveDetail()"
    >
      <div 
        class="modal-content move-card"
        :style="{ '--move-accent': typeColor }"
      >
        <header class="move-header">
          <h2 class="move-title">
            {{ moveName }}
          </h2>
          <button
            class="close-btn"
            @click="uiStore.closeMoveDetail()"
          >
            ✕
          </button>
        </header>

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

        <footer class="modal-footer">
          <button
            class="action-btn"
            @click="uiStore.closeMoveDetail()"
          >
            CERRAR
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 380px;
  background: #1a1a2e;
  border-radius: 24px;
  padding: 24px;
  border-top: 4px solid var(--move-accent);
  box-shadow: 0 20px 50px rgba(0,0,0,0.6);
}

.move-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.move-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--move-accent);
}

.close-btn {
  background: rgba(255,255,255,0.05);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-cat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.cat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.05);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: bold;
  color: #aaa;
  text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  background: rgba(255,255,255,0.03);
  padding: 12px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.05);
}

.stat-item .label {
  display: block;
  font-size: 9px;
  color: #666;
  text-transform: uppercase;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-item .val {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
}

.pp-info {
  background: rgba(255,255,255,0.03);
  padding: 14px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border: 1px solid rgba(255,255,255,0.05);
}

.pp-info .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; }
.pp-info .val { font-size: 16px; font-weight: bold; color: var(--yellow); }

.description-box {
  background: linear-gradient(135deg, rgba(255,255,255,0.02), transparent);
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.05);
  border-left: 4px solid var(--move-accent);
}

.desc-title {
  font-family: 'Press Start 2P', monospace;
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

.modal-footer {
  margin-top: 24px;
}

.action-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255,255,255,0.05);
  color: #888;
  border: none;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
