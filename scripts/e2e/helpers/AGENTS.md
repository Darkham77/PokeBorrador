# AGENTS.md - E2E Test Helpers

Helper utilities and background file writer queues for end-to-end browser simulations and test runners.

## Governance & Rules
- All file paths written or renamed by helper queues MUST be verified and sanitized against directory traversal (reject `..` and enforce relative path bounds).
- Zero fallback policy: explicit error reporting on missing locator elements or invalid simulation payload states.
