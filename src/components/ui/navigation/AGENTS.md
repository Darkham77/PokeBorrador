# Purpose

Manage modular navigation groups and interactive menu buttons for the HUD.

## Ownership

Frontend Developers.

## Local Contracts

- Follow standard repository modularity and Fallow SSoT complexity guidelines.
- Keep GSAP transitions scoped and coordinated with useNavigationState.

## Key Files

- `HUD_NavMarketGroup.vue`: Module implementation.
- `HUD_NavPokemonGroup.vue`: Module implementation.
- `HUD_NavSocialGroup.vue`: Module implementation.

## Work Guidance

- Use :position="position" and scoped CSS classes (.pos-top, .pos-bottom) for dropdown styling.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
