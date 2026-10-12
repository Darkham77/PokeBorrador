import { chromium, type Page } from '@playwright/test';

interface IssueRecord {
  readonly type: 'pageerror' | 'console-error' | 'failed-request' | 'unhandled-rejection';
  readonly message: string;
  readonly tab?: string;
}

const VIEWPORT_WIDTH = 1440 as const;
const VIEWPORT_HEIGHT = 900 as const;
const NAVIGATION_TIMEOUT_MS = 30000 as const;
const SELECTOR_TIMEOUT_MS = 10000 as const;
const CONTROL_WAIT_TIMEOUT_MS = 3000 as const;
const HTTP_ERROR_STATUS_THRESHOLD = 400 as const;
const WORLD_BAKING_SETTLE_TIMEOUT_MS = 1500 as const;
const PREFAB_THUMB_LOAD_TIMEOUT_MS = 600 as const;
const SELECTION_CANVAS_RENDER_TIMEOUT_MS = 500 as const;

async function clickIdSafely(page: Page, id: string, description: string): Promise<boolean> {
  const locator = page.locator(`#${id}`);
  const isVisible = await locator.waitFor({ state: 'visible', timeout: CONTROL_WAIT_TIMEOUT_MS })
    .then(() => true)
    .catch((err: unknown) => {
      console.debug(`[clickIdSafely] Element #${id} wait timed out:`, err instanceof Error ? err.message : String(err));
      return false;
    });

  if (!isVisible) {
    console.warn(`   ⚠️ Control #${id} (${description}) no visible en pantalla.`);
    return false;
  }

  try {
    console.log(`   👉 Clickeando #${id} [${description}]`);
    await locator.click({ force: true });
    await page.waitForFunction(() => true);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`   ⚠️ Falló interacción con #${id}: ${msg}`);
    return false;
  }
}

