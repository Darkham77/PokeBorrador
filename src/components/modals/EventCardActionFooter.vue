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

  padding: 8px 12px;
  border: 2px solid rgb(255 255 255 / 10%);
  border-radius: 6px;
  background: rgb(255 255 255 / 5%);
  color: var(--white);
  font-size: 8px;
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
      @include pixelated;

      display: block;
      color: #94a3b8;
      font-size: 7px;
      margin-bottom: 3px;
    }
    .value {
      @include pixelated;

      color: #f87171;
      font-size: 8px;
      text-shadow: 0 0 6px rgb(248 113 113 / 40%);

      &.upcoming-value {
        color: #93c5fd;
        text-shadow: 0 0 6px rgb(147 197 253 / 40%);
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

    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid #60a5fa;
    border-radius: 6px;
    background: rgb(59 130 246 / 15%);
    color: #60a5fa;
    font-size: 8px;
    text-shadow: 0 0 8px rgb(59 130 246 / 40%);
  }

  .active-badge {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1.5px solid #4ade80;
    border-radius: 6px;
    background: rgb(34 197 94 / 18%);
    color: #4ade80;
    font-size: 8px;
    font-weight: bold;
    text-shadow: 0 0 8px rgb(74 222 128 / 60%);
    box-shadow: 0 0 10px rgb(74 222 128 / 25%);
  }
}
</style>
