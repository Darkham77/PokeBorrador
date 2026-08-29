# Purpose

Actions and business sub-modules for the global events store (`events.ts`).

## Ownership

State Architects / System Logic Developers.

## Local Contracts

- **Modularity**: Actions are decomposed into `eventEnrollmentActions.ts` (competition entry registration and eligibility verification) and `eventAwardsActions.ts` (prize delivery, trophy registration, and past event history sync).
- **Time Synchronization**: All event active windows and competition validations must use server-synchronized timestamps from `timeUtils.ts` (`getServerTime()`, `getServerInstant()`).
- **Data Integrity**: Never mutate user entries without persistence to the backend or local DBRouter.

## Work Guidance

- Keep individual action handlers pure and below the 250 LOC threshold.
- Ensure all notification messages match user-facing strings and test expectations.
