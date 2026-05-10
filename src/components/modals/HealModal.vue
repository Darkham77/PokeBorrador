<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  show?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const isHealing = ref(false)
const progress = ref(0)
const healedCount = ref(0)

const cost = computed(() => shopStore.getHealCost())
const team = computed<(Pokemon | null)[]>(() => gameStore.state.team || [])

const TYPE_COLORS = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
  electric: '#F8D030',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC'
}

function getPokemonFX(p: Pokemon | null) {
  if (!p) return { typeColor: '#A8A878', isShiny: false, isLegendary: false, tierColor: '#A8A878' }
  const data = pokemonDataProvider.getPokemonData(p.id || p.name)
  const tier = getPokemonTier(p)
  const primaryType = data?.type || 'normal'
  
  return {
    typeColor: TYPE_COLORS[primaryType as keyof typeof TYPE_COLORS] || '#A8A878',
    isShiny: p.isShiny,
    isLegendary: tier.tier === 'S+' || tier.tier === 'S',
    tierColor: tier.color
  }
}

function needsHealing(p: Pokemon | null) {
  if (!p) return false
  return p.hp < p.maxHp || p.status || p.moves?.some((m) => m && m.pp < (m.maxPP || 0))
}

async function handleHeal() {
  if (cost.value === 0) {
    const damagedCount = team.value.filter((p: Pokemon | null) => p && needsHealing(p)).length
    if (damagedCount === 0) {
      uiStore.notify('Tu equipo ya está en perfectas condiciones.', '💖')
      emit('close')
      return
    }
  }

  if (cost.value > 0 && gameStore.state.money < cost.value) {
    uiStore.notify('No tenés suficiente dinero para la enfermería.', '💸')
    return
  }

  isHealing.value = true
  progress.value = 0
  healedCount.value = 0

  const tl = gsap.timeline({
    onUpdate: () => {
      // Sincronizar el conteo de curados con el progreso
      const targetCount = Math.floor((progress.value / 100) * team.value.length)
      if (targetCount > healedCount.value) {
        healedCount.value = targetCount
      }
    },
    onComplete: () => {
      const success = shopStore.healAllPokemon(cost.value)
      if (success) {
        gsap.delayedCall(0.8, () => {
          isHealing.value = false
          emit('close')
        })
      } else {
        isHealing.value = false
      }
    }
  })

  tl.to(progress, {
    value: 100,
    duration: 2.0,
    ease: 'none'
  })
}

function handleClose() {
  if (isHealing.value) return
  emit('close')
}

// ── AUTO-HEAL LOGIC ──────────────────────────────────────────────────────────
onMounted(() => {
  // If no cost, check if healing is needed
  if (cost.value === 0 && team.value.length > 0) {
    const damagedCount = team.value.filter((p: Pokemon | null) => p && needsHealing(p)).length
    if (damagedCount === 0) {
      emit('close')
      return
    }
    
    gsap.delayedCall(0.6, () => {
      handleHeal()
    })
  }

  const win = window as unknown as { showHealEffect?: (active: boolean) => void }
  win.showHealEffect = (active: boolean) => {
    if (active) {
      const modalStore = useModalStore()
      modalStore.open('HealOverlay')
      gsap.delayedCall(0.1, handleHeal)
    }
  }
})

onUnmounted(() => {
  gsap.killTweensOf(handleHeal)
})
</script>

<template>
  <BaseModal
    :show="show"
    title="🏥 CENTRO POKÉMON"
    title-color="Rgba(239, 68, 68, 1)"
    header-background="Rgba(26, 28, 46, 1)"
    max-width="360px"
    variant="retro"
    padding="raw"
    :show-close-button="false"
    :close-on-click-outside="false"
    :prevent-close="isHealing"
    @close="handleClose"
  >
    <div class="heal-modal-inner">
      <p class="subtitle">
        Servicio de Salud para Entrenadores
      </p>

      <div class="status-section">
        <div class="team-slots">
          <div 
            v-for="(p, i) in team" 
            :key="p?.uid || i" 
            class="slot"
            :class="{ 
              'active': !!p, 
              'healing': isHealing && i < healedCount,
              'is-guardian': p?.isGuardian,
              'is-premium-tier': getPokemonFX(p).isLegendary
            }"
            :style="{ 
              '--type-color': getPokemonFX(p).typeColor,
              '--tier-color': getPokemonFX(p).tierColor 
            }"
          >
            <!-- Standardized FX Module -->
            <PVSpriteFX
              v-if="p"
              :is-shiny="p.isShiny"
              :is-guardian="p.isGuardian"
              :sparkle-count="8"
              :vibrant="true"
            >
              <!-- Indicator for injured/PP-depleted Pokemon -->
              <div 
                v-if="needsHealing(p)" 
                class="needs-heal-badge"
              >
                🚑
              </div>

              <!-- Type Glow Aura -->
              <div class="type-aura" />
              
              <img 
                :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id || p.name, { isShiny: p.isShiny })" 
                class="poke-sprite"
                :alt="p.name"
                @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }"
              >
            </PVSpriteFX>
          </div>
          
          <div 
            v-for="i in (6 - team.length)" 
            :key="'empty-' + i"
            class="slot empty"
          >
            <div class="ball-icon">
              🔴
            </div>
          </div>
        </div>
        
        <div
          v-if="isHealing"
          class="progress-container"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progress + '%' }"
            />
          </div>
          <p class="healing-text">
            RESTAURANDO EQUIPO...
          </p>
        </div>
        
        <div
          v-else
          class="info-text"
        >
          <div
            v-if="cost > 0"
            class="cost-notice"
          >
            <p class="cost-label">
              COSTO DE SERVICIO
            </p>
            <div class="price-tag">
              ₽ {{ cost.toLocaleString() }}
            </div>
            <small
              v-if="gameStore.state.playerClass === 'rocket'"
              class="rocket-surcharge"
            >Recargo: Miembro del Equipo Rocket (2x)</small>
            <small
              v-else-if="gameStore.state.playerClass === 'criador'"
              class="rocket-surcharge"
            >Recargo: Criador Profesional</small>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="heal-actions">
        <button 
          v-if="cost > 0"
          class="btn-heal-primary" 
          :disabled="isHealing || team.length === 0 || (cost > 0 && gameStore.state.money < cost)"
          @click.stop="handleHeal"
        >
          {{ isHealing ? 'CURANDO...' : 'CURAR EQUIPO' }}
        </button>
        <button
          v-if="cost > 0"
          class="btn-cancel-secondary"
          :disabled="isHealing"
          @click.stop="handleClose"
        >
          VOLVER
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.heal-modal-inner {
  padding: 8px 0;
  text-align: center;
}

