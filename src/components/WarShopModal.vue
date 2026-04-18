<script setup>
const closeWarShop = () => {
  if (typeof window.closeWarShop === 'function') {
    window.closeWarShop()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      id="war-shop-modal"
      class="modal-overlay"
    >
      <div class="modal-content-premium war-shop-container">
        <button
          class="modal-close-btn"
          @click="closeWarShop"
        >
          ✕
        </button>
        <h2 class="war-shop-title">
          🛒 Tienda de Guerra
        </h2>
        <div id="war-shop-items" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.war-shop-container {
  padding: 24px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.war-shop-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--yellow);
  margin-bottom: 12px;
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--gray);
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: Scale(1.1);
    color: var(--red);
  }
}
</style>
