# Git Safety, Environment & Workflow Protocols

> **Scope & Authority**: This document governs **Git safety confirmations, rollback protocols, uncommitted file protection, scratch directory mandates, prohibition on autonomous commits/pushes, root setup scripts SSoT, and artifact lifecycles** across Poké Vicio.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For full Safe Commit validation pipeline and commit message standards ➔ See [@/safe-commit](../../../safe-commit/SKILL.md).
> - For dependency management and package hygiene ➔ See [Dependency Management Manual](../technical/dependency_management_manual.md).
> - For DOX documentation maintenance ➔ See [Markdown Standards](../technical/markdown_standards.md) and [@/dox-navigator](../../../dox-navigator/SKILL.md).

---

## 1. Rollback & Destructive Action Confirmations

- **Mandatory User Confirmation**: Before executing any Git operation involving a rollback, reset, or destructive change (`git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly ask the user for confirmation.
- **Command Disclosure**: The confirmation request MUST include the exact command(s) about to be executed so the user can review them. Never assume user consent for destructive operations.

## 2. Protection of Uncommitted Files

- Before running massive or bulk modification scripts (e.g. formatters, batch replacements, refactoring utilities) on files with uncommitted changes, the agent MUST either propose committing current changes first or create temporary backups of targeted files inside the `scratch/` directory.

## 3. Autonomous Git Commit & Main Branch Push Prohibitions

- **Commit Prohibition**: It is STRICTLY FORBIDDEN to execute any commit or safe-commit flow autonomously without an explicit user instruction to commit or save the repository. The agent MUST NOT assume completion or initiate the Git pipeline on its own.
- **Main Branch Push Protection Mandate**: AI agents are STRICTLY FORBIDDEN from executing `git push` towards the `main` branch (`origin/main` or while checked out on `main`). Pushing to `main` must always be performed manually by the user.
- **Controlled Push to Non-Main Branches**: When explicitly requested by the user (e.g., "hace push"), the agent MAY execute `git push origin <branch>` ONLY IF the current branch is a non-main branch (such as `desarrollo` or a feature branch) and does not touch or target `main` or any other branch.

## 4. Scratch Directory Output Mandate

- Whenever generating temporary files, debug outputs, text reports, summaries, or validation reports (`.txt`, `.log`, `.json`, etc.), they MUST be stored exclusively in the `scratch/` directory at the project root.
- Dumping temporary reports or scratch files in the root or source directories is strictly prohibited.

## 5. Root Setup Scripts SSoT & Dynamic Versioning Governance

- **Root Setup Scripts SSoT**: Initial environment configuration, Node version updates, and NVM fixes MUST be executed exclusively via the root setup scripts:
  - Windows: [`setup-windows.ps1`](../../../../../setup-windows.ps1) (`PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1`)
  - Linux / macOS: [`setup-linux.sh`](../../../../../setup-linux.sh) (`chmod +x ./setup-linux.sh && ./setup-linux.sh`)
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

