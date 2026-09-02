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
    v-if="props.show"
    class="adv-modal-overlay"
  >
    <div class="adv-modal-card border-purple">
      <div class="adv-modal-header bg-gradient-to-b from-purple-500 to-purple-700">
        <span class="icon">🐛</span> MENÚ DE DESARROLLO
      </div>
      <div class="p-5 space-y-3 text-white">
        <p class="text-xs text-gray-400 text-center font-bold uppercase mb-4">
          Herramientas de Testeo
        </p>

        <button
          class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
          @click="emit('unlockAll')"
        >
          <span class="icon text-2xl">🗺️</span> Descubrir todo Kanto
        </button>
        <button
          class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
          @click="emit('giveAllMOs')"
        >
          <span class="icon text-2xl">🎒</span> Obtener todas las MOs
        </button>
        <button
          class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
          @click="emit('triggerSwarm')"
        >
          <span class="icon text-2xl">🔴</span> Forzar Enjambre
        </button>
        <button
          class="w-full bg-red-900/50 hover:bg-red-800/80 text-red-300 p-3 rounded-xl border border-red-800 font-black flex items-center gap-3 transition-colors mt-4"
          @click="emit('hardReset')"
        >
          <span class="icon text-2xl">🗑️</span> REINICIAR UBICACIÓN
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
  background: #0f172a;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px Rgba(0, 0, 0, 0.5);
  border: 2px solid #334155;

  &.border-purple {
    border-color: #9333ea;
  }
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
</style>
