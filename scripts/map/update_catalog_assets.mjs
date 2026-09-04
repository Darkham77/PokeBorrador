import fs from 'fs';

const catalogJsonPath = 'scratch/map_lab/tile_catalog.json';
const catalogJsPath = 'scratch/map_lab/tile_catalog.js';

const catalog = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));

// 1. Register sheets
catalog.sheets['poke_guardhouse.png'] = {
  file: 'poke_guardhouse.png',
  width: 96,
  height: 56,
  cols: 3,
  rows: 2,
  hasAlpha: true
};

catalog.sheets['poke_cycling_railing.png'] = {
  file: 'poke_cycling_railing.png',
  width: 32,
  height: 32,
  cols: 1,
  rows: 1,
  hasAlpha: true
};

catalog.sheets['poke_boardwalk_planks.png'] = {
  file: 'poke_boardwalk_planks.png',
  width: 32,
  height: 32,
  cols: 1,
  rows: 1,
  hasAlpha: true
};

// 2. Register prefabs
if (!catalog.prefabs.buildings) catalog.prefabs.buildings = {};
catalog.prefabs.buildings['guardhouse'] = {
  id: 'guardhouse',
  name: 'Caseta de Guardia / Puesto de Control',
  width: 96,
  height: 56,
  footprint: { w: 3, h: 2, doorOffset: { x: 1, y: 1 } },
  parts: [
    {
      sheet: 'poke_guardhouse.png',
      sx: 0, sy: 0, sw: 96, sh: 56, dx: 0, dy: 0, zIndex: 2
    }
  ]
};

if (!catalog.prefabs.props) catalog.prefabs.props = {};
catalog.prefabs.props['cycling_railing'] = {
  id: 'cycling_railing',
  name: 'Barandilla Metálica de Viaducto',
  width: 32,
  height: 32,
  parts: [
    {
      sheet: 'poke_cycling_railing.png',
      sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 3
    }
  ]
};

catalog.prefabs.props['boardwalk_planks'] = {
  id: 'boardwalk_planks',
  name: 'Tablones de Pasarela Marítima',
  width: 32,
  height: 32,
  parts: [
    {
      sheet: 'poke_boardwalk_planks.png',
      sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 1
    }
  ]
};

// 3. Write updated catalog
fs.writeFileSync(catalogJsonPath, JSON.stringify(catalog, null, 2), 'utf-8');
const jsContent = `/**
 * Poké Vicio • Catálogo Semántico de Tiles (Exportación Nativa v5.0)
 */
window.POKE_TILE_CATALOG = ${JSON.stringify(catalog, null, 2)};
`;
fs.writeFileSync(catalogJsPath, jsContent, 'utf-8');

console.log('? tile_catalog.json and tile_catalog.js updated successfully with new assets!');
