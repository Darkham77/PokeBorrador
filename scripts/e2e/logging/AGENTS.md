# Purpose

Domain module providing an object-oriented execution logging framework for fuzzers and Playwright simulations.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Abstract base class `BaseRunnerLogger` intercepts global `console` calls and routes noisy low-level debug messages to `<logName>_debug.log` under `scripts/e2e/results/reports/`.
- High-level progress logs are displayed on `stdout` (terminal) with percentage formatting via `progressPercent(current, total, message)`.
- Derived classes `FuzzerRunnerLogger` and `SimulationRunnerLogger` customize pattern matching (`isProgressLog`) for domain-specific progress tags.
- **Console Progress Stream Interception & Visual Dividers Protocol**: Any visual dividers (such as Unicode `━` or `─` horizontal bars), lifecycle banners, or suite headers emitted to `stdout` for real-time developer feedback MUST explicitly match `progressPatterns` in `isProgressLog(line)` within `SimulationRunnerLogger` and `FuzzerRunnerLogger`. Unmatched output is automatically routed to background debug buffers (`_debug.log`), silencing critical terminal indicators.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
