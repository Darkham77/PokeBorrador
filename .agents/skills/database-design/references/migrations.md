# Migration Principles

> Safe migration strategy for zero-downtime changes.

## Safe Migration Strategy

```text
For zero-downtime changes:
│
├── Adding column
│   └── Add as nullable → backfill → add NOT NULL
│
├── Removing column
│   └── Stop using → deploy → remove column
│
├── Adding index
│   └── CREATE INDEX (standard transaction-safe syntax; avoid CONCURRENTLY in dual-engine mode)
│
└── Renaming column
    └── Add new → migrate data → deploy → drop old
```

## Migration Philosophy

- Never make breaking changes in one step
- Test migrations on data copy first
- **100% Forward-Only Append-Only**: Historical migrations are strictly immutable. Always roll forward via a new timestamped migration (`YYYYMMDDHHmmss_description.sql` and companion `.sqlite.sql`).
- Run in transactions when possible
- Maintain strict behavioral parity across PostgreSQL and SQLite

## Dual-Engine Architecture (Poké Vicio)

### Local SQLite WASM (Offline)

| Feature | Application |
| :--- | :--- |
| Zero network dependency | Full offline gameplay persistence |
| Compiled companion SQL | `.sqlite.sql` generated via `npm run database:generate-migrations` |
| Fast in-memory tests | Ephemeral SQLite databases in Vitest suites |

### Supabase / PostgreSQL (Online)

| Feature | Application |
| :--- | :--- |
| Full ACID relational DB | Multiplayer, GTS market, Faction War, PvP leaderboards |
| Canonical SSoT | Canonical PostgreSQL migrations (`database/migrations/*.sql`) |
| Row-Level Security (RLS) | High-integrity multi-tenant account isolation |
