import { test, expect } from '@playwright/test';
import { generateTestBatches } from '../../scripts/battle-tester/team-generator.ts';

test.describe('Battle FSM & GSAP Synchronization - Full Coverage', () => {
  // Configurar Playwright para correr todos los tests de este archivo en paralelo maximizando la concurrencia
  test.describe.configure({ mode: 'parallel' });

  // Generar todos los lotes de cobertura para movimientos y habilidades (tamaño de lote = 6)
  const batches = generateTestBatches(6);

  test.beforeEach(async ({ page }) => {
    // Configurar tiempo de espera de cada test a 120 segundos para evitar timeouts bajo alta concurrencia
    test.setTimeout(120000);

    // 1. Inyectar configuraciones de E2E y mockear permisos
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;
      localStorage.setItem('pwa_permissions_accepted', 'true');
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
      await starterCard.waitFor({ state: 'attached', timeout: 5000 });
      await starterCard.click({ force: true });
    } catch (e) {
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
        const { pokemonDebugService } = await import('/src/logic/debug/pokemonDebugService.ts');
        const { useBattleStore } = await import('/src/stores/battle/battle.ts');
        const { useGameStore } = await import('/src/stores/game.ts');
        
        const battleStore = useBattleStore();
        const gameStore = useGameStore();
        
        // Generar equipo local para el jugador usando la API de depuración
        const localPlayerTeam = b.playerTeam.map((set: any) => {
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
        const localEnemyTeam = b.enemyTeam.map((set: any) => {
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
        await battleStore.startBattle(firstEnemy, {
          isTrainer: true,
          enemyTeam: localEnemyTeam,
          trainerName: 'Simulador E2E',
          locationId: 'route1'
        });
      }, batch);

      // 2. Hacer click en "¡COMBATIR!" para iniciar la secuencia de combate real
      const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
      await combatirBtn.waitFor({ state: 'attached', timeout: 5000 });
      await combatirBtn.click({ force: true });

      // 3. Bucle de ejecución automática del combate
      let turnCount = 0;
      const maxTurns = 50;

      while (turnCount < maxTurns) {
        // Verificar si la batalla ya concluyó en el store
        const isOver = await page.evaluate(async () => {
          const { useBattleStore } = await import('/src/stores/battle/battle.ts');
          const store = useBattleStore();
          return !store.activeBattle || store.activeBattle.over;
        });

        if (isOver) {
          break;
        }

        // Esperar a que la máquina de estados retorne a WAIT_INPUT (el turno anterior y sus animaciones terminaron)
        try {
          await page.waitForFunction(async () => {
            const { useBattleStore } = await import('/src/stores/battle/battle.ts');
            const store = useBattleStore();
            return store.currentSubState === 'WAIT_INPUT' || !store.activeBattle || store.activeBattle.over;
          }, { timeout: 8000 });
        } catch (e) {
          await page.screenshot({ path: `scratch/lock-batch-${index + 1}-turn-${turnCount}.png` });
          throw new Error(`Bloqueo detectado: La FSM de combate se quedó trabada en el turno ${turnCount}. Captura guardada en scratch/.`);
        }

        // Re-verificar estado de finalización
        const isOverAfterWait = await page.evaluate(async () => {
          const { useBattleStore } = await import('/src/stores/battle/battle.ts');
          const store = useBattleStore();
          return !store.activeBattle || store.activeBattle.over;
        });

        if (isOverAfterWait) {
          break;
        }

        // 4. Verificación de paridad 1:1 entre Store (Showdown) y DOM (Interfaz Gráfica)
        const storeData = await page.evaluate(async () => {
          const { useBattleStore } = await import('/src/stores/battle/battle.ts');
          const store = useBattleStore();
          return {
            playerHp: store.state?.player?.hp ?? 0,
            playerMaxHp: store.state?.player?.maxHp ?? 1,
            enemyHp: store.state?.enemy?.hp ?? 0,
            enemyMaxHp: store.state?.enemy?.maxHp ?? 1,
            playerStatus: store.state?.player?.status,
            enemyStatus: store.state?.enemy?.status
          };
        });

        // Esperar a que la barra de HP del DOM termine de animarse y refleje exactamente la vida del Store
        if (storeData.playerHp > 0) {
          const expectedPlayerPct = (storeData.playerHp / storeData.playerMaxHp) * 100;
          await page.waitForFunction((expectedPct) => {
            const bar = document.querySelector('.player-card .hp-bar-inner');
            if (!bar) return false;
            const style = bar.getAttribute('style') || '';
            const match = style.match(/width:\s*([\d.]+)%/);
            if (!match || !match[1]) return false;
            return Math.abs(parseFloat(match[1]) - expectedPct) < 1.0;
          }, expectedPlayerPct, { timeout: 2000 }).catch(() => {});

          const playerHpText = await page.locator('.player-card .hp-values').innerText();
          expect(playerHpText).toContain(`${storeData.playerHp}/${storeData.playerMaxHp}`);
        }

        if (storeData.enemyHp > 0) {
          const expectedEnemyPct = (storeData.enemyHp / storeData.enemyMaxHp) * 100;
          await page.waitForFunction((expectedPct) => {
            const bar = document.querySelector('.enemy-card .hp-bar-inner');
            if (!bar) return false;
            const style = bar.getAttribute('style') || '';
            const match = style.match(/width:\s*([\d.]+)%/);
            if (!match || !match[1]) return false;
            return Math.abs(parseFloat(match[1]) - expectedPct) < 1.0;
          }, expectedEnemyPct, { timeout: 2000 }).catch(() => {});

          const enemyHpText = await page.locator('.enemy-card .hp-values').innerText();
          expect(enemyHpText).toContain(`${storeData.enemyHp}/${storeData.enemyMaxHp}`);
        }

        // 5. Determinar qué botones están activos en la pantalla y clickear
        const moveBtn = page.locator('.battle-move-btn, button[id^="move-btn-"]').first();
        const activeMoveBtn = page.locator('.battle-move-btn:not([disabled]), button[id^="move-btn-"]:not([disabled])').first();
        const activeSwitchBtn = page.locator('button:has-text("SLOT"):not([disabled])').first();

        if (await moveBtn.isVisible()) {
          if (await activeMoveBtn.isVisible()) {
            await activeMoveBtn.click({ force: true });
          } else {
            // Si el jugador está atrapado/obligado a cambiar o usar switch
            const changeBtn = page.locator('button:has-text("CAMBIAR")').first();
            if (await changeBtn.isVisible()) {
              await changeBtn.click({ force: true });
              await activeSwitchBtn.waitFor({ state: 'attached', timeout: 2000 });
              await activeSwitchBtn.click({ force: true });
            }
          }
        } else if (await activeSwitchBtn.isVisible()) {
          // Reemplazo obligatorio por K.O.
          await activeSwitchBtn.click({ force: true });
        } else {
          await page.waitForTimeout(100);
        }

        turnCount++;
      }

      // Validar que el combate finalizó correctamente sin errores críticos
      const battleOverSuccess = await page.evaluate(async () => {
        const { useBattleStore } = await import('/src/stores/battle/battle.ts');
        const store = useBattleStore();
        return !store.activeBattle || store.activeBattle.over;
      });
      expect(battleOverSuccess).toBe(true);
    });
  });

  // --- TEST ADICIONAL: Consumo de Pociones en Combate ---
  test('debería consumir una Poción en combate y mantener la sincronía del turno y FSM', async ({ page }) => {
    // 1. Iniciar un combate de prueba contra Pikachu a través de VITE_DEBUG e inicializar inventario
    await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const { useGameStore } = await import('/src/stores/game.ts');
      const { pokemonDebugService } = await import('/src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Inicializar inventario con Pociones
      gameStore.state.inventory = {
        potion: 3
      };

      // Generar equipo local con Bulbasaur dañado (10 HP de 20)
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.hp = 10;
      gameStore.state.team = [bulbasaur];

      const pikachu = pokemonDebugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate
    const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
    await combatirBtn.waitFor({ state: 'attached', timeout: 5000 });
    await combatirBtn.click({ force: true });

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio y el botón de la poción esté activo
    const potionCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Poción"]), .quick-item-card:not(.is-disabled):has(img[alt*="Poc"])').first();
    await potionCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear la Poción (debería abrir el modal de selección de Pokémon)
    await potionCard.click({ force: true });

    // Esperar al modal de selección de Pokémon y clickear en Bulbasaur para aplicarle la poción
    const targetBtn = page.locator('.list-item:has(.name:has-text("Bulbasaur")), button:has-text("Bulbasaur")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click({ force: true });

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await page.waitForFunction(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.currentSubState === 'WAIT_INPUT' || store.state?.player?.hp === 0;
    }, { timeout: 10000 });

    // 6. Verificar que la cantidad de pociones bajó a 2 en el GameStore
    const itemsCount = await page.evaluate(async () => {
      const { useGameStore } = await import('/src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.inventory?.potion ?? 0;
    });
    expect(itemsCount).toBe(2);

    // 6.5 Verificar que la vida de Bulbasaur en el Store realmente aumentó (debe ser mayor a 10, validando que el simulador no ignoró el objeto)
    const finalHp = await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.state?.player?.hp ?? 0;
    });
    expect(finalHp).toBeGreaterThan(10);

    // 7. Continuar el combate de forma automática hasta que finalice por completo (evitando cortes tempranos que oculten bugs en turnos futuros)
    let turnCount = 0;
    const maxTurns = 50;

    while (turnCount < maxTurns) {
      const isOver = await page.evaluate(async () => {
        const { useBattleStore } = await import('/src/stores/battle/battle.ts');
        const store = useBattleStore();
        return !store.activeBattle || store.activeBattle.over;
      });

      if (isOver) {
        break;
      }

      try {
        await page.waitForFunction(async () => {
          const { useBattleStore } = await import('/src/stores/battle/battle.ts');
          const store = useBattleStore();
          return store.currentSubState === 'WAIT_INPUT' || !store.activeBattle || store.activeBattle.over;
        }, { timeout: 8000 });
      } catch (e) {
        await page.screenshot({ path: `scratch/lock-potion-turn-${turnCount}.png` });
        throw new Error(`Bloqueo detectado post-poción: La FSM se trabó en el turno ${turnCount}.`);
      }

      const isOverAfterWait = await page.evaluate(async () => {
        const { useBattleStore } = await import('/src/stores/battle/battle.ts');
        const store = useBattleStore();
        return !store.activeBattle || store.activeBattle.over;
      });

      if (isOverAfterWait) {
        break;
      }

      const activeMoveBtn = page.locator('.battle-move-btn:not([disabled]), button[id^="move-btn-"]:not([disabled])').first();
      const activeSwitchBtn = page.locator('button:has-text("SLOT"):not([disabled])').first();

      if (await activeMoveBtn.isVisible()) {
        await activeMoveBtn.click({ force: true });
      } else if (await activeSwitchBtn.isVisible()) {
        await activeSwitchBtn.click({ force: true });
      } else {
        await page.waitForTimeout(100);
      }

      turnCount++;
    }

    const battleOverSuccess = await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.activeBattle || store.activeBattle.over;
    });
    expect(battleOverSuccess).toBe(true);
  });

  // --- TEST ADICIONAL: Lanzamiento de Pokéball y Captura ---
  test('debería lanzar una Pokéball e intentar capturar al Pokémon enemigo salvaje', async ({ page }) => {
    // 1. Iniciar un combate salvaje contra un Caterpie de nivel 1
    await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const { useGameStore } = await import('/src/stores/game.ts');
      const { pokemonDebugService } = await import('/src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Inicializar inventario con Pokéballs
      gameStore.state.inventory = {
        pokeball: 10
      };

      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 5 });
      gameStore.state.team = [bulbasaur];

      const caterpie = pokemonDebugService.generate({ id: 'caterpie', level: 1 });
      await battleStore.startBattle(caterpie, { locationId: 'route1' });
    });

    // 2. Confirmar combate
    const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
    await combatirBtn.waitFor({ state: 'attached', timeout: 5000 });
    await combatirBtn.click({ force: true });

    // 3. Esperar a que termine la introducción y la pokéball esté activa
    const pokeballCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Pokéball"]), .quick-item-card:not(.is-disabled):has(img[alt*="ball"])').first();
    await pokeballCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Lanzar Pokéball
    await pokeballCard.click({ force: true });

    // 5. Esperar a que finalice la secuencia de captura y termine la batalla
    await page.waitForFunction(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.activeBattle || store.activeBattle.over;
    }, { timeout: 10000 });

    // 6. Validar que la batalla cerró
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.activeBattle || store.activeBattle.over;
    });
    expect(isOver).toBe(true);
  });

  // --- TEST ADICIONAL: Revivir Pokémon en la Banca ---
  test('debería consumir un Revivir en un Pokémon de la banca debilitado y jugar el combate hasta el final', async ({ page }) => {
    // 1. Iniciar un combate de prueba contra Pikachu a través de VITE_DEBUG e inicializar inventario y equipo
    await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const { useGameStore } = await import('/src/stores/game.ts');
      const { pokemonDebugService } = await import('/src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Inicializar inventario con Revivir
      gameStore.state.inventory = {
        revive: 1
      };

      // Generar equipo local con Bulbasaur (activo) y Charmander debilitado (0 HP)
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 5 });
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0; // Debilitado
      gameStore.state.team = [bulbasaur, charmander];

      const pikachu = pokemonDebugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate
    const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
    await combatirBtn.waitFor({ state: 'attached', timeout: 5000 });
    await combatirBtn.click({ force: true });

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio y el botón de Revivir esté activo
    const reviveCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Revivir"]), .quick-item-card:not(.is-disabled):has(img[alt*="Rev"])').first();
    await reviveCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear el Revivir (debería abrir el modal de selección de Pokémon)
    await reviveCard.click({ force: true });

    // Esperar al modal de selección de Pokémon y clickear en Charmander (que está debilitado)
    const targetBtn = page.locator('.list-item:has(.name:has-text("Charmander")), button:has-text("Charmander")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click({ force: true });

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await page.waitForFunction(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.currentSubState === 'WAIT_INPUT' || store.state?.player?.hp === 0;
    }, { timeout: 10000 });

    // 6. Verificar que Charmander en la banca ya no está debilitado (su HP es mayor a 0)
    const charmanderHp = await page.evaluate(async () => {
      const { useGameStore } = await import('/src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.team[1]?.hp ?? 0;
    });
    expect(charmanderHp).toBeGreaterThan(0);

    // 7. Continuar el combate de forma automática hasta que finalice por completo para verificar que no ocurra ningún bloqueo post-revivir
    let turnCount = 0;
    const maxTurns = 50;

    while (turnCount < maxTurns) {
      const isOver = await page.evaluate(async () => {
        const { useBattleStore } = await import('/src/stores/battle/battle.ts');
        const store = useBattleStore();
        return !store.activeBattle || store.activeBattle.over;
      });

      if (isOver) {
        break;
      }

      try {
        await page.waitForFunction(async () => {
          const { useBattleStore } = await import('/src/stores/battle/battle.ts');
          const store = useBattleStore();
          return store.currentSubState === 'WAIT_INPUT' || !store.activeBattle || store.activeBattle.over;
        }, { timeout: 8000 });
      } catch (e) {
        await page.screenshot({ path: `scratch/lock-revive-turn-${turnCount}.png` });
        throw new Error(`Bloqueo detectado post-revivir: La FSM se trabó en el turno ${turnCount}.`);
      }

      const isOverAfterWait = await page.evaluate(async () => {
        const { useBattleStore } = await import('/src/stores/battle/battle.ts');
        const store = useBattleStore();
        return !store.activeBattle || store.activeBattle.over;
      });

      if (isOverAfterWait) {
        break;
      }

      const activeMoveBtn = page.locator('.battle-move-btn:not([disabled]), button[id^="move-btn-"]:not([disabled])').first();
      const activeSwitchBtn = page.locator('button:has-text("SLOT"):not([disabled])').first();

      if (await activeMoveBtn.isVisible()) {
        await activeMoveBtn.click({ force: true });
      } else if (await activeSwitchBtn.isVisible()) {
        await activeSwitchBtn.click({ force: true });
      } else {
        await page.waitForTimeout(100);
      }

      turnCount++;
    }

    const battleOverSuccess = await page.evaluate(async () => {
      const { useBattleStore } = await import('/src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.activeBattle || store.activeBattle.over;
    });
    expect(battleOverSuccess).toBe(true);
  });
});
