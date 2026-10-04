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
  gap: 14px;
  padding: 16px 12px;
  text-align: center;
}

.offline-icon {
  font-size: 32px;
}

.offline-message {
  margin: 0;
  color: #f87171;
  font-family: var(--font-pixel);
  font-size: 11px;
  line-height: 1.4;
}

.offline-actions {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 8px;

  button {
    min-width: 120px;
  }
}
</style>
