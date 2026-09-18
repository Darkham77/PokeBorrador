<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

interface Props {
  cardTimerLabel: string
  formattedRemainingTime: string
  isUpcoming: boolean
  isCompetition: boolean
  rulesBtnElementId: string // infra-id-ok: DOM element identifier for testing and query selectors
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openDetail: []
}>()

const badgeRef = ref<HTMLElement | null>(null)
let badgeCtx: gsap.Context | null = null

onMounted(() => {
  if (badgeRef.value) {
    badgeCtx = gsap.context(() => {
      gsap.fromTo(badgeRef.value, 
        { boxShadow: "0 0 0 0 Rgba(74, 222, 128, 0.4)" },
        { 
          boxShadow: "0 0 0 6px Rgba(74, 222, 128, 0)",
          duration: 1.4,
          repeat: -1,
          ease: "sine.out"
        }
      )
    }, badgeRef.value)
  }
})

onUnmounted(() => {
  if (badgeCtx) {
    badgeCtx.revert()
  }
})
</script>

<template>
  <footer class="card-footer">
    <div class="timer-box">
      <span class="label">{{ props.cardTimerLabel }}</span>
      <span
        class="value"
        :class="{ 'upcoming-value': props.isUpcoming }"
      >{{ props.formattedRemainingTime }}</span>
    </div>
    
    <div
      v-if="props.isUpcoming"
      class="upcoming-badge"
    >
      <span class="emoji">⏳</span> PRÓXIMO
    </div>
    <div
      v-else-if="props.isCompetition"
      class="comp-footer-actions"
    >
      <button
        :id="props.rulesBtnElementId"
        class="retro-btn rules-btn pixelated"
        type="button"
        @click.stop="emit('openDetail')"
      >
        <span class="emoji">📋</span> REGLAS
      </button>
    </div>
    <div 
      v-else 
      ref="badgeRef"
      class="active-badge"
    >
      <span class="emoji">✨</span> ACTIVO
    </div>
  </footer>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 2px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;

  .timer-box {
    .label {
      display: block;
      font-size: 7px;
      color: #94a3b8;
      margin-bottom: 3px;
      @include pixelated;
    }
    .value {
      @include pixelated;
      font-size: 8px;
      color: #f87171;
      text-shadow: 0 0 6px Rgba(248, 113, 113, 0.4);

      &.upcoming-value {
        color: #93c5fd;
        text-shadow: 0 0 6px Rgba(147, 197, 253, 0.4);
      }
    }
  }

  .comp-footer-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  
  .upcoming-badge {
    @include pixelated;
    font-size: 8px;
    padding: 6px 12px;
    border-radius: 6px;
    background: Rgba(59, 130, 246, 0.15);
    border: 1px solid #60a5fa;
    color: #60a5fa;
    text-shadow: 0 0 8px Rgba(59, 130, 246, 0.4);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .active-badge {
    @include pixelated;
    font-size: 8px;
    padding: 6px 12px;
    border-radius: 6px;
    background: Rgba(34, 197, 94, 0.18);
    border: 1.5px solid #4ade80;
    color: #4ade80;
    font-weight: bold;
    text-shadow: 0 0 8px Rgba(74, 222, 128, 0.6);
    box-shadow: 0 0 10px Rgba(74, 222, 128, 0.25);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
