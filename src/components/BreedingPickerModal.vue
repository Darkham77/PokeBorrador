<script setup lang="ts">
/**
 * BreedingPickerModal
 * Standardized modal for selecting parents in daycare.
 */
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { COMPAT_TEXT } from '@/logic/breeding/breedingData'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

interface Props {
  show?: boolean
  mode?: string
  slotIdx?: number
  missionIdx?: number
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  mode: 'daycare',
  slotIdx: 0,
  missionIdx: -1
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore() as any
const breedingStore = useBreedingStore() as any

const searchQuery = ref('')

const allPokemon = computed(() => {
  const team = gameStore.state.team || []
  const box = gameStore.state.box || []
  // Filter out pokemon already in daycare
  return [...team, ...box].filter(p => !breedingStore.daycareSlots.some((s: any) => s.pokemon_id === p.uid))
})

const filteredPokemon = computed(() => {
  let list = allPokemon.value
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }

  // If in mission mode, filter by mission requirement
  if (props.mode === 'mission' && props.missionIdx !== -1) {
    const m = gameStore.state.daycare_missions[props.missionIdx]
    const targetId = m.targetId
    list = list.filter(p => {
      // Basic evolution check (breedingBaseId logic would be better if available globally)
      const baseId = p.id // simplified for now
      if (baseId !== targetId) return false
      
      const req = m.requirement || { type: 'level', minLevel: m.minLevel }
      if (req.type === 'level') return p.level >= req.minLevel
      if (req.type === 'iv_total') {
        const total = (p.ivs.hp || 0) + (p.ivs.atk || 0) + (p.ivs.def || 0) + (p.ivs.spa || 0) + (p.ivs.spd || 0) + (p.ivs.spe || 0)
        return total >= req.minIvTotal
      }
      if (req.type === 'nature') return p.nature === req.nature
      if (req.type === 'iv_31') return p.ivs[req.stat31] === 31
      return true
    })
  }

  return list
})

const selectPokemon = (p: any) => {
  if (props.mode === 'daycare') {
    breedingStore.depositPokemon(p, props.slotIdx)
  } else {
    // Mission delivery logic handled in store eventually
    breedingStore.deliverMission(props.missionIdx, p.uid)
  }
  emit('close')
}

const getListCompatibility = (p: any) => {
  if (props.mode !== 'daycare') return null
  const otherSlotIdx = props.slotIdx === 1 ? 2 : 1
  const otherSlot = breedingStore.daycareSlots.find((s: any) => s.slot_index === otherSlotIdx)
  const otherPoke = otherSlot?.pokemon
  if (!otherPoke) return null
  return checkCompatibility(p, otherPoke)
}

const getSprite = (id: string, shiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny })
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="mode === 'daycare' ? `SLOT ${slotIdx + 1}` : 'MISIÓN GUARDERÍA'"
    title-color="var(--purple-light)"
    header-background="#1a1c2e"
    max-width="500px"
    variant="retro"
    padding="raw"
    @close="emit('close')"
  >
    <div class="picker-content">
      <div class="picker-search">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            placeholder="Buscar por nombre..."
          >
        </div>
      </div>

      <div class="pokemon-grid custom-scrollbar-vicio">
        <div 
          v-for="p in filteredPokemon" 
          :key="p.uid" 
          class="poke-card-vicio"
          @click.stop="selectPokemon(p)"
        >
          <template
            v-for="compatibility in [getListCompatibility(p)]"
            :key="p.uid + '-compat'"
          >
            <div class="sprite-box">
              <img
                :src="getSprite(p.id, p.isShiny)"
                class="poke-sprite"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              >
            </div>
            <div class="poke-info">
              <div class="top-row">
                <span class="name">{{ p.name }}</span>
                <span class="lv">Nv.{{ p.level }}</span>
              </div>
              <div class="genetics">
                IVs: {{ p.ivs.hp }}/{{ p.ivs.atk }}/{{ p.ivs.def }}/{{ p.ivs.spa }}/{{ p.ivs.spd }}/{{ p.ivs.spe }}
              </div>
              
              <div
                v-if="mode === 'daycare'"
                class="compat-status"
              >
                <template v-if="compatibility">
                  <span :style="{ color: (COMPAT_TEXT as any)[compatibility.level].color }">
                    {{ (COMPAT_TEXT as any)[compatibility.level].label }}
                  </span>
                  <span
                    v-if="compatibility.eggSpecies"
                    class="egg-hint"
                  >
                    🥚 {{ compatibility.eggSpecies }}
                  </span>
                </template>
                <template v-else>
                  <span class="waiting-status">Sin pareja</span>
                </template>
              </div>
            </div>
          </template>
          <div
            v-if="p.vigor !== undefined"
            class="vigor-badge"
            :class="{ low: p.vigor <= 2 }"
          >
            ⚡ {{ p.vigor }}
          </div>
        </div>
        
        <div
          v-if="filteredPokemon.length === 0"
          class="empty-state"
        >
          <div class="empty-icon">
            📭
          </div>
          <p>No hay Pokémon disponibles</p>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="btn-vicio-secondary btn-vicio-full"
        @click.stop="emit('close')"
      >
        CANCELAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.picker-content {
  display: flex;
  flex-direction: column;
  height: 500px;
  max-height: 70dvh;
}

.picker-search {
  padding: 16px 20px;
  background: Rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 14px;
      opacity: 0.5;
    }
    
    input {
      width: 100%;
      background: Rgba(255, 255, 255, 0.03);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      padding: 12px 12px 12px 40px;
      border-radius: 12px;
      color: $white;
      font-size: 12px;
      @include pixelated;
      outline: none;
      transition: all 0.2s;
      @include pixelated;
      
      &:focus {
        border-color: var(--yellow);
        background: Rgba(255, 255, 255, 0.05);
      }
    }
  }
}

.pokemon-grid {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  @include smooth-scroll;
}

.poke-card-vicio {
  @include pokemon-list-item-standard(12px);
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;

  &:hover {
    .name { color: var(--yellow); }
  }
}

.sprite-box {
  width: 48px;
  height: 48px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poke-sprite {
  width: 40px;
  height: 40px;
  @include sprite-render;
}

.poke-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .name {
    @include pixelated;
    font-size: 10px;
    color: $white;
    transition: color 0.2s;
    @include pixelated;
  }
  
  .lv {
    font-size: 9px;
    color: var(--gray);
    @include pixelated;
    @include pixelated;
  }
}

.genetics {
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.4);
  font-family: monospace;
}

.compat-status {
  font-size: 8px;
  @include pixelated;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  @include pixelated;
}

.waiting-status { color: Rgba(255, 255, 255, 0.2); }
.egg-hint { color: var(--purple-light); }

.vigor-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 7px;
  @include pixelated;
  padding: 4px 6px;
  border-radius: 4px;
  background: Rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid Rgba(34, 197, 94, 0.2);
  @include pixelated;

  &.low {
    background: Rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: Rgba(239, 68, 68, 0.2);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  
  .empty-icon { font-size: 32px; margin-bottom: 16px; opacity: 0.3; }
  p { @include pixelated; font-size: 8px; color: Rgba(255, 255, 255, 0.2); @include pixelated; }
}
</style>
