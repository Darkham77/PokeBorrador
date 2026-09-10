<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { logToInspector, updateSerializedFormData } from '../logic/useLiveInspector.ts'

const DEFAULT_RANGE_PERCENT = 75 as const
const DEFAULT_PROGRESS_PERCENT = 65 as const
const DEFAULT_METER_VALUE = 85 as const

// Grupo C: Temporales
const temporalInputs = [
  { id: 'date', label: '8. FECHA', type: 'date', tag: 'type="date"', desc: 'Día, mes y año.' },
  { id: 'datetime-local', label: '9. FECHA Y HORA', type: 'datetime-local', tag: 'datetime-local', desc: 'Hora local sin zona.' },
  { id: 'time', label: '10. HORA', type: 'time', tag: 'type="time"', desc: 'Horas y minutos.' },
  { id: 'month', label: '11. MES', type: 'month', tag: 'type="month"', desc: 'Año y mes ISO.' },
  { id: 'week', label: '12. SEMANA', type: 'week', tag: 'type="week"', desc: 'Número de semana ISO.' },
] as const

const temporalVals = ref<Record<string, string>>({
  date: '2026-09-09',
  'datetime-local': '2026-09-09T18:30',
  time: '14:45',
  month: '2026-09',
  week: '2026-W37',
})

// Grupo D: Opciones y Gráficos
const optTerms = ref(true)
const optNewsletter = ref(false)
const planTier = ref<'free' | 'pro'>('free')
const colorVal = ref('#4f46e5')
const rangeVal = ref<number>(DEFAULT_RANGE_PERCENT)

// Grupo E: Archivos y Botones
const fileName = ref('')
const hiddenToken = 'tok_987xzy412alpha'

// Extras Semánticos
const textareaVal = ref('Notas del entrenador: Equipo listo para el gimnasio de Kanto.')
const selectVal = ref('1')
const progressVal = ref<number>(DEFAULT_PROGRESS_PERCENT)
const meterVal = ref<number>(DEFAULT_METER_VALUE)

onMounted(() => {
  gsap.from('.progress-fill', {
    width: '0%',
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0.15
  })
})

function onFieldChange(name: string, val: string | number | boolean) {
  logToInspector(`Input [${name}]: ${val}`)
  syncAllData()
}

function onRangeInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  rangeVal.value = val
  logToInspector(`type="range": nuevo volumen = ${val}%`)
  syncAllData()
}

function onColorInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  colorVal.value = val
  logToInspector(`type="color": seleccionado = ${val}`)
  syncAllData()
}

function onFileUpload(e: Event) {
  const files = (e.target as HTMLInputElement).files
  fileName.value = files && files.length > 0 ? files[0]!.name : ''
  if (fileName.value) logToInspector(`type="file": seleccionado "${fileName.value}"`)
  syncAllData()
}

function onImageClick(e: MouseEvent) {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const x = Math.round(e.clientX - rect.left)
  const y = Math.round(e.clientY - rect.top)
  logToInspector(`type="image" presionado en coordenadas: (x=${x}, y=${y})`)
}

function onSubmitForm() {
  logToInspector('type="submit": Formulario enviado y serializado con éxito')
  syncAllData()
}

function onResetForm() {
  temporalVals.value.date = '2026-09-09'
  temporalVals.value['datetime-local'] = '2026-09-09T18:30'
  temporalVals.value.time = '14:45'
  temporalVals.value.month = '2026-09'
  temporalVals.value.week = '2026-W37'
  optTerms.value = true
  optNewsletter.value = false
  planTier.value = 'free'
  colorVal.value = '#4f46e5'
  rangeVal.value = DEFAULT_RANGE_PERCENT
  fileName.value = ''
  logToInspector('type="reset": Formulario restablecido a valores por defecto')
  syncAllData()
}

