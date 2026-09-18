<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { getItemById } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getNatureInfo } from '@/data/battle/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import PVTooltip from '@/components/common/PVTooltip.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BoxPokemonMenuHeader from './BoxPokemonMenuHeader.vue'
import BoxPokemonMenuSummary from './BoxPokemonMenuSummary.vue'
import { getFieldPassiveBadges } from '@/logic/pokemon/pokemonFieldAbilities'
import { useModalStore } from '@/stores/modals'
import { calculateTotalPower, getPokemonTier, calculateRocketSellPrice as calculatePrice } from '@/logic/pokemon/pokemonUtils'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import { isPokemonBusy } from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'

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
interface EnrichedTeamMember {
  pokemon: Pokemon
  index: number
  tier: ReturnType<typeof getPokemonTier>
  isPremiumTier: boolean
  isDisabled: boolean
  fieldPassive: ReturnType<typeof getFieldPassiveBadges>
  spriteUrl: string
}

const team = computed(() => (gameStore.state.team || []))
const totalPower = computed(() => pokemon.value ? calculateTotalPower(pokemon.value) : 0)
const tierInfo = computed(() => pokemon.value ? getPokemonTier(pokemon.value) : null)
const fieldPassive = computed(() => pokemon.value ? getFieldPassiveBadges(pokemon.value) : null)
const isRocketMode = computed(() => gameStore.state.playerClass === 'rocket')

const totalIvs = computed(() => {
  if (!pokemon.value?.ivs) return 0
  return Object.values(pokemon.value.ivs).reduce((sum, val) => sum + (Number(val) || 0), 0)
})

const pokemonSpriteUrl = computed(() => {
  if (!pokemon.value) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, pokemon.value.id, { isShiny: pokemon.value.isShiny })
})

const busyInfo = computed(() => {
  const p = pokemon.value
  if (!p || !isPokemonBusy(p)) return null
  if (p.inDaycare) return { icon: '🥚', label: 'Guardería' }
  if (p.onMission) return { icon: '🧭', label: 'Misión' }
  if (p.onEvent) return { icon: '🏆', label: 'Evento' }
  return { icon: '🛡️', label: 'Defensa' }
})

const enrichedTeam = computed<EnrichedTeamMember[]>(() => {
  const busyCurrent = isPokemonBusy(pokemon.value)
  return team.value.map((t, index) => {
    const tier = getPokemonTier(t)
    return {
      pokemon: t,
      index,
      tier,
      isPremiumTier: tier.tier === 'S' || tier.tier === 'S+',
      isDisabled: busyCurrent || isPokemonBusy(t),
      fieldPassive: getFieldPassiveBadges(t),
      spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, t.id, { isShiny: t.isShiny })
    }
  })
})

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
    const itemData = getItemById(unequipped)
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
      <BoxPokemonMenuHeader
        :pokemon="pokemon"
        :tier-info="tierInfo"
        :total-ivs="totalIvs"
        :total-power="totalPower"
        :field-passive="fieldPassive"
      />

      <!-- Pokémon Summary (Sprite & Types) -->
      <BoxPokemonMenuSummary
        :pokemon="pokemon"
        :tier-info="tierInfo"
        :pokemon-sprite-url="pokemonSpriteUrl"
        :pokemon-types="pokemonTypes"
        :nature-data="natureData"
        :ability-data="abilityData"
        @detail="handleDetail"
      />

      <!-- Warning label for busy Pokémon -->
      <div 
        v-if="busyInfo" 
        class="busy-warning-banner"
      >
        <span class="emoji warning-icon">⚠️</span>
        <span class="warning-text">
          Este Pokémon está ocupado (<span class="emoji">{{ busyInfo.icon }}</span> {{ busyInfo.label }}). 
          Las acciones de equipo, venta y liberación están bloqueadas.
        </span>
      </div>

      <!-- Action Grid -->
      <div class="box-action-grid">
        <button 
          v-if="team.length < 6" 
          class="menu-action-btn success-btn" 
          :disabled="isPokemonBusy(pokemon)"
          @click.stop="handleMoveToTeam"
        >
          <span class="emoji">➕</span> AGREGAR AL EQUIPO
        </button>

        <!-- Swap Section -->
        <div class="swap-section">
          <h4 class="section-title">
            INTERCAMBIAR POR
          </h4>
          <div class="team-swap-grid">
            <div
              v-for="m in enrichedTeam"
              :key="m.pokemon.uid"
              class="team-swap-card"
              :class="{ 
                'is-premium-tier': m.isPremiumTier,
                'is-disabled': m.isDisabled
              }"
              :style="{ '--tier-color': m.tier.color }"
              @click.stop="!m.isDisabled && handleSwap(m.index)"
            >
              <!-- Tier Badge (Top Left) -->
              <div 
                class="slot-rank m-badge-tier" 
                :style="{ '--tier-color': m.tier.color, '--tier-bg': m.tier.bg }"
              >
                {{ m.tier.tier }}
              </div>

              <!-- Status Indicators (Top Right) -->
              <div class="slot-status-indicators">
                <FriendshipSealBadge
                  :friendship="m.pokemon.friendship"
                  size="sm"
                />
                <PVTooltip
                  v-if="m.fieldPassive"
                  :title="`HABILIDAD: ${m.fieldPassive.label.toUpperCase()}`"
                  :description="m.fieldPassive.desc"
                  position="top"
                >
                  <span class="status-indicator field-passive">
                    <span class="emoji">{{ m.fieldPassive.icon }}</span>
                  </span>
                </PVTooltip>
              </div>
              
              <span class="ts-name">{{ m.pokemon.nickname || m.pokemon.name }}</span>
              
              <PokemonTypePills 
                :pokemon="m.pokemon" 
                size="ssm"
                class="ts-types"
              />

              <!-- Sprite (Center) -->
              <div class="ts-sprite-box">
                <PVSpriteFX
                  :is-shiny="m.pokemon.isShiny"
                  :is-guardian="m.pokemon.isGuardian"
                >
                  <img
                    :src="m.spriteUrl"
                    :alt="m.pokemon.name || 'Pokémon'"
                    class="ts-sprite"
                    @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
                  >
                </PVSpriteFX>
              </div>

              <!-- Tags (Bottom) -->
              <div class="slot-tags">
                <UnifiedBadgePill 
                  :pokemon="m.pokemon" 
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
          <span class="emoji">🎒</span> USAR OBJETO
        </button>
        <button
          class="menu-action-btn danger-btn"
          :disabled="!pokemon?.heldItem"
          @click.stop="handleUnequipItem"
        >
          <span class="emoji">❌</span> QUITAR OBJETO
        </button>
        <button
          class="menu-action-btn"
          @click.stop="handleMoveToBox"
        >
          <span class="emoji">📦</span> MOVER CAJA
        </button>
        <button
          class="menu-action-btn secondary-btn full-width"
          :disabled="isPokemonBusy(pokemon)"
          @click.stop="handleRelease"
        >
          <span class="emoji">⚡</span> LIBERAR
        </button>
        <button
          v-if="isRocketMode"
          class="menu-action-btn danger-btn full-width"
          :disabled="isPokemonBusy(pokemon)"
          @click.stop="handleSellRocket"
        >
          <span class="emoji">💀</span> VENDER MERCADO NEGRO
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
