# Item System Manual (Poké Vicio)

This manual defines the structure, categories, and validation protocols for all in-game items.

## 📦 Data Structure

Items are managed in `src/data/items.ts` through two main objects:

### 1. `SHOP_ITEMS` (Catalog)

Defines how the item looks and how much it costs.

```js
{
  id: 'snake_case_id',
  craftingTier: 0|1|2|3, // Numeric processing tier level
  name: 'Visible Name',
  cat: 'healing|held|tm|breeding|special|stone|stones',
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
- **Dynamic Tab Persistence**: The active tab state of the inventory/backpack modal must be dynamically persistent via `localStorage` so that the user's last tab selection is remembered across sessions. The system must not force a default tab choice globally, except when the inventory is opened with a pre-selected target Pokémon context (e.g., when choosing an item to apply directly to a Pokémon), in which case the `'utilizables'` tab must be dynamically activated to streamline the item selection process.

### 2.1 Battle Quick Bag Protocol

Accessing items via the combat sidebar HUD must mirror the full inventory logic:

- **Immediate Action**: Direct use only for Pokéballs (targeting the enemy).
- **Selection Flow**: For healing/buff items, ALWAYS verify `isValidTarget` first, then open `PokemonSelection` modal to pick the target.
- **Consistency**: Never bypass the "Ask who to apply" step if the item target is the team.
- **Item Lookup**: Always query items by both `id` and `name` (`item.id === key || item.name === key`) to match stored inventory items correctly and prevent target resolution failures.

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
- **Consumption**: The item is consumed only after confirming the learning via the queue's `onComplete` callback. If the user cancels the learning interface, the item is not consumed.

### 2. Evolutionary Stones

- **Validation**: The item only appears as "Usable" if the Pokémon has an evolution defined with that specific item in `evolutionData.ts`.
- **Trigger**: Activates the evolution logic and updates the state.

### 3. Special Objects (Held Items)

- **Equipping**: When equipping an item, if the Pokémon already had one, it automatically returns to the inventory.
- **Battle Restriction**: Items cannot be equipped/unequipped during active combat.

### 4. Move Relearner

- **Standard Grid Parity**: Reuses the core `BattleMoveSlot` component directly to render the list of relearnable moves, ensuring type badges, power/accuracy stats, and rich tooltips (`MoveTooltip`) are perfectly identical to combat/detail screens.
- **Scrollbar Clipping Prevention**: Scrollable moves lists containing hover scaling must define explicit padding (e.g., `4px 6px` on rows and `6px 12px` on list wrapper) to allow components to expand dynamically without clipping borders or causing horizontal scrollbar indicators.
- **English Key Integrity**: Inventory checks and item consumption MUST query the English item ID `'move_relearner'` instead of Spanish display names.
- **Deferred Consumption**: Like TMs, if the Pokémon already has 4 moves, the item consumption must be deferred to the learn queue's `onComplete` callback, protecting the player from item loss on cancellation.

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

- **Asset Detection**: The system looks for keywords (ball, stone, potion) to resolve assets from the PokeAPI CDN (via download_assets.ts). If the item does not follow these conventions, it must be manually mapped in the resolver.
- **Normalization**: IDs and names are treated as case-insensitive in the logic, but asset files must be in lowercase.
- **Financial Transparency**: All bulk sale operations must show the total estimated profit in the confirmation dialog.
- **Zero-Quantity Filtering**: Items with a quantity of `0` MUST be filtered out from inventory lists, HUD quick bag components, and item pill displays. The UI should only present items where `quantity > 0` to prevent cluttering the interface with empty item slots.
- **Breeding Exception**: Items under the `breeding` category are normally forbidden from having direct active effects or entries in `itemEffects.ts` (HEALING_ITEMS). The only exception is `vigor_restorer` (Restaurador de Vigor), which is consumed directly on Pokémon to restore daycare vigor.
- **Fossil Item Restriction**: Fossils (e.g., `helix_fossil`, `dome_fossil`, `old_amber`) are classified as special items and are strictly non-usable outside or inside combat. They must not appear under "Utilizables" (Usables) in the inventory bag and should only be consumed through Daycare Cloning mechanics.
- **Archaeology Reward Ratios**: Archaeology minigame rewards are items directly credited to the inventory based on a fixed ratio: 45% route-specific Fossil, 25% random Evolution Stone, and 30% Gems/Ores (split into 20% common, 10% rare). The rewards modal (`RouteSpawnsModal.vue`) must dynamically display these exact drop rates.
- **UI & Combat Category Parity**: Category names used in database items (e.g., `potions`, `combat_held`, `breeding_held`, `tools`, `machinery`, `tms`) must be matched strictly across HUD components (like `BattleQuickBag.vue`), action controls (like `BattleArenaControls.vue`), and market filters (like `MarketFilters.vue`) to prevent filtering and visibility bugs.
- **Physical Sprite Validation**: Every item sprite path in the database must point to a physically existing image file. The integrity validator script (`validate_items.ts`) performs disk existence checks (`fs.existsSync`) to prevent broken images.
- **Material Localized Terminology**: The word 'Tier' is strictly forbidden in user-facing HUD components, pills, and tooltips. Instead, utilize localized Spanish terms to categorize materials: 'Materia Prima' (Tier 0), 'Material Refinado' (Tier 1), and 'Componentes' (Tier 2).
- **Explicit Numeric Crafting Tier**: Every item in `src/data/items.ts` must have a numeric `craftingTier` property (0 for Raw Materials/Stones, 1 for Refined Materials, 2 for Components, 3 for finished Products). Do not guess or derive the processing stage of an item from its sprite path or category string in store/UI logic.
- **Dual Tab Visibility**: Items of Tiers 0, 1, and 2 that are consumable, usable, or equipable must show up in both the Materials and Products tabs in the inventory. Under the Materials tab, their categories are mapped dynamically according to their tier (`raw_material` for Tier 0, `refined_material` for Tier 1, `component` for Tier 2) so they show up under their respective sidebar filters (e.g. stones under Materia Prima). Under the Products tab, they keep or adjust to their specific product subcategories (e.g. `'stones'` or `'potions'`).
- **English ID Logic Standard for Items & Rewards**: For all logical checks, formulas, or data validations involving inventory and equipped items, daily missions, and arena rewards, ALWAYS compare and query against their standardized English database IDs (e.g., `'exp_share'`, `'everstone'`, `'destiny_knot'`, `'choice_band'`). The sanitization system normalizes equipped items and rewards to their English ID representations. Spanish names (e.g., `"Compartir EXP"`) should be reserved strictly for visual UI rendering.
- **Pokéball ID and Sprite Loading**: Pokéball identifiers (e.g., `great_ball`, `ultra_ball`, `dusk_ball`) must be handled using their exact, lowercase database IDs. You must not apply destructive sanitizations (such as removing underscores `_`) in transition or animation paths, as doing so breaks item database lookup and causes sprite loading failures.

---

## 💰 GTS & Pricing Rules

- **GTS Pricing Statistics**: Item minimum, average, and maximum prices are calculated reactively from active listings in the GTS store by calculating the price-per-unit (`listing.price / listing.data.qty`) grouped by item ID.
- **Rarity Highlight Aesthetics**: Highlighting item rarity (tiers) is done using a `.item-bg-glow` container with a radial gradient matching the tier color (rare = `#3b82f6`, epic = `#a855f7`, legend = `var(--yellow)`) placed behind the clean item sprite. Cards should avoid having a dark background or container behind the sprite.
- **Price Pills Grid Layout**: To prevent overlapping text in list views, display the stock count and the official purchase shop price (`TIENDA: ₱[price]`) on the top line, and the GTS statistics pills (MIN, PROM, MAX) on a separate line below it.
- **Suggested Market Price**: When publishing items to the GTS, default the initial suggested price input in the form to the shop sell price (50% of the shop purchase price) to match the value players get when selling directly to standard shops.

