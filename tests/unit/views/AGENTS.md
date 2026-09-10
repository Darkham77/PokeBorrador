# Purpose

Manage unit tests for views.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Async Teardown and Side-Effect Cleanliness**: Views that trigger `nextTick` or `requestAnimationFrame` hooks during mounting must flush microtasks (`await wrapper.vm.$nextTick()`) and stub async store side-effects (`markAppMounted`) before `wrapper.unmount()` to prevent dangling console logs during worker teardown.

## Work Guidance

- Ensure isolated unit testing with zero flakiness.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This domain module does not contain nested sub-directories with independent AGENTS.md files.*
