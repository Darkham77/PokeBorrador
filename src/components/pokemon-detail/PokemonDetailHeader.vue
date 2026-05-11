<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { calculateTotalPower } from '@/logic/pokemonUtils'
import { translateType } from '@/data/types'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  pokemon: Pokemon
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toggle-tag', tag: string): void
}>()

const p = computed(() => props.pokemon)

const getSprite = (id: string | number, isShiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const totalPower = computed(() => calculateTotalPower(p.value))
const totalIvs = computed(() => {
  const ivs = p.value.ivs || {}
  return Object.values(ivs).reduce((s: number, v: number | boolean | undefined) => s + (Number(v) || 0), 0)
})
const hasIvs = computed(() => Object.keys(p.value.ivs || {}).length > 0)

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <header class="modal-header">
    <div class="poke-identity">
      <div
        class="sprite-box"
        :class="p.aura ? 'aura-' + p.aura : ''"
      >
        <img
          :src="getSprite(p.id, !!p.isShiny)"
          :alt="p.name"
          class="main-sprite"
          @error="handleImgError"
        >
        <span
          v-if="p.isShiny"
          class="shiny-star"
        >✨</span>
      </div>
      <div class="name-info">
        <h2 class="poke-name">
          {{ p.name }}&nbsp;<span :class="['m-badge-gender', p.gender === 'M' ? 'male' : 'female']">
            {{ (p.gender === 'M' ? '♂' : p.gender === 'F' ? '♀' : '') }}
          </span>
        </h2>
        <div class="type-row">
          <span
            class="type-badge"
            :class="'type-' + p.type.toLowerCase()"
          >{{ translateType(p.type).toUpperCase() }}</span>
          <span class="m-badge-level">Nv. {{ p.level }}</span>
          <span
            v-if="hasIvs"
            class="m-badge-iv"
          >IV {{ totalIvs }}</span>
          <span class="m-badge-tot">TOT {{ totalPower }}</span>
          <span class="m-badge-id">#{{ String(p.id).padStart(3, '0') }}</span>
        </div>
        <div class="tags-row">
          <PVTooltip
            title="FAVORITO"
            description="Marcar como Pokémon favorito."
            position="top"
          >
            <button 
              class="tag-btn" 
              :class="{ active: p.tags?.includes('fav') }"
              @click.stop="emit('toggle-tag', 'fav')"
            >
              ⭐
            </button>
          </PVTooltip>

          <PVTooltip
            title="CRIANZA"
            description="Marcar para breeding en la guardería."
            position="top"
          >
            <button 
              class="tag-btn" 
              :class="{ active: p.tags?.includes('breed') }"
              @click.stop="emit('toggle-tag', 'breed')"
            >
              ❤️
            </button>
          </PVTooltip>

          <PVTooltip
            title="IV 31"
            description="Pokémon con al menos un IV perfecto."
            position="top"
          >
            <button 
              class="tag-btn" 
              :class="{ active: p.tags?.includes('iv31') }"
              @click.stop="emit('toggle-tag', 'iv31')"
            >
              31
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>
    <button
      class="close-btn"
      @click.stop="emit('close')"
    >
      ✕
    </button>
  </header>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.poke-identity {
  display: flex;
  gap: 20px;
}

.sprite-box {
  width: 90px;
  height: 90px;
  background: Rgba(255,255,255,0.05);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid Rgba(255,255,255,0.1);
}

.main-sprite {
  width: 80px;
  height: 80px;
  @include pixelated;
}

.shiny-star {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 20px;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 5px gold);
}

.poke-name {
  @include pixelated;
  font-size: 13px;
  color: var(--yellow);
  margin-bottom: 10px;
}

.type-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.id-badge { font-size: 11px; font-weight: bold; }

.tags-row {
  display: flex;
  gap: 10px;
}

.tag-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: Rgba(255,255,255,0.05);
  border: 1px solid Rgba(255,255,255,0.1);
  color: Rgba(255,255,255,0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn.active {
  background: Rgba(255, 215, 0, 0.2);
  border-color: gold;
  color: var(--white);
  will-change: transform, filter, opacity;
  filter: Grayscale(100%);
}

.close-btn {
  background: Rgba(255,255,255,0.1);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: var(--white);
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s;
}

.close-btn:hover { background: var(--red); }

/* Gender Colors handled by m-badge-gender */
</style>
