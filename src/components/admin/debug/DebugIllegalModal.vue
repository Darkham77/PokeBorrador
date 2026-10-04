<script setup lang="ts">
defineProps<{
  title: string
  description: string
  issues: string[]
  emoji?: string
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
          <span
            v-if="emoji"
            class="emoji"
          >{{ emoji }}</span> {{ title }}
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
          <span class="emoji">❌</span> {{ issue }}
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
  z-index: calc(var(--z-max) - 1);
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(0 0 0 / 75%);
  inset: 0;
}

.creator-illegal-modal {
  width: 90%;
  max-width: 500px;
  padding: 1.5rem;
  border: 2px solid #f44;
  border-radius: 8px;
  background: #1e232d;
  color: #fff;
  box-shadow: 0 0 20px rgb(255 68 68 / 40%);
}

.illegal-title {
  margin: 0 0 0.75rem;
  color: #f55;
  font-size: 1.1rem;
  font-weight: bold;
}

.illegal-desc {
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.illegal-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  margin: 0 0 1.25rem;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.illegal-item {
  padding: 0.5rem;
  background: rgb(255 68 68 / 10%);
  color: #fcc;
  font-size: 0.85rem;
  border-left: 3px solid #f44;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
