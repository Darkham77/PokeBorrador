<script setup>
defineProps({
  modelValue: { type: String, required: true }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="server-selector">
    <div class="server-selector-label">
      Servidor
    </div>
    <div class="server-tabs">
      <button 
        class="server-tab" 
        :class="{ active: modelValue === 'online' }"
        @click="$emit('update:modelValue', 'online')"
      >
        🌐 Online
      </button>
      <button 
        class="server-tab" 
        :class="{ active: modelValue === 'local' }"
        @click="$emit('update:modelValue', 'local')"
      >
        💻 Local
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/login";
</style>
