# Purpose

Manage the logic and assets of social.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **PvP Challenge Request Contract**: The battle swords button in `SocialFriendsTab.vue` (`.action-btn.battle`) MUST ONLY be enabled when the target friend is confirmed online (`friend.isOnline === true`). On click, it opens `PvPChallengeModal.vue` allowing the challenger to configure team format (3v3 from `pvpTeam` vs 6v6 from `pvpTeam6`, strictly prohibiting the Adventure team) and level normalization (Real Levels vs Level 50 Flat Rules).
- **Interactive PvP Challenge Toast Contract**: Incoming challenges MUST be rendered via `PvPChallengeToast.vue` at `z-index: var(--z-critical)`. The toast MUST render the challenger's `TrainerAvatar.vue` (including active frames, decor, and level), the username styled with `v-gsap-nick`, and direct action buttons (`[ACEPTAR]` and `[RECHAZAR]`), synthesizing a dedicated retro 8-bit fanfare via `audioEngine.playPvPChallengeSound()`.
- **Disconnection Guard Contract**: Before accepting an incoming challenge, the client MUST verify the challenger's online presence. If the challenger disconnected after issuing the challenge, the invite is cancelled and `PvPOpponentOfflineModal.vue` is displayed with the message *"El oponente no está jugando en este momento"*.
- **Unified Social Rankings & Season Hub Contract**: `SocialRankings.vue` provides 4 sub-views: (1) "Temporada y Recompensas" (countdown timer, current Tier badge, tier progression track, seasonal rules), (2) "Ranking Global" (ELO leaderboard with presence and faction colors), (3) "Podio de Temporadas" (historical winners from `competition_results` with 🥇🥈🥉 podium medals and prize summaries, modularly rendered via `SocialRankingsPodium.vue`), and (4) "Teatro de Batallas" (public featured replays of Top 10 matches, search by Battle Code, and playback launcher). All animations must strictly use GSAP.
- **Asynchronous Leaderboard & Search Challenge Contract**: When challenging any player from `SocialRankings.vue` or `SocialSearchTab.vue` who is currently offline, the client does not block the interaction; it initializes an asynchronous battle against the opponent's dedicated PvP team (3v3 or 6v6 auto-filled from their save) powered by Showdown AI, recording results to `public.passive_battle_reports`.
- **Interactive Battle Code Chat Badge Contract**: Chat messages in `GlobalChat.vue` and `DirectChatWindow.vue` containing a canonical Battle Code pattern (`\bBTL-[A-Z0-9]{4}-[A-Z0-9]{3,4}\b`) automatically render as an interactive retro card displaying combatant names, battle outcome, and an inline [VER REPETICIÓN] button that triggers the tactical replay viewer without navigating away from the active scene.

## Key Files

- `ChatBattleCodeBadge.vue`: Module implementation.
- `ClaimCard.vue`: Module implementation.
- `SocialCenterModal.vue`: Module implementation.
- `SocialRankings.styles.scss`: Module implementation.
- `SocialRankingsSeasonTab.vue`: Module implementation.
- `SocialRankingsTheater.vue`: Module implementation.
- `SocialRequestsTab.vue`: Module implementation.
- `TradeAssetsGrid.vue`: Module implementation.
- `TradeCard.vue`: Module implementation.
- `TradeFooter.vue`: Module implementation.
- `TradeSidePanel.vue`: Module implementation.
- `TrainerCard.vue`: Module implementation.
- `chatBattleCodeHelper.ts`: Module implementation.
- `claimCardHelper.ts`: Module implementation.
- `globalChatHelper.ts`: Module implementation.
- `socialTheaterHelper.ts`: Module implementation.
- `socialTradesHelper.ts`: Module implementation.
- `tradeSidePanelHelper.ts`: Module implementation.
- [`DirectChatMessageRow.vue`](./DirectChatMessageRow.vue): Module implementation.
- [`DirectChatWindow.vue`](./DirectChatWindow.vue): Module implementation.
- [`GlobalChat.vue`](./GlobalChat.vue): Module implementation.
- [`PvPChallengeToast.vue`](./PvPChallengeToast.vue): Module implementation.
- [`SocialFriendsTab.vue`](./SocialFriendsTab.vue): Module implementation.
- [`SocialRankings.vue`](./SocialRankings.vue): Module implementation.
- [`SocialRankingsLeaderboardRow.vue`](./SocialRankingsLeaderboardRow.vue): Module implementation.
- [`SocialRankingsLeaderboardTab.vue`](./SocialRankingsLeaderboardTab.vue): Module implementation.
- [`SocialRankingsPodium.vue`](./SocialRankingsPodium.vue): Module implementation.
- [`SocialSearchResultActions.vue`](./SocialSearchResultActions.vue): Module implementation.
- [`SocialSearchTab.vue`](./SocialSearchTab.vue): Module implementation.
- [`SocialTradesSubNav.vue`](./SocialTradesSubNav.vue): Module implementation.
- [`SocialTradesTab.vue`](./SocialTradesTab.vue): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- Coordinate interactive notifications with `ToastNotification.vue` and GSAP timelines.
- `DirectChatMessageRow.vue`: Child message row component in `DirectChatWindow.vue` encapsulating sender avatar, level, cosmetics, styled nickname, formatted timestamp, and optional `ChatBattleCodeBadge`.
- `SocialRankingsLeaderboardTab.vue`: Subcomponent of `SocialRankings.vue` encapsulating the global ELO leaderboard list.
- `SocialRankingsLeaderboardRow.vue`: Atomic row component rendering an individual player rank card, badges, and challenge action.
- `SocialTradesSubNav.vue`: Atomic sub-navigation bar for trade categories (received, sent, claims) with notification badges and hover effects in `SocialTradesTab.vue`.
- `SocialSearchResultActions.vue`: Encapsulates action buttons (send/accept request) and status badges (pending, friend) for search result items in `SocialSearchTab.vue`.

## Verification

- Run standard validation scripts (`npm run lint`, `npm run auditor`).
- Verify social invite roundtrips via `tests/integration/pvp/pvpInviteLifecycle.spec.ts`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