function syncAllData() {
  updateSerializedFormData({
    date: temporalVals.value.date,
    datetime: temporalVals.value['datetime-local'],
    time: temporalVals.value.time,
    month: temporalVals.value.month,
    week: temporalVals.value.week,
    termsAccepted: optTerms.value,
    newsletter: optNewsletter.value,
    plan: planTier.value,
    colorHex: colorVal.value,
    volumeRange: `${rangeVal.value}%`,
    file: fileName.value || '[Sin archivo]',
    csrfToken: hiddenToken,
    notes: textareaVal.value,
    strategySelect: selectVal.value,
    progressLevel: `${progressVal.value}%`,
    meterPerformance: meterVal.value
  })
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">🕹️</span>
      <span>14. Catálogo Completo de Inputs (Grupos C, D, E & Extras Semánticos)</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel html-showcase-container">
        <!-- GRUPO C: SELECTORES TEMPORALES -->
        <fieldset class="pv-frame-control pv-fieldset">
          <legend class="pv-frame-pill pv-legend">
            <span>📅</span>
            <span>GRUPO C: SELECTORES TEMPORALES NATIVOS</span>
          </legend>

          <div class="input-grid-cols-5">
            <div
              v-for="inp in temporalInputs"
              :key="inp.id"
              class="pv-input-field-block"
            >
              <div class="field-top-label">
                <span>{{ inp.label }}</span>
                <span class="type-pill-tag">{{ inp.tag }}</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="temporalVals[inp.id]"
                  :type="inp.type"
                  class="pv-input"
                  @change="onFieldChange(inp.id, temporalVals[inp.id]!)"
                >
              </div>
              <span class="field-desc">{{ inp.desc }}</span>
            </div>
          </div>
        </fieldset>

        <!-- GRUPO D: OPCIONES, GRÁFICOS Y SLIDERS -->
        <fieldset class="pv-frame-control pv-fieldset">
          <legend class="pv-frame-pill pv-legend">
            <span>🎛️</span>
            <span>GRUPO D: OPCIONES, GRÁFICOS Y DESLIZADORES</span>
          </legend>

          <div class="input-grid-cols-4">
            <!-- 13. checkbox -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>13. CHECKBOXES</span>
                <span class="type-pill-tag">type="checkbox"</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                <label class="pv-checkbox-row">
                  <input
                    v-model="optTerms"
                    type="checkbox"
                    @change="onFieldChange('optTerms', optTerms)"
                  >
                  <div class="pv-frame-pill pv-pixel-checkbox">
                    <span
                      v-if="optTerms"
                      style="font-size: 8px; color: #ffd60a;"
                    >✓</span>
                  </div>
                  <span>Acepto los términos</span>
                </label>
                <label class="pv-checkbox-row">
                  <input
                    v-model="optNewsletter"
                    type="checkbox"
                    @change="onFieldChange('optNewsletter', optNewsletter)"
                  >
                  <div class="pv-frame-pill pv-pixel-checkbox">
                    <span
                      v-if="optNewsletter"
                      style="font-size: 8px; color: #ffd60a;"
                    >✓</span>
                  </div>
                  <span>Boletín de eventos</span>
                </label>
              </div>
            </div>

            <!-- 14. radio -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>14. RADIO BUTTONS</span>
                <span class="type-pill-tag">type="radio"</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                <label class="pv-checkbox-row">
                  <input
                    v-model="planTier"
                    type="radio"
                    value="free"
                    name="plan-tier-demo"
                    @change="onFieldChange('planTier', planTier)"
                  >
                  <div class="pv-frame-pill pv-pixel-checkbox">
                    <span
                      v-if="planTier === 'free'"
                      style="font-size: 7px; color: #38bdf8;"
                    >●</span>
                  </div>
                  <span>Pase Gratuito</span>
                </label>
                <label class="pv-checkbox-row">
                  <input
                    v-model="planTier"
                    type="radio"
                    value="pro"
                    name="plan-tier-demo"
                    @change="onFieldChange('planTier', planTier)"
                  >
                  <div class="pv-frame-pill pv-pixel-checkbox">
                    <span
                      v-if="planTier === 'pro'"
                      style="font-size: 7px; color: #38bdf8;"
                    >●</span>
                  </div>
                  <span>Pase Maestro (Pro)</span>
                </label>
              </div>
            </div>

            <!-- 15. color -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>15. COLOR PICKER</span>
                <span class="type-pill-tag">type="color"</span>
              </div>
              <div class="pv-color-picker-row">
                <input
                  v-model="colorVal"
                  type="color"
                  @input="onColorInput"
                >
                <div>
                  <div
                    class="color-hex-text"
                    :style="{ color: colorVal }"
                  >
                    {{ colorVal }}
                  </div>
                  <span class="field-desc">Selector nativo RGB</span>
                </div>
              </div>
            </div>

            <!-- 16. range -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>16. RANGO (SLIDER)</span>
                <span class="type-pill-tag">type="range"</span>
              </div>
              <div class="pv-range-wrap">
                <div class="range-meta-row">
                  <span>Volumen FX:</span>
                  <span class="range-val-badge">{{ rangeVal }}%</span>
                </div>
                <input
                  v-model.number="rangeVal"
                  type="range"
                  min="0"
                  max="100"
                  @input="onRangeInput"
                >
              </div>
            </div>
          </div>
        </fieldset>

        <!-- GRUPO E: ARCHIVOS, OCULTO Y BOTONES DE ACCIÓN -->
        <fieldset class="pv-frame-control pv-fieldset">
          <legend class="pv-frame-pill pv-legend">
            <span>💾</span>
            <span>GRUPO E: ARCHIVOS, OCULTOS Y BOTONES OFICIALES</span>
          </legend>

          <div class="input-grid-cols-3">
            <!-- 17. file -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>17. SELECTOR DE ARCHIVO</span>
                <span class="type-pill-tag">type="file"</span>
              </div>
              <div class="pv-file-input-wrap">
                <input
                  type="file"
                  @change="onFileUpload"
                >
              </div>
              <span class="field-desc">Carga de avatar o guardado.</span>
            </div>

            <!-- 18. hidden -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>18. CAMPO OCULTO</span>
                <span class="type-pill-tag">type="hidden"</span>
              </div>
              <input
                type="hidden"
                :value="hiddenToken"
              >
              <div
                class="pv-frame-control"
                style="padding: 6px 8px; background: rgba(234, 179, 8, 0.1); --frame-border: #eab308;"
              >
                <div style="font-size: 7px; color: #ffd60a; font-weight: bold;">
                  Invisible en el DOM renderizado
                </div>
                <div style="font-size: 6.5px; color: #94a3b8; margin-top: 2px;">
                  CSRF: "{{ hiddenToken }}"
                </div>
              </div>
            </div>

            <!-- 19. image -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>19. BOTÓN IMAGEN</span>
                <span class="type-pill-tag">type="image"</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input
                  type="image"
                  src="/assets/sprites/crafting/tier3/pokeball.webp"
                  alt="Lanzar Pokéball"
                  style="width: 32px; height: 32px; image-rendering: pixelated; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.2) !important; padding: 2px;"
                  @click.prevent="onImageClick"
                >
                <span class="field-desc">Envía coordenadas (x,y) del clic al pulsarse.</span>
              </div>
            </div>
          </div>

          <!-- BOTONES NATIVOS OFICIALES 20, 21, 22 -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <span style="font-size: 7.5px; font-weight: bold; color: var(--color-text-gold, #ffd60a);">
              BOTONES NATIVOS OFICIALES:
            </span>
            <input
              type="submit"
              value="20. type='submit'"
              class="pv-curve-xs pv-btn pv-btn-primary"
              style="font-size: 7.5px; padding: 6px 12px; cursor: pointer;"
              @click.prevent="onSubmitForm"
            >
            <input
              type="reset"
              value="21. type='reset'"
              class="pv-curve-xs pv-btn pv-btn-danger"
              style="font-size: 7.5px; padding: 6px 12px; cursor: pointer;"
              @click.prevent="onResetForm"
            >
            <input
              type="button"
              value="22. type='button'"
              class="pv-curve-xs pv-btn pv-btn-secondary"
              style="font-size: 7.5px; padding: 6px 12px; cursor: pointer;"
              @click="logToInspector('type=\'button\' presionado')"
            >
          </div>
        </fieldset>

        <!-- CONTROLES ADICIONALES (NO <input>) -->
        <fieldset class="pv-frame-control pv-fieldset">
          <legend class="pv-frame-pill pv-legend">
            <span>⚙️</span>
            <span>CONTROLES ADICIONALES: TEXTAREA, SELECT, PROGRESS & METER</span>
          </legend>

          <div class="input-grid-cols-4">
            <!-- Textarea -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>&lt;textarea&gt;</span>
                <span class="type-pill-tag">multilínea</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <textarea
                  v-model="textareaVal"
                  rows="2"
                  class="pv-input"
                  style="resize: vertical;"
                  @input="onFieldChange('textarea', textareaVal)"
                />
              </div>
            </div>

            <!-- Select -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>&lt;select&gt;</span>
                <span class="type-pill-tag">&lt;option&gt;</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <select
                  v-model="selectVal"
                  class="pv-input pv-select"
                  @change="onFieldChange('select', selectVal)"
                >
                  <option value="1">
                    Estrategia Ofensiva (Atq. Esp.)
                  </option>
                  <option value="2">
                    Estrategia Defensiva (Muralla)
                  </option>
                  <option value="3">
                    Estrategia Velocidad (Sweeper)
                  </option>
                </select>
              </div>
            </div>

            <!-- Progress -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>&lt;progress&gt; (65%)</span>
                <span class="type-pill-tag">progreso</span>
              </div>
              <div class="pv-progress-bar pv-frame-control">
                <div
                  class="progress-fill"
                  :style="{ width: `${progressVal}%` }"
                />
              </div>
              <span class="field-desc">Barra de progreso HTML5 nativa.</span>
            </div>

            <!-- Meter -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>&lt;meter&gt; (85/100)</span>
                <span class="type-pill-tag">medición</span>
              </div>
              <div
                class="pv-progress-bar pv-frame-control"
                style="--frame-border: #a855f7;"
              >
                <div
                  class="progress-fill"
                  :style="{ width: `${meterVal}%`, background: 'linear-gradient(90deg, #a855f7 0%, #c084fc 100%)' }"
                />
              </div>
              <span class="field-desc">Medición óptima de rendimiento.</span>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}
</style>
