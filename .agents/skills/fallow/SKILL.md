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
npx fallow
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

### 6. Automatic Fixes
Preview or apply safe automatic cleanup of unused exports or dead code:
```bash
npx fallow fix --dry-run
npx fallow fix
```

### 7. Explanation of Rules
Explain the logic behind any specific finding without running a full analysis:
```bash
npx fallow explain unused-export
```

---

## Agent Integration Workflow

When modifying codebase logic or completing tasks:
1. **Analyze Pre-existing State**: Run `npx fallow` or `npx fallow audit` to establish a baseline.
2. **Apply Changes**: Perform refactoring, write new features, or clean up unused code.
3. **Verify Compliance**: Run `npx fallow audit --format json` or `npx fallow --format json` to detect regressions.
4. **Auto-correct Issues**: Use `npx fallow fix` to resolve safe findings automatically before submitting code for human review.

---

## Integration with Project Audit Scripts

Fallow is integrated directly into the workspace's NPM auditing scripts:
- **`npm run audit:full`**: Executes all unit tests, project audits, validation scripts, and runs **`npx fallow`** to check dead-code, duplication, and health.
- **`npm run audit:fix`**: Applies the project's native fixes and automatically runs **`npx fallow fix`** to clean up unused code and exports.
- **`npm run audit:summary`**: Executes the project's native audit summary and automatically follows up with **`npx fallow --summary`**.
- **`npm run audit:fallow:summary`**: Runs a quick summary of Fallow diagnostics to avoid cluttering the terminal.
- **`npm run audit:fallow:report`**: Exports the complete human-readable Fallow audit report to the safe directory `scratch/fallow_report.txt` for deeper study.


