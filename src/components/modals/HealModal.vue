<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import { useShopStore } from '@/stores/inventory/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { toPokemonType } from '@/data/battle/types'

const GSAP_SCALE_SELECTED = 1.1
const GSAP_SCALE_AURA = 1.2
const GSAP_SCALE_SPRITE = 1.15
const GSAP_ROTATION_SPRITE_DEG = 3
const GSAP_DURATION_SLOT_SEC = 0.5
const GSAP_DURATION_AURA_SEC = 0.75
const GSAP_DURATION_SPRITE_SEC = 0.6
const GSAP_DURATION_BADGE_POP_SEC = 0.28
const GSAP_DURATION_BADGE_SETTLE_SEC = 0.12
const GSAP_DURATION_HEAL_PROGRESS_SEC = 2.0
const PERCENTAGE_FULL = 100
const GSAP_DELAY_CLOSE_SEC = 0.8
const GSAP_DELAY_AUTO_HEAL_SEC = 0.6
const PERCENTAGE_MAX_SCALE_FACTOR = 100
const MAX_TEAM_POKEMON_COUNT = 6

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
  const data = pokemonDataProvider.getPokemonData(p.id)
  const tier = getPokemonTier(p)
  const primaryType = data?.type || 'normal'
  
  return {
    typeColor: TYPE_COLORS[toPokemonType(primaryType)] || '#A8A878',
    isShiny: p.isShiny,
    isLegendary: tier.tier === 'S+' || tier.tier === 'S',
    tierColor: tier.color
  }
}

function needsHealing(p: Pokemon | null) {
  if (!p) return false
  return p.hp < p.maxHp || p.status || p.moves?.some((m) => m && m.pp < (m.maxPP || 0))
}

const slotRefs = ref<HTMLElement[]>([])
const auraRefs = ref<HTMLElement[]>([])
const spriteRefs = ref<HTMLElement[]>([])

const activeTweensMap = new Map<number, gsap.core.Tween[]>()

function clearSlotAnimations(index: number) {
  const tweens = activeTweensMap.get(index)
  if (tweens) {
    tweens.forEach(t => t.kill())
    activeTweensMap.delete(index)
  }
  const slot = slotRefs.value[index]
  const aura = auraRefs.value[index]
  const sprite = spriteRefs.value[index]
  if (slot) gsap.set(slot, { scale: 1, clearProps: 'scale,background,borderColor,boxShadow' })
  if (aura) gsap.set(aura, { scale: 1, opacity: 0.3, clearProps: 'scale,opacity' })
  if (sprite) gsap.set(sprite, { scale: 1, rotation: 0, filter: 'grayscale(0) brightness(1)', clearProps: 'scale,rotation,filter' })
}

function startSlotAnimations(index: number) {
  clearSlotAnimations(index)

  const slot = slotRefs.value[index]
  const aura = auraRefs.value[index]
  const sprite = spriteRefs.value[index]

  if (!slot) return

  const tweens: gsap.core.Tween[] = []

  tweens.push(gsap.to(slot, {
    scale: GSAP_SCALE_SELECTED,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
    duration: GSAP_DURATION_SLOT_SEC,
    ease: 'power3.out',
    force3D: false
  }))

  if (aura) {
    gsap.set(aura, { opacity: 0.6 })
    tweens.push(gsap.to(aura, {
      scale: GSAP_SCALE_AURA,
      opacity: 0.7,
      duration: GSAP_DURATION_AURA_SEC,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      force3D: false
    }))
  }

  if (sprite) {
    gsap.set(sprite, {
      filter: 'brightness(1.2)'
    })
    tweens.push(gsap.to(sprite, {
      scale: GSAP_SCALE_SPRITE,
      rotation: GSAP_ROTATION_SPRITE_DEG,
      duration: GSAP_DURATION_SPRITE_SEC,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      force3D: false
    }))
  }

  activeTweensMap.set(index, tweens)
}

