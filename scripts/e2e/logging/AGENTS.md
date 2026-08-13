# Purpose

Domain module providing an object-oriented execution logging framework for fuzzers and Playwright simulations.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Abstract base class `BaseRunnerLogger` intercepts global `console` calls and routes noisy low-level debug messages to `<logName>_debug.log` under `scripts/e2e/results/reports/`.
- High-level progress logs are displayed on `stdout` (terminal) with percentage formatting via `progressPercent(current, total, message)`.
- Derived classes `FuzzerRunnerLogger` and `SimulationRunnerLogger` customize pattern matching (`isProgressLog`) for domain-specific progress tags.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
