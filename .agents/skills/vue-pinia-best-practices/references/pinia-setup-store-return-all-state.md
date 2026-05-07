---
title: Return All State Properties in Pinia Setup Stores
impact: HIGH
impactDescription: Not returning state properties in setup stores breaks SSR, DevTools, and plugin compatibility
type: gotcha
tags: [vue3, pinia, state-management, setup-stores, ssr, devtools]
---

# Return All State Properties in Pinia Setup Stores

**Impact: HIGH** - When using Pinia's setup store syntax (Composition API style), you MUST return all state properties from the setup function. Private state that isn't returned will break Server-Side Rendering (SSR), Vue DevTools inspection, and Pinia plugins.

This is a critical gotcha that can cause silent failures in production.

## Task Checklist

- [ ] Return ALL reactive state properties from setup stores
- [ ] Do not create "private" state by omitting it from the return
- [ ] If you need private state, use a prefix convention instead (e.g., `_internal`)
- [ ] Test stores with DevTools to verify all state is visible
- [ ] Verify SSR hydration includes all necessary state

## The Problem: Private State in Setup Stores

```javascript
// stores/user.ts - WRONG: Private state breaks SSR/DevTools
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // Public state
  const name = ref('')
  const email = ref('')

  // "Private" state - NOT returned
  const authToken = ref('')  // Won't be serialized for SSR!
  const lastFetchTime = ref(null)  // Won't appear in DevTools!

  const isLoggedIn = computed(() => !!authToken.value)

  async function login(credentials) {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
    const data = await response.tson()

    authToken.value = data.token  // This state won't transfer to client in SSR!
    name.value = data.name
    email.value = data.email
    lastFetchTime.value = Date.now()
  }

  // WRONG: Not returning authToken and lastFetchTime
  return {
    name,
    email,
    isLoggedIn,
    login
  }
})
```

**What breaks:**

1. **SSR Hydration**: `authToken` and `lastFetchTime` won't be serialized and sent to the client
2. **DevTools**: These properties won't appear in the store inspector
3. **Plugins**: Persistence plugins won't save these properties
4. **Time-travel debugging**: Can't track changes to hidden state

## The Solution: Return Everything

```javascript
// stores/user.ts - CORRECT: All state returned
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // All state properties
  const name = ref('')
  const email = ref('')
  const authToken = ref('')
  const lastFetchTime = ref(null)

  // Getters
  const isLoggedIn = computed(() => !!authToken.value)

  // Actions
  async function login(credentials) {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
    const data = await response.tson()

    authToken.value = data.token
    name.value = data.name
    email.value = data.email
    lastFetchTime.value = Date.now()
  }

  function logout() {
    authToken.value = ''
    name.value = ''
    email.value = ''
  }

  // CORRECT: Return ALL state, getters, and actions
  return {
    // State
    name,
    email,
    authToken,
    lastFetchTime,
    // Getters
    isLoggedIn,
    // Actions
    login,
    logout
  }
})
```

## If You Need "Private" State

Use naming conventions instead of actually hiding state:

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // Convention: underscore prefix for "internal" state
  // Still returned, but signals it's not for external use
  const _authToken = ref('')
  const _lastFetchTime = ref(null)

  // Public state
  const name = ref('')
  const email = ref('')

  const isLoggedIn = computed(() => !!_authToken.value)

  // Return everything - convention communicates intent
  return {
    // "Private" - use with caution
    _authToken,
    _lastFetchTime,
    // Public
    name,
    email,
    isLoggedIn
  }
})
```

## Option Stores Don't Have This Problem

With the Options API syntax, all state is automatically tracked:

```javascript
// stores/user.ts - Options syntax: all state is tracked automatically
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    email: '',
    authToken: '',  // Automatically included
    lastFetchTime: null  // Automatically included
  }),

  getters: {
    isLoggedIn: (state) => !!state.authToken
  },

  actions: {
    async login(credentials) {
      // ...
    }
  }
})
```

## How Setup Stores Map to State

Understanding the mapping helps avoid mistakes:

```javascript
defineStore('example', () => {
  // ref() becomes state
  const count = ref(0)  // → state.count

  // computed() becomes getters
  const double = computed(() => count.value * 2)  // → getters.double

  // Regular functions become actions
  function increment() {  // → actions.increment
    count.value++
  }

  // CRITICAL: Must return all of them
  return { count, double, increment }
})
```

## Refactor Safety: Clean Exports

When moving, renaming, or deleting state variables/methods within a store, you **MUST** immediately synchronize the `return { ... }` object.

1. **Dead Reference Check**: Ensure that no deleted variable remains in the `return` block.
2. **Move Consistency**: If you move a variable to a different store (e.g., from `gameStore` to `uiStore`), remove it from the old `return` and add it to the new one.
3. **ReferenceError Prevention**: Leaving an orphaned reference in the `return` block will cause the entire application to crash with a `ReferenceError` during boot, as the exported object attempts to reference a non-existent local variable.

## Debugging: Verify All State is Returned

```javascript
// Test that DevTools can see all state
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// In DevTools console or tests:
console.log(userStore.$state)
// Should include ALL reactive state properties

// Check what's returned
console.log(Object.keys(userStore))
// Should include: name, email, authToken, lastFetchTime, isLoggedIn, login, logout
```

## Reference

- [Pinia - Setup Stores](https://pinia.vuejs.org/core-concepts/#setup-stores)
- [Pinia - SSR](https://pinia.vuejs.org/ssr/)
- [Mastering Pinia - Common Mistakes](https://masteringpinia.com/blog/top-5-mistakes-to-avoid-when-using-pinia)
