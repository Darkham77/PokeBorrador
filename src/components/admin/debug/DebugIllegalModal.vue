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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.creator-illegal-modal-overlay {
  position: fixed;
  z-index: calc(var(--z-max) - 1);
  display: flex;
  justify-content: center;
  align-items: center;
  background: Rgb(0 0 0 / 75%);
  inset: 0;
}

.creator-illegal-modal {
  width: 90%;
  max-width: 500px;
  padding: 1.5rem;
  border: 2px solid var(--red-light);
  border-radius: $radius-lg;
  background: #1e232d;
  color: var(--white);
  box-shadow: var(--shadow-glow-red-lg);
}

.illegal-title {
  margin: 0 0 0.75rem;
  color: var(--red-light);
  font-size: var(--font-18);
  font-weight: bold;
}

.illegal-desc {
  color: var(--slate-300);
  font-size: var(--font-14);
  margin-bottom: 1rem;
}

.illegal-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  max-height: 250px;
  margin: 0 0 1.25rem;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.illegal-item {
  padding: 0.5rem;
  background: Rgb(255 68 68 / 10%);
  color: var(--red-300);
  font-size: var(--font-14);
  border-left: 3px solid var(--red-light);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
