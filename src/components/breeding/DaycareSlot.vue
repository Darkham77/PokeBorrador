<script setup lang="ts">
import { computed, ref, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon/pokemon'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { NATURE_DATA } from '@/data/battle/natures'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useUIStore } from '@/stores/ui'
import { SHOP_ITEMS } from '@/data/inventory/items'

interface Props {
  slotId: string
  pokemon?: Pokemon | null
  item?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  item: null
})

const emit = defineEmits<{
  (e: 'deposit'): void
  (e: 'withdraw'): void
}>()

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()

const slotRef = ref<HTMLElement | null>(null)
const itemStatusRef = ref<HTMLElement | null>(null)

let slotBorderTween: gsap.core.Tween | null = null
let plusIconTween: gsap.core.Tween | null = null
let spriteBoxTween: gsap.core.Tween | null = null
let itemTween: gsap.core.Tween | null = null

const isHoveringItem = ref(false)

const handleSlotMouseEnter = () => {
  if (!props.pokemon) {
    if (slotBorderTween) slotBorderTween.kill()
    if (slotRef.value) {
      slotBorderTween = gsap.to(slotRef.value, {
        borderColor: '#ffd700',
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    const plusIcon = slotRef.value?.querySelector('.plus-icon')
    if (plusIcon) {
      if (plusIconTween) plusIconTween.kill()
      plusIconTween = gsap.to(plusIcon, {
        scale: 1.1,
        color: '#ffd700',
        duration: 0.3,
        ease: 'power2.out'
      })
    }
  } else {
    if (slotBorderTween) slotBorderTween.kill()
    if (slotRef.value) {
      slotBorderTween = gsap.to(slotRef.value, {
        borderColor: 'rgba(255, 255, 255, 0.15)',
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    const spriteBox = slotRef.value?.querySelector('.sprite-box')
    if (spriteBox) {
      if (spriteBoxTween) spriteBoxTween.kill()
      spriteBoxTween = gsap.to(spriteBox, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
      })
    }
  }
}

const handleSlotMouseLeave = () => {
  if (slotBorderTween) slotBorderTween.kill()
  if (slotRef.value) {
    slotBorderTween = gsap.to(slotRef.value, {
      borderColor: 'rgba(255, 255, 255, 0.06)',
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  if (!props.pokemon) {
    const plusIcon = slotRef.value?.querySelector('.plus-icon')
    if (plusIcon) {
      if (plusIconTween) plusIconTween.kill()
      plusIconTween = gsap.to(plusIcon, {
        scale: 1,
        color: 'rgba(51, 65, 85, 1)',
        duration: 0.3,
        ease: 'power2.out'
      })
    }
  } else {
    const spriteBox = slotRef.value?.querySelector('.sprite-box')
    if (spriteBox) {
      if (spriteBoxTween) spriteBoxTween.kill()
      spriteBoxTween = gsap.to(spriteBox, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
    }
  }
}

const handleItemMouseEnter = () => {
  isHoveringItem.value = true
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: 1.02,
      filter: 'brightness(1.15)',
      duration: 0.2,
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
      duration: 0.2,
      ease: 'power2.out'
    })
  }
}

const handleItemMouseDown = () => {
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: 0.98,
      filter: 'brightness(1.15)',
      duration: 0.1,
      ease: 'power2.out'
    })
  }
}

const handleItemMouseUp = () => {
  if (itemTween) itemTween.kill()
  if (itemStatusRef.value) {
    itemTween = gsap.to(itemStatusRef.value, {
      scale: isHoveringItem.value ? 1.02 : 1,
      filter: isHoveringItem.value ? 'brightness(1.15)' : 'brightness(1)',
      duration: 0.1,
      ease: 'power2.out'
    })
  }
}

watch(() => props.pokemon, () => {
  if (slotBorderTween) slotBorderTween.kill()
  if (plusIconTween) plusIconTween.kill()
  if (spriteBoxTween) spriteBoxTween.kill()
  if (itemTween) itemTween.kill()
  
  if (slotRef.value) {
    gsap.set(slotRef.value, { borderColor: 'rgba(255, 255, 255, 0.06)' })
    const plusIcon = slotRef.value.querySelector('.plus-icon')
    if (plusIcon) {
      gsap.set(plusIcon, { scale: 1, color: 'rgba(51, 65, 85, 1)' })
    }
    const spriteBox = slotRef.value.querySelector('.sprite-box')
    if (spriteBox) {
      gsap.set(spriteBox, { scale: 1 })
    }
  }
})

onUnmounted(() => {
  if (slotBorderTween) slotBorderTween.kill()
  if (plusIconTween) plusIconTween.kill()
  if (spriteBoxTween) spriteBoxTween.kill()
  if (itemTween) itemTween.kill()
})

const findPokemonLocation = (p: Pokemon) => {
  if (!p) return null
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
  if (!p) return
  
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

const genderIcon = computed(() => {
  if (!props.pokemon?.gender) return ''
  return props.pokemon.gender === 'M' ? '♂' : '♀'
})

const getSprite = (id: string | number, isShiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const getNatureDescription = (natureName: string) => {
  return (NATURE_DATA as Record<string, { desc: string }>)[natureName]?.desc || 'Sin efecto en estadísticas.'
}

const heldItemSprite = computed(() => {
  const held = props.pokemon?.heldItem
  if (!held) return ''
  const item = SHOP_ITEMS.find(i => i.id === held || i.name === held)
  if (!item?.sprite) return ''
  return getAssetUrl(ASSET_TYPES.ITEM, item.sprite)
})
</script>

<template>
  <div
    ref="slotRef"
    class="daycare-slot-legacy"
    :class="{ empty: !pokemon }"
    @click.stop="!pokemon ? emit('deposit') : null"
    @mouseenter="handleSlotMouseEnter"
    @mouseleave="handleSlotMouseLeave"
  >
    <div class="slot-marker">
      RANURA {{ slotId.toUpperCase() }}
    </div>

    <!-- Empty State -->
    <div
      v-if="!pokemon"
      class="slot-empty"
    >
      <div class="plus-icon">
        +
      </div>
      <div class="hint">
        ⚡ DEPOSITAR POKÉMON
      </div>
    </div>

    <!-- Occupied State -->
    <div
      v-else
      class="slot-filled"
    >
      <div class="poke-header">
        <div class="sprite-box">
          <img
            :src="getSprite(pokemon.id, !!pokemon.isShiny)"
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
            <span
              v-if="pokemon.gender"
              class="m-badge-gender mini"
              :class="pokemon.gender === 'M' ? 'male' : 'female'"
            >{{ genderIcon }}</span>
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
              :title="`NATURALEZA: ${pokemon.nature.toUpperCase()}`"
              :description="getNatureDescription(pokemon.nature)"
            >
              <span class="nature-text">{{ pokemon.nature.toUpperCase() }}</span>
            </PVTooltip>
          </div>
        </div>
      </div>

      <div class="vigor-status">
        <div class="label">
          VIGOR: {{ pokemon.vigor || 0 }}/{{ pokemon.maxVigor !== undefined ? pokemon.maxVigor : 10 }}
        </div>
        <div class="vigor-bar-bg">
          <div
            class="vigor-fill"
            :style="{ 
              width: (pokemon.maxVigor !== undefined && pokemon.maxVigor === 0) ? '0%' : (((pokemon.vigor || 0) / (pokemon.maxVigor !== undefined ? pokemon.maxVigor : 10)) * 100) + '%', 
              background: ((pokemon.vigor || 0) <= 2 ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)') 
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
            class="item-mini-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
          <span
            v-else
            class="item-emoji-fallback"
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
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/daycare-slot";
</style>
