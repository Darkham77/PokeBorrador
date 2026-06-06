<script setup lang="ts">
import { computed } from 'vue'
import type { ShopItem } from '@/types/items'

const props = defineProps<{
  show: boolean
  hasBicycle: boolean
  filteredBuffItems: ShopItem[]
  selectedTravelItems: Set<string>
  inventory: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'toggleItem', itemId: string): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const activeTravelModifiers = computed(() => {
  const items = props.selectedTravelItems
  let encounterRateMod = 0
  let expMultiplier = 1.0
  let moneyMultiplier = 1.0
  let shinyChanceMod = 1.0
  let typeFocus: string | null = null

  if (items.has('repel')) encounterRateMod = -50
  else if (items.has('super_repel')) encounterRateMod = -80
  else if (items.has('max_repel')) encounterRateMod = -100

  if (items.has('lucky_egg')) expMultiplier = 1.5
  if (items.has('amulet_coin')) moneyMultiplier = 2.0
  if (items.has('ticket_shiny')) shinyChanceMod = 2.0

  if (items.has('incense_fire')) typeFocus = 'fire'
  else if (items.has('incense_water')) typeFocus = 'water'
  else if (items.has('incense_grass')) typeFocus = 'grass'
  else if (items.has('incense_normal')) typeFocus = 'normal'
  else if (items.has('incense_ghost')) typeFocus = 'ghost'
  else if (items.has('incense_psychic')) typeFocus = 'psychic'

  return {
    encounterRateMod,
    expMultiplier,
    moneyMultiplier,
    shinyChanceMod,
    typeFocus
  }
})

// Transition hooks
const { gsap } = await import('gsap')
const onModalEnter = (el: Element, done: () => void) => {
  gsap.fromTo(
    el.querySelector('.adv-event-modal-card'),
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.5)', onComplete: done }
  )
}

const onModalLeave = (el: Element, done: () => void) => {
  gsap.to(
    el.querySelector('.adv-event-modal-card'),
    { scale: 0.8, opacity: 0, duration: 0.2, ease: 'power1.in', onComplete: done }
  )
}
</script>

<template>
  <Transition
    :css="false"
    @enter="onModalEnter"
    @leave="onModalLeave"
  >
    <div
      v-if="show"
      class="adv-event-modal-backdrop"
    >
      <div
        class="adv-event-modal-card pre-travel-modal-card"
        style="max-width: 600px; width: 90%; display: flex; flex-direction: column; gap: 12px; max-height: 90vh;"
      >
        <h3
          class="adv-pixel-text adv-event-title"
          style="margin: 0; text-align: center; font-size: 12px;"
        >
          🚲 Preparando Viaje
        </h3>
        
        <div style="display: flex; gap: 12px; overflow: hidden; flex: 1;">
          <!-- Left Column: Active Buffs Preview -->
          <div style="flex: 1; background: rgba(0,0,0,0.3); border: 2px solid #3c5aa6; padding: 10px; border-radius: 4px; display: flex; flex-direction: column; gap: 8px;">
            <h4
              class="adv-pixel-text"
              style="font-size: 8px; margin: 0 0 4px 0; color: #ffcb05; border-bottom: 1px solid #3c5aa6; padding-bottom: 4px;"
            >
              Buffs de Ruta Activos
            </h4>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 8px; font-family: 'Press Start 2P', monospace; line-height: 1.4;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>🚲 Velocidad:</span>
                <span :style="{ color: hasBicycle ? '#4caf50' : '#888' }">
                  {{ hasBicycle ? 'Rápido' : 'Normal' }}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>🚫 Encuentros:</span>
                <span :style="{ color: activeTravelModifiers.encounterRateMod < 0 ? '#ff9800' : '#fff' }">
                  {{ activeTravelModifiers.encounterRateMod === -100 ? 'Ninguno' : (activeTravelModifiers.encounterRateMod < 0 ? activeTravelModifiers.encounterRateMod + '%' : 'Estándar') }}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>🧠 Exp. Combate:</span>
                <span :style="{ color: activeTravelModifiers.expMultiplier > 1 ? '#4caf50' : '#fff' }">
                  x{{ activeTravelModifiers.expMultiplier.toFixed(1) }}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>💰 Recompensas:</span>
                <span :style="{ color: activeTravelModifiers.moneyMultiplier > 1 ? '#4caf50' : '#fff' }">
                  x{{ activeTravelModifiers.moneyMultiplier.toFixed(1) }}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>✨ Chance Shiny:</span>
                <span :style="{ color: activeTravelModifiers.shinyChanceMod > 1 ? '#e91e63' : '#fff' }">
                  x{{ activeTravelModifiers.shinyChanceMod.toFixed(1) }}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>🔥 Tipo Foco:</span>
                <span :style="{ color: activeTravelModifiers.typeFocus ? '#00bcd4' : '#fff' }">
                  {{ activeTravelModifiers.typeFocus ? activeTravelModifiers.typeFocus.toUpperCase() : 'Ninguno' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Column: Selectable Buff Consumibles -->
          <div style="flex: 1.2; display: flex; flex-direction: column; gap: 6px;">
            <h4
              class="adv-pixel-text"
              style="font-size: 8px; margin: 0; color: #ffcb05;"
            >
              Seleccionar Consumibles
            </h4>
            <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 4px; max-height: 180px; padding-right: 4px;">
              <div 
                v-for="item in filteredBuffItems" 
                :key="item.id" 
                class="adv-toggle-control" 
                style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 0;"
                @click="emit('toggleItem', item.id)"
              >
                <input 
                  type="checkbox" 
                  :checked="selectedTravelItems.has(item.id)" 
                  style="margin: 0; pointer-events: none;"
                >
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 8px; font-family: 'Press Start 2P', monospace;">
                  <span>{{ item.icon }} {{ item.name }}</span>
                  <span style="color: #ffcb05;">x{{ inventory?.[item.id] || 0 }}</span>
                </div>
              </div>
              <div
                v-if="filteredBuffItems.length === 0"
                style="font-size: 8px; font-family: 'Press Start 2P', monospace; color: #888; text-align: center; margin-top: 20px;"
              >
                No tienes consumibles de buffs en tu mochila. ¡Inyéctalos en el panel lateral para probar!
              </div>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; flex-shrink: 0;">
          <button
            class="adv-btn-danger"
            style="padding: 6px 12px; font-family: 'Press Start 2P', monospace; font-size: 8px; min-width: auto; height: auto;"
            @click="emit('cancel')"
          >
            Cancelar
          </button>
          <button
            class="adv-btn-primary"
            style="padding: 6px 12px; font-family: 'Press Start 2P', monospace; font-size: 8px; min-width: auto; height: auto;"
            @click="emit('confirm')"
          >
            Confirmar y Partir 🚲
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
