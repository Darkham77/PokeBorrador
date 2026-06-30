import { test, expect, Page } from '@playwright/test';
import { generateTestBatches } from '../../scripts/battle-tester/team-generator.ts';

interface TeamSet {
  species: string;
  level?: number;
  ability?: string;
  moves?: string[];
  item?: string;
  name?: string;
}

interface DebugStore {
  currentFsmState?: string;
  currentSubState?: string;
  isProcessing?: boolean;
  isIntroAnimating?: boolean;
  state?: {
    over?: boolean;
    turnCount?: number;
    player?: { hp?: number; maxHp?: number } | null;
    enemy?: { hp?: number; maxHp?: number } | null;
  } | null;
}

type WindowWithResolver = typeof window & {
  __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
};

// Helper: Esperar a que la máquina de estados retorne a WAIT_INPUT o SWITCH_MENU (el turno anterior y sus animaciones terminaron)
// Y además asegurar que hayamos avanzado de turno (si no es el primer turno de la simulación)
async function waitForWaitInput(page: Page, turnCount: number, batchIndex: number, expectedSimulatorTurn: number, lastSubState: string) {
  try {
    let resolved = false;
    while (!resolved) {
      await page.waitForFunction(({ expectedTurn, lastSub, isFirst }) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        const isReady = (store.currentFsmState === 'ACTIVE_BATTLE' && 
                        (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
                        !store.state || store.state.over;
        const currentTurn = store.state?.turnCount ?? 1;
        const currentSubState = store.currentSubState;
        
        console.log(`[E2E-FSM-Wait] turnCount: ${expectedTurn}, lastSub: "${lastSub}", isFirst: ${isFirst}, currentSubState: "${store.currentSubState}", currentTurn: ${currentTurn}, isReady: ${isReady}`);
        
        if (!isReady) return false;
        const isCorrectTurn = isFirst || currentSubState === 'SWITCH_MENU' || currentTurn > expectedTurn || (currentTurn === expectedTurn && currentSubState !== lastSub) || store.state?.over;
        return isCorrectTurn;
      }, { expectedTurn: expectedSimulatorTurn, lastSub: lastSubState, isFirst: turnCount === 0 }, { timeout: 12000 });

      // Esperar 100ms para asegurar que no caímos en un microtask gap donde el turnCount subió pero la FSM aún no transitó a EXEC_TURN/APPLY_MOVE
      await page.waitForTimeout(100);

      // Re-verificar si seguimos en un estado listo para input (WAIT_INPUT o SWITCH_MENU o batalla terminada)
      const stillReady = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        return (store.currentFsmState === 'ACTIVE_BATTLE' && 
                (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
                !store.state || store.state.over;
      });

      if (stillReady) {
        resolved = true;
      } else {
        console.log(`[E2E] Falsa alarma detectada (microtask gap). Re-esperando FSM...`);
      }
    }
  } catch (_e) {
    await page.screenshot({ path: `scratch/lock-batch-${batchIndex}-turn-${turnCount}.png` });
    throw new Error(`Bloqueo detectado: La FSM de combate se quedó trabada en el turno ${turnCount}. Captura guardada en scratch/.`);
  }
}

// Helper: Confirmar e iniciar combate real clickeando ¡COMBATIR!
async function confirmAndStartBattle(page: Page) {
  const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
  await combatirBtn.waitFor({ state: 'visible', timeout: 15000 });
  await combatirBtn.click();
}

// Helper: Verificación de paridad 1:1 entre Store (Showdown) y DOM (Interfaz Gráfica)
// Lee store y DOM simultáneamente en el mismo polling loop para evitar snapshots desactualizados.
async function verifyHpParity(page: Page) {
  // Verificar paridad: espera hasta que el DOM refleje exactamente lo que el store tiene EN ESE MOMENTO
  try {
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      const playerHp = store.state?.player?.hp ?? 0;
      const playerMaxHp = store.state?.player?.maxHp ?? 1;
      const enemyHp = store.state?.enemy?.hp ?? 0;
      const enemyMaxHp = store.state?.enemy?.maxHp ?? 1;

      if (playerHp > 0) {
        const el = document.querySelector('.player-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${playerHp}/${playerMaxHp}`)) return false;
      }
      if (enemyHp > 0) {
        const el = document.querySelector('.enemy-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${enemyHp}/${enemyMaxHp}`)) return false;
      }
      return true;
    }, undefined, { timeout: 15000 });
  } catch (err) {
    const diagnosis = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      const storePlayer = `${store.state?.player?.hp}/${store.state?.player?.maxHp}`;
      const storeEnemy  = `${store.state?.enemy?.hp}/${store.state?.enemy?.maxHp}`;
      const domPlayer   = document.querySelector('.player-card .hp-values')?.textContent ?? 'null';
      const domEnemy    = document.querySelector('.enemy-card .hp-values')?.textContent ?? 'null';
      return { storePlayer, storeEnemy, domPlayer, domEnemy };
    });
    console.error(`[E2E ERROR] HP Mismatch — Store player: ${diagnosis.storePlayer}, DOM player: "${diagnosis.domPlayer}" | Store enemy: ${diagnosis.storeEnemy}, DOM enemy: "${diagnosis.domEnemy}"`);
    throw err;
  }
}

