# Purpose

Manage the logic and assets of auth.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Key Files

- `AuthLocalLogin.vue`: Module implementation.
- `AuthLocalSignup.vue`: Module implementation.
- `AuthOnlineLogin.vue`: Module implementation.
- `AuthOnlineSignup.vue`: Module implementation.
- `AuthServerSelector.vue`: Module implementation.
- `SessionConflictModal.vue`: Module implementation.
- [`LoginExpiredNotice.vue`](./LoginExpiredNotice.vue): Module implementation.
- [`LoginPwaUpdateBanner.vue`](./LoginPwaUpdateBanner.vue): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Login Banner Modularization (`LoginExpiredNotice.vue`, `LoginPwaUpdateBanner.vue`)**: Encapsulates the session-expired alert and the PWA version update banner (with GSAP progress bar animation) into standalone auth subcomponents to minimize `LoginView.vue` template rendering complexity.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
