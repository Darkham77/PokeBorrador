<script setup>
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const gameStore = useGameStore()

defineProps({
  item: { type: Object, required: true },
  show: { type: Boolean, default: false }
})

defineEmits(['close', 'select'])
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="target-overlay"
      @click.self="$emit('close')"
    >
      <div class="target-card animate-pop">
        <header class="target-header">
          <div class="item-preview">
            <img
              :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
              class="mini-sprite"
              @error="e => e.target.style.display = 'none'"
            >
            <div>
              <div class="label">
                USAR OBJETO:
              </div>
              <div class="name">
                {{ item.name }}
              </div>
            </div>
          </div>
          <button
            class="close-target"
            @click.stop="$emit('close')"
          >
            ✕
          </button>
        </header>
        
        <p class="target-hint">
          ¿En qué Pokémon quieres usarlo?
        </p>
        
        <div class="team-grid">
          <div 
            v-for="(poke, index) in gameStore.state.team" 
            :key="poke.uid"
            class="target-node"
            @click.stop="$emit('select', { pokemon: poke, index })"
          >
            <div class="poke-sprite-wrap">
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, poke.id, { isShiny: poke.isShiny })"
                class="poke-sprite"
                @error="e => e.target.style.display = 'none'"
              >
            </div>
            <div class="poke-info">
              <div class="poke-name">
                {{ poke.name }}
              </div>
              <div class="poke-meta">
                Nv. {{ poke.level }} · HP {{ poke.hp }}/{{ poke.maxHp }}
              </div>
              <div class="hp-bar">
                <div
                  class="hp-fill"
                  :style="{ width: (poke.hp/poke.maxHp*100) + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.target-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(15, 23, 42, 0.95);
  z-index: var(--z-base);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.target-card {
  width: 100%;
  max-width: 400px;
  background: Rgba(30, 41, 59, 1);
  border-radius: 24px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  padding: 24px;
  box-shadow: 0 20px 50px Rgba(0,0,0,0.5);
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  
  .item-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .mini-sprite { width: 32px; height: 32px; image-rendering: pixelated; }
    .label { font-size: 8px; font-weight: 800; color: $muted; }
    .name { font-size: 14px; font-weight: 800; color: var(--yellow); }
  }
  
  .close-target { background: none; border: none; color: Rgba(71, 85, 105, 1); font-size: 18px; cursor: pointer; }
}

.target-hint { font-size: 12px; font-weight: 700; color: Rgba(148, 163, 184, 1); margin-bottom: 16px; }

.team-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-node {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover { 
    background: Rgba(255, 255, 255, 0.08); 
    border-color: var(--yellow); 
    box-shadow: 0 0 0 1px var(--yellow);
  }
  
  .poke-sprite { width: 48px; height: 48px; image-rendering: pixelated; }
  
  .poke-info {
    flex: 1;
    .poke-name { font-weight: 800; font-size: 14px; color: var(--white); margin-bottom: 2px; }
    .poke-meta { font-size: 10px; color: $muted; margin-bottom: 4px; }
    
    .hp-bar {
      height: 4px;
      background: Rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      .hp-fill { height: 100%; background: Rgba(34, 197, 94, 1); }
    }
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes popIn {
  from { opacity: 0; transform: Scale(0.9); }
  to { opacity: 1; transform: Scale(1); }
}
.animate-pop { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
</style>
