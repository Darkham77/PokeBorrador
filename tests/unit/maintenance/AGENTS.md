# Purpose

Manage the unit tests for maintenance scripts and audit rules.

## Ownership

Tooling & DevOps Engineers.

## Local Contracts

- Test audit rules, zero-timer invariants, and anti-pattern detectors.
- Ensure all custom audit rules in `node_modules/@francogp/auditor/src/suites/architecture/audit_rules.ts` have passing unit tests.

## Work Guidance

- Keep tests isolated and fast.
- Mock file paths and string inputs directly without touching the filesystem.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
