/**
 * scripts/map/build_mobile_gallery_artifact.ts
 *
 * Generates a self-contained, mobile-optimized HTML artifact with embedded Base64 images
 * so the user can inspect, pan, zoom, and download generated procedural maps directly from their phone.
 */

import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

function getBase64Image(filename: string): string | null {
  let fullPath = path.join(ARTIFACT_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    // Try to find a file starting with the base name (e.g. micro_vineta_berry_orchard)
    const basePrefix = filename.replace(/_\d+\.png$/, '');
    if (fs.existsSync(ARTIFACT_DIR)) {
      const match = fs.readdirSync(ARTIFACT_DIR).find((f) => f.startsWith(basePrefix) && f.endsWith('.png'));
      if (match) {
        fullPath = path.join(ARTIFACT_DIR, match);
      }
    }
  }
  if (!fs.existsSync(fullPath)) return null;
  const buffer = fs.readFileSync(fullPath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

const items = [
  {
    category: 'continentes',
    title: 'Continente Pokémon HD (400x400 Tiles, 6400x6400 px)',
    desc: 'Escala regional monumental: océano austral, cordillera central, meandros fluviales y 18 asentamientos.',
    file: 'continente_pokemon_hd_6400px.png'
  },
  {
    category: 'ciudades',
    title: 'Ciudad en Meseta (Procedural, Sin Hardcode, Sin Museo Corrupto)',
    desc: 'Cuadrantes asimétricos con Centro Pokémon, Gimnasio Roca, Tienda y casas rústicas en plena montaña.',
    file: 'spot_01_ciudad_plateada.png'
  },
  {
    category: 'ciudades',
    title: 'Ciudad Cerúlea / Arquetipo Dojo',
    desc: 'Dojo de artes marciales en NE, Centro en NW, Tienda en SW y Gimnasio en SE con bancos y farolas.',
    file: 'spot_02_ciudad_celeste.png'
  },
  {
    category: 'ciudades',
    title: 'Ciudad Carmín y Puerto Marítimo',
    desc: 'Club de Fans Pokémon, Gimnasio en NW, pinedas densas y calles de arena conectadas al litoral.',
    file: 'spot_03_ciudad_carmin_puerto.png'
  },
  {
    category: 'ciudades',
    title: 'Ciudad Costera / Fucsia',
    desc: 'Avenida empedrada con salida directa a la playa, Centro en NE, Gimnasio y casas de tejado verde.',
    file: 'spot_04_ciudad_fucsia.png'
  },
  {
    category: 'ciudades',
    title: 'Metrópolis Celadón / Capital',
    desc: 'Gran Centro Comercial, Casino Rocket, Bloque de Condominios y bosques perimetrales.',
    file: 'inspeccion_04_ciudad_celadon_metropolis.png'
  },
  {
    category: 'ciudades',
    title: 'Pueblo Inicial: Jardines y Cercados',
    desc: 'Jardines cercados con cancelas, buzones al pie de puerta y huerto rural.',
    file: 'inspeccion_01_pueblo_paleta_jardines.png'
  },
  {
    category: 'mecanicas',
    title: 'Garita de Control Vertical (Ruta 1)',
    desc: 'Aduana canónica con cercos de madera y vía central transitable.',
    file: 'garita_control_1_route_gate_1.png'
  },
  {
    category: 'mecanicas',
    title: 'Garita de Control Horizontal (Ruta 2)',
    desc: 'Aduana horizontal con paso transversal de este a oeste y vallas de seguridad.',
    file: 'garita_control_2_route_gate_2.png'
  },
  {
    category: 'mecanicas',
    title: 'Desnivel Salto 1-Way (Ledge GBA)',
    desc: 'Autotiling canónico de 3 piezas con corredor lateral transitable anti-softlock.',
    file: 'desnivel_salto_1way_ledge_1.png'
  },
  {
    category: 'mecanicas',
    title: 'Obstáculo MO: Árbol de Corte',
    desc: 'Bloqueo en atajo secundario accesible con Medalla Cascada (Gimnasio 2) con vallas de contención.',
    file: 'obstaculo_mo_cut_tree_1.png'
  },
  {
    category: 'mecanicas',
    title: 'Hierba Alta Canónica (Pradera Ruta 1)',
    desc: 'Campos extensos de hierba alta GBA que flanquean la ruta para encuentros con Pokémon salvajes.',
    file: 'spot_11_pradera_hierba_alta_ruta_1.png'
  },
  {
    category: 'mecanicas',
    title: 'Obstáculo MO: Roca de Fuerza',
    desc: 'Bloqueo en desfiladero montañoso accesible con Medalla Arcoíris (Gimnasio 4).',
    file: 'obstaculo_mo_strength_boulder_3.png'
  },
  {
    category: 'vinetas',
    title: 'Micro-Viñeta: Huerto de Bayas',
    desc: 'Huerto cerrado con hileras de arbustos de bayas, flores, carteles de consejos y vallas rústicas.',
    file: 'micro_vineta_berry_orchard_3.png'
  },
  {
    category: 'vinetas',
    title: 'Micro-Viñeta: Plaza con Fuente Cívica',
    desc: 'Plaza comunitaria con fuente de piedra 3x3, farolas urbanas, banco de descanso y flores.',
    file: 'micro_vineta_civic_fountain_1.png'
  }
];

const renderedCards = items
  .map((item, idx) => {
    const dataUri = getBase64Image(item.file);
    if (!dataUri) return '';
    return `
      <div class="gallery-card bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-md flex flex-col mb-6" data-category="${item.category}">
        <div class="p-4 bg-slate-900/40 border-b border-[var(--border)] flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-white tracking-wide">${item.title}</h3>
            <p class="text-xs text-slate-400 mt-0.5">${item.desc}</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">#${idx + 1}</span>
        </div>
        <div class="relative bg-[#102040] flex items-center justify-center p-2 overflow-hidden min-h-[260px]">
          <img
            src="${dataUri}"
            alt="${item.title}"
            class="max-w-full h-auto max-h-[480px] object-contain rounded-lg shadow"
            style="image-rendering: pixelated; image-rendering: crisp-edges;"
            loading="lazy"
          />
        </div>
        <div class="p-3 bg-slate-900/60 border-t border-[var(--border)] flex justify-between items-center gap-3">
          <span class="text-[11px] font-mono text-slate-400 truncate">${item.file}</span>
          <a
            href="${dataUri}"
            download="${item.file}"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
          >
            <span>⬇️</span> Descargar al Celular
          </a>
        </div>
      </div>
    `;
  })
  .filter(Boolean)
  .join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">
  <title>Visor de Continentes Pokémon (Móvil)</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    :root {
      --background: #0b1120;
      --card: #131d31;
      --border: #223252;
      --foreground: #f1f5f9;
      --muted-foreground: #94a3b8;
    }
    body {
      background-color: var(--background);
      color: var(--foreground);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      touch-action: pan-y;
      -webkit-font-smoothing: antialiased;
    }
    .pixelated {
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body class="p-3 sm:p-6 max-w-3xl mx-auto pb-16">

  <!-- Header -->
  <header class="mb-6 text-center">
    <div class="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
      Poké Vicio • Motor Procedural GBA
    </div>
    <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
      Explorador de Continentes y Ciudades
    </h1>
    <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
      Toca cualquier botón de descarga para guardar las imágenes directamente en la galería de tu celular con máxima nitidez pixel art.
    </p>
  </header>

  <!-- Filter Tabs -->
  <div class="flex flex-wrap gap-2 justify-center mb-6 sticky top-2 z-10 bg-slate-900/90 backdrop-blur p-2 rounded-2xl border border-slate-800 shadow-lg">
    <button onclick="filterCategory('all', this)" class="tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow">
      Todos
    </button>
    <button onclick="filterCategory('continentes', this)" class="tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white">
      🗺️ Continentes
    </button>
    <button onclick="filterCategory('ciudades', this)" class="tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white">
      🏙️ Ciudades
    </button>
    <button onclick="filterCategory('mecanicas', this)" class="tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white">
      🧗 Ledges & MOs
    </button>
    <button onclick="filterCategory('vinetas', this)" class="tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white">
      ⛲ Viñetas
    </button>
  </div>

  <!-- Cards Container -->
  <main id="gallery-container">
    ${renderedCards}
  </main>

  <footer class="mt-8 text-center text-xs text-slate-500">
    Poké Vicio Procedural Continental Engine • 100% Cero Hardcoding
  </footer>

  <script>
    function filterCategory(category, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.className = 'tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
      });
      btn.className = 'tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow';

      const cards = document.querySelectorAll('.gallery-card');
      cards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>
`;

const targetHtmlPath = path.join(ARTIFACT_DIR, 'galeria_continentes_mobile.html');
fs.writeFileSync(targetHtmlPath, htmlContent, 'utf-8');
console.log(`Galería móvil generada exitosamente en: ${targetHtmlPath} (${(htmlContent.length / 1024).toFixed(1)} KB)`);
