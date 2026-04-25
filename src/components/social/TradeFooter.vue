<script setup>
defineProps({
  message: { type: String, default: '' },
  isGift: { type: Boolean, default: false },
  isSending: { type: Boolean, default: false }
})

defineEmits(['update:message', 'update:isGift', 'send'])
</script>

<template>
  <div class="trade-footer-controls">
    <div class="message-section">
      <textarea 
        :value="message" 
        placeholder="Escribe un mensaje para tu oferta..." 
        class="trade-message-input"
        @input="$emit('update:message', $event.target.value)"
      />
    </div>

    <div class="action-section">
      <label class="gift-toggle">
        <input
          :checked="isGift"
          type="checkbox"
          @change="$emit('update:isGift', $event.target.checked)"
        >
        <span class="toggle-label">🎁 Es un regalo</span>
      </label>

      <button
        class="send-offer-btn"
        :disabled="isSending"
        @click="$emit('send')"
      >
        <span v-if="isSending">PROCESANDO...</span>
        <span v-else>ENVIAR OFERTA</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.trade-footer-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.trade-message-input {
  width: 100%;
  height: 60px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 12px;
  color: $white;
  font-size: 12px;
  resize: none;
  outline: none;
  &:focus { border-color: var(--purple); }
}

.action-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.gift-toggle { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  cursor: pointer;
  input { width: 20px; height: 20px; cursor: pointer; accent-color: var(--purple); }
  .toggle-label { font-size: 10px; @include pixelated; color: $white; }
}

.send-offer-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--purple), #8e24aa);
  border: none;
  border-radius: 14px;
  color: $white;
  @include pixelated;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
    filter: Brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}
</style>