// Helper: Determinar qué botones están activos en la pantalla y clickear
async function handleBattleInput(page: Page): Promise<boolean> {
  // Esperar a que el estado de procesamiento termine (microtasks/animaciones) antes de decidir
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    return !resolver().isProcessing;
  }, undefined, { timeout: 2000 }).catch(() => {});

  const isProcessing = await page.evaluate(async () => {
    const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
    return useBattleStore().isProcessing;
  });

  if (isProcessing) {
    console.log(`[E2E] handleBattleInput: Store is already processing. Skipping input click.`);
    return false;
  }

  const subState = await page.evaluate(async () => {
    const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
    return useBattleStore().currentSubState;
  });

  const isModalOpen = await page.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll('.base-modal-root')) as HTMLElement[];
    return overlays.some(el => {
      // Ignorar el contenedor principal de la batalla
      if (el.querySelector('.battle-arena-modal')) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  });

  if (isModalOpen && subState === 'WAIT_INPUT') {
    console.log(`[E2E] handleBattleInput: Modal/Overlay is open in WAIT_INPUT. Skipping input click.`);
    return false;
  }

  console.log(`[E2E] handleBattleInput started. subState is: "${subState}"`);

  const activeSwitchBtn = page.locator('.quick-card-override:not(.is-active):not(.is-fainted):not(.is-disabled)').first();

  if (subState === 'SWITCH_MENU') {
    // Si la máquina de estados nos pide obligatoriamente elegir reemplazo, esperamos que el botón esté visible y clickeamos.
    console.log(`[E2E] In SWITCH_MENU block. Waiting for activeSwitchBtn...`);
    const count = await page.locator('.quick-card-override').count();
    console.log(`[E2E] Total .quick-card-override buttons: ${count}`);
    for (let i = 0; i < count; i++) {
      const cls = await page.locator('.quick-card-override').nth(i).getAttribute('class');
      console.log(`[E2E] Button index ${i} class list: "${cls}"`);
    }
    await activeSwitchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await activeSwitchBtn.click();
    return true;
  } else {
    // En un turno normal, preferir usar movimiento si está visible o se vuelve visible en 2 segundos.
    console.log(`[E2E] In normal turn block.`);
    const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
    try {
      await activeMoveBtn.waitFor({ state: 'visible', timeout: 2000 });
      await activeMoveBtn.click();
      return true;
    } catch (_e) {
      // Si no hay movimientos disponibles (o están ocultos/cargando), intentar cambiar voluntariamente usando el acceso directo del banco (quick-card).
      console.log(`[E2E] Move button not visible. Attempting voluntary quick-switch...`);
      if (await activeSwitchBtn.isVisible()) {
        await activeSwitchBtn.click();
        return true;
      } else {
        // Como último recurso, esperar un poco.
        console.log(`[E2E] Quick-switch button not visible. Waiting 200ms...`);
        await page.waitForTimeout(200);
        return false;
      }
    }
  }
}

