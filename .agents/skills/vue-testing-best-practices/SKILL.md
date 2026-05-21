---
name: vue-testing-best-practices
version: 1.0.0
license: MIT
author: github.com/vuejs-ai
description: Use for Vue.ts testing. Covers Vitest, Vue Test Utils, component testing, mocking, testing patterns, and Playwright for E2E testing.
---

Vue.ts testing best practices, patterns, and common gotchas.

### Testing

- Setting up test infrastructure for Vue 3 projects → See [testing-vitest-recommended-for-vue](references/testing-vitest-recommended-for-vue.md)
- Tests keep breaking when refactoring component internals → See [testing-component-blackbox-approach](references/testing-component-blackbox-approach.md)
- Tests fail intermittently with race conditions → See [testing-async-await-flushpromises](references/testing-async-await-flushpromises.md)
- Composables using lifecycle hooks or inject fail to test → See [testing-composables-helper-wrapper](references/testing-composables-helper-wrapper.md)
- Getting "injection Symbol(pinia) not found" errors in tests → See [testing-pinia-store-setup](references/testing-pinia-store-setup.md)
- Components with async setup won't render in tests → See [testing-suspense-async-components](references/testing-suspense-async-components.md)
- Snapshot tests keep passing despite broken functionality → See [testing-no-snapshot-only](references/testing-no-snapshot-only.md)
- Choosing end-to-end testing framework for Vue apps → See [testing-e2e-playwright-recommended](references/testing-e2e-playwright-recommended.md)
- Tests need to verify computed styles or real DOM events → See [testing-browser-vs-node-runners](references/testing-browser-vs-node-runners.md)
- Testing components created with defineAsyncComponent fails → See [async-component-testing](references/async-component-testing.md)
- Teleported modal content can't be found in wrapper queries → See [teleport-testing-complexity](references/teleport-testing-complexity.md)
- **Animation-Driven State**: If a store/component state change is delayed by a timeout (e.g., waiting for modal exit animation), use `vi.useFakeTimers()` and `vi.advanceTimersByTime(...)` in Vitest to advance time. **MANDATORY**: Ensure the advance time EXCEEDS the code's timeout (e.g., use 600ms if the code has a 550ms timeout) to account for any race conditions in the test runner's event loop.
- **Logic Extraction for Testability**: Complex algorithms inside computed properties or methods in `.vue` files are hard to unit test. Extract core pure logic to external helper files (e.g., `mapCardHelper.ts`) and test them in isolation using standard Vitest unit tests. This ensures the "brain" of the component is stable without the overhead of component mounting.
- **CLI Debug Tool Testing**: When unit testing CLI-first debug tools (in `debugStore.ts`), you MUST mock the `DBRouter` or `supabase` layer to prevent real database interactions.
  - **Pattern**: Mock `rpc`, `upsert`, and `from().select()` chains to return predictable results.
  - **MANDATORY**: Ensure the mock handles `getTimeOffset` and `setTimeOffset` correctly if testing time-manipulation tools.
- **Robust Mocks for Combat Logic**: When unit testing complex combat turns (e.g., `battleTurn.ts`) that interact with multiple Pinia stores and the GameBus, ensure the mock store provides a complete and consistent state. This includes nested properties (like `activeBattle.player.moves`) and all required base stats (`atk`, `def`, `maxHp`). Insufficient or shallow mocks often lead to silent failures or "property of undefined" errors during Vitest execution.
- **Mocking GSAP Context in Vitest**: When testing Vue components that utilize `gsap.context()` for managing animation lifecycles, mock `gsap.context` globally in the test setup (e.g., `vitest.setup.ts`). The mock must implement the complete, typed signatures of `.add()`, `.revert()`, `.kill()`, and `.selector()` without resorting to `any` or `@ts-ignore` to satisfy strict linting.
- **Testing Deferred Rendering via IntersectionObserver**: When testing components that conditionally render heavy DOM elements (e.g., `v-if="isVisible"`) based on `IntersectionObserver` visibility:
  - Provide a global mock for `IntersectionObserver` in the test files or setup that satisfies the full TypeScript interface (`root`, `rootMargin`, `scrollMargin`, `thresholds`, `observe()`, `unobserve()`, `disconnect()`, `takeRecords()`).
  - Vue updates the DOM asynchronously; therefore, always use `await wrapper.vm.$nextTick()` after triggering the observer callback before asserting the presence, visibility, or classes of conditional elements.

## Reference

- [Vue.ts Testing Guide](https://vuejs.org/guide/scaling-up/testing)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
