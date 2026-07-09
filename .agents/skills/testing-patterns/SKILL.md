---
name: testing-patterns
description: Master testing patterns and principles. YOU MUST apply these unit, integration, and mocking strategies to ensure rock-solid code quality. No excuses for untested behavior.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Testing Patterns

> PROACTIVELY apply these principles to build reliable test suites. DO NOT settle for low coverage or flaky tests.

---

## 1. Testing Pyramid

```text
        /\          E2E (Few)
        /\          E2E (Few)
       /  \         Critical flows
      /----\
     /      \       Integration (Some)
    /--------\      API, DB queries
   /          \
  /------------\    Unit (Many)
                    Functions, classes
```

---

## 2. AAA Pattern

| Step | Purpose |
| :--- | :--- |
| **Arrange** | Set up test data |
| **Act** | Execute code under test |
| **Assert** | Verify outcome |

---

## 3. Test Type Selection

### When to Use Each

| Type | Best For | Speed |
| :--- | :--- | :--- |
| **Unit** | Pure functions, logic | Fast (<50ms) |
| **Integration** | API, DB, services | Medium |
| **E2E** | Critical user flows | Slow |

---

## 4. Unit Test Principles

### Good Unit Tests

| Principle | Meaning |
| :--- | :--- |
| Fast | < 100ms each |
| Isolated | No external deps |
| Repeatable | Same result always |
| Self-checking | No manual verification |
| Timely | Written with code |

### What to Unit Test

| Test | Don't Test |
| :--- | :--- |
| Business logic | Framework code |
| Edge cases | Third-party libs |
| Error handling | Simple getters |

---

## 5. Integration Test Principles

### What to Test

| Area | Focus |
| :--- | :--- |
| API endpoints | Request/response |
| Database | Queries, transactions |
| External services | Contracts |

### Setup/Teardown

| Phase | Action |
| :--- | :--- |
| Before All | Connect resources |
| Before Each | Reset state |
| After Each | Clean up |
| After All | Disconnect |

---

## 6. Mocking Principles

### When to Mock

| Mock | Don't Mock |
| :--- | :--- |
| External APIs | The code under test |
| Database (unit) | Simple dependencies |
| Time/random | Pure functions |
| Temporal (Node 26+) | Force Polyfill in `setup.ts` |
| Network | In-memory stores |

### Mock Isolation (CRITICAL)

- **Avoid Multi-Mocking**: Do not call `vi.mock` for the same module multiple times in the same file; Vitest hoists them and the result is unpredictable.
- **Dynamic State Mocks**: Use a single `vi.mock` that returns a shared mock object. Update the properties of this object within each `it` block to change behavior safely without polluting other tests.

### Mock Types

| Type | Use |
| :--- | :--- |
| Stub | Return fixed values |
| Spy | Track calls |
| Mock | Set expectations |
| Fake | Simplified implementation |

---

## 7. Test Organization

### Naming

| Pattern | Example |
| :--- | :--- |
| Should behavior | "should return error when..." |
| When condition | "when user not found..." |
| Given-when-then | "given X, when Y, then Z" |

### Grouping

| Level | Use |
| :--- | :--- |
| describe | Group related tests |
| it/test | Individual case |
| beforeEach | Common setup |

---

## 8. Test Data

### Strategies

| Approach | Use |
| :--- | :--- |
| Factories | Generate test data |
| Fixtures | Predefined datasets |
| Builders | Fluent object creation |

### Principles

- Use realistic data
- Randomize non-essential values (faker)
- Share common fixtures
- Keep data minimal

---

## 9. Best Practices

| Practice | Why |
| :--- | :--- |
| One assert per test | Clear failure reason |
| Independent tests | No order dependency |
| Fast tests | Run frequently |
| Descriptive names | Self-documenting |
| Clean up | Avoid side effects |
| **JSDOM Safety Checks** | Browser APIs (e.g., `IntersectionObserver`, `localStorage`) may be undefined in tests. Always include safety checks (e.g., `if (typeof API === 'undefined') return`) in composables to prevent test crashes. |
| **Prop-Based UI Testing** | For modern components (e.g., `PVTooltip`), verify **Props/Attributes** instead of searching for nested DOM elements. This avoids breakage when elements are **Teleported** or refactored internally. |
| **Asset Resolution Parity** | When migrating assets from external to local, ALWAYS update the corresponding unit tests (e.g., `assets.spec.ts`) to verify the new local path resolution and `.webp` extension. |
| **Sanitization & Recovery** | For "Self-Healing" systems (e.g., legacy data repair), ALWAYS add unit tests that simulate partially corrupt objects to verify successful recovery and prevent reference errors. |
| **TypeScript Global Declarations** | Const globals defined in config files (like `__APP_VERSION__` in `vite.config.ts`) must be explicitly declared in tests using `declare const VAR: type;` to satisfy the TypeScript compiler during pre-commit checks (`vue-tsc --noEmit`). |
| **Static Imports over Dynamic Require** | In ESM-based test graphs (especially with Vitest or Node.js native test runners containing top-level await), dynamic `require()` statements inside loop blocks or helper files will trigger compiler/execution crashes. Use static `import` at the top of the test file instead. |
| **Decoupling Integrity Tests** | Verification tests validating static data integrity (e.g., map configurations) should check against explicit/static registries rather than relying on runtime combat-mechanic helpers (which are subject to dynamic rule changes) to avoid flaky assertions. |

---

## 10. Anti-Patterns

| ❌ Don't | ✅ Do |
| :--- | :--- |
| Test implementation | Test behavior |
| Duplicate test code | Use factories |
| Complex test setup | Simplify or split |
| Ignore flaky tests | Fix root cause |
| Skip cleanup | Reset state |

---

> **Remember:** Tests are documentation. If someone can't understand what the code does from the tests, rewrite them.

---

## 11. Required Mocks for `switchAction` Tests

`switchAction.ts` uses multiple dynamic imports. If any of them is missing from the test's
mock setup, the function crashes before reaching the return statement under test — causing
the assertion to fail for the wrong reason.

When testing `executeSwitch`, always include **all** of these mocks:

| Module | Exports to mock |
| :--- | :--- |
| `@/logic/battle/orchestrator` | `isPlayerTrappedInWorker`, `executeTurnInWorker` |
| `@/logic/battle/showdownWorkerClient` | `executeTurnInWorker`, `syncTeamsFromLastWorkerState` |
| `@/logic/battle/showdownBridge` | `filterShowdownLogs`, `parseShowdownLogLine` |
| `@/stores/ui` | `useUIStore().notify` (required for the trap-abort notification path) |
| `@/logic/pokemon/typeEngine` | `getCombinedEffectiveness` |

Without the `@/stores/ui` mock, the early return inside the trap check never executes,
causing the switch to proceed and the trap assertion to fail silently.
