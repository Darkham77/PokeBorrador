# Purpose

Manage the logic and assets of auth.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dead State Chain Rule**: When removing a write-only state variable or its setter (e.g., `setLastLoadedSaveTime`), you MUST trace and remove ALL upstream sites that compute the value passed to that setter. Leaving orphaned assignment-only code behind produces TS6133 errors. Checklist: (1) grep all call sites of the setter, (2) check if the computed value serves any other purpose, (3) if not, delete the entire computation block together with the call site.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.
