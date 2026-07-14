import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { setupE2ESession } from '../e2e_helpers.ts';
import { useGameStore } from '../../../src/stores/game.ts';

type GameStoreType = ReturnType<typeof useGameStore>;

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev-import-db-cleanup');
});

test('Debug ash save switch issue', async ({ page }) => {
  // Incrementar timeout para la rotación completa del equipo
  test.setTimeout(60000);

  // 1. Configurar la sesión de E2E
  await setupE2ESession(page);

  // 2. Escuchar todos los mensajes de consola (logs, warnings, errors)
  page.on('console', msg => {
    const txt = msg.text();
    const type = msg.type();
    console.log(`[BROWSER-${type.toUpperCase()}] ${txt}`);
  });

  // 3. Cargar la base de datos de ash desde la carpeta permanente
  const dbPath = path.resolve('tests/fixtures/poke_local_ash.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base de datos no encontrada en ${dbPath}`);
  }
  const dbBuffer = fs.readFileSync(dbPath);
  const base64Data = dbBuffer.toString('base64');

  // Ir a la página para iniciar el origen
  await page.goto('/');
  await page.waitForTimeout(1000);

  // Inyectar en IndexedDB
  await page.evaluate(async (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const DB_NAME = 'pokevicio_idb';
    const STORE_NAME = 'keyval';
    const KEY_NAME = 'pokevicio_sqlite_v2';

    await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(bytes, KEY_NAME);
        store.put(bytes, KEY_NAME + '_backup');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, base64Data);

  console.log('IndexedDB inyectado con poke_local_ash.db.');

  // 4. Iniciar sesión como "ash"
  await page.goto('/login');
  await page.locator('button:has-text("Local")').click();
  await page.fill('input[placeholder="Nombre de Entrenador"]', 'ash');
  await page.click('button:has-text("JUGAR LOCAL")');

  // Esperar a que cargue la interfaz principal
  const mapBtn = page.locator('button.map-btn').first();
  await mapBtn.waitFor({ state: 'attached', timeout: 30000 });
  console.log('Logueado y cargado el mapa de ash.');

  // Imprimir estado del equipo y de la caja
  const teamState = await page.evaluate(() => {
    const gameStore = (window as unknown as { __VITE_DEBUG__?: { getGameStore?: () => GameStoreType } }).__VITE_DEBUG__?.getGameStore?.();
    if (!gameStore) return 'Store no disponible';
    return {
      team: gameStore.state.team.map(p => p ? { name: p.name, moves: p.moves?.map(m => m ? (m.id || 'unknown') : 'null') } : null),
      boxLength: gameStore.state.box?.length || 0,
      boxNames: gameStore.state.box?.map((p: { name: string } | null) => p?.name) || []
    };
  });
  console.log('Estado cargado en memoria:', JSON.stringify(teamState, null, 2));

  // 5. Iniciar un combate salvaje de prueba usando las herramientas de debug si están disponibles
  console.log('Iniciando combate de prueba...');
  await page.evaluate(async () => {
    // Intentar invocar un encuentro salvaje via debug
    const debug = (window as unknown as { __VITE_DEBUG__?: { spawnEncounter?: (config: { id: string; level: number }) => Promise<void> } }).__VITE_DEBUG__;
    if (debug && debug.spawnEncounter) {
      await debug.spawnEncounter({ id: 'rattata', level: 5 });
    }
  });

  // Esperar a que el modal de combate aparezca
  await page.waitForSelector('button:has-text("¡COMBATIR!")', { timeout: 15000 });
  await page.click('button:has-text("¡COMBATIR!")');
  console.log('Entrando a combate...');

  // Esperar a que el menú de acciones de combate cargue (se vea el layout de controles)
  await page.waitForSelector('.battle-controls-layout', { timeout: 15000 });
  await page.waitForTimeout(2000); // Dar un margen para animaciones iniciales

  // Intentar abrir el menú de cambio y rotar por todos los Pokémon
  const teamUids = [
    'cdaccb69-94dd-4217-9425-3a8a68d6d0a9', // Gengar
    '1b617e5c-25de-466e-b796-d331885af6fe', // Eevee
    '3b70c27d-9a1d-4632-becb-d46db26e2398', // Pidgey
    '45397106-0ece-4c36-98d1-569e4351b5a7', // Rayquaza
    'feb1462c-f5e3-4e01-bb31-1feec02735a8'  // Poliwhirl
  ];

  for (const uid of teamUids) {
    console.log(`=== SOLICITANDO CAMBIO A POKEMON CON UID: ${uid} ===`);
    const switchBtn = page.locator('button:has-text("Cambiar")').first();
    await switchBtn.click();
    await page.waitForTimeout(1000);

    const card = page.locator(`.list-item[data-pokemon-uid="${uid}"]`).first();
    await card.click();
    console.log(`Clic realizado en UID: ${uid}. Esperando resolución de turno...`);
    await page.waitForTimeout(4000); // Esperar que termine el turno/animación
  }

  // Guardar una captura en el directorio de artifacts al final
  const screenshotPath = 'C:/Users/Franco/.gemini/antigravity/brain/257e3fa9-f52e-44f7-abed-d418c8684d29/scratch/switch_result.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Captura guardada en: ${screenshotPath}`);
});
