<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { getSpriteUrl } from '@/logic/sprites'
import { useBattleVisuals } from '@/composables/useBattleVisuals'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()
const { getHpColor } = useBattleVisuals()

const isOpen = computed(() => uiStore.isBattleSwitchOpen)
const isForced = computed(() => uiStore.isBattleSwitchForced)
const team = computed(() => gameStore.state.team || [])
const activePoke = computed(() => battleStore.activeBattle?.player)

const close = () => {
  if (isForced.value) return // Cant close if forced to switch
  uiStore.isBattleSwitchOpen = false
}

const handleSwitch = async (index) => {
  await battleStore.executeSwitch(index, isForced.value)
  uiStore.isBattleSwitchOpen = false
  uiStore.isBattleSwitchForced = false
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div class="switch-modal-card">
        <div class="modal-header">
          <div class="icon-header">
            🔄
          </div>
          <h2>{{ isForced ? '¡ELEGÍ UN POKÉMON!' : 'CAMBIAR POKÉMON' }}</h2>
          <p v-if="!isForced">
            ¿A quién quieres enviar al combate?
          </p>
          <p v-else>
            Tu Pokémon ha caído. ¡Elige al siguiente!
          </p>
        </div>

        <div class="team-list">
          <template
            v-for="(p, index) in team"
            :key="p.uid || index"
          >
            <div 
              v-if="p.uid !== activePoke?.uid && p.hp > 0"
              class="target-row"
              @click="handleSwitch(index)"
            >
              <div class="poke-sprite">
                <img
                  :src="getSpriteUrl(p.id, p.isShiny)"
                  :alt="p.name"
                >
              </div>
              
              <div class="poke-info">
                <div class="name-line">
                  <span class="p-name">{{ p.name }}</span>
                  <span class="p-lv">Nv.{{ p.level }}</span>
                </div>
                
                <div class="hp-bar-container">
                  <div 
                    class="hp-bar-fill" 
                    :style="{ 
                      width: (p.hp / p.maxHp * 100) + '%',
                      backgroundColor: getHpColor(p.hp / p.maxHp * 100)
                    }"
                  />
                </div>
                
                <div class="hp-text">
                  {{ p.hp }} / {{ p.maxHp }} HP
                </div>
              </div>

              <div class="select-hint">
                ¡IR!
              </div>
            </div>
          </template>
        </div>

        <button
          v-if="!isForced"
          class="cancel-btn"
          @click="close"
        >
          CANCELAR
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.switch-modal-card {
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  padding: 24px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.icon-header { font-size: 32px; margin-bottom: 8px; }

h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--purple);
  margin: 0 0 10px 0;
  line-height: 1.4;
}

p { color: var(--gray); font-size: 11px; margin: 0; }

.team-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.target-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.target-row:hover {
  background: rgba(199, 125, 255, 0.1);
  border-color: rgba(199, 125, 255, 0.3);
  transform: translateX(4px);
}

.poke-sprite img {
  width: 52px;
  height: 52px;
  image-rendering: pixelated;
}

.poke-info { flex: 1; }
.name-line { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.p-name { font-weight: 700; font-size: 15px; }
.p-lv { font-size: 11px; color: var(--gray); }

.hp-bar-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.hp-bar-fill { height: 100%; transition: width 0.5s ease; }
.hp-text { font-size: 10px; color: var(--gray); font-family: monospace; }

.select-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--purple);
  opacity: 0;
  transition: opacity 0.2s;
}

.target-row:hover .select-hint { opacity: 1; }

.cancel-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 16px;
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
}

.cancel-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
