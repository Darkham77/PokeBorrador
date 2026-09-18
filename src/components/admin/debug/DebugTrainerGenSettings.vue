<script setup lang="ts">
import { ARCHETYPE_PRESETS } from './useDebugTrainers.ts'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'

const teamSize = defineModel<number>('teamSize', { required: true })
const forceShiny = defineModel<boolean>('forceShiny', { required: true })
const guardianProb = defineModel<number>('guardianProb', { required: true })
const minLevel = defineModel<number>('minLevel', { required: true })
const maxLevel = defineModel<number>('maxLevel', { required: true })
const selectedPreset = defineModel<string>('selectedPreset', { required: true })

const emit = defineEmits<{
  (e: 'generate'): void
}>()
</script>

<template>
  <div class="debug-card">
    <label>GENERACIÓN RÁPIDA DE EQUIPO</label>

    <div class="gen-params-grid">
      <div class="input-group vertical">
        <span class="field-label">Cant. Pokes</span>
        <input 
          v-model.number="teamSize" 
          type="number" 
          min="1" 
          max="6"
        >
      </div>

      <div class="input-group vertical">
        <span class="field-label">¿Forzar Shiny?</span>
        <select v-model="forceShiny">
          <option :value="false">
            No (5% azar)
          </option>
          <option :value="true">
            Sí (100% Shiny)
          </option>
        </select>
      </div>

      <div class="input-group vertical">
        <span class="field-label">¿Forzar Guardián?</span>
        <select v-model="guardianProb">
          <option :value="0.01">
            No (1% azar)
          </option>
          <option :value="0.1">
            10% azar
          </option>
          <option :value="0.25">
            25% azar
          </option>
          <option :value="0.5">
            50% azar
          </option>
          <option :value="1">
            Sí (100% Guardián)
          </option>
        </select>
      </div>

      <div class="input-group vertical">
        <span class="field-label">Nivel Mínimo</span>
        <input
          v-model.number="minLevel"
          type="number"
          min="1"
          :max="MAX_POKEMON_LEVEL"
        >
      </div>
      <div style="flex: 1;">
        <label style="font-size: 0.75rem; color: #a78bfa;">Nivel Máx</label>
        <input
          v-model.number="maxLevel"
          type="number"
          min="1"
          :max="MAX_POKEMON_LEVEL"
        >
      </div>

      <div
        class="input-group vertical"
        style="grid-column: span 2;"
      >
        <span class="field-label">Tema / Arquetipo (Preset)</span>
        <select
          id="debug-trainer-preset-select"
          v-model="selectedPreset"
        >
          <option 
            v-for="p in ARCHETYPE_PRESETS" 
            :key="p.id" 
            :value="p.id"
          >
            {{ p.name }}
          </option>
        </select>
      </div>
    </div>

    <div
      class="button-row"
      style="margin-top: 12px;"
    >
      <button 
        id="debug-btn-gen-random-team"
        class="btn-vicio-success sm"
        style="width: 100%; height: 32px;"
        @click.stop="emit('generate')"
      >
        <span class="emoji">🎲</span> GENERAR NUEVO EQUIPO AL AZAR
      </button>
    </div>
  </div>
</template>

<style src="./DebugTrainersTab.styles.scss" scoped lang="scss"></style>
