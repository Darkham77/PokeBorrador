<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getFriendshipTooltipDetails } from '@/logic/pokemon/friendshipLogic'

interface Props {
  friendship?: number | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  friendship: 70,
  size: 'md',
  showTooltip: true,
})

const badgeRef = ref<HTMLElement | null>(null)
let pulseTween: gsap.core.Tween | null = null

const details = computed(() => getFriendshipTooltipDetails({ friendship: props.friendship }))
const seal = computed(() => details.value.seal)

const tooltipTitle = computed(() => {
  return `${seal.value.iconEmoji} ${seal.value.label} (${details.value.currentValue}/${details.value.maxValue})`
})

const tooltipDescription = computed(() => {
  const d = details.value
  const quote = `«${d.evaluatorQuote}»`
  const evo = `🚀 ${d.evolutionMessage}`
  const battle = `⚔️ Retribución: ${d.returnPower} BP | Frustración: ${d.frustrationPower} BP`
  const perks = `⭐ ${d.combatPerksSummary}`
  return `${quote}\n\n${evo}\n${battle}\n${perks}`
})

onMounted(() => {
  if (!badgeRef.value) return

  // Subtle GSAP pulse animation for top tiers
  if (seal.value.id === 'radiant_prism' || seal.value.id === 'best_friends') {
    pulseTween = gsap.to(badgeRef.value, {
      scale: 1.12,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  }
})

onUnmounted(() => {
  if (pulseTween) {
    pulseTween.kill()
    pulseTween = null
  }
})

function onMouseEnter() {
  if (badgeRef.value) {
    gsap.to(badgeRef.value, {
      scale: 1.25,
      duration: 0.2,
      ease: 'back.out(2)',
    })
  }
}

function onMouseLeave() {
  if (badgeRef.value) {
    gsap.to(badgeRef.value, {
      scale: 1.0,
      duration: 0.2,
      ease: 'power1.out',
    })
  }
}
</script>

<template>
  <PVTooltip
    v-if="showTooltip"
    :id="`tooltip-friendship-seal-${seal.id}`"
    :title="tooltipTitle"
    :description="tooltipDescription"
    position="top"
    :delay="250"
    :touch-instant="true"
  >
    <div
      :id="`friendship-seal-${seal.id}`"
      ref="badgeRef"
      class="friendship-seal-badge"
      :class="[
        `size-${size}`,
        `tier-${seal.id}`,
        { 'is-evo-ready': seal.isEvolutionReady, 'is-max-bond': seal.isCombatPerksActive }
      ]"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <span
        class="emoji seal-icon"
        aria-hidden="true"
      >{{ seal.iconEmoji }}</span>
    </div>
  </PVTooltip>
  <div
    v-else
    :id="`friendship-seal-${seal.id}`"
    ref="badgeRef"
    class="friendship-seal-badge"
    :class="[`size-${size}`, `tier-${seal.id}`]"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <span
      class="emoji seal-icon"
      aria-hidden="true"
    >{{ seal.iconEmoji }}</span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.friendship-seal-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transform-origin: center center;
  line-height: 1;

  .seal-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    filter: Drop-Shadow(0 1px 2px Rgba(0, 0, 0, 0.8));
  }

  // Sizes
  &.size-sm {
    font-size: 13px;
  }

  &.size-md {
    font-size: 16px;
  }

  &.size-lg {
    font-size: 22px;
  }

  // Tiers
  &.tier-distrust {
    filter: Saturate(0.6) Brightness(0.85);
  }

  &.tier-radiant_prism .seal-icon {
    filter: Drop-Shadow(0 0 4px Rgba(217, 70, 239, 0.8)) Drop-Shadow(0 1px 2px Rgba(0, 0, 0, 0.8));
  }

  &.tier-best_friends .seal-icon {
    filter: Drop-Shadow(0 0 5px Rgba(250, 204, 21, 0.9)) Drop-Shadow(0 1px 2px Rgba(0, 0, 0, 0.8));
  }
}
</style>
