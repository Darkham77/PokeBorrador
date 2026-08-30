<script setup lang="ts">
defineProps<{
  title: string
  description: string
  issues: string[]
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div
    id="debug-illegal-pokemon-modal"
    class="creator-illegal-modal-overlay"
    @click.self="emit('close')"
  >
    <div class="creator-illegal-modal">
      <div class="modal-header">
        <h4 class="illegal-title">
          {{ title }}
        </h4>
      </div>
      <p class="illegal-desc">
        {{ description }}
      </p>
      <ul class="illegal-list">
        <li
          v-for="(issue, i) in issues"
          :key="i"
          class="illegal-item"
        >
          <span class="emoji-inline">❌</span> {{ issue }}
        </li>
      </ul>
      <div class="modal-footer">
        <button
          id="debug-illegal-modal-close-btn"
          class="btn-vicio-primary md"
          @click="emit('close')"
        >
          ENTENDIDO
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.creator-illegal-modal-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-max) - 1);
}

.creator-illegal-modal {
  background: #1e232d;
  border: 2px solid #ff4444;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  color: #fff;
  box-shadow: 0 0 20px Rgba(255, 68, 68, 0.4);
}

.illegal-title {
  margin: 0 0 0.75rem 0;
  color: #ff5555;
  font-size: 1.1rem;
  font-weight: bold;
}

.illegal-desc {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: #ccc;
}

.illegal-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
}

.illegal-item {
  background: Rgba(255, 68, 68, 0.1);
  border-left: 3px solid #ff4444;
  padding: 0.5rem;
  font-size: 0.85rem;
  color: #ffcccc;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
