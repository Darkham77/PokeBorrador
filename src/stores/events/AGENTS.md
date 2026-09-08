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
- **Multi-Category Awards & Storage Capacity Pre-Flight Validation**:
  - `fetchPastEvents` MUST populate `myAwards: PendingAward[]` for past event history items, reflecting all sub-competition awards won by the user in that event.
  - When claiming an individual award, `updatePastEventsAwardClaimed` MUST update the award's `received_at` timestamp while keeping `hasUnclaimedAward: true` and `isClaimed: false` if any remaining awards for that event are still unreceived. The card only marks `isClaimed = true` when ALL awards in `myAwards` have been claimed.
  - **Storage Capacity Pre-Flight Guard**: Before claiming any reward (either single via `claimAward` or batch via `claimAllEventAwards`), the store MUST evaluate incoming Pokémon against total available player storage (`validateStorageCapacityForAwards`): `6 - team.length` (team slots) + `(boxCount * 50) - box.length` (PC box slots). If incoming Pokémon exceed available slots, the action MUST abort immediately (fail-fast) before executing any DB RPC or state update, warning the player with exact counts to prevent box overflow and data loss.
- **Post-Capture Event Eligibility & Auto-Enrollment Prompt Contract**: Following combat resolution and reward distribution, before starting the next search phase, the engine evaluates the newly caught Pokémon against all active competition events and sub-competitions (`total_ivs`, `weight` [max/min], `height` [max/min], `level` [max/min], `friendship` [max], `stat_iv` [max]). If the Pokémon qualifies and improves the player's existing record in any category (or is the player's first valid entry), an agile GSAP modal (`EventAutoEnrollModal.vue`) appears offering one-click enrollment. If it improves multiple categories, it displays an interactive category selector allowing the player to choose which category to enroll it in or replace.
- **Greedy Competition Auto-Fill (`autoFillBestEntries` & `#event-auto-fill-btn-${event.id}`)**: Active competition cards across Home (`HomeEventsSection.vue`) and the events modal (`EventCard.vue`) feature an action button `[⚡ AUTO-RELLENAR]` (`#event-auto-fill-btn-${event.id}`). When invoked, `eventStore.autoFillBestEntries(eventId)` executes a greedy optimization algorithm across all owned Pokémon (`team` and PC `boxes`), finding the highest-scoring candidate for each category, guaranteeing zero cross-category participant collisions (one Pokémon cannot represent two categories in the same event), submitting only score-improving assignments, and notifying a consolidated toast summary.

## Work Guidance

- Keep individual action handlers pure and below the 250 LOC threshold.
- Ensure all notification messages match user-facing strings and test expectations.
