<template>
  <!-- Trigger: html-validate (no-deprecated-attr), template-missing-input-id, mobile touch target -->
  <div align="center" class="bad-container">
    <img src="/logo.png">
    <input type="text" placeholder="No ID input">
    <button style="width: 10px; height: 10px;">Click</button>
    <span>🚀 Emoji directo sin clase canónica</span>
  </div>
</template>

<script>
// Trigger: vue-script-setup-missing, vue-missing-lang-ts
export default {
  name: 'BadComponent',
  mounted() {
    // Trigger: naked-console-call
    console.log("Component mounted");
  }
}
</script>

<style>
/* Trigger: unscoped-component-styles, deep-selector-anti-pattern */
.bad-container >>> .child {
  color: red;
}
</style>
