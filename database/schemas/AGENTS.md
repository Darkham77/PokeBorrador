# Purpose

Manage the logic and assets of schemas.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Zero-Duplication Public Projection Views (`trainer_public_profiles`)**: Expose public trainer metrics (`pokedex_caught`, `pokedex_seen`, `trainers_defeated`, `wild_wins`, `war_coins`, `defeated_gyms`) dynamically computed from `game_saves.save_data` using `security_invoker = false` projection views, strictly forbidding duplicate storage columns in `profiles`.
- **Strict RLS Isolation on Game Saves (`game_saves`)**: Access to `game_saves` is strictly isolated to the authenticated owner (`(select auth.uid()) = user_id`), preventing unauthenticated or third-party saves inspection.
- **Chat Messages Privacy Isolation (`chat_messages`)**: Private messages are strictly filtered at RLS level to sender and receiver (`"senderId" = (select auth.uid()) OR type = 'private:' || (select auth.uid())::text`).
- **Financial Integrity Check Constraints**: `market_listings.price` and `trade_offers.offer_money`/`request_money` enforce non-negative check constraints at database level.
- **Automated Award Functions Restriction**: RPC functions `fn_award_ranked_season_automated` and `fn_award_event_automated` are restricted exclusively to `service_role`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
