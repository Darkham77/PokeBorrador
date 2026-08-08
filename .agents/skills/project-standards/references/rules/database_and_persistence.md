# Database & Persistence Governance

This document governs DBRouter isolation, save state shields, remote DB protection, and Showdown status parity across Poké Vicio.

## 1. Context Isolation (DBRouter)

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.
- Run `npm run validate:sql` before committing database-related changes.

## 2. Zero-Pokemon Save Prohibition (Save Shield)

- To prevent data corruption or accidental reset overlays, it is STRICTLY FORBIDDEN to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`.
- A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.

## 3. Absolute Prohibition on Remote Database Updates

- It is STRICTLY FORBIDDEN for any AI agent to execute, run, or trigger database update/migration scripts (e.g., `npm run servers:db:update`) against any remote, Docker-based, or shared database profile (including `server_franco`, `cloud`, or `official_prod`).
- Agents must NEVER touch or update remote/shared databases; database migrations are strictly reserved for manual execution by the USER.

## 4. Simulator Parity & Nickname Constraints

- **UID-Based Nicknames**: Showdown natively truncates nicknames to 18 characters. To prevent destructive truncation when mapping UIDs, team initialization in the simulator MUST use the first 8 characters of the UID (`uid.split('-')[0]`) as the Showdown nickname (`name`).
- **UID Resolution**: All UID mappings and injections (`injectUidsIntoRequest`) and log resolutions (`getPoke`) MUST be strictly based on UID or UID prefix. Name or slot-index fallbacks are strictly prohibited.
- **Showdown Status Representation**: Any status clearance or assignment on a Showdown simulator Pokemon instance MUST use an empty string `''` to denote no status. Assigning `null` to `status` on simulator instances will cause internal simulator crashes. Client-side Vue store Pokémon representations may still use `null` to indicate no status.
