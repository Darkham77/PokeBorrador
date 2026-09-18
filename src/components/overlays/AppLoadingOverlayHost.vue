<script setup lang="ts">
// style-inherited: uses global pv-button-retro and PVLoadingOverlay scoped styles
import { gsap } from 'gsap'
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

type LoadingOverlayTheme = 'default' | 'purple' | 'error' | 'warning';

interface Props {
  show: boolean
  title: string
  message: string
  statusText?: string
  icon?: string
  showSpinner?: boolean
  theme?: LoadingOverlayTheme
  cardClass?: string
  needRefresh?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  statusText: '',
  icon: '',
  showSpinner: false,
  theme: 'default',
  cardClass: '',
  needRefresh: false
})

const emit = defineEmits<{
  (e: 'update'): void
}>()

const onLoadingEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none', onComplete: done })
}

const onLoadingLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, duration: 0.8, ease: 'power2.inOut', onComplete: done })
}
</script>

<template>
  <Teleport to="body">
    <Transition
      appear
      :css="false"
      @enter="onLoadingEnter"
      @leave="onLoadingLeave"
    >
      <PVLoadingOverlay
        v-if="props.show"
        :title="props.title"
        :message="props.message"
        :status-text="props.statusText"
        :icon="props.icon"
        :show-spinner="props.showSpinner"
        :theme="props.theme"
        :card-class="props.cardClass"
      >
        <template
          v-if="props.needRefresh"
          #actions
        >
          <button
            id="app-loading-overlay-update-btn"
            class="pv-button-retro"
            @click.stop="emit('update')"
          >
            CERRAR SESIÓN Y ACTUALIZAR
          </button>
        </template>
      </PVLoadingOverlay>
    </Transition>
  </Teleport>
</template>
