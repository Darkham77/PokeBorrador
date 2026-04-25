<script setup>
const _props = defineProps({
  serverType: { type: String, required: true }
})

const emit = defineEmits(['update:serverType'])
</script>

<template>
  <div class="server-selector">
    <div class="server-selector-label">
      Servidor
    </div>
    <div class="server-tabs">
      <button 
        :class="['server-tab', { active: serverType === 'online' }]" 
        @click.stop="emit('update:serverType', 'online')"
      >
        <span class="btn-icon">🌐</span>
        <span class="btn-text">Online</span>
      </button>
      <button 
        :class="['server-tab', { active: serverType === 'local' }]" 
        @click.stop="emit('update:serverType', 'local')"
      >
        <span class="btn-icon">💻</span>
        <span class="btn-text">Local</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.server-selector {
  margin-bottom: 24px;
  background: Rgba(0, 0, 0, 0.3);
  padding: 14px;
  border-radius: 16px;
  border: 1px solid Rgba(255, 255, 255, 0.06);
}

.server-selector-label {
  font-size: 9px;
  @include pixelated;
  color: $gray;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.server-tabs {
  display: flex;
  gap: 8px;

  @media (max-width: 400px) {
    flex-direction: column;
  }
}

.server-tab {
  flex: 1;
  padding: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: $gray;
  border-radius: 10px;
  cursor: pointer;
  font-size: 10px;
  @include pixelated;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  line-height: normal;
  white-space: nowrap;
}

.server-tab.active {
  background: $yellow;
  color: $black;
  border-color: $yellow;
}
</style>
