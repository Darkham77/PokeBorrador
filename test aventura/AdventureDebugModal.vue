<script setup lang="ts">
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'unlockAll'): void
  (e: 'giveAllMOs'): void
  (e: 'triggerSwarm'): void
  (e: 'hardReset'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div
    class="fixed inset-0 z-[350] bg-black/80 backdrop-blur-md flex items-center justify-center transition-opacity duration-300"
    :class="[props.show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
  >
    <div
      class="bg-gray-900 rounded-3xl w-11/12 max-w-sm overflow-hidden shadow-2xl border-4 border-purple-500 transition-transform duration-300"
      :class="[props.show ? 'scale-100' : 'scale-90']"
    >
      <div class="bg-gradient-to-b from-purple-500 to-purple-700 text-white p-4 text-center font-black text-xl shadow-inner border-b-2 border-purple-800">
        🐛 MENÚ DE DESARROLLO
      </div>
      <div class="p-5 space-y-3 text-white">
        <p class="text-xs text-gray-400 text-center font-bold uppercase mb-4">
          Herramientas de Testeo
        </p>

        <button
          class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
          @click="emit('unlockAll')"
        >
          <span class="text-2xl">🗺️</span> Descubrir todo Kanto
        </button>
        <button
          class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
          @click="emit('giveAllMOs')"
        >
          <span class="text-2xl">🎒</span> Obtener todas las MOs
        </button>
        <button
          class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
          @click="emit('triggerSwarm')"
        >
          <span class="text-2xl">🔴</span> Forzar Enjambre
        </button>
        <button
          class="w-full bg-red-900/50 hover:bg-red-800/80 text-red-300 p-3 rounded-xl border border-red-800 font-black flex items-center gap-3 transition-colors mt-4"
          @click="emit('hardReset')"
        >
          <span class="text-2xl">🗑️</span> BORRAR PARTIDA
        </button>
      </div>
      <div class="p-4 bg-gray-800 border-t border-gray-700">
        <button
          class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md active:scale-95 transition-transform"
          @click="emit('close')"
        >
          Cerrar Debug
        </button>
      </div>
    </div>
  </div>
</template>
