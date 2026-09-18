# Purpose

Manage the logic and assets of auth.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Login Banner Modularization (`LoginExpiredNotice.vue`, `LoginPwaUpdateBanner.vue`)**: Encapsulates the session-expired alert and the PWA version update banner (with GSAP progress bar animation) into standalone auth subcomponents to minimize `LoginView.vue` template rendering complexity.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
