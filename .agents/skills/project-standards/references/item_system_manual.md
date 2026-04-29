# Item System Manual (Poké Vicio)

This manual defines the structure, categories, and validation protocols for all in-game items.

## 📦 Data Structure

Items are managed in `src/data/items.js` through two main objects:

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

### 2. `itemEffects.js` (Usable Logic)

Defines what the item does when used on a Pokémon or globally.

- **Pre-validation (`isValidTarget`)**: ALWAYS check targets before opening selection modals. If no targets exist, do NOT open the selector and notify the user via Toast.
- **Consumption**: The item is automatically consumed upon success.
- **Battle Mode**: In combat, the selection modal MUST use the `allowedIds` filter to ONLY show valid targets (e.g., only fainted Pokémon for Revives).
- **Failure Handling**: If an item application fails, do NOT close the inventory. Notify the cause and let the user retry.

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

- **Validation**: The item only appears as "Usable" if the Pokémon has an evolution defined with that specific item in `evolutionData.js`.
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

---

## 🚀 Protocol for Adding Items

1. **Registration**: Add entry in `SHOP_ITEMS`.
2. **Logic**: If usable, add function in `HEALING_ITEMS`.
3. **Battle Restriction**: If not usable in battle, add it to the `nonCombat` list in `items.js`.
4. **Validation**: Run the script:

    ```bash
    node .agents/skills/item-validator/scripts/validate_items.js
    ```

---

## 🚨 Integrity Rules

- **Asset Detection**: The system looks for keywords (ball, stone, potion) to resolve assets from PokeAPI. If the item does not follow these conventions, it must be manually mapped in the resolver.
- **Normalization**: IDs and names are treated as case-insensitive in the logic, but asset files must be in lowercase.
- **Financial Transparency**: All bulk sale operations must show the total estimated profit in the confirmation dialog.
