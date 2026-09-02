# Purpose

Actions and business sub-modules for the global events store (`events.ts`).

## Ownership

State Architects / System Logic Developers.

## Local Contracts

- **Modularity**: Actions are decomposed into `eventEnrollmentActions.ts` (competition entry registration and eligibility verification) and `eventAwardsActions.ts` (prize delivery, trophy registration, and past event history sync).
- **Time Synchronization**: All event active windows and competition validations must use server-synchronized timestamps from `timeUtils.ts` (`getServerTime()`, `getServerInstant()`).
- **Data Integrity**: Never mutate user entries without persistence to the backend or local DBRouter.
- **Award Validation & Safe Discard**: All pending awards must be checked against `isAwardClaimable` before processing claims. Legacy/invalid awards are blocked from claiming and can strictly only be discarded via `discardAward`, executing table deletions and atomic reactive state updates.
- **Competition Entries Primary Key & UUID Compliance**: The `competition_entries` table defines its primary key `id` as `UUID DEFAULT gen_random_uuid()`. Upsert payloads MUST NEVER pass synthetic composite text strings (e.g. `${eventId}:${categoryId}:${authStore.user.id}`) into `id`. Let PostgreSQL generate or preserve the UUID automatically via `onConflict: 'event_id, category_id, player_id'`.
- **Automated Awarding RPC Error Visibility & Concluded Event Processing**: In `eventsStore` (`fetchEvents()`), automated event awarding calls to `db.rpc('fn_award_event_automated')` MUST NOT silently swallow errors. All RPC failures MUST be logged via `logger.error` with full error context. Concluded competition checking MUST inspect all distinct `event_id` entries in `competition_entries` and trigger awarding even if an event configuration has concluded, has been deactivated (`active = false`), or represents a legacy alias (`hora_magikarp` vs `torneo_pesca`), ensuring player entries are never orphaned.

## Work Guidance

- Keep individual action handlers pure and below the 250 LOC threshold.
- Ensure all notification messages match user-facing strings and test expectations.
