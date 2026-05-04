# Evolution System Manual

## 1. Evolution by Level

- **Standard**: Activated upon reaching the level defined in `evolutionData.js`.
- **Tyrogue**: Evolves at level 20 based on its stats: Atk > Def (**Hitmonlee**), Def > Atk (**Hitmonchan**), Tie (50/50).

## 2. Wild Evolution (Auto-Evo)

When the system generates a high-level wild Pokémon, it applies an automatic evolution process:

- **Stones/Trade**: 50% probability of evolving if the level is >= 30 (stone) or >= 32 (trade).

## 3. Evolutionary Stones

- **Eevee**: Requires Water Stone (Vaporeon), Thunder Stone (Jolteon), or Fire Stone (Flareon).
