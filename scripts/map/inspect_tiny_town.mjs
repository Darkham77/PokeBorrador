/**
 * inspect_tiny_town.mjs - Genera un visualizador interactivo con el catálogo indexado
 * de todos los tiles (0 a 131) de Kenney Tiny Town para mapear el diccionario.
 */

import fs from 'fs';
import path from 'path';

const tilesDir = path.join(process.cwd(), 'scratch', 'map_lab', 'tilesets', 'kenney', 'tiny-town', 'Tiles');
const tileFiles = fs.readdirSync(tilesDir).filter(f => f.endsWith('.png')).sort();

let tileItemsHtml = '';
tileFiles.forEach((file, index) => {
  const tileId = parseInt(file.replace('tile_', '').replace('.png', ''), 10);
  const col = tileId % 12;
  const row = Math.floor(tileId / 12);

  tileItemsHtml += `
    <div class="tile-card flex flex-col items-center bg-slate-800 p-2 rounded border border-slate-700 hover:border-amber-400 cursor-pointer transition-all" data-id="${tileId}" data-col="${col}" data-row="${row}">
      <img src="tilesets/kenney/tiny-town/Tiles/${file}" class="w-10 h-10 pixelated" alt="Tile ${tileId}" />
      <span class="font-mono text-xs font-bold text-amber-400 mt-1">#${tileId}</span>
      <span class="text-[10px] text-slate-400">(${col},${row})</span>
    </div>
  `;
});

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Kenney Tiny Town - Visual Tile Indexer</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    .pixelated { image-rendering: pixelated; }
  </style>
</head>
<body class="bg-slate-950 text-slate-200 p-6 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">
    <header class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div>
        <h1 class="text-xl font-bold text-amber-400">Kenney Tiny Town (16x16) • Catálogo de Tiles</h1>
        <p class="text-xs text-slate-400">132 tiles individuales listos para mapear en el diccionario de Kanto</p>
      </div>
      <div class="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-3 py-1.5 rounded font-mono">
        12 Columnas x 11 Filas
      </div>
    </header>

    <div class="grid grid-cols-12 gap-2 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
      ${tileItemsHtml}
    </div>
  </div>
</body>
</html>`;

const outPath = path.join(process.cwd(), 'scratch', 'map_lab', 'tiny_town_atlas_viewer.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Visual indexer generated at:', outPath);
