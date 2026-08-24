---
name: fallow
description: MANDATORY engine for codebase intelligence, code auditing, dead code detection, duplication analysis, complexity hotspots, and pre-commit audit triage. YOU MUST trigger this skill whenever the user or task mentions auditing code, reviewing errors, grouping problems, checking code quality, finding duplicates, measuring cyclomatic/cognitive complexity, dead code, unused exports, CWE security findings, or pre-commit/CI checks in BOTH Spanish and English (e.g., "auditar", "auditoría", "errores de auditoría", "agrupa por problemas", "agrupar por problemas", "listar errores", "revisa los errores", "calidad de código", "código duplicado", "triplicados", "complejidad", "dead code", "fallow", "npm run audit", "audit:errors", "audit:summary", "audit:warnings-diff", "audit:human", "cwe", "antipatrones", "code audit", "audit errors", "codebase intelligence"). Enforces deterministic structured JSON grouping via Fallow and project audit tools, strictly prohibiting manual log parsing or raw grepping.
---

# Fallow: Codebase Intelligence & Code Auditing

Fallow is a Rust-native, zero-config codebase intelligence engine for TypeScript and JavaScript repositories. It checks the codebase as a system, providing deterministic evidence on code quality, risk, architecture, dependencies, duplication, and dead code.

Use this skill to run and interpret Fallow commands and unified project audit tools to audit the workspace, group findings by category/file, find refactoring targets, eliminate dead code, or preview auto-fixes.

---

## 🚨 Structured Triage & Grouping Mandate (Zero Manual Grepping)

> [!CRITICAL]
> **Zero Manual Grep & Zero Redundant Re-Execution Mandate**:
> 1. Never parse raw audit outputs using manual terminal grepping (`npm run audit | grep ...`).
> 2. **Never re-run `audit:errors` or other audit commands if `npm run audit:warnings-diff` or `npm run audit` was just executed.** The terminal output from `audit:warnings-diff` prints all project errors directly at the bottom of the output and exports `scratch/warnings_diff_report.json`. Read and act on the existing output immediately without wasting compute on duplicate audit runs.
> Always use the specialized audit commands below to group, rank, and inspect issues deterministically.

### 📋 Rapid Triage Cheatsheet

| Goal | Optimal Command | Format / Purpose |
| :--- | :--- | :--- |
| **Group all errors by category & top files** | `npm run audit:errors` | Structured JSON with violation breakdown and top files |
| **High-level audit summary table** | `npm run audit:summary` | Compact human summary (rule counts + top offender files) |
| **Filter audit to a specific rule** | `npm run audit -- --rule="<name>" --summary` | Targeted rule triage (e.g. `--rule="mágico"`) |
| **Audit changed files only (vs main)** | `node ./node_modules/fallow/bin/fallow audit --changed-since main` | Scoped PR/branch audit of modified files |
| **Code duplication & triplets** | `npm run audit:fallow:triplets`<br>`node ./node_modules/fallow/bin/fallow dupes` | Identifies duplicate and triplicate blocks |
| **Complexity hotspots & refactor targets** | `node ./node_modules/fallow/bin/fallow health --score --hotspots --targets` | Ranked refactoring recommendations |
| **Quick Fallow summary** | `npm run audit:fallow:summary` | Concise terminal summary without log bloat |
| **Export full Fallow report** | `npm run audit:fallow:report` | Saves human-readable report to `scratch/fallow_report.txt` |
| **Auto-fix safe unused code/exports** | `npm run audit:fix` / `node ./node_modules/fallow/bin/fallow fix` | Applies native and Fallow automatic cleanups |

---

## Core Commands

### 1. Unified Codebase Audit

Runs dead code, duplication, and health analyses together:

```bash
npm run fallow
# Or cross-platform direct Node execution:
node ./node_modules/fallow/bin/fallow
```

To run only specific analyses:

```bash
node ./node_modules/fallow/bin/fallow --only dead-code
node ./node_modules/fallow/bin/fallow --only health
```

### 2. Changed-Code Audit (PR/Commit Scoping)

Reviews changed files (typically compared to `main` or another git ref) for introduced issues, dead code, duplication, and complexity:

```bash
node ./node_modules/fallow/bin/fallow audit --changed-since main
```

> [!NOTE]
> Do not pass individual file paths directly as positional arguments to the root command (e.g. `npx fallow file.ts` returns an unrecognized subcommand error). Use `fallow audit` with `--base` or `--changed-since` ref to scope the analysis to the changed files.

