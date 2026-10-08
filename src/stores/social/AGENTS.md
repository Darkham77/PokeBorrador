# Purpose

Manage social interactions, chat messages, active friends, and private conversations.

## Ownership

Frontend Developers / Social Systems Engineers.

## Local Contracts

- Keep chat logs capped to avoid DOM pollution and memory bloat.
- Coordinate cosmetic loading dynamically through Pinia store lifecycle hooks.
- Format all chat timestamps using `formatChatTimestamp` (today: `HH:mm`, prior to today: `DD/MM/YYYY HH:mm`).

## Key Files

- `chat.ts`: Module implementation.
- `chatCosmetics.ts`: Module implementation.
- `chatDateHelper.ts`: Module implementation.
- `chatPrivate.ts`: Module implementation.
- `chatSanitizer.ts`: Module implementation.
- `social.ts`: Module implementation.
- `socialParser.ts`: Module implementation.

## Work Guidance

- Ensure strict separation of local/online channels inside the chat state.
- Keep direct chat windows synchronized to avoid message loss.

## Verification

- Run `npm run auditor`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
