<script setup lang="ts">
import AdventureModal from './AdventureModal.vue';
import { useMapLensStore } from '../../stores/mapLens.ts';
import { MAP_LENSES } from '../../types/map/mapLenses.ts';

const props = defineProps<{
  show: boolean;
}>();

const mapLensStore = useMapLensStore();

const emit = defineEmits<{
  (e: 'unlockAll'): void;
  (e: 'giveAllMOs'): void;
  (e: 'triggerSwarm'): void;
  (e: 'hardReset'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <AdventureModal
    :show="props.show"
    title="🐛 MENÚ DE DESARROLLO"
    card-variant="purple"
    header-class="bg-gradient-to-b from-purple-500 to-purple-700"
    @close="emit('close')"
  >
    <div class="p-5 space-y-3 text-white">
      <p class="text-xs text-gray-400 text-center font-bold uppercase mb-4">
        Herramientas de Testeo
      </p>

      <div class="space-y-1 pb-2 border-b border-gray-700">
        <span class="block text-[10px] text-gray-400 font-bold uppercase">Capa / Lente Activa</span>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="lens in MAP_LENSES"
            id="adventure-debug-modal-btn-lens"
            :key="lens"
            type="button"
            class="p-2 text-xs font-bold rounded-lg border text-center transition-colors"
            :class="
              mapLensStore.activeLens === lens
                ? 'bg-purple-600 border-purple-400 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
            "
            @click="mapLensStore.setLens(lens)"
          >
            {{ lens }}
          </button>
        </div>
      </div>

      <button
        id="adventure-debug-modal-btn-descubrir-todo-kanto"
        class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
        @click="emit('unlockAll')"
      >
        <span class="text-2xl">🗺️</span> Descubrir todo Kanto
      </button>
      <button
        id="adventure-debug-modal-btn-obtener-todas-las-mos"
        class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
        @click="emit('giveAllMOs')"
      >
        <span class="text-2xl">🎒</span> Obtener todas las MOs
      </button>
      <button
        id="adventure-debug-modal-btn-forzar-enjambre"
        class="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl border border-gray-600 font-bold flex items-center gap-3 transition-colors"
        @click="emit('triggerSwarm')"
      >
        <span class="text-2xl">🔴</span> Forzar Enjambre
      </button>
      <button
        id="adventure-debug-modal-btn-borrar-partida"
        class="w-full bg-red-900/50 hover:bg-red-800/80 text-red-300 p-3 rounded-xl border border-red-800 font-black flex items-center gap-3 transition-colors mt-4"
        @click="emit('hardReset')"
      >
        <span class="text-2xl">🗑️</span> BORRAR PARTIDA
      </button>
    </div>
    <div class="p-4 bg-gray-800 border-t border-gray-700">
      <button
        id="adventure-debug-modal-btn-cerrar-debug"
        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md active:scale-95 transition-transform"
        @click="emit('close')"
      >
        Cerrar Debug
      </button>
    </div>
  </AdventureModal>
</template>

<style lang="scss" src="../../styles/modals.scss"></style>
