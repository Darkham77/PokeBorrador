---
name: lint-and-validate
description: "Automatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, validate, types, static analysis."
allowed-tools: Read, Glob, Grep, Bash
---

# Lint and Validate Skill

> **MANDATORY:** Run appropriate validation tools after EVERY code change. Do not finish a task until the code is error-free.

## Procedures by Ecosystem

### Node.js / TypeScript

1. **Lint/Fix:** Run `npm run lint` or `npx eslint "path" --fix`
2. **Type Check:** Execute `npx tsc --noEmit`
3. **Audit Security:** Run `npm audit --audit-level=high`

### Python

1. **Lint (Ruff):** Execute `ruff check "path" --fix` (Fast & Modern)
2. **Audit Security (Bandit):** Run `bandit -r "path" -ll`
3. **Type Check (MyPy):** Execute `mypy "path"`

## The Quality Loop

1. **Write/Edit Code**: Implement your changes.
2. **Run Audit**: Execute `npm run lint && npx tsc --noEmit`.
3. **Analyze Report**: Inspect the "FINAL AUDIT REPORT" section.
4. **Fix & Repeat**: Do not submit code with "FINAL AUDIT" failures.

## Error Handling

- **Lint failure**: Fix style or syntax issues immediately.
- **Type failure**: Correct type mismatches before proceeding.
- **No tool configured**: Verify project root for `.eslintrc`, `tsconfig.json`, or `pyproject.toml` and create one if missing.

---
**Strict Rule:** No code should be committed or reported as "done" without passing these checks.

---

## Scripts

| Script | Purpose | Command |
| :--- | :--- | :--- |
| `scripts/lint_runner.py` | Run unified lint checks | `python scripts/lint_runner.py <project_path>` |
| `scripts/type_coverage.py` | Analyze type coverage | `python scripts/type_coverage.py <project_path>` |
