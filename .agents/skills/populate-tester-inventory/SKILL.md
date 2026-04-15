---
name: populate-tester-inventory
description: Rapidly populates the current trainer's account with 20 diverse, randomized Pokémon for testing purposes. Use this skill whenever the user wants to "fill the box", "test filters", "add 20 pokes", or needs a diverse team/inventory for debugging UI components like the PC Box or Pokedex.
---

# Populate Tester Inventory

This skill enables the instant addition of 20 randomized Pokémon to the current player's inventory (specifically the PC Box) in the local database.

## When to use

- To test the **PC Box** UI with many Pokémon.
- To test **Filters** and sorting.
- To verify **Pokedex** entries and completion logic.
- When the user asks to "populate", "fill", or "add 20 random pokemones".

## Procedure

### 1. Preparation

Ensure the game is running locally (usually at `http://localhost:5173`) and you are logged in.

### 2. Execution

Use the `browser_subagent` to execute the population script. The script is located at:
`c:\Users\franc\Trabajo\Juegos\Pokemon-Online\.agents\skills\populate-tester-inventory\scripts\populate_inventory.js`

You should:

1. Read the contents of `populate_inventory.js`.
2. Use the `browser_subagent` to execute this JavaScript code in the current page context.

### 3. Verification

After execution, verify:

- An alert appeared confirming the addition.
- The `state.box.length` has increased by 20.
- The sprites are visible in the PC Box tab.

## Script Details

The script generates:

- 20 Pokémon from Gen 1-3 (IDs 1-386).
- Randomized levels (5-55).
- Randomized IVs.
- 5% Shiny chance.
- Automatic Pokedex registration.
- Automatic Save (`saveGame()`).
