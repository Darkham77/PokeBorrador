<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { SHOP_ITEMS } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getNatureInfo } from '@/data/battle/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import PVTooltip from '@/components/common/PVTooltip.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { useModalStore } from '@/stores/modals'
import { calculateTotalPower, getPokemonTier, calculateRocketSellPrice as calculatePrice } from '@/logic/pokemon/pokemonUtils'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { toPokemonType, type PokemonType } from '@/data/battle/types'

interface Props {
  show?: boolean
  boxIndex: number
}

const props = withDefaults(defineProps<Props>(), {
  show: true
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()
const boxStore = useBoxStore()

const pokemon = computed(() => (gameStore.state.box[props.boxIndex] || null))
const natureData = computed(() => {
  const nat = pokemon.value?.nature
  return nat ? getNatureInfo(nat) : null
})
const pokemonTypes = computed<PokemonType[]>(() => {
  const p = pokemon.value
  if (!p) return []
  const types: PokemonType[] = [toPokemonType(p.type)]
  if (p.type2) types.push(toPokemonType(p.type2))
  return types
})
const team = computed(() => (gameStore.state.team || []))
const totalPower = computed(() => pokemon.value ? calculateTotalPower(pokemon.value) : 0)
const tierInfo = computed(() => pokemon.value ? getPokemonTier(pokemon.value) : null)
const isRocketMode = computed(() => gameStore.state.playerClass === 'rocket')

const abilityData = computed(() => {
  if (!pokemon.value || !pokemon.value.ability) return { name: '', desc: '' }
  const data = pokemonDataProvider.getAbilityData(pokemon.value.ability)
  return {
    name: data ? data.name : pokemon.value.ability,
    desc: data ? data.desc : ''
  }
})

const handleMoveToTeam = () => {
  const res = boxStore.moveBoxToTeam(props.boxIndex)
  if (res.success) {
    uiStore.notify(res.msg, '➕')
    emit('close')
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const handleSwap = (teamIndex: number) => {
  const res = boxStore.swapBoxWithTeam(props.boxIndex, teamIndex)
  if (res.success) {
    uiStore.notify(res.msg, '↔️')
    emit('close')
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const handleDetail = () => {
  if (pokemon.value) {
    uiStore.openPokemonDetail(pokemon.value, props.boxIndex, 'box')
  }
}

const handleUseItem = () => {
  // Set target context directly in uiStore and open modal via modalStore 
  // to avoid circular dependency issues with uiStore.toggleInventory
  uiStore.inventoryTarget = { context: 'box', index: props.boxIndex }
  useModalStore().open('Inventory')
}

const handleUnequipItem = () => {
  const inventoryStore = useInventoryStore()
  const unequipped = inventoryStore.unequipItem('box', props.boxIndex)
  if (unequipped) {
    const itemData = SHOP_ITEMS.find(i => i.id === unequipped || i.name === unequipped)
    const displayName = itemData ? itemData.name : unequipped.toUpperCase().replace(/_/g, ' ')
    uiStore.notify(`¡Se ha quitado el objeto: ${displayName}!`, '🎒')
  }
}

const handleMoveToBox = () => {
  useModalStore().open('BoxMove', { 
    pokemon: pokemon.value, 
    boxIndex: props.boxIndex 
  })
}

const handleRelease = () => {
  if (!pokemon.value) return
  if (pokemon.value.inDaycare) {
    uiStore.notify('No se puede liberar un Pokémon en la Guardería.', '⚠️')
    return
  }
  
  uiStore.openConfirm({
    title: '⚡ LIBERAR POKÉMON',
    message: `¿Estás seguro de que querés liberar a ${pokemon.value.name}? Esta acción es permanente.`,
    onConfirm: () => {
      boxStore.boxReleaseSelected = [props.boxIndex]
      const names = boxStore.doBoxRelease()
      uiStore.notify(`¡${names[0]} fue liberado!`, '🌿')
      emit('close')
    }
  })
}

const handleSellRocket = () => {
  if (!pokemon.value) return
  const price = calculatePrice(pokemon.value)

  uiStore.openConfirm({
    title: 'VENTA MERCADO NEGRO',
    message: `¿Estás seguro de que querés vender a ${pokemon.value.name} al Mercado Negro por ₽${price.toLocaleString()}? Esta acción es permanente.`,
    onConfirm: () => {
      boxStore.boxRocketSelected = [props.boxIndex]
      const { value } = boxStore.doBoxRocketSell()
      uiStore.notify(`¡Vendido por ₽${value.toLocaleString()}! 💀`, '🚀')
      emit('close')
    }
  })
}



</script>

<template>
  <BaseModal
    :show="show"
    variant="retro"
    max-width="500px"
    hide-header
    padding="raw"
    @close="emit('close')"
  >
    <div
      v-if="pokemon"
      class="box-menu-content"
    >
      <!-- Premium Header Section -->
      <header class="menu-header">
        <div class="header-left">
          <div
            v-if="tierInfo"
            class="m-badge-tier giant"
            :style="{ '--tier-color': tierInfo.color, '--tier-bg': tierInfo.bg }"
          >
            {{ tierInfo.tier }}
          </div>
        </div>

        <div class="header-center">
          <div class="p-name-stack">
            <h3 class="p-name">
              {{ pokemon?.nickname || pokemon?.name }}
            </h3>
            <span
              v-if="pokemon?.nickname"
              class="box-species-subtitle"
            >
              {{ pokemon?.name }}
            </span>
          </div>

          <div class="header-badges">
            <span
              v-if="pokemon?.gender"
              :class="['m-badge-gender', pokemon?.gender === 'm' ? 'male' : 'female']"
            >
              {{ pokemon?.gender === 'm' ? '♂' : '♀' }}
            </span>
            <span class="m-badge-level">Nv. {{ pokemon?.level }}</span>
            <span class="m-badge-iv">IV {{ (Object.values(pokemon?.ivs || {}) as number[]).reduce((s,v)=>s+(v||0),0) }}</span>
            <PVTooltip
              title="PODER TOTAL"
              description="Suma de estadísticas base, IVs genéticos y bonificación de EVs (4 EVs = 1 IV)."
              position="bottom"
            >
              <span class="m-badge-tot">TOT {{ totalPower }}</span>
            </PVTooltip>
          </div>
        </div>

        <!-- Spacer to balance header since BaseModal provides the close button via inheritance -->
        <div class="header-right-spacer" />
      </header>

      <!-- Pokémon Summary (Sprite & Types) -->
      <div 
        class="pokemon-summary-card" 
        :style="{ '--tier-color': tierInfo?.color }"
        @click.stop="handleDetail"
      >
        <div 
          class="sprite-box"
        >
          <PVSpriteFX
            :is-shiny="pokemon?.isShiny"
            :is-guardian="pokemon?.isGuardian"
          >
            <img
              :src="getAssetUrl(ASSET_TYPES.POKEMON, pokemon?.id, { isShiny: pokemon?.isShiny })"
              class="menu-sprite"
              @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
            >
          </PVSpriteFX>
        </div>

        <div class="summary-meta">
          <div class="box-types-row">
            <PokemonTypeTag
              v-for="t in pokemonTypes" 
              :key="t"
              :type="t"
              size="sm"
            />
          </div>

          <div class="nature-ability">
            <PVTooltip
              v-if="natureData"
              :title="natureData.name.toUpperCase()"
              :description="natureData.desc"
              position="top"
            >
              <span class="interactive-text">{{ natureData.name }}</span>
            </PVTooltip>
            <span
              v-if="natureData && pokemon?.ability"
              class="sep"
            >|</span>
            <PVTooltip
              v-if="pokemon?.ability"
              :title="abilityData.name"
              :description="abilityData.desc"
              position="top"
            >
              <span class="interactive-text">{{ abilityData.name }}</span>
            </PVTooltip>
          </div>

          <div class="tags-row">
            <UnifiedBadgePill 
              v-if="pokemon"
              :pokemon="pokemon" 
              size="md" 
              :vertical="false"
              inline
            />
          </div>
        </div>
      </div>

      <!-- Warning label for busy Pokémon -->
      <div 
        v-if="pokemon?.onMission || pokemon?.inDaycare || pokemon?.onDefense" 
        class="busy-warning-banner"
      >
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">
          Este Pokémon está ocupado ({{ pokemon.inDaycare ? '🥚 Guardería' : pokemon.onMission ? '🧭 Misión' : '🛡️ Defensa' }}). 
          Las acciones de equipo, venta y liberación están bloqueadas.
        </span>
      </div>

      <!-- Action Grid -->
      <div class="box-action-grid">
        <button 
          v-if="team.length < 6" 
          class="menu-action-btn success-btn" 
          :disabled="pokemon?.onMission || pokemon?.inDaycare || pokemon?.onDefense"
          @click.stop="handleMoveToTeam"
        >
          <span class="icon">➕</span> AGREGAR AL EQUIPO
        </button>

        <!-- Swap Section -->
        <div class="swap-section">
          <h4 class="section-title">
            INTERCAMBIAR POR
          </h4>
          <div class="team-swap-grid">
            <div
              v-for="(t, i) in team"
              :key="t.uid"
              class="team-swap-card"
              :class="{ 
                'is-premium-tier': getPokemonTier(t).tier === 'S' || getPokemonTier(t).tier === 'S+',
                'is-disabled': pokemon?.onMission || pokemon?.inDaycare || pokemon?.onDefense 
              }"
              :style="{ '--tier-color': getPokemonTier(t).color }"
              @click.stop="!(pokemon?.onMission || pokemon?.inDaycare || pokemon?.onDefense) && handleSwap(i as number)"
            >
              <!-- Tier Badge (Top Left) -->
              <div 
                class="slot-rank m-badge-tier" 
                :style="{ '--tier-color': getPokemonTier(t).color, '--tier-bg': getPokemonTier(t).bg }"
              >
                {{ getPokemonTier(t).tier }}
              </div>
              
              <span class="ts-name">{{ t.nickname || t.name }}</span>
              
              <PokemonTypePills 
                :pokemon="t" 
                size="ssm"
                class="ts-types"
              />

              <!-- Sprite (Center) -->
              <div 
                class="ts-sprite-box"
              >
                <PVSpriteFX
                  :is-shiny="t.isShiny"
                  :is-guardian="t.isGuardian"
                >
                  <img
                    :src="getAssetUrl(ASSET_TYPES.POKEMON, t.id, { isShiny: t.isShiny })"
                    class="ts-sprite"
                    @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
                  >
                </PVSpriteFX>
              </div>

              <!-- Tags (Bottom) -->
              <div class="slot-tags">
                <UnifiedBadgePill 
                  :pokemon="t" 
                  size="sm" 
                  :vertical="false"
                  inline
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="footer-actions">
        <button
          class="menu-action-btn"
          @click.stop="handleUseItem"
        >
          <span class="icon">🎒</span> USAR OBJETO
        </button>
        <button
          class="menu-action-btn danger-btn"
          :disabled="!pokemon?.heldItem"
          @click.stop="handleUnequipItem"
        >
          <span class="icon">❌</span> QUITAR OBJETO
        </button>
        <button
          class="menu-action-btn"
          @click.stop="handleMoveToBox"
        >
          <span class="icon">📦</span> MOVER CAJA
        </button>
        <button
          class="menu-action-btn secondary-btn full-width"
          :disabled="pokemon?.onMission || pokemon?.inDaycare || pokemon?.onDefense"
          @click.stop="handleRelease"
        >
          <span class="icon">⚡</span> LIBERAR
        </button>
        <button
          v-if="isRocketMode"
          class="menu-action-btn danger-btn full-width"
          :disabled="pokemon?.onMission || pokemon?.inDaycare || pokemon?.onDefense"
          @click.stop="handleSellRocket"
        >
          <span class="icon">💀</span> VENDER MERCADO NEGRO
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "../../styles/components/box-menu" as *;

.busy-warning-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: Rgba(239, 68, 68, 0.08);
  border: 1px solid Rgba(239, 68, 68, 0.25);
  border-radius: 12px;
  padding: 10px 14px;
  margin: 12px 16px;
  
  .warning-icon {
    font-size: 16px;
  }
  
  .warning-text {
    font-size: 7px;
    font-family: var(--font-pixel);
    line-height: 1.5;
    color: #f87171;
  }
}
</style>
