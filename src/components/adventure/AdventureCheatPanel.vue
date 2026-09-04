<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useShopStore } from '@/stores/inventory/shop'
import { ITEMS_BY_ID, isItemId, type ItemId } from '@/data/inventory/items'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'

interface Props {
  injectedItems: Set<ItemId>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'addLog', message: string): void
  (e: 'update:injectedItems', next: Set<ItemId>): void
}>()

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const shopStore = useShopStore()

const filteredShopItems = computed(() => Object.values(ITEMS_BY_ID))

const adjustItem = (itemId: ItemId, amount: number) => {
  const nextInjected = new Set(props.injectedItems)
  if (amount > 0) {
    inventoryStore.addItem(itemId, amount)
    nextInjected.add(itemId)
    emit('update:injectedItems', nextInjected)
    emit('addLog', `🔧 Cheat: Añadido ${amount}x ${itemId} a la mochila.`)
  } else {
    const inv = gameStore.state.inventory || {}
    const currentQty = inv[itemId] || 0
    if (currentQty > 0) {
      inventoryStore.removeItem(itemId, Math.min(Math.abs(amount), currentQty))
      emit('addLog', `🔧 Cheat: Removido ${Math.abs(amount)}x ${itemId} de la mochila.`)
    }
  }
}

const MAX_INVENTORY_CLEAR_QTY = 999

const clearTestItems = () => {
  const inv = gameStore.state.inventory || {}
  props.injectedItems.forEach(itemId => {
    if (isItemId(itemId) && inv[itemId]) {
      inventoryStore.removeItem(itemId, MAX_INVENTORY_CLEAR_QTY)
    }
  })
  emit('update:injectedItems', new Set<ItemId>())
  emit('addLog', `🧹 Limpieza: Todos los ítems inyectados por el panel de pruebas han sido eliminados.`)
}

const injectTestTeam = () => {
  const currentTeam = gameStore.state.team || []
  if (currentTeam.length >= 6) {
    emit('addLog', '⚠️ El equipo ya está lleno (máx. 6 Pokémon). Remueve alguno desde el PC.')
    return
  }
  
  const pika = makePokemon('pikachu', 20)
  const abra = makePokemon('abra', 15)
  const char = makePokemon('charizard', 25)
  
  if (char) {
    char.ability = 'flamebody'
  }
  
  if (pika) gameStore.addPokemon(pika, { notify: false })
  if (abra) gameStore.addPokemon(abra, { notify: false })
  if (char) gameStore.addPokemon(char, { notify: false })
  
  emit('addLog', '🔧 Cheat: Inyectado equipo de prueba (Pikachu Nv20, Abra Nv15, Charizard Nv25 con pasiva Cuerpo Llama).')
  gameStore.save(false)
}

