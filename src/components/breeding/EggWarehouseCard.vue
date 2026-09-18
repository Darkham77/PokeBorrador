<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import type { DaycareEgg } from '@/types/breeding/breeding'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import EggSprite from '@/components/common/EggSprite.vue'

const CARD_HOVER_OFFSET_Y_PX = -4
const GSAP_CARD_TRANSITION_DUR_SEC = 0.25
const GSAP_TRASH_TRANSITION_DUR_SEC = 0.2
const GSAP_TRASH_HOVER_SCALE = 1.1
const GSAP_EGG_CARD_HOVER_MIN_SCALE = 0.95
const GSAP_EGG_CARD_UNSCANNED_HOVER_SCALE = 0.85

interface Props {
  egg: DaycareEgg
  isCriador: boolean
  isLevelAdequate: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'claim', egg: DaycareEgg): void
  (e: 'delete', egg: DaycareEgg): void
}>()

const pokemonName = computed(() => {
  const specId = requirePokemonSpeciesId(props.egg.species)
  return POKEMON_DB[specId]?.name || 'Huevo'
})

const eggTierInfo = computed(() => {
  if (!props.egg.ivs) return null
  return getPokemonTier({ ivs: props.egg.ivs })
})

const handleCardMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  gsap.to(el, {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(244, 63, 94, 0.5)',
    y: CARD_HOVER_OFFSET_Y_PX,
    boxShadow: '0 8px 24px rgba(244, 63, 94, 0.15)',
    duration: GSAP_CARD_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })

  const visual = el.querySelector('.egg-visual')
  const info = el.querySelector('.egg-info')
  const action = el.querySelector('.egg-hover-action')

  if (visual) {
    gsap.to(visual, { opacity: 0, y: -8, scale: GSAP_EGG_CARD_HOVER_MIN_SCALE, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' })
  }
  if (info) {
    gsap.to(info, { opacity: 0, y: -8, scale: GSAP_EGG_CARD_HOVER_MIN_SCALE, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' })
  }
  if (action) {
    gsap.to(action, { opacity: 1, scale: 1, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' })
  }
}

const handleCardMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  gsap.to(el, {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    y: 0,
    boxShadow: 'none',
    duration: GSAP_CARD_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })

  const visual = el.querySelector('.egg-visual')
  const info = el.querySelector('.egg-info')
  const action = el.querySelector('.egg-hover-action')

  if (visual) {
    gsap.to(visual, { opacity: 1, y: 0, scale: 1, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' })
  }
  if (info) {
    gsap.to(info, { opacity: 1, y: 0, scale: 1, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' })
  }
  if (action) {
    gsap.to(action, { opacity: 0, scale: GSAP_EGG_CARD_UNSCANNED_HOVER_SCALE, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' })
  }
}

const handleTrashMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  gsap.to(el, {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    color: '#ffffff',
    scale: GSAP_TRASH_HOVER_SCALE,
    duration: GSAP_TRASH_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const handleTrashMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  gsap.to(el, {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    scale: 1.0,
    duration: GSAP_TRASH_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}
</script>

<template>
  <div
    :id="'egg-card-' + egg.id"
    class="egg-card"
    @click.stop="emit('claim', egg)"
    @mouseenter="handleCardMouseEnter"
    @mouseleave="handleCardMouseLeave"
  >
    <!-- Trash button to discard egg (only if scanned) -->
    <button
      v-if="egg.inherited_ivs?._scanned"
      class="egg-trash-btn"
      title="Tirar huevo"
      @click.stop="emit('delete', egg)"
      @mouseenter="handleTrashMouseEnter"
      @mouseleave="handleTrashMouseLeave"
    >
      <span class="emoji">🗑️</span>
    </button>

    <div class="egg-visual">
      <div class="egg-sprite">
        <EggSprite
          :tint="egg.tint"
          size="48"
          class="egg-sprite-img"
        />
      </div>
      <div
        v-if="egg.inherited_ivs?._scanned"
        class="scanned-badge"
      >
        <span class="emoji">🔍</span> ESCANEADO
      </div>
    </div>

    <div class="egg-info">
      <div class="name">
        {{ egg.inherited_ivs?._scanned ? pokemonName : 'HUEVO POKÉMON' }}
      </div>

      <!-- Colored IV Grade Badge -->
      <div
        v-if="egg.inherited_ivs?._scanned && eggTierInfo"
        class="egg-grade-container"
      >
        <span
          class="egg-grade-badge"
          :style="{
            '--tier-color': eggTierInfo.color,
            '--tier-bg': eggTierInfo.bg
          }"
        >
          GRADO {{ eggTierInfo.tier }}
        </span>
      </div>

      <div
        v-if="egg.inherited_ivs?._scanned && egg.ivs"
        class="egg-scanned-ivs"
      >
        <div class="iv-stat">
          <span>HP</span>{{ egg.ivs.hp }}
        </div>
        <div class="iv-stat">
          <span>ATK</span>{{ egg.ivs.atk }}
        </div>
        <div class="iv-stat">
          <span>DEF</span>{{ egg.ivs.def }}
        </div>
        <div class="iv-stat">
          <span>SPA</span>{{ egg.ivs.spa }}
        </div>
        <div class="iv-stat">
          <span>SPD</span>{{ egg.ivs.spd }}
        </div>
        <div class="iv-stat">
          <span>SPE</span>{{ egg.ivs.spe }}
        </div>
      </div>
      <div
        v-if="egg.inherited_ivs?._cost"
        class="cost"
      >
        Costo: <span>₽{{ (egg.inherited_ivs?._cost || 0).toLocaleString() }}</span>
      </div>
    </div>

    <div
      class="egg-hover-action"
      :class="{ 'two-lines': isCriador && isLevelAdequate && !egg.inherited_ivs?._scanned }"
    >
      <template v-if="isCriador && isLevelAdequate && !egg.inherited_ivs?._scanned">
        ESCANEAR<br>O<br>RECOGER
      </template>
      <template v-else>
        RECOGER
      </template>
    </div>
  </div>
</template>

<style scoped src="./EggWarehouseCard.styles.scss" lang="scss"></style>
