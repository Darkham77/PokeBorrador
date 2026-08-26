---
name: project-browser-testing
description: E2E test orchestrator. Delegates environment and simulation protocols to the `@/project-standards/references/qa/browser_testing_manual.md` manual.
---

# Skill: Browser Testing (Orchestrator)

> [!IMPORTANT]
> To perform browser testing, you **MUST** follow the login and simulation protocol detailed in the [Browser Testing Manual](../project-standards/references/qa/browser_testing_manual.md).

## Execution Flow

1. **Local Server**: Ensure that `http://localhost:5174` is active for automated E2E simulations (or `http://localhost:5173` for manual browser debugging).
2. **ASH Login**: Log in as the standard test user.
3. **Simulation Commands**: Use `window.__VITE_DEBUG__` to teleport to the views you want to test.

## 🏁 Final Integrity Check

After verifying behavior in the browser, you **MUST** run the full verification flow to ensure no side effects or type regressions were introduced:

```bash
npm run validate:types
npm run validate:sql
npm run lint
npm run test
npm run build
```

## Diagnostics

If a test fails, perform a dual diagnostic by reviewing both the browser console and the development server logs.
