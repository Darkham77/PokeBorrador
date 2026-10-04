<script setup lang="ts">
interface Props {
  message?: string
  isGift?: boolean
  isSending?: boolean
}

withDefaults(defineProps<Props>(), {
  message: '',
  isGift: false,
  isSending: false
})

const emit = defineEmits<{
  (e: 'update:message', val: string): void
  (e: 'update:isGift', val: boolean): void
  (e: 'send'): void
}>()

const handleMessageInput = (e: Event) => {
  emit('update:message', (e.target as HTMLTextAreaElement).value)
}

const handleGiftChange = (e: Event) => {
  emit('update:isGift', (e.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="trade-footer-controls">
    <div class="message-section">
      <textarea 
        :value="message" 
        placeholder="Escribe un mensaje para tu oferta..." 
        class="trade-message-input"
        @input="handleMessageInput"
      />
    </div>

    <div class="action-section">
      <label class="gift-toggle">
        <input
          :checked="isGift"
          type="checkbox"
          @change="handleGiftChange"
        >
        <span class="toggle-label"><span class="emoji">🎁</span> Es un regalo</span>
      </label>

      <button
        class="send-offer-btn"
        :disabled="isSending"
        @click.stop="$emit('send')"
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
  padding: 12px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 14px;
  background: Rgb(0 0 0 / 30%);
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

  @media (width <= 480px) {
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
  .toggle-label { @include pixelated; color: $white; font-size: 10px; }
}

.send-offer-btn {
  @include pixelated;

  padding: 16px 32px;
  border: none;
  border-radius: 14px;
  background: Linear-Gradient(135deg, var(--purple), Rgb(142 36 170 / 100%));
  color: $white;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 15px Rgb(168 85 247 / 30%);
  

  &:hover:not(:disabled) {
    transform: Translatey(-2px);
    box-shadow: 0 6px 20px Rgb(168 85 247 / 50%);
    will-change: transform, filter, opacity;
  filter: Brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}
</style>
