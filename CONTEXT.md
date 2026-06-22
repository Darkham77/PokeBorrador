# Poké Vicio Domain Context

This document is the single source of truth for domain terms and glossary concepts in the Poké Vicio project. It is strictly a glossary and contains no implementation details.

## Glossary

### Route Guardian (Guardián de Ruta)

A powerful alpha Pokémon that protects a specific route. Defeating or capturing it allows a player's faction to accumulate dominance points for that route.

### Guardian Lockout (Bloqueo de Guardián)

A daily restriction applied to a player's account. A player is allowed to defeat or capture at most one Guardian per route per calendar day. Once locked out, the Guardian will no longer appear on the route map card or trigger combat encounters for the rest of the day.

### Battle Cry (Grito de Batalla)

A distinct audio clip associated with each Pokémon species. It is played when the Pokémon enters the battlefield, faints in combat (slowed and pitch-lowered), or executes voice-based status moves.

### Volatile Counter (Contador Volátil)

A temporary turn-based counter attached to a Pokémon that ticks down at the end of each round and triggers an effect (such as sleep or self-inflicted damage) when it reaches zero. It is completely cleared when the Pokémon is withdrawn from the active combat seat.

### Side Condition (Condición de Bando)

A status or delayed effect tied directly to a bando (player/enemy side of the field) rather than a specific Pokémon. It persists across switches and affects whichever Pokémon occupies the active seat when it triggers (such as Wish).

### Entity Lookup (Búsqueda de Entidad)

The process of retrieving a game entity (Pokémon, Move, Ability, Item, or Nature) from the database. It must be performed exclusively using the canonical English identifier (ID) to ensure data integrity and avoid silent fallbacks.

### Identity Resolution (Resolución de Identidad)

The mechanism by which the application verifies that an entity ID exists in the database. If the ID is invalid or cannot be resolved, the engine must immediately halt and throw an explicit error to prevent corrupt state propagation.

### Species Whitelist (Lista de Especies Habilitadas)

A global subset of Pokémon species identifiers (IDs) that are permitted across all game systems (such as combat, daycare/breeding, eggs, and enemy trainer teams). If any system requests a species whose ID is not present in this list, the data provider must prevent its generation by throwing an explicit identity resolution error.
