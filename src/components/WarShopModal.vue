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
      <div
        class="modal-content-premium"
        style="padding:24px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto;"
      >
        <button
          class="modal-close-btn"
          @click="closeWarShop"
        >
          ✕
        </button>
        <h2 style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--yellow);margin-bottom:12px;">
          🛒 Tienda de Guerra
        </h2>
        <div id="war-shop-items" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--gray);
  font-size: 20px;
  cursor: pointer;
}
</style>
