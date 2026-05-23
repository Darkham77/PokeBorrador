<script setup lang="ts">
import { gsap } from 'gsap'

interface Props {
  modelValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function handleServerTabEnter(e: MouseEvent) {
  const tab = e.currentTarget as HTMLElement
  if (!tab.classList.contains('active')) {
    gsap.to(tab, {
      color: 'var(--blue)',
      backgroundColor: 'Rgba(59, 139, 255, 0.08)',
      duration: 0.2
    })
  }
}

function handleServerTabLeave(e: MouseEvent) {
  const tab = e.currentTarget as HTMLElement
  if (!tab.classList.contains('active')) {
    gsap.to(tab, {
      color: 'var(--gray)',
      backgroundColor: 'transparent',
      duration: 0.2
    })
  }
}

function selectTab(value: string) {
  emit('update:modelValue', value)
  gsap.set('.login-server-tab', { clearProps: 'all' })
}
</script>

<template>
  <div class="server-selector">
    <div class="server-selector-label">
      Servidor
    </div>
    <div class="server-tabs">
      <button 
        class="login-server-tab" 
        :class="{ active: modelValue === 'online' }"
        @click.stop="selectTab('online')"
        @mouseenter="handleServerTabEnter"
        @mouseleave="handleServerTabLeave"
      >
        🌐 Online
      </button>
      <button 
        class="login-server-tab" 
        :class="{ active: modelValue === 'local' }"
        @click.stop="selectTab('local')"
        @mouseenter="handleServerTabEnter"
        @mouseleave="handleServerTabLeave"
      >
        💻 Local
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/login";
</style>
