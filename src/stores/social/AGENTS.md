# Purpose

Manage social interactions, chat messages, active friends, and private conversations.

## Ownership

Frontend Developers / Social Systems Engineers.

## Local Contracts

- Keep chat logs capped to avoid DOM pollution and memory bloat.
- Coordinate cosmetic loading dynamically through Pinia store lifecycle hooks.

## Work Guidance

- Ensure strict separation of local/online channels inside the chat state.
- Keep direct chat windows synchronized to avoid message loss.

## Verification

- Run `npm run lint`.
