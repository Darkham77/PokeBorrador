# Purpose

Manage the logic and assets of profile.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Event Medals and Participations Metric Card**: `ProfileEventStatsCard.vue` visualizes trainer competition statistics including total events participated, total event podium medals, and first (gold 🥇), second (silver 🥈), and third (bronze 🥉) place counts.
- **Competitive Ranked Medals Display Card**: `ProfileRankedMedalsCard.vue` visualizes monthly ranked season tier medals (`bronce`, `plata`, `oro`, `platino`, `diamante`, `maestro`) earned across historical seasons. Renders official 64x64 transparent sprites with fallback emojis, inspectable tooltip with season name and date, empty state with encouragement, and supports both trainer self-profile and public profile modal views (`OtherUserProfileModal.vue`).
- **Pinned Battle Replays Card**: `ProfilePinnedReplaysCard.vue` renders up to 5 favorite battle replays pinned by the trainer, displaying opponent username, format, date, tier, victory/defeat badge, and a direct button to launch the tactical replay spectator or copy the Battle Code.

## Work Guidance

- Ensure clean decoupling, Retro-Modern aesthetics, and zero-warning type safety.

## Verification

- Run `npm run lint` and `npm run test`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
