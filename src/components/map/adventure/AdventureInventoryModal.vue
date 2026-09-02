<script setup lang="ts">
const props = defineProps<{
  show: boolean
  activeCompanion: string
  playerInventory: Record<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'updateCompanion', comp: string): void
  (e: 'updateInventory', item: string, value: boolean): void
  (e: 'close'): void
}>()

const companions = [
  { id: 'none', name: 'Ninguno', desc: 'Sin bonus', icon: '❌', sprite: '' },
  { id: 'pikachu', name: 'Pikachu', desc: '+50% Combates', icon: '⚡', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
  { id: 'meowth', name: 'Meowth', desc: '+50% Monedas', icon: '💰', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png' },
  { id: 'squirtle', name: 'Squirtle', desc: '+50% Pesca', icon: '🌊', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' }
]

const mos = [
  { id: 'Vuelo', icon: '🦅', label: 'Vuelo' },
  { id: 'Corte', icon: '✂️', label: 'Corte' },
  { id: 'Surf', icon: '🌊', label: 'Surf' },
  { id: 'Flauta', icon: '🎵', label: 'Flauta' }
]
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.show"
      class="adv-modal-overlay"
      @click.self="emit('close')"
    >
      <div class="adv-modal-card">
        <div class="adv-modal-header">
          <span class="icon">🎒</span> EQUIPO Y OBJETOS
        </div>

        <div class="adv-modal-body">
          <!-- Companion Section -->
          <div class="section-group">
            <p class="section-title">
              ACOMPAÑANTE ACTIVO
            </p>
            <div class="companion-grid">
              <button
                v-for="comp in companions"
                :key="comp.id"
                class="companion-btn"
                :class="{ active: props.activeCompanion === comp.id }"
                :title="comp.desc"
                @click="emit('updateCompanion', comp.id)"
              >
                <div class="companion-avatar">
                  <img
                    v-if="comp.sprite"
                    :src="comp.sprite"
                    class="pixel-art"
                    :alt="comp.name"
                  >
                  <span
                    v-else
                    class="empty-icon"
                  >{{ comp.icon }}</span>
                </div>
                <span class="companion-name">{{ comp.name }}</span>
                <span class="companion-desc">{{ comp.desc }}</span>
              </button>
            </div>
          </div>

          <!-- Vehicle & MOs Section -->
          <div class="section-group">
            <p class="section-title">
              VEHÍCULO Y MOVIMIENTOS OCULTOS
            </p>

            <!-- Bicycle Toggle -->
            <label
              class="vehicle-card"
              :class="{ active: props.playerInventory['Bicicleta'] }"
            >
              <div class="vehicle-info">
                <span class="vehicle-icon">🚲</span>
                <div class="vehicle-texts">
                  <div class="vehicle-headline">
                    <span class="vehicle-name">BICICLETA</span>
                    <span class="vehicle-speed-badge">Velocidad x2</span>
                  </div>
                  <p class="vehicle-desc">Permite desplazarse al doble de velocidad en rutas terrestres.</p>
                </div>
              </div>
              <input
                type="checkbox"
                :checked="props.playerInventory['Bicicleta']"
                class="adv-checkbox"
                @change="emit('updateInventory', 'Bicicleta', ($event.target as HTMLInputElement).checked)"
              >
            </label>

            <!-- MOs Grid -->
            <div class="mo-grid">
              <label
                v-for="mo in mos"
                :key="mo.id"
                class="mo-card"
                :class="{ active: props.playerInventory[mo.id] }"
              >
                <div class="mo-header">
                  <span class="mo-icon">{{ mo.icon }}</span>
                  <span class="mo-title">{{ mo.label }}</span>
                </div>
                <input
                  type="checkbox"
                  :checked="props.playerInventory[mo.id]"
                  class="adv-checkbox"
                  @change="emit('updateInventory', mo.id, ($event.target as HTMLInputElement).checked)"
                >
              </label>
            </div>
          </div>
        </div>

        <div class="adv-modal-footer">
          <button
            class="adv-save-btn"
            @click="emit('close')"
          >
            Guardar y Salir
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.adv-modal-overlay {
  position: fixed;
  inset: 0;
  width: dvw;
  height: 100dvh;
  background: Rgba(5, 10, 20, 0.85);
  backdrop-filter: Blur(8px);
  z-index: 60000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.adv-modal-card {
  width: 100%;
  max-width: 440px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(59, 130, 246, 0.2);
  border: 2px solid #3b82f6;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.adv-modal-header {
  padding: 14px 16px;
  font-weight: 900;
  font-size: 1.15rem;
  text-align: center;
  color: #fff;
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
  border-bottom: 2px solid #1e40af;
  letter-spacing: 0.05em;
  @include pixelated;
}

.adv-modal-body {
  padding: 18px 16px;
  max-height: 65dvh;
  overflow-y: auto;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0;
}

.companion-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: Rgba(15, 23, 42, 0.7);
  padding: 10px;
  border-radius: 14px;
  border: 1px solid Rgba(255, 255, 255, 0.08);
}

.companion-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 12px;
  background: Rgba(30, 41, 59, 0.6);
  border: 1.5px solid Rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: Rgba(59, 130, 246, 0.15);
    border-color: Rgba(59, 130, 246, 0.4);
    transform: Translatey(-2px);
  }

  &.active {
    background: Rgba(59, 130, 246, 0.25);
    border-color: #60a5fa;
    box-shadow: 0 0 12px Rgba(96, 165, 250, 0.4);
    color: #fff;
    transform: Scale(1.04);
  }

  .companion-avatar {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;

    img {
      width: 100%;
      height: 100%;
    }

    .empty-icon {
      font-size: 1.2rem;
    }
  }

  .companion-name {
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.1;
  }

  .companion-desc {
    font-size: 0.62rem;
    color: #93c5fd;
    font-weight: 700;
    margin-top: 2px;
    text-align: center;
    line-height: 1.1;
  }
}

.vehicle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: Rgba(15, 23, 42, 0.7);
  border: 1.5px solid Rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: Rgba(59, 130, 246, 0.5);
    background: Rgba(30, 41, 59, 0.8);
  }

  &.active {
    border-color: #3b82f6;
    background: Rgba(59, 130, 246, 0.15);
    box-shadow: 0 0 14px Rgba(59, 130, 246, 0.25);
  }

  .vehicle-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .vehicle-icon {
    font-size: 2rem;
  }

  .vehicle-texts {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .vehicle-headline {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vehicle-name {
    font-size: 0.92rem;
    font-weight: 900;
    color: #f8fafc;
    letter-spacing: 0.05em;
  }

  .vehicle-speed-badge {
    font-size: 0.65rem;
    padding: 1px 6px;
    border-radius: 6px;
    background: Rgba(34, 197, 94, 0.2);
    color: #86efac;
    border: 1px solid Rgba(34, 197, 94, 0.4);
    font-weight: 800;
  }

  .vehicle-desc {
    font-size: 0.72rem;
    color: #94a3b8;
    margin: 0;
  }
}

.mo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.mo-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: Rgba(15, 23, 42, 0.7);
  border: 1.5px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: Rgba(59, 130, 246, 0.5);
    background: Rgba(30, 41, 59, 0.8);
  }

  &.active {
    border-color: #38bdf8;
    background: Rgba(56, 189, 248, 0.15);
    box-shadow: 0 0 10px Rgba(56, 189, 248, 0.25);

    .mo-title {
      color: #bae6fd;
    }
  }

  .mo-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mo-icon {
    font-size: 1.35rem;
  }

  .mo-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: 0.05em;
  }
}

.adv-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.adv-modal-footer {
  padding: 14px 16px;
  background: #0b1120;
  border-top: 1px solid Rgba(255, 255, 255, 0.08);
}

.adv-save-btn {
  width: 100%;
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-weight: 900;
  padding: 12px;
  border-radius: 12px;
  font-size: 1rem;
  border: 1px solid #60a5fa;
  box-shadow: 0 4px 14px Rgba(29, 78, 216, 0.4);
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: all 0.2s ease;

  &:hover {
    filter: Brightness(1.1);
    transform: Translatey(-1px);
  }

  &:active {
    transform: Scale(0.97);
  }
}

.pixel-art {
  image-rendering: pixelated;
}
</style>
