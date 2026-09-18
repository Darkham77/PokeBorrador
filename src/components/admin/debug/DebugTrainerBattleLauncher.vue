<script setup lang="ts">
interface MapItem {
  id: string
  name: string
}

interface GymItem {
  id: string
  name: string
  leader: string
}

interface Props {
  allMapsList: MapItem[]
  gymList: GymItem[]
}

defineProps<Props>()

const combatLocationType = defineModel<'map' | 'gym'>('combatLocationType', { required: true })
const selectedMapId = defineModel<string>('selectedMapId', { required: true })
const selectedGymId = defineModel<string>('selectedGymId', { required: true })
const gymDifficulty = defineModel<'easy' | 'normal' | 'hard'>('gymDifficulty', { required: true })

const emit = defineEmits<{
  (e: 'startCombat'): void
}>()
</script>

<template>
  <div class="debug-card">
    <label>INICIAR COMBATE</label>

    <div class="input-group vertical">
      <span class="field-label">Tipo de Encuentro</span>
      <div
        class="button-row"
        style="width: 100%; display: flex;"
      >
        <button 
          style="flex: 1;"
          :class="{ active: combatLocationType === 'map' }"
          @click.stop="combatLocationType = 'map'"
        >
          <span class="emoji">🗺️</span> RUTA / MAPA
        </button>
        <button 
          style="flex: 1;"
          :class="{ active: combatLocationType === 'gym' }"
          @click.stop="combatLocationType = 'gym'"
        >
          <span class="emoji">🏆</span> GIMNASIO
        </button>
      </div>
    </div>

    <div
      v-if="combatLocationType === 'map'"
      class="input-group vertical"
      style="margin-top: 10px;"
    >
      <span class="field-label">Seleccionar Ruta/Mapa</span>
      <select v-model="selectedMapId">
        <option 
          v-for="m in allMapsList" 
          :key="m.id" 
          :value="m.id"
        >
          {{ m.name }}
        </option>
      </select>
    </div>

    <div
      v-else
      class="gym-fields-flex"
      style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;"
    >
      <div class="input-group vertical">
        <span class="field-label">Líder / Gimnasio</span>
        <select v-model="selectedGymId">
          <option 
            v-for="g in gymList" 
            :key="g.id" 
            :value="g.id"
          >
            {{ g.name }} ({{ g.leader }})
          </option>
        </select>
      </div>

      <div class="input-group vertical">
        <span class="field-label">Dificultad</span>
        <div
          class="button-row"
          style="width: 100%; display: flex;"
        >
          <button 
            v-for="d in (['easy', 'normal', 'hard'] as const)" 
            :key="d"
            class="sim-diff-btn"
            style="flex: 1;"
            :class="{ active: gymDifficulty === d, [d]: true }"
            @click.stop="gymDifficulty = d"
          >
            {{ d.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>

    <div
      style="margin-top: 16px;"
    >
      <button 
        class="battle-start-btn-debug"
        style="width: 100%; height: 34px; font-weight: bold;"
        @click.stop="emit('startCombat')"
      >
        <span class="emoji">⚔️</span> INICIAR COMBATE
      </button>
    </div>
  </div>
</template>

<style src="./DebugTrainersTab.styles.scss" scoped lang="scss"></style>
