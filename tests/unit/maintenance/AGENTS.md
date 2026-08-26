# Purpose

Manage the unit tests for maintenance scripts and audit rules.

## Ownership

Tooling & DevOps Engineers.

## Local Contracts

- Test audit rules, zero-timer invariants, and anti-pattern detectors.
- Ensure all custom audit rules in `scripts/maintenance/audit_rules.ts` have passing unit tests.

## Work Guidance

- Keep tests isolated and fast.
- Mock file paths and string inputs directly without touching the filesystem.

## Child DOX Index

None (leaf directory).
