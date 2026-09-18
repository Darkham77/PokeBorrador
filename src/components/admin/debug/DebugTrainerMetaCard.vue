<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

interface Props {
  isRocketClass: boolean
  availableSpriteList: Array<{ id: string; label: string }>
}

defineProps<Props>()

const trainerName = defineModel<string>('trainerName', { required: true })
const trainerSprite = defineModel<string>('trainerSprite', { required: true })
const criminality = defineModel<number>('criminality', { required: true })

const emit = defineEmits<{
  (e: 'randomizeTrainer'): void
  (e: 'randomizeName'): void
  (e: 'randomizeSprite'): void
  (e: 'loadPolice'): void
}>()
</script>

<template>
  <div class="debug-card">
    <div class="section-header-row flex-between">
      <label>DATOS DEL ENTRENADOR</label>
      <button 
        class="btn-vicio-secondary sm"
        @click.stop="emit('randomizeTrainer')"
      >
        <span class="emoji">🎲</span> ALEATORIO
      </button>
    </div>
    
    <div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
      <div class="trainer-sprite-preview">
        <img 
          :src="getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite)" 
          :alt="trainerName || 'Entrenador'"
          class="trainer-sprite-img"
          @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
        >
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
        <div class="input-group vertical">
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <span
              class="field-label"
              style="margin-bottom: 0;"
            >Nombre del Entrenador</span>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="emit('randomizeName')"
            >
              <span class="emoji">🎲</span>
            </button>
          </div>
          <input 
            id="debug-input-trainer-name"
            v-model="trainerName" 
            type="text" 
            placeholder="Nombre..."
          >
        </div>

        <div class="input-group vertical">
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <span
              class="field-label"
              style="margin-bottom: 0;"
            >Sprite del Entrenador</span>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="emit('randomizeSprite')"
            >
              <span class="emoji">🎲</span>
            </button>
          </div>
          <select v-model="trainerSprite">
            <option 
              v-for="s in availableSpriteList" 
              :key="s.id" 
              :value="s.id"
            >
              {{ s.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div
      class="input-group vertical"
      style="margin-top: 12px;"
    >
      <div class="label-row flex-between">
        <span class="field-label">Criminalidad (Team Rocket)</span>
        <span class="crime-pct danger-text">{{ criminality }}%</span>
      </div>
      <div
        v-if="isRocketClass"
        class="crime-sim-slider-row"
      >
        <input 
          v-model.number="criminality" 
          type="range" 
          min="0" 
          max="100"
          class="slider-crime"
        >
      </div>
      <div
        v-else
        class="crime-info-fallback"
      >
        <span>Requiere clase TEAM ROCKET activa para testear criminalidad.</span>
      </div>
    </div>

    <div
      class="button-row"
      style="margin-top: 12px;"
    >
      <button 
        class="btn-vicio-secondary sm"
        style="background: rgba(59, 139, 255, 0.15); border-color: rgba(59, 139, 255, 0.3); color: #5ea2ff;"
        @click.stop="emit('loadPolice')"
      >
        <span class="emoji">🚨</span> CARGAR OFICIAL DE POLICÍA
      </button>
    </div>
  </div>
</template>

<style src="./DebugTrainersTab.styles.scss" scoped lang="scss"></style>
