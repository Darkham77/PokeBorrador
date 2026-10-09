import path from 'node:path';
import sharp from 'sharp';

const ARTIFACT_DIR = 'C:/Users/Ro/.gemini/antigravity/brain/b391978b-ef23-4ef4-a223-4b7e97986f65';
const OUT_FILE = path.join(ARTIFACT_DIR, 'croquis_barreras_topologicas.png');

const W = 1400;
const H = 820;

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#0f172a"/>
  <rect width="${W}" height="${H}" fill="url(#gridPattern)"/>

  <!-- Title Header -->
  <rect x="30" y="24" width="${W - 60}" height="70" rx="12" fill="#1e293b" stroke="#38bdf8" stroke-width="2" filter="url(#shadow)"/>
  <text x="50" y="58" font-family="'Segoe UI', Arial, sans-serif" font-size="24" font-weight="bold" fill="#f8fafc">
    CROQUIS TOPOLÓGICO: ENCAUZAMIENTO POR BARRERAS NATURALES
  </text>
  <text x="50" y="80" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#94a3b8">
    Comparativa entre el modelo actual (pasto abierto sin bloqueo) vs el modelo canónico Pokémon (relleno denso impenetrable).
  </text>

  <!-- ========================================================================= -->
  <!-- PANEL IZQUIERDO: EL ERROR ACTUAL -->
  <!-- ========================================================================= -->
  <g transform="translate(40, 115)">
    <!-- Container -->
    <rect width="630" height="660" rx="14" fill="#182234" stroke="#ef4444" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Panel Header -->
    <rect x="0" y="0" width="630" height="50" rx="14" fill="#ef4444" fill-opacity="0.15"/>
    <text x="24" y="32" font-family="'Segoe UI', Arial, sans-serif" font-size="18" font-weight="bold" fill="#f87171">
      ❌ MODELO ACTUAL (Incorrecto: Mundo Abierto)
    </text>

    <!-- Map Canvas Area -->
    <rect x="25" y="65" width="580" height="490" rx="10" fill="#2d6a4f"/>

    <!-- Open Meadow Area (Vast green grass) -->
    <rect x="25" y="65" width="580" height="490" rx="10" fill="#52b788" fill-opacity="0.35"/>

    <!-- Routes (Dirt Paths) -->
    <!-- Route A -> B -->
    <path d="M 120 160 L 460 160" stroke="#fef08a" stroke-width="28" stroke-linecap="round" fill="none"/>
    <path d="M 120 160 L 460 160" stroke="#ca8a04" stroke-width="28" stroke-dasharray="4 4" stroke-linecap="round" fill="none" opacity="0.3"/>
    
    <!-- Route B -> C -->
    <path d="M 460 160 L 460 440" stroke="#fef08a" stroke-width="28" stroke-linecap="round" fill="none"/>
    <path d="M 460 160 L 460 440" stroke="#ca8a04" stroke-width="28" stroke-dasharray="4 4" stroke-linecap="round" fill="none" opacity="0.3"/>

    <!-- Scattered Trees (Decorative only, lots of gaps!) -->
    <circle cx="240" cy="240" r="18" fill="#1b4332"/>
    <circle cx="280" cy="320" r="20" fill="#1b4332"/>
    <circle cx="340" cy="260" r="19" fill="#1b4332"/>
    <circle cx="200" cy="360" r="22" fill="#1b4332"/>
    <circle cx="370" cy="370" r="20" fill="#1b4332"/>

    <!-- POI Nodes -->
    <!-- POI A -->
    <circle cx="120" cy="160" r="32" fill="#3b82f6" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
    <text x="120" y="166" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">A</text>
    <rect x="60" y="105" width="120" height="24" rx="4" fill="#0f172a" fill-opacity="0.9"/>
    <text x="120" y="122" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#60a5fa" text-anchor="middle">Ciudad A</text>

    <!-- POI B -->
    <circle cx="460" cy="160" r="32" fill="#3b82f6" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
    <text x="460" y="166" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">B</text>
    <rect x="400" y="105" width="120" height="24" rx="4" fill="#0f172a" fill-opacity="0.9"/>
    <text x="460" y="122" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#60a5fa" text-anchor="middle">Ciudad B</text>

    <!-- POI C -->
    <circle cx="460" cy="440" r="32" fill="#3b82f6" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
    <text x="460" y="446" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">C</text>
    <rect x="400" y="485" width="120" height="24" rx="4" fill="#0f172a" fill-opacity="0.9"/>
    <text x="460" y="502" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#60a5fa" text-anchor="middle">Ciudad C</text>

    <!-- The Problem: Player walking straight across open grass from A to C! -->
    <path d="M 140 185 Q 260 340 435 425" stroke="#ef4444" stroke-width="5" stroke-dasharray="8 6" fill="none"/>
    <polygon points="440,428 425,420 430,435" fill="#ef4444"/>

    <!-- Warning Callout Box -->
    <rect x="135" y="275" width="250" height="60" rx="8" fill="#450a0a" stroke="#ef4444" stroke-width="2" filter="url(#shadow)"/>
    <text x="260" y="298" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="bold" fill="#fca5a5" text-anchor="middle">
      ⚠️ ERROR DE DISEÑO
    </text>
    <text x="260" y="320" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" fill="#fecaca" text-anchor="middle">
      Pasto abierto permite caminar de A a C
    </text>
    <text x="260" y="334" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" fill="#fecaca" text-anchor="middle">
      ¡Se salta Ciudad B y el 50% del juego!
    </text>

    <!-- Bottom Description -->
    <rect x="25" y="570" width="580" height="70" rx="8" fill="#0f172a" fill-opacity="0.7"/>
    <text x="40" y="595" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#cbd5e1">
      • Hay árboles decorativos sueltos con huecos transitables por todas partes.
    </text>
    <text x="40" y="616" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#cbd5e1">
      • Nada impide físicamente que el sprite del jugador camine por la llanura.
    </text>
    <text x="40" y="637" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#f87171" font-weight="bold">
      • Rompe la progresión lineal del RPG y la lógica del grafo de rutas.
    </text>
  </g>

  <!-- ========================================================================= -->
  <!-- PANEL DERECHO: EL MODELO CANÓNICO (LO QUE BUSCAS) -->
  <!-- ========================================================================= -->
  <g transform="translate(730, 115)">
    <!-- Container -->
    <rect width="630" height="660" rx="14" fill="#182234" stroke="#22c55e" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Panel Header -->
    <rect x="0" y="0" width="630" height="50" rx="14" fill="#22c55e" fill-opacity="0.15"/>
    <text x="24" y="32" font-family="'Segoe UI', Arial, sans-serif" font-size="18" font-weight="bold" fill="#4ade80">
      ✅ MODELO CANÓNICO POKÉMON (Relleno Infranqueable)
    </text>

    <!-- Map Canvas Area -->
    <rect x="25" y="65" width="580" height="490" rx="10" fill="#064e3b"/>

    <!-- Dense Forest Mass (Solid Impassable Greenery in all voids) -->
    <!-- Dense tree cluster pattern covering the entire center void -->
    <g fill="#14532d" stroke="#052e16" stroke-width="1.5">
      <!-- Massive solid forest block between A and C -->
      <rect x="90" y="210" width="310" height="270" rx="12" fill="#0f3d24"/>
      <!-- Individual overlapping tree crowns creating an impenetrable wall -->
      <!-- Row 1 -->
      <circle cx="120" cy="225" r="22"/> <circle cx="155" cy="225" r="22"/> <circle cx="190" cy="225" r="22"/> <circle cx="225" cy="225" r="22"/> <circle cx="260" cy="225" r="22"/> <circle cx="295" cy="225" r="22"/> <circle cx="330" cy="225" r="22"/> <circle cx="365" cy="225" r="22"/> <circle cx="395" cy="225" r="22"/>
      <!-- Row 2 -->
      <circle cx="110" cy="260" r="22"/> <circle cx="145" cy="260" r="22"/> <circle cx="180" cy="260" r="22"/> <circle cx="215" cy="260" r="22"/> <circle cx="250" cy="260" r="22"/> <circle cx="285" cy="260" r="22"/> <circle cx="320" cy="260" r="22"/> <circle cx="355" cy="260" r="22"/> <circle cx="390" cy="260" r="22"/>
      <!-- Row 3 -->
      <circle cx="115" cy="295" r="22"/> <circle cx="150" cy="295" r="22"/> <circle cx="185" cy="295" r="22"/> <circle cx="220" cy="295" r="22"/> <circle cx="255" cy="295" r="22"/> <circle cx="290" cy="295" r="22"/> <circle cx="325" cy="295" r="22"/> <circle cx="360" cy="295" r="22"/> <circle cx="395" cy="295" r="22"/>
      <!-- Row 4 -->
      <circle cx="120" cy="330" r="22"/> <circle cx="155" cy="330" r="22"/> <circle cx="190" cy="330" r="22"/> <circle cx="225" cy="330" r="22"/> <circle cx="260" cy="330" r="22"/> <circle cx="295" cy="330" r="22"/> <circle cx="330" cy="330" r="22"/> <circle cx="365" cy="330" r="22"/> <circle cx="395" cy="330" r="22"/>
      <!-- Row 5 -->
      <circle cx="125" cy="365" r="22"/> <circle cx="160" cy="365" r="22"/> <circle cx="195" cy="365" r="22"/> <circle cx="230" cy="365" r="22"/> <circle cx="265" cy="365" r="22"/> <circle cx="300" cy="365" r="22"/> <circle cx="335" cy="365" r="22"/> <circle cx="370" cy="365" r="22"/> <circle cx="395" cy="365" r="22"/>
      <!-- Row 6 -->
      <circle cx="130" cy="400" r="22"/> <circle cx="165" cy="400" r="22"/> <circle cx="200" cy="400" r="22"/> <circle cx="235" cy="400" r="22"/> <circle cx="270" cy="400" r="22"/> <circle cx="305" cy="400" r="22"/> <circle cx="340" cy="400" r="22"/> <circle cx="375" cy="400" r="22"/> <circle cx="395" cy="400" r="22"/>
      <!-- Outer perimeter barriers (blocking top & right) -->
      <circle cx="120" cy="85" r="22"/> <circle cx="155" cy="85" r="22"/> <circle cx="190" cy="85" r="22"/> <circle cx="225" cy="85" r="22"/> <circle cx="260" cy="85" r="22"/> <circle cx="295" cy="85" r="22"/> <circle cx="330" cy="85" r="22"/> <circle cx="365" cy="85" r="22"/> <circle cx="400" cy="85" r="22"/> <circle cx="435" cy="85" r="22"/> <circle cx="470" cy="85" r="22"/>
      <circle cx="530" cy="120" r="22"/> <circle cx="530" cy="160" r="22"/> <circle cx="530" cy="200" r="22"/> <circle cx="530" cy="240" r="22"/> <circle cx="530" cy="280" r="22"/> <circle cx="530" cy="320" r="22"/> <circle cx="530" cy="360" r="22"/> <circle cx="530" cy="400" r="22"/> <circle cx="530" cy="440" r="22"/>
      <circle cx="50" cy="160" r="22"/> <circle cx="50" cy="200" r="22"/> <circle cx="50" cy="240" r="22"/>
    </g>

    <!-- Transitable Corridors (Dilated Playable Hallways) -->
    <!-- Corridor A -> B -->
    <path d="M 120 160 L 460 160" stroke="#86efac" stroke-width="48" stroke-linecap="round" fill="none" opacity="0.4"/>
    <path d="M 120 160 L 460 160" stroke="#fef08a" stroke-width="26" stroke-linecap="round" fill="none"/>

    <!-- Corridor B -> C -->
    <path d="M 460 160 L 460 440" stroke="#86efac" stroke-width="48" stroke-linecap="round" fill="none" opacity="0.4"/>
    <path d="M 460 160 L 460 440" stroke="#fef08a" stroke-width="26" stroke-linecap="round" fill="none"/>

    <!-- POI Nodes -->
    <!-- POI A -->
    <circle cx="120" cy="160" r="32" fill="#3b82f6" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
    <text x="120" y="166" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">A</text>
    <rect x="60" y="105" width="120" height="24" rx="4" fill="#0f172a" fill-opacity="0.9"/>
    <text x="120" y="122" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#60a5fa" text-anchor="middle">Ciudad A</text>

    <!-- POI B -->
    <circle cx="460" cy="160" r="32" fill="#3b82f6" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
    <text x="460" y="166" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">B</text>
    <rect x="400" y="105" width="120" height="24" rx="4" fill="#0f172a" fill-opacity="0.9"/>
    <text x="460" y="122" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#60a5fa" text-anchor="middle">Ciudad B</text>

    <!-- POI C -->
    <circle cx="460" cy="440" r="32" fill="#3b82f6" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
    <text x="460" y="446" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">C</text>
    <rect x="400" y="485" width="120" height="24" rx="4" fill="#0f172a" fill-opacity="0.9"/>
    <text x="460" y="502" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#60a5fa" text-anchor="middle">Ciudad C</text>

    <!-- Blocked Shortcut Arrow -->
    <path d="M 145 190 L 260 305" stroke="#ef4444" stroke-width="4" stroke-dasharray="6 4" fill="none"/>
    <circle cx="265" cy="310" r="22" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" filter="url(#shadow)"/>
    <text x="265" y="318" font-family="'Segoe UI', Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">✕</text>

    <!-- Success Route Arrows (Obligatory canalized corridor) -->
    <!-- A -> B -->
    <path d="M 170 160 L 410 160" stroke="#22c55e" stroke-width="6" stroke-linecap="round" fill="none"/>
    <polygon points="415,160 398,152 400,168" fill="#22c55e"/>
    <!-- B -> C -->
    <path d="M 460 210 L 460 390" stroke="#22c55e" stroke-width="6" stroke-linecap="round" fill="none"/>
    <polygon points="460,395 452,378 468,380" fill="#22c55e"/>

    <!-- Callout Box in Forest -->
    <rect x="135" y="340" width="250" height="52" rx="8" fill="#064e3b" stroke="#4ade80" stroke-width="2" filter="url(#shadow)"/>
    <text x="260" y="362" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="bold" fill="#86efac" text-anchor="middle">
      🌲 BARRERA IMPENETRABLE
    </text>
    <text x="260" y="380" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" fill="#dcfce7" text-anchor="middle">
      Bosque denso / Muros de roca bloquean el atajo
    </text>

    <!-- Bottom Description -->
    <rect x="25" y="570" width="580" height="70" rx="8" fill="#0f172a" fill-opacity="0.7"/>
    <text x="40" y="595" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#cbd5e1">
      • <tspan font-weight="bold" fill="#4ade80">Todo hueco fuera de rutas se inunda</tspan> con árboles pegados o montañas.
    </text>
    <text x="40" y="616" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#cbd5e1">
      • El jugador está <tspan font-weight="bold" fill="#facc15">encauzado físicamente</tspan> dentro del pasillo de la ruta.
    </text>
    <text x="40" y="637" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#38bdf8" font-weight="bold">
      • Obligación total de pasar por Ciudad B para llegar a Ciudad C.
    </text>
  </g>
</svg>
`;

async function main() {
  await sharp(Buffer.from(svg))
    .png()
    .toFile(OUT_FILE);
  console.log(`Croquis generated successfully at ${OUT_FILE}`);
}

main().catch(console.error);
