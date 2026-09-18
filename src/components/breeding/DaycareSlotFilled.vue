<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getVigor, getMaxVigor } from '@/logic/pokemon/pokemonUtils'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import { NATURE_DATA, isNatureId, getNatureInfo } from '@/data/battle/natures'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useUIStore } from '@/stores/ui'
import { getItemById } from '@/data/inventory/items'

const GSAP_FAST_DURATION_SEC = 0.2
const GSAP_PRESS_DURATION_SEC = 0.1
const SCALE_HOVER_ITEM = 1.02
const SCALE_PRESS_ITEM = 0.98
const VIGOR_CRITICAL_THRESHOLD = 2
const PERCENTAGE_FULL_MULTIPLIER = 100
const GSAP_HOVER_BRIGHTNESS_BOOST_PERCENT = 1.15

interface Props {
  pokemon: Pokemon
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'withdraw'): void
}>()

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()

const itemStatusRef = ref<HTMLElement | null>(null)
let itemTween: gsap.core.Tween | null = null
const isHoveringItem = ref(false)

const handleItemMouseEnter = () => {
  isHoveringItem.value = true
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: SCALE_HOVER_ITEM,
      filter: `brightness(${GSAP_HOVER_BRIGHTNESS_BOOST_PERCENT})`,
      duration: GSAP_FAST_DURATION_SEC,
      ease: 'power2.out'
    })
  }
}

const handleItemMouseLeave = () => {
  isHoveringItem.value = false
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: 1,
      filter: 'brightness(1)',
      duration: GSAP_FAST_DURATION_SEC,
      ease: 'power2.out'
    })
  }
}

const handleItemMouseDown = () => {
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: SCALE_PRESS_ITEM,
      filter: `brightness(${GSAP_HOVER_BRIGHTNESS_BOOST_PERCENT})`,
      duration: GSAP_PRESS_DURATION_SEC,
      ease: 'power2.out'
    })
  }
}

const handleItemMouseUp = () => {
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: isHoveringItem.value ? SCALE_HOVER_ITEM : 1,
      filter: isHoveringItem.value ? `brightness(${GSAP_HOVER_BRIGHTNESS_BOOST_PERCENT})` : 'brightness(1)',
      duration: GSAP_PRESS_DURATION_SEC,
      ease: 'power2.out'
    })
  }
}

onUnmounted(() => {
  if (itemTween) itemTween.kill()
})

const findPokemonLocation = (p: Pokemon) => {
  const teamIndex = gameStore.state.team.findIndex(x => x && x.uid === p.uid)
  if (teamIndex !== -1) {
    return { context: 'team' as const, index: teamIndex }
  }
  const boxIndex = gameStore.state.box.findIndex(x => x && x.uid === p.uid)
  if (boxIndex !== -1) {
    return { context: 'box' as const, index: boxIndex }
  }
  return null
}

const handleItemClick = () => {
  const p = props.pokemon
  const loc = findPokemonLocation(p)
  if (!loc) {
    uiStore.notify('No se pudo localizar este Pokémon', '⚠️')
    return
  }
  
  if (p.heldItem) {
    const item = p.heldItem
    inventoryStore.unequipItem(loc.context, loc.index)
    uiStore.notify(`¡${item} retirado!`, '🎒')
  } else {
    uiStore.toggleInventory(loc.context, loc.index)
  }
}

const getSprite = (id: string | number, isShiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const getNatureDescription = (natureName: string) => {
  const clean = (natureName || '').toLowerCase().trim()
  return isNatureId(clean) ? NATURE_DATA[clean].desc : 'Sin efecto en estadísticas.'
}

const heldItemSprite = computed(() => {
  const held = props.pokemon.heldItem
  if (!held) return ''
  const item = getItemById(held)
  if (!item?.sprite) return ''
  return getAssetUrl(ASSET_TYPES.ITEM, item.sprite)
})
</script>

<template>
  <div class="slot-filled">
    <div class="poke-header">
      <div class="sprite-box">
        <img
          :src="getSprite(pokemon.id, !!pokemon.isShiny)"
          :alt="pokemon.name || 'Pokémon'"
          class="pixel-sprite"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
      </div>
      <div class="poke-info">
        <div class="p-name-stack-daycare">
          <span class="name">{{ pokemon.nickname || pokemon.name.toUpperCase() }}</span>
          <span
            v-if="pokemon.nickname"
            class="species-subtitle"
          >{{ pokemon.name.toUpperCase() }}</span>
        </div>
        <div class="lv-gender-line">
          <span class="m-badge-level">NV.{{ pokemon.level }}</span>
          <PVGenderBadge
            v-if="pokemon.gender"
            :gender="pokemon.gender"
            size="mini"
          />
        </div>
        <div class="iv-grid-daycare">
          <div class="iv-item">
            <span class="label">HP</span>
            <span class="val">{{ pokemon.ivs.hp }}</span>
          </div>
          <div class="iv-item">
            <span class="label">ATK</span>
            <span class="val">{{ pokemon.ivs.atk }}</span>
          </div>
          <div class="iv-item">
            <span class="label">DEF</span>
            <span class="val">{{ pokemon.ivs.def }}</span>
          </div>
          <div class="iv-item">
            <span class="label">SPA</span>
            <span class="val">{{ pokemon.ivs.spa }}</span>
          </div>
          <div class="iv-item">
            <span class="label">SPD</span>
            <span class="val">{{ pokemon.ivs.spd }}</span>
          </div>
          <div class="iv-item">
            <span class="label">SPE</span>
            <span class="val">{{ pokemon.ivs.spe }}</span>
          </div>
        </div>
        <div class="nature-line">
          <PVTooltip
            :title="`NATURALEZA: ${getNatureInfo(pokemon.nature).name.toUpperCase()}`"
            :description="getNatureDescription(pokemon.nature)"
          >
            <span class="nature-text">{{ getNatureInfo(pokemon.nature).name.toUpperCase() }}</span>
          </PVTooltip>
        </div>
      </div>
    </div>

    <div class="vigor-status">
      <div class="label">
        VIGOR: {{ getVigor(pokemon) }}/{{ getMaxVigor(pokemon) }}
      </div>
      <div class="vigor-bar-bg">
        <div
          class="vigor-fill"
          :style="{ 
            width: getMaxVigor(pokemon) === 0 ? '0%' : ((getVigor(pokemon) / getMaxVigor(pokemon)) * PERCENTAGE_FULL_MULTIPLIER) + '%', 
            background: getVigor(pokemon) <= VIGOR_CRITICAL_THRESHOLD ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)' 
          }"
        />
      </div>
    </div>

    <div
      ref="itemStatusRef"
      class="item-status"
      @click.stop="handleItemClick"
      @mouseenter="handleItemMouseEnter"
      @mouseleave="handleItemMouseLeave"
      @mousedown="handleItemMouseDown"
      @mouseup="handleItemMouseUp"
    >
      <div
        v-if="pokemon.heldItem"
        class="item-badge active"
      >
        <img
          v-if="heldItemSprite"
          :src="heldItemSprite"
          :alt="pokemon.heldItem || 'Objeto equipado'"
          class="item-mini-sprite"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
        <span
          v-else
          class="emoji item-emoji-fallback"
        >📦</span>
        {{ pokemon.heldItem.toUpperCase() }}
      </div>
      <div
        v-else
        class="item-badge none"
      >
        SIN OBJETO
      </div>
    </div>

    <button
      class="withdraw-btn-retro"
      @click.stop="emit('withdraw')"
    >
      RETIRAR
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/daycare-slot";
</style>
