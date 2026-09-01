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
        🎒 EQUIPO Y OBJETOS
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
            ❌
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
              <span class="text-3xl">🚲</span>
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
            :class="[
              mo === 'Vuelo' ? 'bg-sky-50 border-sky-200 text-sky-900' : 
              mo === 'Corte' ? 'bg-green-50 border-green-200 text-green-900' :
              mo === 'Surf' ? 'bg-blue-50 border-blue-200 text-blue-900' :
              'bg-purple-50 border-purple-200 text-purple-900'
            ]"
          >
            <span class="text-3xl mb-1">{{ mo === 'Vuelo' ? '🦅' : mo === 'Corte' ? '✂️' : mo === 'Surf' ? '🌊' : '🎵' }}</span>
            <span class="font-bold text-sm mb-2">{{ mo }}</span>
            <input
              type="checkbox"
              :checked="props.playerInventory[mo]"
              class="w-5 h-5 accent-blue-600"
              @change="emit('updateInventory', mo, ($event.target as HTMLInputElement).checked)"
            >
          </label>

          <label class="flex flex-col items-center justify-center bg-yellow-50 p-3 rounded-2xl border-2 border-yellow-300 cursor-pointer hover:bg-yellow-100 transition-colors col-span-2">
            <div class="flex items-center gap-3 w-full justify-center mb-1">
              <span class="text-3xl">🏅</span>
              <span class="font-black text-yellow-900 text-md uppercase">Liga Pokémon</span>
              <input
                type="checkbox"
                :checked="props.playerInventory['Medallas']"
                class="w-6 h-6 accent-yellow-600"
                @change="emit('updateInventory', 'Medallas', ($event.target as HTMLInputElement).checked)"
              >
            </div>
          </label>
        </div>
      </div>
      <div class="p-4 bg-gray-100 border-t-2 border-gray-200">
        <button
          class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 rounded-xl text-lg shadow-md active:scale-95 transition-transform"
          @click="emit('close')"
        >
          Cerrar Equipo
        </button>
      </div>
    </div>
  </div>
</template>