// Helper: Bucle de ejecución automática de turnos
async function executeAutoBattle(page: Page, batchIndex: number, startingTurn = 0) {
  let turnCount = startingTurn;
  const maxTurns = 150;
  let lastSimulatorTurn = 0;
  let lastSubState = '';

  while (turnCount < maxTurns) {
    // Verificar si la batalla ya concluyó en el store
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });

    if (isOver) {
      break;
    }

    await waitForWaitInput(page, turnCount, batchIndex, lastSimulatorTurn, lastSubState);

    // Re-verificar estado de finalización
    const isOverAfterWait = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });

    if (isOverAfterWait) {
      break;
    }

    // Verificar paridad DOM/Store
    await verifyHpParity(page);

    // Guardar el turnCount actual antes de ejecutar la acción
    const stateInfo = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        turn: store.state?.turnCount ?? 1,
        subState: store.currentSubState
      };
    });
    lastSimulatorTurn = stateInfo.turn;
    lastSubState = stateInfo.subState || '';

    // Procesar acción del turno
    const inputPerformed = await handleBattleInput(page);

    if (inputPerformed) {
      // Esperar a que la FSM salga de los estados de input para no leer el estado viejo en la próxima iteración
      await page.waitForFunction(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        return store.currentSubState !== 'WAIT_INPUT' && store.currentSubState !== 'SWITCH_MENU';
      }, undefined, { timeout: 10000 });
      turnCount++;
    } else {
      // Si no se hizo clic (ej. estaba procesando, recarga de fondo, bolsa abierta), reintentar en el mismo turno
      await page.waitForTimeout(100);
    }
  }

  // Validar que el combate finalizó correctamente sin errores críticos
  const battleOverSuccess = await page.evaluate(async () => {
    const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
    const store = useBattleStore();
    return !store.state || store.state.over;
  });
  expect(battleOverSuccess).toBe(true);
}