watch([isHealing, healedCount], ([newIsHealing, newHealedCount]) => {
  if (!newIsHealing) {
    for (let i = 0; i < team.value.length; i++) {
      clearSlotAnimations(i)
    }
  } else {
    for (let i = 0; i < team.value.length; i++) {
      if (i < newHealedCount) {
        if (!activeTweensMap.has(i)) {
          startSlotAnimations(i)
        }
      } else {
        clearSlotAnimations(i)
      }
    }
  }
}, { immediate: true })

const GSAP_BADGE_INITIAL_ROTATION_DEG = -20
const GSAP_BADGE_MID_ROTATION_DEG = 10

function onBadgeEnter(el: Element, done: () => void) {
  const tl = gsap.timeline({ onComplete: done })
  tl.fromTo(el, 
    { scale: 0, rotation: GSAP_BADGE_INITIAL_ROTATION_DEG }, 
    { scale: GSAP_SCALE_AURA, rotation: GSAP_BADGE_MID_ROTATION_DEG, duration: GSAP_DURATION_BADGE_POP_SEC, ease: 'power1.out' }
  ).to(el, {
    scale: 1,
    rotation: 0,
    duration: GSAP_DURATION_BADGE_SETTLE_SEC,
    ease: 'power1.inOut'
  })
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
      const targetCount = Math.floor((progress.value / PERCENTAGE_FULL) * team.value.length)
      if (targetCount > healedCount.value) {
        healedCount.value = targetCount
      }
    },
    onComplete: () => {
      const success = shopStore.healAllPokemon(cost.value)
      if (success) {
        gsap.delayedCall(GSAP_DELAY_CLOSE_SEC, () => {
          isHealing.value = false
          emit('close')
        })
      } else {
        isHealing.value = false
      }
    }
  })

  tl.to(progress, {
    value: PERCENTAGE_MAX_SCALE_FACTOR,
    duration: GSAP_DURATION_HEAL_PROGRESS_SEC,
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
    
    gsap.delayedCall(GSAP_DELAY_AUTO_HEAL_SEC, () => {
      handleHeal()
    })
  }
})

const GSAP_OVERLAY_HEAL_DELAY_SEC = 0.1

  Reflect.set(window, 'showHealEffect', (active: boolean) => {
    if (active) {
      const modalStore = useModalStore()
      modalStore.open('HealOverlay')
      gsap.delayedCall(GSAP_OVERLAY_HEAL_DELAY_SEC, handleHeal)
    }
  })

onUnmounted(() => {
  gsap.killTweensOf(handleHeal)
  for (let i = 0; i < team.value.length; i++) {
    clearSlotAnimations(i)
  }
})
</script>

<template>
  <BaseModal
    :show="show"
    title="⚡ CENTRO POKÉMON"
    title-color="Rgba(239, 68, 68, 1)"
    header-background="Rgba(26, 28, 46, 1)"
    max-width="360px"
    variant="retro"
    padding="raw"
    accent-color="var(--green)"
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
            :ref="(el) => { if (el) slotRefs[i] = el as HTMLElement }"
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
              <Transition
                :css="false"
                @enter="onBadgeEnter"
              >
                <div 
                  v-if="needsHealing(p)" 
                  class="needs-heal-badge"
                >
                  🚑
                </div>
              </Transition>

              <!-- Type Glow Aura -->
              <div 
                :ref="(el) => { if (el) auraRefs[i] = el as HTMLElement }"
                class="type-aura" 
              />
              
              <img 
                :ref="(el) => { if (el) spriteRefs[i] = el as HTMLElement }"
                :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id || p.name, { isShiny: p.isShiny })" 
                class="poke-sprite"
                :alt="p.name"
                @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }"
              >
            </PVSpriteFX>
          </div>
          
          <div 
            v-for="i in Math.max(0, MAX_TEAM_POKEMON_COUNT - team.length)" 
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
@use "@/styles/components/heal-modal";
</style>
