<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
  id?: string
  show?: boolean
  opponentName?: string
}

withDefaults(defineProps<Props>(), {
  id: '',
  show: true,
  opponentName: 'El oponente'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

function handleClose() {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    title="OPONENTE DESCONECTADO"
    variant="danger"
    max-width="400px"
    padding="compact"
    @close="handleClose"
  >
    <div class="pvp-offline-body">
      <div class="offline-icon emoji">
        📡
      </div>
      <p class="offline-message">
        El oponente no está jugando en este momento.
      </p>
      <div class="offline-actions">
        <button
          id="btn-pvp-offline-ack"
          class="btn-vicio-secondary"
          @click="handleClose"
        >
          ENTENDIDO
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.pvp-offline-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 12px;
  gap: 14px;
}

.offline-icon {
  font-size: 32px;
}

.offline-message {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: #f87171;
  line-height: 1.4;
  margin: 0;
}

.offline-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 8px;

  button {
    min-width: 120px;
  }
}
</style>