To output machine-readable JSON for automatic processing or grading:

```bash
node ./node_modules/fallow/bin/fallow audit --format json
```

### 3. Dead Code & Cleanup Opportunities

Detects unused files, unused exports, unused class/enum members, circular dependencies, boundary violations, and unused or unlisted external/monorepo package dependencies:

```bash
node ./node_modules/fallow/bin/fallow dead-code
```

Key flags:

- `--unused-exports`: Only check for unused exports.
- `--circular-deps`: Only report circular dependencies.
- `--boundary-violations`: Only report boundary violations.
- `--stale-suppressions`: Only find stale suppression comments.
- `--production`: Exclude test/dev/storybook files from the analysis.
- `--include-entry-exports`: Force analysis of exports from entry points.

### 4. Code Duplication

Finds copy-pasted blocks using suffix-array algorithms:

```bash
node ./node_modules/fallow/bin/fallow dupes
```

Key flags:

- `--mode <strict|mild|weak|semantic>`: Override detection mode (mild is default, semantic finds renamed variables/literals).
- `--skip-local`: Only report cross-directory duplication.
- `--trace <file:line | dup:id>`: Deep-dive a clone group.

### 5. Health & Complexity

Analyzes complexity thresholds, maintainability indexes, and refactoring targets:

```bash
node ./node_modules/fallow/bin/fallow health --score --hotspots --targets
```

Key flags:

- `--score`: Compute overall codebase health score (0-100) with a letter grade.
- `--targets`: List ranked refactoring recommendations.
- `--effort <low|medium|high>`: Filter refactoring targets by effort required.
- `--hotspots`: Highlight riskiest files based on git churn and complexity.
- `--coverage <path>`: Integrate static test coverage gaps from files like `coverage-final.json`.

> [!IMPORTANT]
> **Minimum Health Score Mandate (85/100)**:
> The minimum acceptable codebase health score is **85/100**. Any score below 85 is strictly non-compliant.
> If `node ./node_modules/fallow/bin/fallow health --score` yields a score lower than 85, you MUST:
> 1. Run `node ./node_modules/fallow/bin/fallow health --targets --hotspots` to get Fallow's ranked refactoring recommendations and risky hotspots.
> 2. Follow Fallow's specific recommendations to reduce cognitive and cyclomatic complexity, break up large modules, and eliminate dead code or duplication.
> 3. Re-run `node ./node_modules/fallow/bin/fallow health --score` iteratively until the score is strictly 85 or higher.

### 6. Automatic Fixes

Fallow supports safe automatic cleanup of unused exports or dead code:

```bash
node ./node_modules/fallow/bin/fallow fix
```

> [!IMPORTANT]
> Because this project utilizes dynamic loading, router interfaces, and public APIs, running automatic fixes (`fallow fix`) can strip the `export` keyword from those entries and break TypeScript compilation or routing.
> To prevent this, you **MUST** manually add surgical, specific export exceptions one by one in `.fallowrc.json` under `"ignoreExports"`.
> The use of wildcard `*` exclusions is strictly forbidden. Every dynamic or public export that needs to be preserved must be added individually.

Preview or dry-run cleanup:

```bash
node ./node_modules/fallow/bin/fallow fix --dry-run
```

### 7. Explanation of Rules

Explain the logic behind any specific finding without running a full analysis:

```bash
node ./node_modules/fallow/bin/fallow explain unused-export
```

---

## Agent Integration Workflow

When auditing codebase logic, triaging errors, or completing tasks:

1. **Structured Diagnostic Scan**: Run `npm run audit:errors` or `npm run audit:summary` to get an instant breakdown of violations grouped by category and top offending files.
2. **Duplication & Hotspots Scan**: Run `npm run audit:fallow:triplets` and `node ./node_modules/fallow/bin/fallow health --score --hotspots --targets` to see structural debt.
3. **Apply Surgical Fixes**: Fix issues file-by-file starting with the highest-ranked hotspots.
4. **Verify Health Compliance**: Run `node ./node_modules/fallow/bin/fallow health --score` to ensure health score is **>= 85**.
5. **Regression Check**: Run `node ./node_modules/fallow/bin/fallow audit --changed-since main` to confirm 0 new issues are introduced.

---

## Integration with Project Audit Scripts

Fallow is integrated directly into the workspace's NPM auditing scripts:

