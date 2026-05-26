# Watcher Immediate TDZ ReferenceError

## Problem

When using `watch` with the `{ immediate: true }` option inside a `<script setup>` block, the watcher callback is executed **synchronously** during the setup phase (at the point of the watcher's declaration).

If the watcher callback references any variables, `ref`s, or `computed` properties that are declared lower down in the script block, JavaScript throws a `ReferenceError: Cannot access 'X' before initialization`.

This happens because of JavaScript's **Temporal Dead Zone (TDZ)**: variables declared with `let` or `const` (including computed refs) are not accessible before their physical declaration line, and immediate watchers trigger computation before that line is reached.

### Anti-Pattern Example

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ❌ Watcher is declared at the top and runs immediately!
watch(
  () => processedGrid.value,
  (newGrid) => {
    // Accessing processedGrid immediately triggers evaluation of computed properties
    console.log(newGrid)
  },
  { immediate: true }
)

const items = ref(['bulbasaur', 'charmander'])

// processedGrid depends on spawnGrid
const processedGrid = computed(() => {
  return items.value.map(id => ({ id, sprite: `/sprites/${id}.png` }))
})
</script>
```

In the example above, calling the immediate watcher triggers `processedGrid.value`. When Vue evaluates `processedGrid`, the JavaScript engine realizes that `processedGrid` has not yet been initialized by the `computed` constructor, causing a `ReferenceError`.

---

## Solution

Always declare watchers, especially immediate watchers (`{ immediate: true }` or `watchEffect`), at the **bottom of the setup block** (after all `ref`s, `reactive` state, and `computed` properties have been fully declared and initialized).

### Best Practice Example

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const items = ref(['bulbasaur', 'charmander'])

// 1. Declare state and computed properties first
const processedGrid = computed(() => {
  return items.value.map(id => ({ id, sprite: `/sprites/${id}.png` }))
})

// 2. Declare immediate watchers at the bottom of the script setup block
watch(
  () => processedGrid.value,
  (newGrid) => {
    console.log(newGrid)
  },
  { immediate: true }
)
</script>
```
