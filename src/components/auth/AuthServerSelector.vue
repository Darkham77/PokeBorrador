<script setup lang="ts">
interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
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
        @click.stop="$emit('update:modelValue', 'online')"
      >
        🌐 Online
      </button>
      <button 
        class="login-server-tab" 
        :class="{ active: modelValue === 'local' }"
        @click.stop="$emit('update:modelValue', 'local')"
      >
        💻 Local
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/login";
</style>
