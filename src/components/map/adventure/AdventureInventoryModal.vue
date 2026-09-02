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

const activeCompanionBtn = (comp: string) => {
  return props.activeCompanion === comp ? 'ring-4 ring-blue-500 scale-110' : (comp === 'none' ? 'opacity-50' : '')
}
</script>

<template>
  <div
    v-if="props.show"
    class="adv-modal-overlay"
  >
    <div class="adv-modal-card">
      <div class="adv-modal-header bg-gradient-to-b from-blue-500 to-blue-700">
        <span class="icon">🎒</span> EQUIPO Y OBJETOS
      </div>
      <div class="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-gray-800">
        <p class="text-xs text-gray-500 text-center font-bold uppercase mb-4">
          Acompañante Activo
        </p>
        <div class="flex justify-around items-center bg-gray-100 p-3 rounded-2xl border border-gray-200">
          <button
            :class="activeCompanionBtn('none')"
            class="p-2 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50"
            title="Sin acompañante"
            @click="emit('updateCompanion', 'none')"
          >
            <span class="icon">❌</span>
          </button>
          <button
            :class="activeCompanionBtn('pikachu')"
            class="p-2 border-2 border-yellow-400 rounded-xl bg-yellow-50 hover:bg-yellow-100"
            title="+50% Combates"
            @click="emit('updateCompanion', 'pikachu')"
          >
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
              class="w-8 h-8 pixel-art"
              alt="Pikachu"
            >
          </button>
          <button
            :class="activeCompanionBtn('meowth')"
            class="p-2 border-2 border-amber-400 rounded-xl bg-amber-50 hover:bg-amber-100"
            title="+50% Monedas"
            @click="emit('updateCompanion', 'meowth')"
          >
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png"
              class="w-8 h-8 pixel-art"
              alt="Meowth"
            >
          </button>
          <button
            :class="activeCompanionBtn('squirtle')"
            class="p-2 border-2 border-blue-400 rounded-xl bg-blue-50 hover:bg-blue-100"
            title="+50% Pesca"
            @click="emit('updateCompanion', 'squirtle')"
          >
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png"
              class="w-8 h-8 pixel-art"
              alt="Squirtle"
            >
          </button>
        </div>

        <p class="text-xs text-gray-500 text-center font-bold uppercase mb-4">
          Modificadores de Viaje
        </p>
        <div class="grid grid-cols-2 gap-3 px-1 pb-2">
          <label class="flex flex-col items-center justify-center bg-gray-100 p-3 rounded-2xl border-2 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors col-span-2">
            <div class="flex items-center gap-3 w-full justify-center mb-1">
              <span class="icon text-3xl">🚲</span>
              <span class="font-black text-gray-800 text-md uppercase">Bicicleta</span>
              <input
                type="checkbox"
                :checked="props.playerInventory['Bicicleta']"
                class="w-6 h-6 accent-blue-600"
                @change="emit('updateInventory', 'Bicicleta', ($event.target as HTMLInputElement).checked)"
              >
            </div>
            <p class="text-[10px] text-gray-500 font-bold">Aumenta la velocidad de viaje x2</p>
          </label>

          <label
            v-for="mo in ['Vuelo', 'Corte', 'Surf', 'Flauta']"
            :key="mo"
            class="flex flex-col items-center justify-center p-3 rounded-2xl border-2 cursor-pointer hover:bg-opacity-80 transition-colors"
            :class="props.playerInventory[mo] ? 'bg-blue-50 border-blue-400 text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-400'"
          >
            <span class="icon text-2xl mb-1">{{ mo === 'Vuelo' ? '🦅' : (mo === 'Corte' ? '✂️' : (mo === 'Surf' ? '🌊' : '🎵')) }}</span>
            <span class="font-black text-xs uppercase">{{ mo }}</span>
            <input
              type="checkbox"
              :checked="props.playerInventory[mo]"
              class="mt-2 w-4 h-4 accent-blue-600"
              @change="emit('updateInventory', mo, ($event.target as HTMLInputElement).checked)"
            >
          </label>
        </div>
      </div>
      <div class="p-4 bg-gray-100 border-t border-gray-200">
        <button
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md active:scale-95 transition-transform"
          @click="emit('close')"
        >
          Guardar y Salir
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.adv-modal-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.75);
  backdrop-filter: Blur(4px);
  z-index: 60000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.adv-modal-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px Rgba(0, 0, 0, 0.5);
  border: 2px solid #cbd5e1;
}

.adv-modal-header {
  padding: 16px;
  font-weight: 900;
  font-size: 1.15rem;
  text-align: center;
  color: #fff;
  letter-spacing: 0.05em;
  @include pixelated;
}

.pixel-art {
  image-rendering: pixelated;
}
</style>
