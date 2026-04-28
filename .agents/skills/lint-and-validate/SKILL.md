---
name: lint-and-validate
description: "Automatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, validate, types, static analysis."
---

# Lint and Validate Skill

> **MANDATORY:** Run appropriate validation tools after EVERY code change. Do not finish a task until the code is error-free.

## Procedures by Ecosystem

### Node.js / TypeScript

1. **Lint/Fix:** Run `npm run lint` or `npx eslint "path" --fix`
2. **Type Check:** Execute `npx tsc --noEmit`
3. **Audit Security:** Run `npm audit --audit-level=high`
4. **Production Build Integrity**: ALWAYS run `npm run build` after UI/SASS changes to catch syntax errors that may break the production bundle.

### Python

1. **Lint (Ruff):** Execute `ruff check "path" --fix`
2. **Audit Security (Bandit):** Run `bandit -r "path" -ll`
3. **Type Check (MyPy):** Execute `mypy "path"`

### SASS / CSS

1. **Deprecation Check**: Replace legacy SASS ternary `if()` with modern `@if / @else` control blocks.
2. **Variable Safety**: Verify that SASS color functions do not attempt to process CSS `var()` tokens directly.

---

> **Note for Poké Vicio**: Project-specific validation scripts (Hybrid Detection, Capitalization Audit, CSS Redundancy) have been moved to the [Manual de Validación y Calidad](../project-standards/references/validation_manual.md).

## The Quality Loop

1. **Write/Edit Code**: Implement your changes.
2. **Run Audit**: Execute the standard lint/build commands.
3. **Analyze Report**: Fix all errors.
4. **Fix & Repeat**: Do not submit code with failures.

## Error Handling

- **Lint failure**: Fix style or syntax issues immediately.
- **Type failure**: Correct type mismatches before proceeding.
- **No tool configured**: Verify project root for config files.

---

**Strict Rule:** No code should be committed or reported as "done" without passing these checks.
