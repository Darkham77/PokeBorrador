<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/boxStore'
import { getSpriteUrl } from '@/data/spriteMapping'

const props = defineProps({
  boxIndex: { type: Number, required: true }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const uiStore = useUIStore()
const boxStore = useBoxStore()

const pokemon = computed(() => gameStore.state.box[props.boxIndex])
const team = computed(() => gameStore.state.team)

const handleMoveToTeam = () => {
  const res = boxStore.moveBoxToTeam(props.boxIndex)
  if (res.success) {
    uiStore.notify(res.msg, '➕')
    emit('close')
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const handleSwap = (teamIndex) => {
  const res = boxStore.swapBoxWithTeam(props.boxIndex, teamIndex)
  if (res.success) {
    uiStore.notify(res.msg, '↔️')
    emit('close')
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const handleDetail = () => {
  uiStore.openPokemonDetail(pokemon.value, props.boxIndex, 'box')
  emit('close')
}

const handleUseItem = () => {
  uiStore.isInventoryOpen = true
  emit('close')
}

const handleMoveToBox = () => {
  uiStore.openPrompt({
    title: 'Mover Pokémon',
    message: `¿A qué caja querés mover a ${pokemon.value.name}? (1 a ${gameStore.state.boxCount})`,
    initialValue: (boxStore.currentBoxIndex + 1).toString(),
    type: 'number',
    onConfirm: (val) => {
      const boxNum = parseInt(val)
      if (isNaN(boxNum) || boxNum < 1 || boxNum > gameStore.state.boxCount) {
        uiStore.notify('Número de caja inválido.', '⚠️')
        return
      }
      
      const res = boxStore.movePokemonToBox(props.boxIndex, boxNum - 1)
      if (res.success) {
        uiStore.notify(res.msg, '📦')
        emit('close')
      }
    }
  })
}

const handleRelease = () => {
  if (pokemon.value.inDaycare) {
    uiStore.notify('No se puede soltar un Pokémon en la Guardería.', '⚠️')
    return
  }
  
  uiStore.openConfirm({
    title: 'Soltar Pokémon',
    message: `¿Estás seguro de que querés soltar a ${pokemon.value.name}? Esta acción es permanente.`,
    onConfirm: () => {
      // Use the helper from boxStore if possible, or just splice here for simplicity since it's a single one
      // But boxStore.returnHeldItem is private or needs to be exported.
      // I'll use boxStore.toggleBoxReleaseSelect and doBoxRelease or just a new single method.
      // I'll use a direct splice but call returnHeldItem if I exported it.
      // Actually, I'll just add a single release method to boxStore to keep it DRY.
      
      // Let's assume I'll add it to boxStore or just use the batch one by selecting one.
      boxStore.boxReleaseSelected = [props.boxIndex]
      const names = boxStore.doBoxRelease()
      uiStore.notify(`¡${names[0]} fue soltado!`, '🌿')
      emit('close')
    }
  })
}

const handleRocketSell = () => {
  // Use a temporary selection to get the value for THIS pokemon
  const originalSelection = [...boxStore.boxRocketSelected]
  boxStore.boxRocketSelected = [props.boxIndex]
  const price = boxStore.getRocketSellValue()
  boxStore.boxRocketSelected = originalSelection // Restore

  uiStore.openConfirm({
    title: 'Vender Mercado Negro',
    message: `¿Vender ${pokemon.value.name} por ₽${price.toLocaleString()} al Team Rocket?`,
    onConfirm: () => {
      boxStore.boxRocketSelected = [props.boxIndex]
      const res = boxStore.doBoxRocketSell()
      uiStore.notify(`¡Vendido por ₱${res.value.toLocaleString()}! 🚀`, '🚀')
      emit('close')
    }
  })
}

const handleToggleTag = (tag) => {
  boxStore.togglePokeTag(props.boxIndex, tag)
}
</script>

<template>
  <div
    class="box-menu-overlay"
    @click.self="emit('close')"
  >
    <div
      v-if="pokemon"
      class="box-menu-card animate-pop"
    >
      <header class="menu-header">
        <div class="pokemon-id">
          #{{ pokemon.id.toString().padStart(3, '0') }}
        </div>
        <img
          :src="getSpriteUrl(pokemon.id, pokemon.isShiny)"
          class="menu-sprite"
        >
        <h3 class="pokemon-name">
          {{ pokemon.name }} {{ pokemon.isShiny ? '✨' : '' }}
        </h3>
        <div class="pokemon-meta">
          Nv. {{ pokemon.level }} · {{ pokemon.nature }} · {{ pokemon.ability }}
        </div>
        
        <div class="tag-row">
          <button 
            class="tag-btn" 
            :class="{ active: pokemon.tags?.includes('fav') }"
            title="Favorito"
            @click="handleToggleTag('fav')"
          >
            ⭐
          </button>
          <button 
            class="tag-btn" 
            :class="{ active: pokemon.tags?.includes('breed') }"
            title="Crianza"
            @click="handleToggleTag('breed')"
          >
            ❤️
          </button>
          <button 
            class="tag-btn" 
            :class="{ active: pokemon.tags?.includes('iv31') }"
            title="IV 31"
            @click="handleToggleTag('iv31')"
          >
            31
          </button>
        </div>
      </header>

      <div class="menu-body scrollbar">
        <button
          class="action-btn detail-btn"
          @click="handleDetail"
        >
          <span class="icon">👁️</span> Ver Detalles
        </button>

        <button 
          v-if="team.length < 6" 
          class="action-btn add-btn" 
          @click="handleMoveToTeam"
        >
          <span class="icon">➕</span> Agregar al equipo
        </button>

        <div class="swap-section">
          <div class="section-title">
            INTERCAMBIAR POR:
          </div>
          <div
            v-for="(t, i) in team"
            :key="t.uid"
            class="team-option"
            @click="handleSwap(i)"
          >
            <img
              :src="getSpriteUrl(t.id, t.isShiny)"
              class="team-sprite"
            >
            <div class="team-info">
              <div class="name">
                {{ t.name }}
              </div>
              <div class="lv">
                Nv. {{ t.level }}
              </div>
            </div>
            <span class="swap-icon">↔️</span>
          </div>
        </div>

        <button
          class="action-btn item-btn"
          @click="handleUseItem"
        >
          <span class="icon">🎒</span> Usar Objeto
        </button>

        <button 
          v-if="gameStore.state.playerClass === 'rocket'" 
          class="action-btn rocket-btn" 
          @click="handleRocketSell"
        >
          <span class="icon">🚀</span> Vender Mercado Negro
        </button>

        <button
          class="action-btn move-btn"
          @click="handleMoveToBox"
        >
          <span class="icon">📦</span> Mover a otra caja
        </button>

        <button 
          class="action-btn release-btn" 
          :disabled="pokemon.inDaycare"
          @click="handleRelease"
        >
          <span class="icon">🌿</span> Soltar Pokémon
        </button>
      </div>

      <footer class="menu-footer">
        <button
          class="close-btn"
          @click="emit('close')"
        >
          CERRAR
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.box-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.box-menu-card {
  width: 100%;
  max-width: 380px;
  background: #1a1a1a;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.menu-header {
  padding: 24px;
  text-align: center;
  background: linear-gradient(to bottom, rgba(255,255,255,0.03), transparent);
  border-bottom: 1px solid rgba(255,255,255,0.05);

  .pokemon-id {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 8px;
  }

  .menu-sprite {
    width: 80px;
    height: 80px;
    image-rendering: pixelated;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
  }

  .pokemon-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: var(--yellow);
    margin: 12px 0 6px;
    text-transform: uppercase;
  }

  .pokemon-meta {
    font-size: 11px;
    color: var(--gray);
  }

  .tag-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;

    .tag-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;

      &.active {
        background: rgba(199, 125, 255, 0.2);
        border-color: var(--purple);
        color: #fff;
        transform: scale(1.1);
      }
      &:hover { background: rgba(255, 255, 255, 0.1); }
    }
  }
}

.menu-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.08);

  .icon { font-size: 16px; width: 20px; text-align: center; }

  &:hover { background: rgba(255, 255, 255, 0.08); transform: translateX(4px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &.detail-btn { color: var(--purple-light); border-color: rgba(199, 125, 255, 0.3); background: rgba(199, 125, 255, 0.05); }
  &.add-btn { color: var(--blue); border-color: rgba(59, 139, 255, 0.3); background: rgba(59, 139, 255, 0.05); }
  &.item-btn { color: var(--green); border-color: rgba(107, 203, 119, 0.3); background: rgba(107, 203, 119, 0.05); }
  &.rocket-btn { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
  &.release-btn { color: #888; font-size: 11px; margin-top: 10px; opacity: 0.6; }
}

.swap-section {
  margin: 10px 0;
  .section-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: var(--purple);
    margin-bottom: 12px;
    padding-left: 4px;
  }
}

.team-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(199, 125, 255, 0.05);
    border-color: rgba(199, 125, 255, 0.3);
    transform: translateX(4px);
  }

  .team-sprite { width: 36px; height: 36px; image-rendering: pixelated; }
  .team-info {
    flex: 1;
    .name { font-size: 13px; font-weight: 700; color: #fff; }
    .lv { font-size: 11px; color: var(--gray); }
  }
  .swap-icon { font-size: 14px; color: var(--purple); opacity: 0.6; }
}

.menu-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);

  .close-btn {
    width: 100%;
    padding: 12px;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: var(--gray);
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
  }
}

.scrollbar::-webkit-scrollbar { width: 4px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