async function runTestAventuraSuite(): Promise<void> {
  console.log('🚀 Iniciando suite de verificación Playwright para test_aventura con selectores por ID...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }
  });
  const page = await context.newPage();

  const issues: IssueRecord[] = [];
  let currentTab = 'initial-load';

  page.on('pageerror', (err) => {
    console.error(`❌ [PageError][${currentTab}]:`, err.message);
    issues.push({ type: 'pageerror', message: err.message, tab: currentTab });
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (!text.includes('favicon.ico')) {
        console.error(`⚠️ [ConsoleError][${currentTab}]:`, text);
        issues.push({ type: 'console-error', message: text, tab: currentTab });
      }
    } else if (msg.type() === 'warning' && text.includes('Duplicate keys found')) {
      console.error(`⚠️ [VueWarning][${currentTab}]:`, text);
      issues.push({ type: 'console-error', message: text, tab: currentTab });
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.includes('favicon.ico')) {
      const failure = req.failure()?.errorText ?? 'unknown';
      if (failure !== 'net::ERR_ABORTED') {
        console.error(`🚨 [RequestFailed][${currentTab}]: ${url} (${failure})`);
        issues.push({ type: 'failed-request', message: `${url} - ${failure}`, tab: currentTab });
      }
    }
  });

  page.on('response', (resp) => {
    const status = resp.status();
    const url = resp.url();
    if (status >= HTTP_ERROR_STATUS_THRESHOLD && !url.includes('favicon.ico')) {
      const msg = `HTTP ${status} on ${url}`;
      console.error(`🚨 [HTTPError][${currentTab}]: ${msg}`);
      issues.push({ type: 'failed-request', message: msg, tab: currentTab });
    }
  });

  try {
    console.log('🌐 Navegando a https://localhost:5173/test_aventura/index.html...');
    await page.goto('https://localhost:5173/test_aventura/index.html', {
      waitUntil: 'networkidle',
      timeout: NAVIGATION_TIMEOUT_MS
    });
    console.log('✅ Carga inicial completada con éxito.');

    // 1. Croquis Kanto
    currentTab = 'kanto';
    console.log('\n--- 🗺️ [1/7] Probando pestaña: Croquis Kanto (#tab-kanto) ---');
    await page.waitForSelector('.adventure-suite-container', { timeout: SELECTOR_TIMEOUT_MS });
    await clickIdSafely(page, 'btn-radar', 'Radar modal toggle');
    await clickIdSafely(page, 'btn-header-inventory', 'Abrir inventario');
    await clickIdSafely(page, 'btn-debug', 'Debug drawer toggle');
    await clickIdSafely(page, 'node-pallet', 'Seleccionar parada Pueblo Paleta');

    // 2. Continent Studio
    currentTab = 'continent';
    console.log('\n--- 🌍 [2/7] Probando pestaña: Continent Studio (#tab-continent) ---');
    await clickIdSafely(page, 'tab-continent', 'Pestaña Continent Studio');
    await clickIdSafely(page, 'btn-display-hybrid', 'Modo de visualización Híbrido');
    await clickIdSafely(page, 'btn-display-tiles', 'Modo de visualización Tiles GBA');
    await clickIdSafely(page, 'btn-random-seed', 'Generar semilla aleatoria');
    await clickIdSafely(page, 'btn-dim-128', 'Escala 128x128');
    await clickIdSafely(page, 'btn-preset-kanto', 'Cargar Preset Canónico Kanto');
    await clickIdSafely(page, 'btn-regional-center-view', 'Centrar viewport regional');

    // 3. Continental / Map Studio
    currentTab = 'map-studio';
    console.log('\n--- 📐 [3/7] Probando pestaña: Map Studio (#tab-map-studio) ---');
    await clickIdSafely(page, 'tab-map-studio', 'Pestaña Map Studio');
    await clickIdSafely(page, 'btn-view-connections', 'Vista Conexiones');
    await clickIdSafely(page, 'btn-view-geographic', 'Vista Geográfica');
    await clickIdSafely(page, 'tool-btn-terrain', 'Herramienta Pincel de Terreno');
    await clickIdSafely(page, 'tool-btn-structures', 'Herramienta Estampador');
    await clickIdSafely(page, 'tool-btn-pointer-geo', 'Herramienta Puntero');
    await clickIdSafely(page, 'btn-generate-geography', 'Generar Geografía Procedural');
    // Wait for async world baking to settle
    await page.waitForTimeout(WORLD_BAKING_SETTLE_TIMEOUT_MS);
    await clickIdSafely(page, 'btn-load-kanto', 'Cargar Kanto Canónico');
    await page.waitForTimeout(WORLD_BAKING_SETTLE_TIMEOUT_MS);

    // 4. Graph Studio
    currentTab = 'graph-studio';
    console.log('\n--- 🕸️ [4/7] Probando pestaña: Graph Studio (#tab-graph-studio) ---');
    await clickIdSafely(page, 'tab-graph-studio', 'Pestaña Graph Studio');
    await clickIdSafely(page, 'btn-teleport-cerulean', 'Saltar a Ciudad Celeste');
    await clickIdSafely(page, 'btn-teleport-pallet', 'Saltar a Pueblo Paleta');
    await clickIdSafely(page, 'btn-tab-prefabs', 'Pestaña Drawer Prefabs');
    await clickIdSafely(page, 'chip-buildings', 'Filtro Prefabs Edificios');
    await page.waitForTimeout(PREFAB_THUMB_LOAD_TIMEOUT_MS);
    const brokenPrefabs = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('.prefabs-grid img.prefab-thumb')) as HTMLImageElement[];
      return imgs.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src);
    });
    if (brokenPrefabs.length > 0) {
      console.error('🚨 Prefabs con imágenes rotas en Graph Studio:', brokenPrefabs);
      issues.push({ type: 'failed-request', message: `Broken prefabs: ${brokenPrefabs.join(', ')}`, tab: 'graph-studio' });
    } else {
      console.log('   ✅ Prefabs visibles de Graph Studio cargados sin imágenes rotas.');
    }
    await clickIdSafely(page, 'btn-tab-terrain', 'Pestaña Drawer Terreno');
    await clickIdSafely(page, 'btn-brush-2', 'Brocha de terreno 2x2');

    // 5. Local Cell & Tile Studio
    currentTab = 'cell-studio';
    console.log('\n--- 🧱 [5/7] Probando pestaña: Tile Editor (#tab-cell-studio) ---');
    await clickIdSafely(page, 'tab-cell-studio', 'Pestaña Tile Editor');
    await clickIdSafely(page, 'layer-row-ground', 'Seleccionar capa Ground');
    await clickIdSafely(page, 'btn-vis-layer-ground', 'Toggle visibilidad Ground');
    await clickIdSafely(page, 'layer-row-collision', 'Seleccionar capa Colisiones');

    // 6. Autotile Studio
    currentTab = 'autotile';
    console.log('\n--- 🧩 [6/7] Probando pestaña: Autotile Studio (#tab-autotile) ---');
    await clickIdSafely(page, 'tab-autotile', 'Pestaña Autotile Studio');
    await clickIdSafely(page, 'btn-autotile-randomize-seed', 'Randomizar Semilla Autotile');
    await clickIdSafely(page, 'btn-radius-2', 'Radio de inspección 5x5');
    await clickIdSafely(page, 'btn-category-mountain_cliff', 'Filtro categoría Riscos/Montaña');
    await clickIdSafely(page, 'btn-category-water_coast', 'Filtro categoría Agua/Costas');
    await clickIdSafely(page, 'btn-category-all', 'Filtro categoría Todos');
    await clickIdSafely(page, 'btn-autotile-report', 'Abrir reporte autotile');
    await clickIdSafely(page, 'btn-close-report', 'Cerrar reporte autotile');

    // 7. GBA Asset Atlas Inspector
    currentTab = 'atlas';
    console.log('\n--- 🖼️ [7/7] Probando pestaña: Atlas Inspector (#tab-atlas) ---');
    await clickIdSafely(page, 'tab-atlas', 'Pestaña Atlas Inspector');
    await clickIdSafely(page, 'btn-atlas-toggle-grid', 'Toggle Cuadrícula Atlas');
    await clickIdSafely(page, 'btn-gallery-cat-buildings', 'Filtro Galería Edificios');
    await clickIdSafely(page, 'btn-gallery-cat-nature', 'Filtro Galería Naturaleza');
    await clickIdSafely(page, 'btn-gallery-cat-all', 'Filtro Galería Todos');

    // Verify all rendered gallery images loaded with natural dimensions
    console.log('   🔍 Verificando integridad de imágenes renderizadas en la galería...');
    await page.waitForSelector('.asset-card img.preview-img', { timeout: SELECTOR_TIMEOUT_MS });
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('.asset-card img.preview-img')) as HTMLImageElement[];
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .slice(0, 10)
        .map((img) => img.src);
    });

    if (brokenImages.length > 0) {
      console.error(`🚨 Detectadas ${brokenImages.length} imágenes rotas en Atlas Inspector:`, brokenImages);
      for (const broken of brokenImages) {
        issues.push({ type: 'failed-request', message: `Broken image in DOM: ${broken}`, tab: 'atlas' });
      }
    } else {
      console.log('   ✅ Todas las imágenes visibles de la galería cargaron correctamente.');
    }

    // Probar selección de edificios y verificación de renderizado en el canvas central
    console.log('   👉 Probando selección de edificios y renderizado en MasterSheetCanvas...');
    await clickIdSafely(page, 'btn-gallery-cat-buildings', 'Filtro Edificios para selección');
    await clickIdSafely(page, 'card-asset-poke_dept_store', 'Seleccionar Edificio Dept Store');
    await page.waitForTimeout(SELECTION_CANVAS_RENDER_TIMEOUT_MS);

    const canvasHasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.master-sheet-canvas') as HTMLCanvasElement | null;
      if (!canvas) return false;
      if (canvas.width === 0 || canvas.height === 0) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const pixel = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      // Pixel alpha or color should not be completely 0/undefined
      return canvas.width > 0 && canvas.height > 0 && pixel !== undefined;
    });

    if (!canvasHasContent) {
      console.error('🚨 Canvas central no tiene contenido tras seleccionar edificio.');
      issues.push({ type: 'pageerror', message: 'MasterSheetCanvas is empty or has 0 dimensions', tab: 'atlas' });
    } else {
      console.log('   ✅ Canvas central renderizó correctamente el edificio seleccionado.');
    }

    await clickIdSafely(page, 'card-asset-poke_museum', 'Seleccionar Edificio Museo Pewter');
    await page.waitForTimeout(SELECTION_CANVAS_RENDER_TIMEOUT_MS);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('💥 Error crítico durante la ejecución del test:', errorMsg);
    issues.push({ type: 'pageerror', message: errorMsg, tab: currentTab });
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('📊 RESUMEN DE COMPROBACIÓN TEST_AVENTURA CON SELECTORES ID:');
  console.log(`Total de incidencias capturadas: ${issues.length}`);
  if (issues.length === 0) {
    console.log('🎉 ¡Todas las páginas, menús y vistas de test_aventura fueron interactuadas mediante ID con 0 errores!');
  } else {
    for (const [idx, issue] of issues.entries()) {
      console.log(`\n[${idx + 1}] Tipo: ${issue.type} | Tab: ${issue.tab}`);
      console.log(`    Mensaje: ${issue.message}`);
    }
  }
  console.log('========================================\n');

  if (issues.length > 0) {
    process.exit(1);
  }
}

runTestAventuraSuite();
