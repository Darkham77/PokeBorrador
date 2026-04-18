<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const gameStore = useGameStore()
const uiStore = useUIStore()

const claims = computed(() => gameStore.state.claimQueue || [])
const hasClaims = computed(() => claims.value.length > 0)

const processingId = ref(null)
const cooldowns = reactive(new Set())

const claimAsset = async (claimId) => {
  if (cooldowns.has(claimId)) {
    uiStore.notify('Debes esperar 5 segundos entre reclamos', '⏳')
    return
  }

  processingId.value = claimId
  const success = await gameStore.claimAsset(claimId)
  
  if (success) {
    uiStore.notify('¡Objeto recibido!', '🎁')
    // Cooldown logic
    cooldowns.add(claimId)
    setTimeout(() => cooldowns.delete(claimId), 5000)
  }
  
  processingId.value = null
}

const receiveAll = async () => {
  for (const claim of claims.value) {
    await claimAsset(claim.id)
    // Small delay between batch claims
    await new Promise(r => setTimeout(r, 1000))
  }
}

const getAssetIcon = (asset) => {
  if (asset.type === 'money') return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nugget.png'
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
}

const getSpriteUrl = (id) => {
  if (window.getSpriteUrl) return window.getSpriteUrl(id)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}
</script>

<template>
  <div
    v-if="hasClaims"
    class="claim-status-container"
  >
    <div class="claim-header">
      <div class="claim-title">
        🎁 OBJETOS PENDIENTES ({{ claims.length }})
      </div>
      <button
        class="receive-all-btn"
        :disabled="processingId"
        @click="receiveAll"
      >
        RECIBIR TODO
      </button>
    </div>

    <div class="claim-list scrollbar">
      <div
        v-for="claim in claims"
        :key="claim.id"
        class="claim-item"
      >
        <div class="asset-preview">
          <img 
            v-if="claim.asset_data.type === 'pokemon'" 
            :src="getSpriteUrl(claim.asset_data.data.id)" 
            class="pixel-art pokemon-sprite"
          >
          <img
            v-else
            :src="getAssetIcon(claim.asset_data)"
            class="pixel-art"
          >
          
          <div class="asset-info">
            <div
              v-if="claim.asset_data.type === 'pokemon'"
              class="asset-name"
            >
              {{ claim.asset_data.data.name }} (Lv.{{ claim.asset_data.data.level }})
            </div>
            <div
              v-else-if="claim.asset_data.type === 'money'"
              class="asset-name"
            >
              ₽{{ claim.asset_data.data.toLocaleString() }}
            </div>
            <div class="source">
              Origen: {{ claim.source_type }}
            </div>
          </div>
        </div>
        <button 
          class="claim-btn" 
          :disabled="processingId === claim.id" 
          @click="claimAsset(claim.id)"
        >
          {{ processingId === claim.id ? '...SINC' : 'RECIBIR' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.claim-status-container {
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-top: 15px;
  backdrop-filter: blur(10px);
}

.claim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.claim-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--purple);
}

.receive-all-btn {
  background: var(--purple);
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.claim-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.claim-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.asset-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pixel-art {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  &.pokemon-sprite {
    width: 48px;
    height: 48px;
    margin: -12px; // Offset for better alignment with text
  }
}

.asset-name {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.source {
  font-size: 9px;
  color: var(--gray);
  text-transform: capitalize;
}

.claim-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(168, 85, 247, 0.2); border-color: var(--purple); }
}
</style>
