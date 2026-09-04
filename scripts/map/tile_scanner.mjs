import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TILES_DIR = path.resolve('scratch/map_lab/tilesets/lpc');
const OUTPUT_JSON = path.resolve('scratch/map_lab/tile_catalog.json');
const OUTPUT_JS = path.resolve('scratch/map_lab/tile_catalog.js');
const VIEWER_HTML = path.resolve('scratch/map_lab/tile_catalog_viewer.html');

async function scanAndBuildCatalog() {
  console.log('=== LPC SMART TILE SCANNER & SEMANTIC CATALOG ENGINE ===');
  
  if (!fs.existsSync(TILES_DIR)) {
    console.error(`Tiles directory does not exist: ${TILES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TILES_DIR).filter(f => f.endsWith('.png'));
  console.log(`Discovered ${files.length} spritesheets in ${TILES_DIR}`);

  const catalog = {
    version: '3.0',
    generatedAt: new Date().toISOString(),
    tileSize: 32,
    sheets: {},
    terrains: {},
    autotileLayout: {
      standardLPC: {
        cols: 3,
        rows: 6,
        pieces: {
          TL:  { col: 0, row: 2, sx: 0,  sy: 64,  desc: 'Top-Left outer corner' },
          T:   { col: 1, row: 2, sx: 32, sy: 64,  desc: 'Top border' },
          TR:  { col: 2, row: 2, sx: 64, sy: 64,  desc: 'Top-Right outer corner' },
          L:   { col: 0, row: 3, sx: 0,  sy: 96,  desc: 'Left border' },
          C:   { col: 1, row: 3, sx: 32, sy: 96,  desc: 'Center / single' },
          R:   { col: 2, row: 3, sx: 64, sy: 96,  desc: 'Right border' },
          BL:  { col: 0, row: 4, sx: 0,  sy: 128, desc: 'Bottom-Left outer corner' },
          B:   { col: 1, row: 4, sx: 32, sy: 128, desc: 'Bottom border' },
          BR:  { col: 2, row: 4, sx: 64, sy: 128, desc: 'Bottom-Right outer corner' },
          F0:  { col: 0, row: 5, sx: 0,  sy: 160, desc: 'Solid interior fill var 0' },
          F1:  { col: 1, row: 5, sx: 32, sy: 160, desc: 'Solid interior fill var 1' },
          F2:  { col: 2, row: 5, sx: 64, sy: 160, desc: 'Solid interior fill var 2' },
          S0:  { col: 0, row: 0, sx: 0,  sy: 0,   desc: 'Scatter overlay var 0' },
          S1:  { col: 1, row: 0, sx: 32, sy: 0,   desc: 'Scatter overlay var 1' },
          S2:  { col: 2, row: 0, sx: 64, sy: 0,   desc: 'Scatter overlay var 2' }
        }
      }
    },
    prefabs: {
      trees: {},
      buildings: {},
      nature: {},
      props: {},
      bridges: {},
      cliffs: {}
    }
  };

  // 1. Analyze sheets and categorize terrains
  for (const file of files) {
    const filePath = path.join(TILES_DIR, file);
    const meta = await sharp(filePath).metadata();
    const cols = Math.floor(meta.width / 32);
    const rows = Math.floor(meta.height / 32);

    catalog.sheets[file] = {
      file,
      width: meta.width,
      height: meta.height,
      cols,
      rows,
      hasAlpha: meta.hasAlpha
    };

    // Detect if this is a standard 3x6 LPC autotile sheet (96x192)
    if (cols === 3 && rows === 6) {
      // Sample the solid center tile (col 1, row 5) to classify the terrain
      const centerBuffer = await sharp(filePath)
        .extract({ left: 32, top: 160, width: 32, height: 32 })
        .toBuffer();
      const stats = await sharp(centerBuffer).stats();
      const [r, g, b] = stats.channels.map(ch => Math.round(ch.mean));

      let terrainType = 'unknown';
      if (file === 'lava.png') {
        terrainType = 'lava';
      } else if (file === 'grassalt.png') {
        terrainType = 'tall_grass';
      } else if (file === 'dirt2.png') {
        terrainType = 'mountain_dirt';
      } else if (file === 'dirt.png') {
        terrainType = 'dirt_path';
      } else if (file === 'watergrass.png') {
        terrainType = 'water_grass';
      } else if (file === 'water.png') {
        terrainType = 'water_shore';
      } else if (file === 'grass.png') {
        terrainType = 'grass';
      } else if (g > r && g > b) {
        terrainType = 'grass';
      } else if (b > r && b > g) {
        terrainType = 'water';
      } else if (r > b) {
        terrainType = 'dirt_path';
      } else {
        terrainType = 'stone';
      }

      catalog.terrains[terrainType] = {
        sheet: file,
        avgColor: [r, g, b],
        isAutotile: true,
        layout: 'standardLPC'
      };
      console.log(`  -> Detected Terrain Autotile [${terrainType}] in ${file} (RGB: ${r},${g},${b})`);
    }
  }

  // 2. Define High-Fidelity Multi-Tile Prefabs with Semantic Footprints

  // === TREES: POKÉMON GBA ===
  catalog.prefabs.trees.oak = {
    id: 'tree_oak',
    name: 'Árbol Redondo Oficial (GBA FireRed)',
    width: 32,
    height: 48,
    footprint: { w: 1, h: 2, solidW: 1, solidH: 1 },
    parts: [
      { sheet: 'poke_tree_poke.png', sx: 0, sy: 0, sw: 32, sh: 48, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  catalog.prefabs.trees.pine = {
    id: 'tree_pine',
    name: 'Pino Oficial (GBA FireRed)',
    width: 32,
    height: 48,
    footprint: { w: 1, h: 2, solidW: 1, solidH: 1 },
    parts: [
      { sheet: 'poke_tree_poke.png', sx: 0, sy: 0, sw: 32, sh: 48, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // === BUILDINGS: 100% CANÓNICOS POKÉMON GBA (FIRERED / EMERALD) ===
  // -------------------------------------------------------------------------
  // Edificios oficiales con tejados cenitales, logotipos de Pokéball,
  // puertas que nacen en el suelo y rotulaciones canónicas ("P.C.", "SHOP", "GYM").
  // -------------------------------------------------------------------------

  // 1. Centro Pokémon Oficial (GBA FireRed - Tejado Rojo + Pokéball + P.C.)
  catalog.prefabs.buildings.pokecenter = {
    id: 'pokecenter',
    name: 'Centro Pokémon Oficial (GBA FireRed)',
    width: 80,
    height: 78,
    footprint: { w: 3, h: 3, doorOffset: { x: 1, y: 2 } },
    parts: [
      { sheet: 'poke_pokecenter.png', sx: 0, sy: 0, sw: 80, sh: 78, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 2. Tienda PokéMart Oficial (GBA FireRed - Tejado Azul + SHOP)
  catalog.prefabs.buildings.pokemart = {
    id: 'pokemart',
    name: 'Tienda PokéMart Oficial (GBA FireRed)',
    width: 64,
    height: 70,
    footprint: { w: 2, h: 3, doorOffset: { x: 1, y: 2 } },
    parts: [
      { sheet: 'poke_pokemart.png', sx: 0, sy: 0, sw: 64, sh: 70, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 3. Gimnasio Pokémon Clásico (GBA FireRed - Letrero GYM + Pokéball Dorada)
  catalog.prefabs.buildings.gym = {
    id: 'gym',
    name: 'Gimnasio Pokémon Clásico (GBA FireRed)',
    width: 96,
    height: 80,
    footprint: { w: 3, h: 3, doorOffset: { x: 1, y: 2 } },
    parts: [
      { sheet: 'poke_gym.png', sx: 0, sy: 0, sw: 96, sh: 80, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 4. Laboratorio del Profesor Oak (Pueblo Paleta GBA)
  catalog.prefabs.buildings.lab_oak = {
    id: 'lab_oak',
    name: 'Laboratorio del Profesor Oak (GBA FireRed)',
    width: 112,
    height: 78,
    footprint: { w: 4, h: 3, doorOffset: { x: 2, y: 2 } },
    parts: [
      { sheet: 'poke_lab_oak.png', sx: 0, sy: 0, sw: 112, sh: 78, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 5. Casa de Red (Pueblo Paleta GBA - Tejado Rojo a dos aguas)
  catalog.prefabs.buildings.house_red = {
    id: 'house_red',
    name: 'Casa de Red (Pueblo Paleta GBA)',
    width: 80,
    height: 56,
    footprint: { w: 3, h: 2, doorOffset: { x: 1, y: 1 } },
    parts: [
      { sheet: 'poke_house_red.png', sx: 0, sy: 0, sw: 80, sh: 56, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 6. Casa de Blue (Pueblo Paleta / Celeste GBA - Tejado Azul a dos aguas)
  catalog.prefabs.buildings.house_blue = {
    id: 'house_blue',
    name: 'Casa de Blue (Pueblo Paleta GBA)',
    width: 80,
    height: 56,
    footprint: { w: 3, h: 2, doorOffset: { x: 2, y: 1 } },
    parts: [
      { sheet: 'poke_house_blue.png', sx: 0, sy: 0, sw: 80, sh: 56, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 7. Casa Residencial Verde (Ciudad Verde / Ciudad Azulona GBA)
  catalog.prefabs.buildings.house_green = {
    id: 'house_green',
    name: 'Casa Residencial Verde (GBA)',
    width: 80,
    height: 54,
    footprint: { w: 3, h: 2, doorOffset: { x: 1, y: 1 } },
    parts: [
      { sheet: 'poke_house_green.png', sx: 0, sy: 0, sw: 80, sh: 54, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 8. Casa Residencial Terracota / Naranja (Ciudad Plateada / Carmín GBA)
  catalog.prefabs.buildings.house_brown = {
    id: 'house_brown',
    name: 'Casa Residencial Tejado Naranja (GBA)',
    width: 64,
    height: 56,
    footprint: { w: 2, h: 2, doorOffset: { x: 1, y: 1 } },
    parts: [
      { sheet: 'poke_house_orange.png', sx: 0, sy: 0, sw: 64, sh: 56, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 9. Casa de Voluntarios (Pueblo Lavanda GBA)
  catalog.prefabs.buildings.house_purple = {
    id: 'house_purple',
    name: 'Casa Residencial Lavanda (GBA)',
    width: 80,
    height: 56,
    footprint: { w: 3, h: 2, doorOffset: { x: 1, y: 1 } },
    parts: [
      { sheet: 'poke_house_purple.png', sx: 0, sy: 0, sw: 80, sh: 56, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 10. Sede Central Silph S.A. (Ciudad Azafrán GBA - Rascacielos Corporativo)
  catalog.prefabs.buildings.silph_tower = {
    id: 'silph_tower',
    name: 'Sede Central Silph S.A. (Torre Corporativa GBA)',
    width: 144,
    height: 160,
    footprint: { w: 5, h: 5, doorOffset: { x: 2, y: 4 } },
    parts: [
      { sheet: 'poke_silph_tower.png', sx: 0, sy: 0, sw: 144, sh: 160, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 11. Central de Energía de Kanto (Power Plant GBA)
  catalog.prefabs.buildings.power_plant = {
    id: 'power_plant',
    name: 'Central de Energía de Kanto (GBA)',
    width: 160,
    height: 104,
    footprint: { w: 5, h: 4, doorOffset: { x: 2, y: 3 } },
    parts: [
      { sheet: 'poke_power_plant.png', sx: 0, sy: 0, sw: 160, sh: 104, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 12. Palacio de la Liga Pokémon (Meseta Añil GBA)
  catalog.prefabs.buildings.pokemon_league = {
    id: 'pokemon_league',
    name: 'Palacio de la Liga Pokémon (Meseta Añil GBA)',
    width: 256,
    height: 104,
    footprint: { w: 8, h: 4, doorOffset: { x: 4, y: 3 } },
    parts: [
      { sheet: 'poke_pokemon_league.png', sx: 0, sy: 0, sw: 256, sh: 104, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 13. Gran Gimnasio Cúpula Dorada (Battle Dome GBA)
  catalog.prefabs.buildings.gym_gold = {
    id: 'gym_gold',
    name: 'Gran Gimnasio Cúpula Dorada (GBA)',
    width: 112,
    height: 90,
    footprint: { w: 4, h: 3, doorOffset: { x: 2, y: 2 } },
    parts: [
      { sheet: 'poke_gym_gold.png', sx: 0, sy: 0, sw: 112, sh: 90, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 14. Casino y Tienda de Premios (Ciudad Azulona GBA)
  catalog.prefabs.buildings.game_corner = {
    id: 'game_corner',
    name: 'Casino Rocket / Tienda de Premios (Ciudad Azulona GBA)',
    width: 112,
    height: 80,
    footprint: { w: 4, h: 3, doorOffset: { x: 2, y: 2 } },
    parts: [
      { sheet: 'poke_game_corner.png', sx: 0, sy: 0, sw: 112, sh: 80, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 15. Torre Pokémon de Pueblo Lavanda
  catalog.prefabs.buildings.pokemon_tower = {
    id: 'pokemon_tower',
    name: 'Torre Pokémon de Pueblo Lavanda',
    width: 96,
    height: 192,
    footprint: { w: 3, h: 6, doorOffset: { x: 1, y: 5 } },
    parts: [
      { sheet: 'shadow.png', sx: 64, sy: 0, sw: 96, sh: 32, dx: 0, dy: 160, zIndex: 0 },
      { sheet: 'house.png', sx: 0, sy: 96, sw: 96, sh: 64, dx: 0, dy: 0, zIndex: 1 },
      { sheet: 'house.png', sx: 96, sy: 128, sw: 96, sh: 64, dx: 0, dy: 48, zIndex: 2 },
      { sheet: 'house.png', sx: 0, sy: 96, sw: 96, sh: 32, dx: 0, dy: 80, zIndex: 3 },
      { sheet: 'house.png', sx: 96, sy: 128, sw: 96, sh: 96, dx: 0, dy: 96, zIndex: 4 },
      { sheet: 'house.png', sx: 96, sy: 0, sw: 32, sh: 64, dx: 32, dy: 128, zIndex: 5 },
      { sheet: 'house.png', sx: 224, sy: 0, sw: 28, sh: 44, dx: 34, dy: 54, zIndex: 5 }
    ]
  };

  // === NATURE & CLIFFS ===
  catalog.prefabs.nature.cave_entrance = {
    id: 'cave_entrance',
    name: 'Boca de Cueva Rocosa (Mt. Moon / Túnel Roca)',
    width: 96,
    height: 96,
    footprint: { w: 3, h: 3 },
    parts: [
      { sheet: 'mountains.png', sx: 0, sy: 160, sw: 96, sh: 96, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  catalog.prefabs.cliffs.plateau_top = {
    id: 'plateau_top',
    name: 'Cima de Meseta Rocosa',
    width: 96,
    height: 96,
    parts: [
      { sheet: 'mountains.png', sx: 192, sy: 0, sw: 96, sh: 96, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  catalog.prefabs.cliffs.mountain_ramp = {
    id: 'mountain_ramp',
    name: 'Rampa de Ascenso a la Cumbre',
    width: 144,
    height: 128,
    parts: [
      { sheet: 'mountains.png', sx: 96, sy: 160, sw: 144, sh: 128, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  catalog.prefabs.nature.magma_crater = {
    id: 'magma_crater',
    name: 'Cráter Volcánico de Isla Canela',
    width: 96,
    height: 96,
    parts: [
      { sheet: 'lava.png', sx: 0, sy: 64, sw: 96, sh: 96, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  // === BRIDGES & PIERS ===
  // Nugget Bridge (Vertical River Crossing: North-South)
  catalog.prefabs.bridges.nugget_bridge = {
    id: 'nugget_bridge',
    name: 'Puente Pepita (Ruta 24 - Cruce Norte-Sur)',
    width: 64,
    height: 128,
    footprint: { w: 2, h: 4 },
    parts: [
      // Top approach ramp
      { sheet: 'bridges.png', sx: 0, sy: 64, sw: 64, sh: 32, dx: 0, dy: 0, zIndex: 1 },
      // Mid river span
      { sheet: 'bridges.png', sx: 0, sy: 96, sw: 64, sh: 32, dx: 0, dy: 32, zIndex: 1 },
      { sheet: 'bridges.png', sx: 0, sy: 96, sw: 64, sh: 32, dx: 0, dy: 64, zIndex: 1 },
      // South landing ramp
      { sheet: 'bridges.png', sx: 0, sy: 128, sw: 64, sh: 32, dx: 0, dy: 96, zIndex: 1 }
    ]
  };

  // Horizontal Arched Bridge
  catalog.prefabs.bridges.arched_bridge_h = {
    id: 'arched_bridge_h',
    name: 'Puente de Madera Arqueado con Barandas',
    width: 96,
    height: 64,
    parts: [
      { sheet: 'bridges.png', sx: 96, sy: 0, sw: 96, sh: 64, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  // Wooden Harbor Pier (Vermilion City / Cinnabar Island)
  catalog.prefabs.bridges.harbor_pier = {
    id: 'harbor_pier',
    name: 'Muelle Portuario de Madera con Postes',
    width: 64,
    height: 96,
    parts: [
      { sheet: 'bridges.png', sx: 128, sy: 96, sw: 64, sh: 96, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  // === PROPS POKÉMON GBA ===
  // 1. Farola Urbana Pokémon (Postes dobles rojos canónicos)
  catalog.prefabs.props.street_lamp = {
    id: 'street_lamp',
    name: 'Farola Urbana Pokémon (GBA)',
    width: 32,
    height: 48,
    parts: [
      { sheet: 'poke_street_lamp.png', sx: 0, sy: 0, sw: 32, sh: 48, dx: 0, dy: 0, zIndex: 3 }
    ]
  };

  // 2. Valla Blanca de Piquete (Pueblo Paleta GBA)
  catalog.prefabs.props.fence_wood_h = {
    id: 'fence_wood_h',
    name: 'Valla Blanca de Piquete (Pueblo Paleta GBA)',
    width: 48,
    height: 16,
    parts: [
      { sheet: 'poke_fence_picket.png', sx: 0, sy: 0, sw: 48, sh: 16, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 3. Buzón Residencial (Pueblo Paleta GBA)
  catalog.prefabs.props.mailbox = {
    id: 'mailbox',
    name: 'Buzón Residencial (GBA)',
    width: 16,
    height: 16,
    parts: [
      { sheet: 'poke_mailbox.png', sx: 0, sy: 0, sw: 16, sh: 16, dx: 0, dy: 0, zIndex: 3 }
    ]
  };

  // 4. Flores Rojas Oficiales Pokémon (GBA)
  catalog.prefabs.props.flowers_red = {
    id: 'flowers_red',
    name: 'Flores Rojas Silvestres (GBA)',
    width: 16,
    height: 16,
    parts: [
      { sheet: 'poke_flowers_red.png', sx: 0, sy: 0, sw: 16, sh: 16, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  catalog.prefabs.props.flowers_yellow = {
    id: 'flowers_yellow',
    name: 'Flores Silvestres (GBA)',
    width: 16,
    height: 16,
    parts: [
      { sheet: 'poke_flowers_red.png', sx: 0, sy: 0, sw: 16, sh: 16, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  // 5. Snorlax Durmiente (Bloqueo de Ruta Canónico GBA)
  catalog.prefabs.props.snorlax = {
    id: 'snorlax',
    name: 'Snorlax Durmiente (GBA)',
    width: 32,
    height: 32,
    parts: [
      { sheet: 'poke_snorlax.png', sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 3 }
    ]
  };

  // 6. Camión del S.S. Anne en el Muelle (GBA)
  catalog.prefabs.props.ss_anne_truck = {
    id: 'ss_anne_truck',
    name: 'Camión Legendario del Puerto (GBA)',
    width: 48,
    height: 32,
    parts: [
      { sheet: 'poke_ss_anne_truck.png', sx: 0, sy: 0, sw: 48, sh: 32, dx: 0, dy: 0, zIndex: 3 }
    ]
  };

  catalog.prefabs.props.barrels = {
    id: 'barrels',
    name: 'Barriles de Carga Portuaria',
    width: 48,
    height: 32,
    parts: [
      { sheet: 'barrel.png', sx: 0, sy: 0, sw: 48, sh: 32, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  catalog.prefabs.props.boulder_rock = {
    id: 'boulder_rock',
    name: 'Roca Natural de Ruta',
    width: 32,
    height: 32,
    parts: [
      { sheet: 'rock.png', sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  catalog.prefabs.props.pebbles = {
    id: 'pebbles',
    name: 'Guijarros y Piedras de Camino',
    width: 24,
    height: 20,
    parts: [
      { sheet: 'rock.png', sx: 36, sy: 12, sw: 24, sh: 20, dx: 0, dy: 0, zIndex: 1 }
    ]
  };

  catalog.prefabs.props.stalagmite = {
    id: 'stalagmite',
    name: 'Estalagmita de Caverna',
    width: 32,
    height: 32,
    parts: [
      { sheet: 'mountains.png', sx: 0, sy: 256, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 2 }
    ]
  };

  // 3. Write catalog to JSON and JS
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2));
  fs.writeFileSync(OUTPUT_JS, `// Autogenerated by tile_scanner.mjs\nwindow.TILE_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`);
  console.log(`\nCatalog successfully generated and saved to:`);
  console.log(`  -> ${OUTPUT_JSON}`);
  console.log(`  -> ${OUTPUT_JS}`);
  console.log(`Total sheets registered: ${Object.keys(catalog.sheets).length}`);
  console.log(`Total terrains detected: ${Object.keys(catalog.terrains).length}`);
  console.log(`Total prefabs assembled: ${
    Object.keys(catalog.prefabs.trees).length +
    Object.keys(catalog.prefabs.buildings).length +
    Object.keys(catalog.prefabs.nature).length +
    Object.keys(catalog.prefabs.cliffs).length +
    Object.keys(catalog.prefabs.bridges).length +
    Object.keys(catalog.prefabs.props).length
  }`);

  // 4. Update the visual HTML viewer
  const viewerHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Catálogo Semántico de Tiles y Prefabs LPC v3</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    body { background-color: #0b0f19; font-family: system-ui, sans-serif; }
    .pixelated { image-rendering: pixelated; }
  </style>
</head>
<body class="text-slate-200 p-6 space-y-8">
  <header class="border-b border-slate-800 pb-4 flex justify-between items-center">
    <div>
      <h1 class="text-xl font-bold text-amber-400">Catálogo Semántico de Tiles y Prefabs LPC v3</h1>
      <p class="text-xs text-slate-400">Indexación dinámica de biomas, autotiles y estructuras arquitectónicas</p>
    </div>
    <span class="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded text-xs font-mono">
      ${Object.keys(catalog.sheets).length} Sheets • 100% Indexado
    </span>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Terrenos con Autotile Detectados</h2>
    <div class="grid grid-cols-3 gap-3">
      ${Object.entries(catalog.terrains).map(([name, t]) => `
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
          <div class="w-8 h-8 rounded border border-slate-700" style="background-color: rgb(${t.avgColor.join(',')})"></div>
          <div>
            <div class="font-mono text-sm font-bold text-emerald-300">${name}</div>
            <div class="text-xs text-slate-400">${t.sheet} • 3x6 LPC Autotile</div>
          </div>
        </div>
      `).join('')}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Prefabs y Estructuras Asambladas</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      ${Object.values(catalog.prefabs.buildings).concat(
        Object.values(catalog.prefabs.trees),
        Object.values(catalog.prefabs.bridges),
        Object.values(catalog.prefabs.nature)
      ).map(p => `
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <div class="font-bold text-sm text-slate-100">${p.name}</div>
          <div class="text-xs text-slate-400 font-mono">${p.id} (${p.width}x${p.height}px)</div>
          <div class="text-xs text-slate-500">${p.parts.length} piezas compositadas</div>
        </div>
      `).join('')}
    </div>
  </section>
</body>
</html>`;

  fs.writeFileSync(VIEWER_HTML, viewerHtml);
  console.log(`Visual viewer updated: ${VIEWER_HTML}`);
}

scanAndBuildCatalog().catch(err => {
  console.error(err);
  process.exit(1);
});