.subtitle {
  color: Rgba(255, 255, 255, 0.4);
  font-size: 8px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  @include pixelated;
}

.team-slots {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 10px 20px 10px;
}

.slot {
  width: 90px;
  height: 90px;
  background: Rgba(255, 255, 255, 0.03);
  border: 2px solid Rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: visible; // Critical for PVSpriteFX particles
  
  &.empty {
    opacity: 0.3;
    border-style: dashed;
  }
  
  &.active {
    opacity: 1;
    background: Rgba(255, 255, 255, 0.06);
  }

  &.healing {
    background: Rgba(34, 197, 94, 0.08);
    border-color: Rgba(34, 197, 94, 0.4);
    box-shadow: 0 0 20px Rgba(34, 197, 94, 0.2);
    transform: Scale(1.1);
  }
}

.poke-sprite {
  width: 72px;
  height: 72px;
  @include sprite-render;
  will-change: transform, filter, opacity;
  filter: Grayscale(0.8) Brightness(0.5);
  transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  z-index: calc(var(--z-base) + 2);
}

.type-aura {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: Radial-Gradient(circle, var(--type-color) 0%, transparent 70%);
  opacity: 0.15;
  transition: opacity 0.3s;
  z-index: calc(var(--z-base) + 1);
}

.needs-heal-badge {
  position: absolute;
  top: 4px;
  right: 0px;
  font-size: 14px;
  z-index: var(--z-low);
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 5px Rgba(239, 68, 68, 0.5));
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bounce-in {
  0% { transform: Scale(0) Rotate(-20deg); }
  70% { transform: Scale(1.2) Rotate(10deg); }
  100% { transform: Scale(1) Rotate(0deg); }
}

.slot.active {
  .type-aura { opacity: 0.3; }
  .poke-sprite { will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Grayscale(0) Brightness(1); }
}

.slot.healing {
  background: Rgba(34, 197, 94, 0.05);
  border-color: Rgba(34, 197, 94, 0.3);
  
  .type-aura {
    opacity: 0.6;
    animation: pulse-aura 1.5s infinite;
  }
  
  .poke-sprite {
    will-change: transform, filter, opacity;
  filter: Brightness(1.2) Drop-Shadow(0 0 10px Rgba(255, 255, 255, 0.6));
    animation: pulse-sprite 0.6s infinite alternate;
  }
}

.slot.is-shiny {
  border-color: Rgba(255, 214, 10, 0.4);
  box-shadow: 0 0 20px Rgba(255, 214, 10, 0.1);
}

.slot.is-premium-tier {
  @include pokemon-card-premium-tier;
}

@keyframes pulse-aura {
  0%, 100% { transform: Scale(1); opacity: 0.4; }
  50% { transform: Scale(1.2); opacity: 0.7; }
}

@keyframes pulse-sprite {
  from { transform: Scale(1) Rotate(0deg); }
  to { transform: Scale(1.15) Rotate(3deg); }
}

.progress-container {
  margin-top: 10px;
}

.progress-bar {
  height: 6px;
  background: Rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
}

.progress-fill {
  height: 100%;
  background: Linear-Gradient(90deg, Rgba(34, 197, 94, 1), Rgba(74, 222, 128, 1));
  box-shadow: 0 0 15px Rgba(34, 197, 94, 0.5);
  transition: width 0.1s linear;
}

.healing-text {
  color: Rgba(34, 197, 94, 1);
  font-size: 7px;
  letter-spacing: 1px;
  @include pixelated;
}

.cost-notice {
  background: Rgba(239, 68, 68, 0.05);
  padding: 16px;
  border-radius: 16px;
  border: 1px solid Rgba(239, 68, 68, 0.2);
  @include glass;
  
  .cost-label {
    font-size: 7px;
    color: Rgba(239, 68, 68, 1);
    margin-bottom: 12px;
    @include pixelated;
    letter-spacing: 1px;
  }
  
  .price-tag {
    font-size: 20px;
    color: var(--white);
    text-shadow: 0 0 15px Rgba(255, 255, 255, 0.2);
    @include pixelated;
  }
  
  .rocket-surcharge {
    display: block;
    margin-top: 10px;
    color: Rgba(239, 68, 68, 0.6);
    font-size: 7px;
    @include pixelated;
    text-transform: uppercase;
  }
}

.heal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-heal-primary {
  @include btn-vicio-danger;
  width: 100%;
}

.btn-cancel-secondary {
  background: Rgba(255, 255, 255, 0.03);
  color: Rgba(255, 255, 255, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 12px;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;
  @include pixelated;
  
  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.08);
    color: var(--white);
    border-color: Rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
