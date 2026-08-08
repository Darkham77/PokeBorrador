<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

interface Props {
  tint?: string
  size?: number | string
}

const DEFAULT_EGG_SPRITE_SIZE_PX = 48

const props = withDefaults(defineProps<Props>(), {
  tint: '',
  size: DEFAULT_EGG_SPRITE_SIZE_PX
})

const eggUrl = computed(() => getAssetUrl(ASSET_TYPES.POKEMON, 'egg'))

const containerStyle = computed(() => {
  let finalSize = props.size
  if (typeof props.size === 'number') {
    finalSize = `${props.size}px`
  } else if (typeof props.size === 'string' && !isNaN(Number(props.size))) {
    finalSize = `${props.size}px`
  }
  return {
    width: finalSize,
    height: finalSize,
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
})

const imgStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  imageRendering: 'pixelated' as const
}))

const tintStyle = computed(() => {
  if (!props.tint) return {}
  const tintColor = props.tint === 'violet' ? 'rgba(168, 85, 247, 0.65)' : props.tint
  return {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: tintColor,
    mixBlendMode: 'color' as const,
    maskImage: `url(${eggUrl.value})`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    webkitMaskImage: `url(${eggUrl.value})`,
    webkitMaskSize: 'contain',
    webkitMaskRepeat: 'no-repeat',
    webkitMaskPosition: 'center',
    pointerEvents: 'none' as const
  }
})
</script>

<template>
  <div
    class="egg-sprite-container"
    :style="containerStyle"
  >
    <img
      :src="eggUrl"
      alt="Huevo Pokémon"
      :style="imgStyle"
    >
    <div
      v-if="tint"
      class="egg-tint-overlay"
      :style="tintStyle"
    />
  </div>
</template>
