# Item System Manual (Poké Vicio)

This manual defines the structure, categories, and validation protocols for all in-game items.

## 📦 Data Structure

Items are managed in `src/data/items.ts` through two main objects:

### 1. `SHOP_ITEMS` (Catalog)

Defines how the item looks and how much it costs.

```js
{
  id: 'snake_case_id',
  name: 'Visible Name',
  cat: 'healing|held|tm|breeding|special|stone',
  sprite: 'URL_pixel_art',
  icon: 'emoji',
  price: 1000,
  desc: 'Description...',
  effect: (qty) => { inventoryStore.addItem('Name', qty); }
}
```

### 2. `itemEffects.ts` (Usable Logic)

Defines what the item does when used on a Pokémon or globally.

- **Pre-validation (`isValidTarget`)**: ALWAYS check targets before opening selection modals. If no targets exist, do NOT open the selector and notify the user via Toast.
- **Consumption**: The item is automatically consumed upon success.
- **Battle Mode**: In combat, the selection modal MUST use the `allowedIds` filter to ONLY show valid targets (e.g., only fainted Pokémon for Revives).
- **Failure Handling**: If an item application fails, do NOT close the inventory. Notify the cause and let the user retry.

### 2.1 Battle Quick Bag Protocol

Accessing items via the combat sidebar HUD must mirror the full inventory logic:

- **Immediate Action**: Direct use only for Pokéballs (targeting the enemy).
- **Selection Flow**: For healing/buff items, ALWAYS verify `isValidTarget` first, then open `PokemonSelection` modal to pick the target.
- **Consistency**: Never bypass the "Ask who to apply" step if the item target is the team.

### 3. Log Orchestration (Battle Mode)

To provide clear visual feedback without redundancy, item usage logs must be split:

1. **Action Log**: "¡Has usado X!" o "¡Entrenador usó X!".
    - **Source**: `'player'` or `'enemy_trainer'`.
    - **Visual**: Shows the trainer's avatar.
2. **Effect Log**: "¡Recuperó HP!" o "¡Curó su parálisis!".
    - **Source**: The item ID/Name.
    - **Visual**: Shows the specific item sprite.

---

## 💰 Item Economy

- **Selling Price**: Items are sold for **50%** of their purchase value (`price * 0.5`).
- **Batch Selling**: The system allows for the bulk sale of items, calculating the total profit before confirming.

---

## 📖 Use of TMs and Evolution

### 1. Technical Machines (TMs)

- **Learning**: If the Pokémon has < 4 moves, it learns the new one instantly.
- **Queue**: If it has 4 moves, it is added to a learning queue (`learnQueue`) for the user to choose which one to forget.
- **Consumption**: The item is consumed only after confirming the learning.

### 2. Evolutionary Stones

- **Validation**: The item only appears as "Usable" if the Pokémon has an evolution defined with that specific item in `evolutionData.ts`.
- **Trigger**: Activates the evolution logic and updates the state.

### 3. Special Objects (Held Items)

- **Equipping**: When equipping an item, if the Pokémon already had one, it automatically returns to the inventory.
- **Battle Restriction**: Items cannot be equipped/unequipped during active combat.

---

## 🛠️ Functional Categories (`cat`)

| Category | Primary Use | Entry in `HEALING_ITEMS` |
| :--- | :--- | :--- |
| `healing` | Healing, PP, Status | ✅ Mandatory |
| `held` | Equippable on Pokémon (`type: 'held'`) | ❌ Forbidden |
| `tm` | Teach moves | ✅ Mandatory |
| `stone` | Evolution | ✅ Mandatory |
| `special` | Global buffs, Repels | ✅ Mandatory |
| `breeding` | Daycare & Vigor recovery | ❌ Forbidden (Except 'vigor_restorer') |

---

## 🚀 Protocol for Adding Items

1. **Registration**: Add entry in `SHOP_ITEMS`.
2. **Logic**: If usable, add function in `HEALING_ITEMS`.
3. **Battle Restriction**: If not usable in battle, add it to the `nonCombat` list in `items.ts`.
4. **Validation**: Run the script:

    ```bash
    node .agents/skills/item-validator/scripts/validate_items.ts
    ```

---

## 🚨 Integrity Rules

- **Asset Detection**: The system looks for keywords (ball, stone, potion) to resolve assets from PokeAPI. If the item does not follow these conventions, it must be manually mapped in the resolver.
- **Normalization**: IDs and names are treated as case-insensitive in the logic, but asset files must be in lowercase.
- **Financial Transparency**: All bulk sale operations must show the total estimated profit in the confirmation dialog.
- **Zero-Quantity Filtering**: Items with a quantity of `0` MUST be filtered out from inventory lists, HUD quick bag components, and item pill displays. The UI should only present items where `quantity > 0` to prevent cluttering the interface with empty item slots.
- **Breeding Exception**: Items under the `breeding` category are normally forbidden from having direct active effects or entries in `itemEffects.ts` (HEALING_ITEMS). The only exception is `vigor_restorer` (Restaurador de Vigor), which is consumed directly on Pokémon to restore daycare vigor.