---

## 🎨 Asset Pipeline & Crafting Tier Sprite Standards

All inventory and shop item sprites in `public/assets/sprites/` MUST strictly follow the 4-tier domain hierarchy mapped from `item.craftingTier`:
- `crafting/tier0/`: Raw materials, stones, and primary crafting inputs (`item.craftingTier === 0`).
- `crafting/tier1/`: Refined materials and intermediate crafting items (`item.craftingTier === 1`).
- `crafting/tier2/`: Advanced components and complex parts (`item.craftingTier === 2`).
- `crafting/tier3/`: Finished products, consumables, TMs, Mochis, Pokéballs, and held battle items (`item.craftingTier === 3`).

### Canonical Pipeline Commands
1. **Download Missing Sprites**: `npm run assets:download:items` (`scripts/assets/download_assets.ts`).
2. **Convert and Build Asset DB**: `npm run assets:convert` (`scripts/assets/convert_assets.ts`).
3. **Re-tier and Organize Items**: `node --permission --experimental-strip-types --allow-addons --allow-fs-read=. --allow-fs-write=. scripts/assets/organize_item_sprites_by_tier.ts`.

### Strict Prohibitions
- **Zero Flat Directories**: It is STRICTLY FORBIDDEN to create flat asset directories (such as `items/`) or alter `items.json` sprite paths away from `crafting/tier[0-3]/`.
- **Zero Resolver Bypass**: `assetService.ts` resolves `ASSET_TYPES.ITEM` using the explicit `item.sprite` path (`crafting/tierX/<id>`) with fallback to `crafting/tier3/<id>`. Do not introduce ad-hoc folder overrides in the resolver.

