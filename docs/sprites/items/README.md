# Item Sprite Inventory & Collision Resolution Catalog

This catalog documents the acquired and processed item sprites stored in `docs/sprites/items/` to resolve the 6 audit sprite collision warnings (and their integrity validator mirrors).

All assets are available in both uncompressed **PNG** and lossless **WebP** formats, aligned with the project sprite standards (`public/assets/sprites/crafting/tier3/`).

---

## Summary of Acquired Assets

| Item ID | Item Name | Suggested File | Dimensions | Source / Provenance | Resolves Collision With |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `polkadotbow` | Lazo Rosa | `polkadotbow.png` / `.webp` | 32x32 | Custom retro pixel art (alternatives: `polkadotbow_pink_scarf`, `polkadotbow_ribbon_sweet`) | `choicescarf` |
| `linkcable` | Cable Link | `linkcable.png` / `.webp` | 40x40 | Bulbapedia (Pokémon Legends: Arceus official, with HD `linkcable_hd.png`) | `everstone` |
| `vilevial` | Frasco Vil | `vilevial.png` / `.webp` | 30x30 | Smogon Sprites (CAP 30 Venomicon signature item) | `leftovers` |
| `vigorcandy` | Caramelo de vigor | `vigorcandy.png` / `.webp` | 30x30 | PokéSprite (Let's Go / GO Energy Yellow Candy) | `rarecandy` |
| `vigorrestorer` | Restaurador de Vigor | `vigorrestorer.png` / `.webp` | 30x30 | PokeAPI (Max Elixir tonic; alternative: `vigorrestorer_alt_root`) | `rarecandy` |
| `ticketshiny` | Ticket Shiny | `ticketshiny.png` / `.webp` | 30x30 | PokeAPI (Official FRLG Rainbow Pass - 7 colored) | `eonticket` |
| `ticketsafari` | Ticket Safari | `ticketsafari.png` / `.webp` | 24x24 | PokeAPI (Official S.S. Ticket; alternative: `ticketsafari_alt_pass`) | `eonticket` |
| `ticketcerulean` | Ticket Cueva Celeste | `ticketcerulean.png` / `.webp` | 24x24 | PokéSprite (Official Aurora Ticket - Cosmic theme) | `eonticket` |
| `ticketarticuno` | Ticket Articuno | `ticketarticuno.png` / `.webp` | 24x24 | PokéSprite (Official Mystic Ticket - Island sea theme) | `eonticket` |
| `ticketmewtwo` | Ticket Mewtwo | `ticketmewtwo.png` / `.webp` | 30x30 | PokeAPI (Official Liberty Pass - Secret Mythical pass) | `eonticket` |
| `incensewater` | Incienso Agua | `incensewater.png` / `.webp` | 30x30 | PokeAPI (Official Wave Incense; alternative: `incensewater_alt_sea`) | `luckincense` |
| `incensegrass` | Incienso Planta | `incensegrass.png` / `.webp` | 30x30 | PokeAPI (Official Rose Incense) | `luckincense` |
| `incensepsychic` | Incienso Psíquico | `incensepsychic.png` / `.webp` | 30x30 | PokeAPI (Official Odd Incense) | `luckincense` |
| `incensenormal` | Incienso Normal | `incensenormal.png` / `.webp` | 30x30 | PokeAPI (Official Pure Incense) | `luckincense` |
| `incensefire` | Incienso Fuego | `incensefire.png` / `.webp` | 30x30 | Curated Incense (Fiery crimson ceramic with flaming ember smoke) | `luckincense` |
| `incenseghost` | Incienso Fantasma | `incenseghost.png` / `.webp` | 30x30 | Curated Incense (Shadowy indigo ceramic with spectral lavender smoke) | `luckincense` |

---

## Detailed Collision Groups Analysis

### Group 1: `choicescarf` vs `polkadotbow`

- **Problem**: `polkadotbow` currently reuses `crafting/tier3/choicescarf.webp`.
- **Domain Context**: Polkadot Bow (Lazo Rosa) was a Generation II held item boosting Normal moves, adapted in this game to boost Fairy-type attacks (+20%).
- **Files Provided**:
  - `polkadotbow.png` / `.webp`: High-fidelity 32x32 retro pixel art pink bow with white polka dots and gold clasp.
  - `polkadotbow_ribbon_sweet.png` / `.webp`: Official 8-bit ribbon sweet from Smogon.
  - `polkadotbow_pink_scarf.png` / `.webp`: Official Hoenn/Sinnoh Contest Pink Scarf from Bulbapedia.

### Group 2: `everstone` vs `linkcable`

- **Problem**: `linkcable` currently reuses `crafting/tier3/everstone.webp`.
- **Domain Context**: Linking Cord (Cable Link) is the canonical item from *Pokémon Legends: Arceus* allowing trade evolutions.
- **Files Provided**:
  - `linkcable.png` / `.webp`: Pixel-scaled 40x40 sprite matching standard inventory dimensions.
  - `linkcable_hd.png` / `.webp`: The original 128x128 official illustration from Bulbapedia.

### Group 3: `leftovers` vs `vilevial`

- **Problem**: `vilevial` currently reuses `crafting/tier3/leftovers.webp`.
- **Domain Context**: Vile Vial (Frasco Vil) is the signature held item for the Smogon CAP 30 Pokémon **Venomicon**, boosting Poison and Flying moves (+20%).
- **Files Provided**:
  - `vilevial.png` / `.webp`: The exact 30x30 official item icon from the Smogon/Showdown sprites repository (`src/minisprites/items/ivile_vial.png`).

### Group 4: `rarecandy` vs `vigorcandy` & `vigorrestorer`

- **Problem**: Both `vigorcandy` and `vigorrestorer` currently reuse `crafting/tier3/rarecandy.webp`.
- **Domain Context**:
  - `vigorcandy`: Usable item that restores 1 vigor point.
  - `vigorrestorer`: Rare breeding held item that restores breeding vigor to veteran Pokémon.
- **Files Provided**:
  - `vigorcandy.png` / `.webp`: Official yellow energy candy sprite from *Let's Go* / *PokéSprite*.
  - `vigorcandy_alt_orange.png` / `.webp`: Alternative red/orange candy variant.
  - `vigorrestorer.png` / `.webp`: Official Max Elixir tonic sprite from PokeAPI.
  - `vigorrestorer_alt_root.png` / `.webp`: Alternative herbal Energy Root sprite from PokeAPI.

### Group 5: `eonticket` vs 5 Custom Tickets

- **Problem**: `ticketshiny`, `ticketsafari`, `ticketcerulean`, `ticketarticuno`, and `ticketmewtwo` all reuse `crafting/tier3/eonticket.webp`.
- **Domain Context**: Unique zone and booster event tickets.
- **Files Provided**:
  - `ticketshiny.png` / `.webp`: The official 7-color Rainbow Pass from FRLG.
  - `ticketsafari.png` / `.webp`: Official S.S. Ticket cruise/safari pass (alternative: `ticketsafari_alt_pass.png`).
  - `ticketcerulean.png` / `.webp`: Official Aurora Ticket with deep cosmic tones for Cerulean Cave.
  - `ticketarticuno.png` / `.webp`: Official Mystic Ticket with oceanic blue tones for Seafoam Islands.
  - `ticketmewtwo.png` / `.webp`: Official Liberty Pass with mysterious laboratory key motif.

### Group 6: `luckincense` vs 6 Elemental Incenses

- **Problem**: All 6 custom incenses (`incensefire`, `incensewater`, `incensegrass`, `incensenormal`, `incenseghost`, `incensepsychic`) reuse `crafting/tier3/luckincense.webp`.
- **Domain Context**: Incenses used to attract specific Pokémon types.
- **Files Provided**:
  - `incensewater.png` / `.webp`: Official Wave Incense from PokeAPI (alt: `incensewater_alt_sea.png`).
  - `incensegrass.png` / `.webp`: Official Rose Incense from PokeAPI.
  - `incensepsychic.png` / `.webp`: Official Odd Incense from PokeAPI.
  - `incensenormal.png` / `.webp`: Official Pure Incense from PokeAPI.
  - `incensefire.png` / `.webp`: Custom fire-themed incense burner (ruby/vermilion ceramic, flame-tinted smoke).
  - `incenseghost.png` / `.webp`: Custom ghost-themed incense burner (midnight violet ceramic, spectral lavender smoke).
  - Reference bases included: `incense_base_rock.png`, `incense_base_lax.png`, `incense_base_full.png`.

---

## Bonus Note on Ogerpon Sprite Warning

- **Auditor finding**: `[ogerpon] (Number: 1017) is missing: animatedBackShiny`.
- **Investigation findings**:
  1. In official Generation IX (*Scarlet/Violet*), Ogerpon is **shiny-locked**.
  2. In the project repository (`public/assets/sprites/pokemon/animated/Back shiny/`), all masked forms (`1017i_1.webp` through `1017i_11.webp`) exist. Only the base unmasked form (`1017i.webp`) is missing.
  3. The animated sprite format in the repository is a **horizontal sprite strip** of 20 frames (each frame 71x71, total resolution 1420x71).
