---
name: lint-and-validate
description: "Automatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, validate, types, static analysis."
---

# Lint and Validate Skill

> **MANDATORY:** Run appropriate validation tools after EVERY code change. Do not finish a task until the code is error-free.

## Procedures by Ecosystem

### Node.ts / TypeScript (Poké Vicio Flow)

It is MANDATORY to run the full verification chain before reporting a task as completed:

1. **Type Check**: `npm run validate:types`
2. **SQL Validation**: `npm run validate:sql`
3. **Items Integrity**: `npm run validate:items`
4. **FSM Audit**: `npm run fsm:audit`
5. **Standard Audit**: `npm run audit` (o `audit:fix` para reparación automática)
6. **Lint/Fix**: `npm run lint`
7. **Unit Tests**: `npm run test`
8. **Production Build**: `npm run build`

> **Note**: Do not skip steps. High-fidelity web games require absolute build integrity.

### Strict ESLint Compliance Rules

- **Intent Comments in Empty Catch Blocks**: To comply with strict ESLint rules (`no-empty`), always include an explicit comment of intention (e.g., `catch { /* ignore */ }`) inside empty catch blocks designed to silence benign errors. Never leave a catch block completely empty.
- **Unused Declarations and Compiler Strictness**: Avoid leaving unexported local variables, helpers, types, or interfaces unused in modified files. The strict TypeScript compiler check (`vue-tsc --noEmit`) will trigger `TS6133` or `TS6196` errors, causing type validation to fail. Either utilize the declarations or remove them entirely to keep type safety green.

### Python

1. **Lint (Ruff):** Execute `ruff check "path" --fix`
2. **Audit Security (Bandit):** Run `bandit -r "path" -ll`
3. **Type Check (MyPy):** Execute `mypy "path"`

### SASS / CSS

1. **Deprecation Check**: Replace legacy SASS ternary `if()` with modern `@if / @else` control blocks.
2. **Variable Safety**: Verify that SASS color functions do not attempt to process CSS `var()` tokens directly.

### Markdown / Documentation

To maintain high documentation standards and clean compilation loops, all manual files (`**/*.md`) are validated using `npm run lint:md` (or `npx markdownlint` with appropriate parameters):

1. **Rule Configuration**:
   - **MD013 (Line Length)**: Disabled (`false`) to prevent false warnings on RouterOS CLI script listings and absolute file/image URLs.
   - **MD024 (Duplicate Headings)**: Configured with `{"siblings_only": true}` to allow structural repeats (such as localized Advantages/Penalties) within separate nested sections.
   - **MD045 (Alt Text)**: Strict alt-text is required for all images; reference-style image blocks must have descriptions (`![Description][ref_image]`).
   - **MD060 (Table Column Style)**: Enforce standard pipe (`|`) spacing to ensure tables are aligned and readable.
2. **Directory Exclusion**: Ignore build outputs, `node_modules`, and developmental chat attachments (`docs/media/**`) to avoid checking irrelevant temporary assets.

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