test.describe('Battle FSM & GSAP Synchronization - Full Coverage', () => {


  // Generar todos los lotes de cobertura para movimientos y habilidades (tamaño de lote = 6)
  const batches = generateTestBatches(6);

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (
        text.includes('BRIDGE') ||
        text.includes('E2E') ||
        text.toLowerCase().includes('error') ||
        text.includes('Showdown') ||
        text.includes('FSM') ||
        text.includes('BattleStore') ||
        text.includes('BattleTurn') ||
        text.includes('SYNC')
      ) {
        console.log(`[BROWSER] ${text}`);
      }
    });
    // Configurar tiempo de espera de cada test a 120 segundos para evitar timeouts bajo alta concurrencia
    test.setTimeout(120000);

    // 1. Inyectar configuraciones de E2E y mockear permisos
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E__ = true;
      localStorage.setItem('pwa_permissions_accepted', 'true');
      localStorage.setItem('auto-battle', 'false');
      if ('Notification' in window) {
        Object.defineProperty(Notification, 'permission', {
          get() { return 'granted'; }
        });
      }
    });

    // 2. Navegar al Login
    await page.goto('/login');

    // 3. Seleccionar servidor local
    const localTab = page.locator('button:has-text("Local")');
    await localTab.click();

    // 4. Iniciar sesión con un usuario dedicado para pruebas locales
    const testUser = `TEST_USER_${Date.now()}`;
    await page.fill('input[placeholder="Nombre de Entrenador"]', testUser);
    await page.click('button:has-text("JUGAR LOCAL")');

    // 5. Elegir inicial si aparece
    const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
    try {
      await starterCard.waitFor({ state: 'visible', timeout: 30000 });
      await starterCard.click();
    } catch (_e) {
      // Ignorar si no aparece
    }

    // 6. Esperar a que cargue la interfaz principal (aumentado a 45s para soportar carga concurrente pesada)
    const mapaBtn = page.locator('button:has-text("MAPA")').first();
    await mapaBtn.waitFor({ state: 'attached', timeout: 45000 });
  });

  // Generar dinámicamente un caso de prueba de Playwright para cada lote de simulación.
  batches.forEach((batch, index) => {
    test(`debería simular el lote #${index + 1} (${batch.movesToTest.length} movimientos, ${batch.abilitiesToTest.length} habilidades) sin bloqueos de FSM`, async ({ page }) => {
      // 1. Construir e inyectar el equipo del jugador y del enemigo en la sesión del navegador
      await page.evaluate(async (b) => {
        const { pokemonDebugService } = await import('../../src/logic/debug/pokemonDebugService.ts');
        const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
        const { useGameStore } = await import('../../src/stores/game.ts');
        
        const battleStore = useBattleStore();
        const gameStore = useGameStore();
        
        // Generar equipo local para el jugador usando la API de depuración
        const localPlayerTeam = b.playerTeam.map((set: TeamSet) => {
          return pokemonDebugService.generate({
            id: set.species.toLowerCase(),
            level: set.level || 100,
            ability: set.ability,
            moves: set.moves,
            heldItem: set.item,
            nickname: set.name
          });
        });

        // Generar equipo local para el enemigo (NPC)
        const localEnemyTeam = b.enemyTeam.map((set: TeamSet) => {
          return pokemonDebugService.generate({
            id: set.species.toLowerCase(),
            level: set.level || 100,
            ability: set.ability,
            moves: set.moves,
            heldItem: set.item,
            nickname: set.name
          });
        });

        // Sobrescribir el equipo del jugador en el GameStore
        gameStore.state.team = localPlayerTeam;

        // Iniciar la batalla como combate de entrenador usando el primer enemigo y la plantilla completa
        const firstEnemy = localEnemyTeam[0];
        if (!firstEnemy) throw new Error('No enemy generated for E2E test');

        await battleStore.startBattle(firstEnemy, {
          isTrainer: true,
          enemyTeam: localEnemyTeam,
          trainerName: 'Simulador E2E',
          locationId: 'route1'
        });
      }, batch);

      // 2. Confirmar combate e iniciar
      await confirmAndStartBattle(page);

      // 3. Ejecutar auto-batalla y validaciones
      await executeAutoBattle(page, index + 1);
    });
  });

  // --- TEST ADICIONAL: Consumo de Pociones en Combate ---
  test('debería consumir una Poción en combate y mantener la sincronía del turno y FSM', async ({ page }) => {
    // 1. Iniciar un combate de prueba contra Pikachu a través de VITE_DEBUG e inicializar inventario
    await page.evaluate(async () => {
      const { useGameStore: getGameStore } = await import('../../src/stores/game.ts');
      const { useBattleStore: getBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = getGameStore();
      const battleStore = getBattleStore();

      // Inicializar inventario con Pociones
      gameStore.state.inventory = {
        potion: 3
      };
      // Generar equipo local con Bulbasaur dañado (10 HP de 20)
      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.hp = 10;
      gameStore.state.team = [bulbasaur];
      await gameStore.saveGame();

      const pikachu = debugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio y el botón de la poción esté activo
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (resolver) {
          const store = resolver();
          const cardEl = document.querySelector('.quick-item-card');
          const classes = cardEl ? cardEl.className : 'null';
          console.log(`[E2E-POLL] #${i} SubState: "${store.currentSubState}", isIntro: ${store.isIntroAnimating}, isProc: ${store.isProcessing}, hasPlayer: ${!!store.state?.player}, cardClasses: "${classes}"`);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    });

    const potionCard = page.locator('.quick-item-card:not(.is-disabled)').first();
    await potionCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear la Poción (debería abrir el modal de selección de Pokémon)
    await potionCard.click();

    // Esperar al modal de selección de Pokémon y clickear en Bulbasaur para aplicarle la poción
    const targetBtn = page.locator('.list-item:has(.name:has-text("Bulbasaur")), button:has-text("Bulbasaur")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentSubState === 'WAIT_INPUT' || (store.state && store.state.player && store.state.player.hp === 0);
    }, undefined, { timeout: 10000 });

    // 6. Verificar que la cantidad de pociones bajó a 2 en el GameStore
    const itemsCount = await page.evaluate(async () => {
      const { useGameStore } = await import('../../src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.inventory?.potion ?? 0;
    });
    expect(itemsCount).toBe(2);

    // 6.5 Verificar que la vida de Bulbasaur en el Store realmente aumentó (debe ser mayor a 10, validando que el simulador no ignoró el objeto)
    const finalHp = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.state?.player?.hp ?? 0;
    });
    expect(finalHp).toBeGreaterThan(10);

    // 7. Continuar el combate de forma automática hasta que finalice por completo (evitando cortes tempranos que oculten bugs en turnos futuros)
    await executeAutoBattle(page, 999, 1);
  });

  // --- TEST ADICIONAL: Lanzamiento de Pokéball y Captura ---
  test('debería lanzar una Pokéball e intentar capturar al Pokémon enemigo salvaje', async ({ page }) => {
    // 1. Iniciar un combate salvaje contra un Caterpie de nivel 1
    await page.evaluate(async () => {
      const { useBattleStore: battleLoader } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore: gameLoader } = await import('../../src/stores/game.ts');
      const { pokemonDebugService: pkmnDebugger } = await import('../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = gameLoader();
      const battleStore = battleLoader();

      // Inicializar inventario con Pokéballs
      gameStore.state.inventory = {
        masterball: 10
      };

      const bulbasaur = pkmnDebugger.generate({ id: 'bulbasaur', level: 5 });
      gameStore.state.team = [bulbasaur];

      const caterpie = pkmnDebugger.generate({ id: 'caterpie', level: 1 });
      await battleStore.startBattle(caterpie, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que termine la introducción y la pokéball esté activa
    const pokeballCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Master Ball"]), .quick-item-card:not(.is-disabled):has(img[alt*="ball"])').first();
    await pokeballCard.waitFor({ state: 'visible', timeout: 15000 });

    // 4. Lanzar Pokéball
    await pokeballCard.click();

    // 5. Esperar a que finalice la secuencia de captura y termine la batalla
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return !store.state || store.state.over;
    }, undefined, { timeout: 10000 });

    // 6. Validar que la batalla cerró
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });
    expect(isOver).toBe(true);
  });

  // --- TEST ADICIONAL: Revivir Pokémon en la Banca ---
  test('debería consumir un Revivir en un Pokémon de la banca debilitado y jugar el combate hasta el final', async ({ page }) => {
    // 1. Iniciar un combate de prueba contra Pikachu a través de VITE_DEBUG e inicializar inventario y equipo
    await page.evaluate(async () => {
      const { useBattleStore: storeBattle } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore: storeGame } = await import('../../src/stores/game.ts');
      const { pokemonDebugService: serviceDebug } = await import('../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = storeGame();
      const battleStore = storeBattle();

      // Inicializar inventario con Revivir
      gameStore.state.inventory = {
        revive: 1
      };

      // Generar equipo local con Bulbasaur (activo) y Charmander debilitado (0 HP)
      const bulbasaur = serviceDebug.generate({ id: 'bulbasaur', level: 5 });
      const charmander = serviceDebug.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0; // Debilitado
      gameStore.state.team = [bulbasaur, charmander];

      const pikachu = serviceDebug.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio y el botón de Revivir esté activo
    const reviveCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Revivir"]), .quick-item-card:not(.is-disabled):has(img[alt*="Rev"])').first();
    await reviveCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear el Revivir (debería abrir el modal de selección de Pokémon)
    await reviveCard.click();

    // Esperar al modal de selección de Pokémon y clickear en Charmander (que está debilitado)
    const targetBtn = page.locator('.list-item:has(.name:has-text("Charmander")), button:has-text("Charmander")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentSubState === 'WAIT_INPUT' || (store.state && store.state.player && store.state.player.hp === 0);
    }, undefined, { timeout: 10000 });

    // 6. Verificar que Charmander en la banca ya no está debilitado (su HP es mayor a 0)
    const charmanderHp = await page.evaluate(async () => {
      const { useGameStore } = await import('../../src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.team[1]?.hp ?? 0;
    });
    expect(charmanderHp).toBeGreaterThan(0);

    // 7. Continuar el combate de forma automática hasta que finalice por completo para verificar que no ocurra ningún bloqueo post-revivir
    await executeAutoBattle(page, 998);
  });
});
