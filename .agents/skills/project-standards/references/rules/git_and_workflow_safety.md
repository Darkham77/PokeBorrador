# Git Safety, Environment & Workflow Protocols

This document governs Git operations, safety confirmations, uncommitted file protection, environment setup scripts, artifact governance, and output folder standards across Poké Vicio.

## 1. Rollback & Destructive Action Confirmations

- **Mandatory User Confirmation**: Before executing any Git operation involving a rollback, reset, or destructive change (`git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly ask the user for confirmation.
- **Command Disclosure**: The confirmation request MUST include the exact command(s) about to be executed so the user can review them. Never assume user consent for destructive operations.

## 2. Protection of Uncommitted Files

- Before running massive or bulk modification scripts (e.g. formatters, batch replacements, refactoring utilities) on files with uncommitted changes, the agent MUST either propose committing current changes first or create temporary backups of targeted files inside the `scratch/` directory.

## 3. Autonomous Git Commit & Push Prohibitions

- **Commit Prohibition**: It is STRICTLY FORBIDDEN to execute any commit or safe-commit flow autonomously without an explicit user instruction to commit or save the repository. The agent MUST NOT assume completion or initiate the Git pipeline on its own.
- **Manual Push Mandate**: Agents are FORBIDDEN from executing `git push`. Always inform the user when the local repository is clean so they can push manually when ready.

## 4. Scratch Directory Output Mandate

- Whenever generating temporary files, debug outputs, text reports, summaries, or validation reports (`.txt`, `.log`, `.json`, etc.), they MUST be stored exclusively in the `scratch/` directory at the project root.
- Dumping temporary reports or scratch files in the root or source directories is strictly prohibited.

## 5. Root Setup Scripts SSoT & Dynamic Versioning Governance

- **Root Setup Scripts SSoT**: Initial environment configuration, Node version updates, and NVM fixes MUST be executed exclusively via the root setup scripts:
  - Windows: [`setup-windows.ps1`](../../../setup-windows.ps1) (`PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1`)
  - Linux / macOS: [`setup-linux.sh`](../../../setup-linux.sh) (`chmod +x ./setup-linux.sh && ./setup-linux.sh`)
- **Zero-Hardcode Versioning Policy**: It is STRICTLY FORBIDDEN to hardcode Node.js or npm version numbers inside environment setup scripts, maintenance tools, or documentation tutorials. All scripts MUST dynamically parse the required version from the `"engines"` field in `package.json` (`pkgContent.engines.node`).
- **Environment Audit & Pre-Check**: Pre-install checks (`node --experimental-strip-types scripts/maintenance/check_environment.ts`) automatically validate runtime environment requirements. Whenever outdated Node/npm versions or broken Windows NVM symlinks are detected, instruct the user to run the appropriate root setup script.

## 6. Artifact Governance Lifecycle (MANDATORY)

To ensure rigor and traceability, every complex task MUST follow the artifact lifecycle:
1. **Planning**: Create `implementation_plan.md`. Wait for approval from the user.
2. **Execution**: Maintain `task.md` as the source of truth during implementation.
3. **Closure**: Create `walkthrough.md` with concrete evidence (test logs, screenshots) of task success.

## 7. CLI Execution Safety & No Interactive Background Tasks

- **Prohibition on Multi-Line Inline Node CLI Commands (`noInteractiveCliHangs`)**: AI agents MUST NEVER run multi-line inline scripts (`npx tsx -e "..."` or `node -e "..."`) in terminal background tasks on Windows. Doing so causes child processes to hang or await interactive stdin indefinitely.
- **Dedicated Test/Script Files Mandate**: All validations, diagnostics, and test executions MUST be conducted using dedicated Vitest test files (`npx vitest run <path>`) or dedicated script files in `scripts/` or `scratch/`.