- **`npm run audit:full`**: Executes all unit tests, project audits, validation scripts, and runs **`node ./node_modules/fallow/bin/fallow`** to check dead-code, duplication, and health.
- **`npm run audit:fix`**: Applies the project's native fixes and automatically runs **`node ./node_modules/fallow/bin/fallow fix`** to clean up unused code and exports.
- **`npm run audit:summary`**: Executes the project's native audit summary and automatically follows up with **`node ./node_modules/fallow/bin/fallow --summary`**.
- **`npm run audit:fallow:summary`**: Runs a quick summary of Fallow diagnostics to avoid cluttering the terminal.
- **`npm run audit:fallow:report`**: Exports the complete human-readable Fallow audit report to the safe directory `scratch/fallow_report.txt` for deeper study.

> [!TIP]
> The **native project auditor** (`npm run audit`) also supports powerful CLI flags for targeted triage. Pass them after `--`:
> - `--rule="<partial-name>"` — filter to one rule (e.g. `--rule="mágico"` for magic-number errors).
> - `--summary` — compact rule-count + top-files table. **Always use before a full listing to avoid terminal floods.**
> - `--top=N` / `-t N` — control the top-offenders table size (default 15).
> - `--json` / `-j` — machine-readable JSON output, pipeable into scripts or `jq`.
> - `--errors-only` — suppress warnings, show only hard errors.
>
> **Quick recipe:** `npm run audit -- --rule="mágico" --summary --top=30`

---

## Node 26+ Programmatic & Configuration Practices

- **Programmatic Sandbox Spawning & Direct Binary Execution**: All programmatic calls to Fallow or internal CLIs MUST use `node ./node_modules/fallow/bin/fallow --format json` instead of `spawnSync('npx', ...)` or `npx fallow`. Invoking `npx` under Windows 11 triggers OS SmartScreen/App Control alerts due to `cmd.exe` subshell path resolution. Always configure a large buffer size (`maxBuffer: 10 * 1024 * 1024` or more) when capturing stdout to avoid `ENOBUFS` buffer overflow errors on large codebases.
- **Dependency & Export Ignores**: Backend/test libraries (like `postgres` or `@pkmn/sim`) not imported in client bundles but declared in `package.json` must be added to `"ignoreDependencies"` in `.fallowrc.json`. Legitimate unused exports (for public APIs, dynamic loading, or shared data structures) MUST be added surgically one by one in `.fallowrc.json` under `"ignoreExports"`. **The use of wildcards (`*`) to ignore entire files is strictly prohibited** to ensure Fallow continues auditing code health in those modules.

---

## ignorePatterns vs entry — Critical Distinction (LESSON LEARNED)

These two fields in `.fallowrc.json` serve different purposes and MUST NOT be confused:

- **`ignorePatterns`**: Suppresses **file-level analysis** (CWE security warnings, complexity, duplication). Use for internal Node tooling scripts (e.g., `scripts/e2e/fuzzer/**`, `scripts/e2e/battle/**`) that produce false positive security warnings (CWE-22 path traversal, CWE-532 log taint) because they are trusted internal tools, not user-facing code.

- **`entry`**: Defines the **import graph roots** for dead export detection. Add `scripts/e2e/**/*.ts` and `scripts/maintenance/**/*.ts` here so that imports FROM those scripts are recognized as live consumers of `src/` exports.

**A file can be in:**
- `entry` only → analyzed for dead exports (its imports count as consumers), subject to file-level audit
- `ignorePatterns` only → excluded entirely from all analysis
- Both `ignorePatterns` AND implicitly in `entry` via a parent glob → **THIS IS THE TRAP**: file-level analysis is suppressed, but its imports are still counted as consumers

**NEVER put all `scripts/**` in `ignorePatterns`** — it blinds dead export detection for any `src/` export consumed only by scripts, causing Fallow to falsely flag them as unused and potentially leading to their incorrect removal.

**Correct pattern for scripts:**
```json
{
  "ignorePatterns": ["scripts/e2e/fuzzer/**", "scripts/e2e/battle/**", "scripts/maintenance/**"],
  "entry": ["scripts/e2e/**/*.ts", "scripts/maintenance/**/*.ts"]
}
```
This way: `scripts/e2e/e2e_helpers.ts` is a graph root (its imports from `src/` count), but `scripts/e2e/fuzzer/core/fuzzer_engine.ts` is excluded from file-level CWE/duplication analysis.
