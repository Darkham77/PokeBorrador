---
name: fallow
description: Use fallow to perform deterministic static codebase intelligence (dead code, complexity, duplication, architecture, dependencies) on TypeScript and JavaScript codebases. Trigger this skill whenever the user or task mentions auditing code, running codebase intelligence, checking for dead code or unused exports, finding code duplication, checking health/complexity scores, or running pre-commit/CI code audits.
---

# Fallow: Codebase Intelligence & Code Auditing

Fallow is a Rust-native, zero-config codebase intelligence engine for TypeScript and JavaScript repositories. It checks the codebase as a system, providing deterministic evidence on code quality, risk, architecture, dependencies, duplication, and dead code.

Use this skill to run and interpret Fallow commands to audit the workspace, find refactoring targets, eliminate dead code, or preview auto-fixes.

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
npx fallow --only dead-code
npx fallow --only health
```

### 2. Changed-Code Audit (PR/Commit Scoping)

Reviews changed files (typically compared to `main` or another git ref) for introduced issues, dead code, duplication, and complexity:

```bash
npx fallow audit --changed-since main
```

> [!NOTE]
> Do not pass individual file paths directly as positional arguments to the root command (e.g. `npx fallow file.ts` returns an unrecognized subcommand error). Use `npx fallow audit` with `--base` or `--changed-since` ref to scope the analysis to the changed files.

To output machine-readable JSON for automatic processing or grading:

```bash
npx fallow audit --format json
```

### 3. Dead Code & Cleanup Opportunities

Detects unused files, unused exports, unused class/enum members, circular dependencies, boundary violations, and unused or unlisted external/monorepo package dependencies:

```bash
npx fallow dead-code
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
npx fallow dupes
```

Key flags:

- `--mode <strict|mild|weak|semantic>`: Override detection mode (mild is default, semantic finds renamed variables/literals).
- `--skip-local`: Only report cross-directory duplication.
- `--trace <file:line | dup:id>`: Deep-dive a clone group.

### 5. Health & Complexity

Analyzes complexity thresholds, maintainability indexes, and refactoring targets:

```bash
npx fallow health --score --hotspots --targets
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
> If `npx fallow health --score` yields a score lower than 85, you MUST:
> 1. Run `npx fallow health --targets --hotspots` to get Fallow's ranked refactoring recommendations and risky hotspots.
> 2. Follow Fallow's specific recommendations to reduce cognitive and cyclomatic complexity, break up large modules, and eliminate dead code or duplication.
> 3. Re-run `npx fallow health --score` iteratively until the score is strictly 85 or higher.

### 6. Automatic Fixes

Fallow supports safe automatic cleanup of unused exports or dead code:

```bash
npx fallow fix
```

> [!IMPORTANT]
> Because this project utilizes dynamic loading, router interfaces, and public APIs, running automatic fixes (`npx fallow fix`) can strip the `export` keyword from those entries and break TypeScript compilation or routing.
> To prevent this, you **MUST** manually add surgical, specific export exceptions one by one in `.fallowrc.json` under `"ignoreExports"`.
> The use of wildcard `*` exclusions is strictly forbidden. Every dynamic or public export that needs to be preserved must be added individually.

Preview or dry-run cleanup:

```bash
npx fallow fix --dry-run
```

### 7. Explanation of Rules

Explain the logic behind any specific finding without running a full analysis:

```bash
npx fallow explain unused-export
```

---

## Agent Integration Workflow

When modifying codebase logic or completing tasks:

1. **Analyze Pre-existing State**: Run `npx fallow` or `npx fallow audit` and `npx fallow health --score` to establish a baseline.
2. **Apply Changes**: Perform refactoring, write new features, or clean up unused code.
3. **Verify Compliance**: Run `npx fallow health --score` to verify the codebase health score is **>= 85**. If the score is below 85, inspect `npx fallow health --targets --hotspots`, follow Fallow's advice, and refactor until score is **>= 85**.
4. **Detect Regressions & Clean Up**: Run `npx fallow audit --format json` or `npx fallow --format json` to detect new issues, and use `npx fallow fix` to resolve safe findings automatically before submitting code for review.

---

## Integration with Project Audit Scripts

Fallow is integrated directly into the workspace's NPM auditing scripts:

- **`npm run audit:full`**: Executes all unit tests, project audits, validation scripts, and runs **`npx fallow`** to check dead-code, duplication, and health.
- **`npm run audit:fix`**: Applies the project's native fixes and automatically runs **`npx fallow fix`** to clean up unused code and exports.
- **`npm run audit:summary`**: Executes the project's native audit summary and automatically follows up with **`npx fallow --summary`**.
- **`npm run audit:fallow:summary`**: Runs a quick summary of Fallow diagnostics to avoid cluttering the terminal.
- **`npm run audit:fallow:report`**: Exports the complete human-readable Fallow audit report to the safe directory `scratch/fallow_report.txt` for deeper study.

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

