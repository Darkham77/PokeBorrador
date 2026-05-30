# Evolution System Manual

## 1. Evolution by Level

- **Standard**: Activated upon reaching the level defined in `evolutionData.ts`.
- **Trigger**: The check triggers synchronously when a Pokémon *levels up* (via battle rewards, debug, or rare candies). If cancelled, it will not prompt again until the next level-up event occurs.
- **Tyrogue**: Evolves at level 20 based on its stats: Atk > Def (**Hitmonlee**), Def > Atk (**Hitmonchan**), Tie (50/50).

## 2. Wild Evolution (Auto-Evo)

When the system generates a high-level wild Pokémon, it applies an automatic evolution process:

- **Stones/Trade**: 50% probability of evolving if the level is >= 30 (stone) or >= 32 (trade).

## 3. Evolutionary Stones

- **Eevee**: Requires Water Stone (Vaporeon), Thunder Stone (Jolteon), or Fire Stone (Flareon).

## 4. Manual Cancellation (The B-Button)

During the visual sequence of an evolution (specifically during `intro` and `flashing` stages), the player can click the **B-Button** to cancel the process:
- A text is displayed: `¿Eh? ¡[Pokémon] ha dejado de evolucionar!`.
- **Restriction**: Cancellation is only allowed for level-up / happiness evolutions. Evolutions triggered via Evolutionary Stones or Trades CANNOT be cancelled.

## 5. Passive Prevention (Piedra Eterna / Everstone)

If a Pokémon holds `"Piedra Eterna"` (Everstone), any level-up or trade evolution is blocked automatically, skipping the sequence entirely.