const healActiveTeam = () => {
  shopStore.healAllPokemon(0)
  emit('addLog', '🏥 Cheat: Todo tu equipo ha sido completamente curado.')
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
    <!-- Mi Equipo Activo -->
    <div
      class="adv-panel adv-column adv-active-team-column"
      style="display: flex; flex-direction: column; gap: 8px;"
    >
      <h3
        class="adv-pixel-text adv-column-title"
        style="margin-bottom: 2px;"
      >
        Mi Equipo Activo
      </h3>
      
      <div style="display: flex; gap: 4px; width: 100%;">
        <button 
          class="adv-hm-btn" 
          style="flex: 1; font-size: 6px; padding: 4px; font-family: var(--font-pixel);"
          @click="injectTestTeam"
        >
          <span class="emoji">🐣</span> Inyectar Equipo
        </button>
        <button 
          class="adv-hm-btn" 
          style="flex: 1; font-size: 6px; padding: 4px; font-family: var(--font-pixel);"
          @click="healActiveTeam"
        >
          <span class="emoji">🏥</span> Curar Todo
        </button>
      </div>

      <div
        class="adv-team-scroll"
        style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;"
      >
        <div 
          v-for="pkmn in gameStore.state.team" 
          :key="pkmn.uid"
          class="adv-team-pkmn-card"
          style="border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); border-radius: 6px; padding: 6px; display: flex; flex-direction: column; gap: 4px;"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px;">
            <span style="font-weight: bold; color: #ffcb05;">{{ pkmn.name }}</span>
            <span style="color: #aaa;">Nv {{ pkmn.level }}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; font-size: 6px; color: #ccc;">
              <span>HP</span>
              <span>{{ pkmn.hp }} / {{ pkmn.maxHp }}</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; border: 1px solid rgba(0,0,0,0.5);">
              <div 
                :style="{ 
                  width: `${Math.max(0, Math.min(100, (pkmn.hp / pkmn.maxHp) * 100))}%`, 
                  backgroundColor: (pkmn.hp / pkmn.maxHp) > 0.5 ? '#4caf50' : (pkmn.hp / pkmn.maxHp) > 0.2 ? '#ff9800' : '#f44336' 
                }"
                style="height: 100%;"
              />
            </div>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px;">
            <template
              v-for="(move, idx) in pkmn.moves"
              :key="move ? move.name : idx"
            >
              <div 
                v-if="move"
                style="font-size: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; display: flex; justify-content: space-between; gap: 6px; width: 100%;"
              >
                <span style="color: #dfcbb5;">{{ move.name }}</span>
                <span :style="{ color: move.pp > 0 ? '#ffcb05' : '#ef5350' }">{{ move.pp }}/{{ move.maxPP }}</span>
              </div>
            </template>
          </div>
        </div>

        <div 
          v-if="!gameStore.state.team || gameStore.state.team.length === 0"
          style="color: #888; font-size: 8px; text-align: center; padding: 12px; font-family: var(--font-pixel);"
        >
          Tu equipo está vacío. ¡Usa Inyectar Equipo!
        </div>
      </div>
    </div>

    <!-- Inyector de Mochila -->
    <div
      class="adv-panel adv-column adv-cheat-inventory-column"
      style="display: flex; flex-direction: column; gap: 8px;"
    >
      <h3
        class="adv-pixel-text adv-column-title"
        style="margin-bottom: 2px;"
      >
        Inyector de Mochila
      </h3>
      <button 
        class="adv-hm-btn" 
        style="width: 100%; font-size: 8px; padding: 4px; font-family: var(--font-pixel);"
        @click="clearTestItems"
      >
        <span class="emoji">🗑️</span> Limpiar Test Items
      </button>
      <div
        class="adv-cheat-item-scroll"
        style="max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px;"
      >
        <div
          class="adv-cheat-item-row"
          style="display: flex; align-items: center; justify-content: space-between; font-size: 8px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px;"
        >
          <span style="font-family: var(--font-pixel);"><span class="emoji">🚲</span> Bici ({{ gameStore.state.inventory?.['bicycle'] || 0 }})</span>
          <div style="display: flex; gap: 2px;">
            <button
              class="adv-hm-btn"
              style="padding: 2px 4px; min-width: auto; font-size: 8px;"
              @click="adjustItem('bicycle', 1)"
            >
              +1
            </button>
            <button
              class="adv-hm-btn"
              style="padding: 2px 4px; min-width: auto; font-size: 8px;"
              @click="adjustItem('bicycle', -1)"
            >
              -1
            </button>
          </div>
        </div>
        <div 
          v-for="item in filteredShopItems" 
          :key="item.id" 
          class="adv-cheat-item-row" 
          style="display: flex; align-items: center; justify-content: space-between; font-size: 8px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px;"
        >
          <span style="font-family: var(--font-pixel); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 120px;">
            <span class="emoji">{{ item.icon }}</span> {{ item.name }} ({{ gameStore.state.inventory?.[item.id] || 0 }})
          </span>
          <div style="display: flex; gap: 2px; flex-shrink: 0;">
            <button
              class="adv-hm-btn"
              style="padding: 2px 4px; min-width: auto; font-size: 8px;"
              @click="adjustItem(item.id, 1)"
            >
              +1
            </button>
            <button
              class="adv-hm-btn"
              style="padding: 2px 4px; min-width: auto; font-size: 8px;"
              @click="adjustItem(item.id, 10)"
            >
              +10
            </button>
            <button
              class="adv-hm-btn"
              style="padding: 2px 4px; min-width: auto; font-size: 8px;"
              @click="adjustItem(item.id, -1)"
            >
              -1
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/views/adventure/AdventureTestView.styles.scss"></style>

