# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_fsm_sync.spec.ts >> Battle FSM & GSAP Synchronization - Full Coverage >> debería simular el lote #14 (24 movimientos, 6 habilidades) sin bloqueos de FSM
- Location: tests\e2e\test_fsm_sync.spec.ts:292:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - generic:
        - text: 
        - generic:
          - generic [ref=e3]:
            - generic [ref=e4] [cursor=pointer]:
              - generic [ref=e6]: 🧢
              - generic [ref=e7]:
                - generic [ref=e8]: TEST_USER_1782811645
                - generic [ref=e10]: Nivel 4
            - generic [ref=e13]:
              - button "👤 Perfil" [ref=e14] [cursor=pointer]:
                - generic [ref=e15]: 👤
                - generic [ref=e16]: Perfil
              - button "⚙️ Ajustes" [ref=e17] [cursor=pointer]:
                - generic [ref=e18]: ⚙️
                - generic [ref=e19]: Ajustes
              - button "📖 Libro" [ref=e20] [cursor=pointer]:
                - generic [ref=e21]: 📖
                - generic [ref=e22]: Libro
            - generic [ref=e23]:
              - generic [ref=e25] [cursor=pointer]:
                - generic [ref=e26]: ₱
                - generic [ref=e27]: 15,000
              - generic [ref=e29] [cursor=pointer]:
                - generic [ref=e30]: 
                - generic [ref=e31]: 1,200
              - generic [ref=e33] [cursor=pointer]:
                - generic [ref=e34]: ⚔️
                - generic [ref=e35]: "0"
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic: ⚡ CENTRO POKÉMON
                        - generic: Saná a tu equipo y restaurá todos sus PP al instante.
                      - generic: ⚡ CURACIÓN
                - generic:
                  - generic: REGIÓN DE KANTO
                - generic:
                  - generic [ref=e37] [cursor=pointer]: 🌅⛄🥶
                  - generic:
                    - generic:
                      - generic [ref=e38] [cursor=pointer]:
                        - img [ref=e40]
                        - generic [ref=e41]: GUARDIÁN
                      - generic [ref=e43] [cursor=pointer]: 🌅⛄🥶
                  - generic [ref=e45] [cursor=pointer]: 🌅⛄
                  - generic [ref=e47] [cursor=pointer]: 🌅⛄
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 1 MEDALLAS
                      - generic [ref=e49]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 1 MEDALLAS
                      - generic [ref=e51]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 1 MEDALLAS
                      - generic [ref=e53]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e55]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e57]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e59]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e61]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e63]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e65]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e67]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e69]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e71]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 5 MEDALLAS
                      - generic [ref=e73]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 4 MEDALLAS
                      - generic [ref=e75]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 4 MEDALLAS
                      - generic [ref=e77]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 4 MEDALLAS
                      - generic [ref=e79]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 5 MEDALLAS
                      - generic [ref=e81]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE TICKET SAFARI
                      - generic [ref=e83]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 6 MEDALLAS
                      - generic [ref=e85]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 7 MEDALLAS
                      - generic [ref=e87]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 8 MEDALLAS
                      - generic [ref=e89]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 8 MEDALLAS
                      - generic [ref=e91]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 8 MEDALLAS
                      - generic [ref=e93]: 🔒
          - generic:
            - button "💬 Chat" [ref=e95] [cursor=pointer]:
              - generic [ref=e96]: 💬
              - generic [ref=e97]: Chat
            - button "🛠️ DEBUG" [ref=e99] [cursor=pointer]:
              - generic [ref=e100]: 🛠️
              - generic [ref=e101]: DEBUG
          - generic [ref=e103]:
            - button "🗺️ MAPA" [ref=e104] [cursor=pointer]:
              - generic [ref=e105]: 🗺️
              - generic [ref=e106]: MAPA
            - button "⚡ POKÉMON" [ref=e108] [cursor=pointer]:
              - generic [ref=e109]: ⚡
              - generic [ref=e110]: POKÉMON
            - button "🎒 MOCHILA" [ref=e112] [cursor=pointer]:
              - generic [ref=e113]: 🎒
              - generic [ref=e114]: MOCHILA
            - button "🏆 GIMS 8" [ref=e116] [cursor=pointer]:
              - generic [ref=e117]: 🏆
              - generic [ref=e118]: GIMS
              - generic [ref=e119]: "8"
            - button "Huevo Pokémon CRIANZA" [ref=e121] [cursor=pointer]:
              - img "Huevo Pokémon" [ref=e125]
              - generic [ref=e126]: CRIANZA
            - button "🏪 MARKET" [ref=e128] [cursor=pointer]:
              - generic [ref=e129]: 🏪
              - generic [ref=e130]: MARKET
            - button "👪 SOCIAL" [ref=e132] [cursor=pointer]:
              - generic [ref=e133]: 👪
              - generic [ref=e134]: SOCIAL
  - generic [ref=e136]:
    - generic [ref=e137]:
      - generic [ref=e139] [cursor=pointer]: 🌅⛄🥶
      - generic [ref=e141]:
        - generic [ref=e142]:
          - generic [ref=e143]:
            - generic:
              - generic:
                - generic:
                  - img
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img "Environment Cover"
                        - generic:
                          - img "Environment Cover"
                        - generic:
                          - img "Environment Cover"
                        - generic:
                          - img "Environment Cover"
                        - generic:
                          - img "Environment Cover"
                  - img [ref=e146]
                  - img [ref=e154]
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img "Environment Cover"
                        - generic:
                          - img "Environment Cover"
                        - generic:
                          - img "Environment Cover"
                  - generic [ref=e158]:
                    - img [ref=e162]
                    - generic:
                      - generic:
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
                        - generic: ⚡
          - generic:
            - generic [ref=e165]:
              - generic [ref=e167]: "???"
              - generic [ref=e169]: Nv. ??
              - generic [ref=e171]: "HP: ???/???"
            - generic [ref=e174]:
              - generic [ref=e176]: Mew
              - generic [ref=e177]:
                - generic [ref=e178]: Nv. 100
                - generic [ref=e180]: PSÍQUICO
              - generic [ref=e185]: "HP: 275/328"
              - generic [ref=e186]:
                - generic [ref=e188]: ⚡
                - generic [ref=e190]: 🧠
          - generic [ref=e191]:
            - button "+" [disabled] [ref=e192]
            - button "-" [ref=e193] [cursor=pointer]
        - generic [ref=e196]:
          - generic [ref=e197]:
            - img [ref=e199]
            - generic [ref=e200]: ¡Blissey recibió daño!
          - generic [ref=e201]:
            - img [ref=e203]
            - generic [ref=e204]: ¡Blissey se debilitó!
          - generic [ref=e205]:
            - img [ref=e207]
            - generic [ref=e208]: Blissey fue derrotado!
          - generic [ref=e209]:
            - img [ref=e211]
            - generic [ref=e212]: ¡Entrenador envía a Blissey!
          - generic [ref=e213]:
            - img [ref=e215]
            - generic [ref=e216]: ¡Blissey usó Golpe Cuerpo!
          - generic [ref=e217]:
            - img [ref=e219]
            - generic [ref=e220]: ¡Mew recibió daño!
          - generic [ref=e221]:
            - img [ref=e223]
            - generic [ref=e224]: ¡Mew se debilitó!
          - generic [ref=e225]:
            - img [ref=e227]
            - generic [ref=e228]: ¡Mew se ha debilitado!
          - generic [ref=e229]:
            - img [ref=e231]
            - generic [ref=e232]: ¡Elige a tu próximo Pokémon!
          - generic [ref=e233]:
            - img [ref=e235]
            - generic [ref=e236]: ¡Adelante, Mew!
          - generic [ref=e237]:
            - img [ref=e239]
            - generic [ref=e240]: ¡Mew usó Jet Punch!
          - generic [ref=e241]:
            - img [ref=e243]
            - generic [ref=e244]: ¡Blissey recibió daño!
          - generic [ref=e245]:
            - img [ref=e247]
            - generic [ref=e248]: ¡Blissey usó Golpe Cuerpo!
          - generic [ref=e249]:
            - img [ref=e251]
            - generic [ref=e252]: ¡Mew recibió daño!
          - generic [ref=e253]:
            - img [ref=e255]
            - generic [ref=e256]: "¡Mew sufrió un problema de estado: PAR!"
          - generic [ref=e257]:
            - img [ref=e259]
            - generic [ref=e260]: "¡Blissey sufrió un problema de estado: PAR!"
          - generic [ref=e261]:
            - img [ref=e263]
            - generic [ref=e264]: ¡Mew usó Jet Punch!
          - generic [ref=e265]:
            - img [ref=e267]
            - generic [ref=e268]: ¡Blissey recibió daño!
          - generic [ref=e269]:
            - img [ref=e271]
            - generic [ref=e272]: ¡Blissey está paralizado y no puede moverse!
          - generic [ref=e273]:
            - img [ref=e275]
            - generic [ref=e276]: ¡Mew está paralizado y no puede moverse!
          - generic [ref=e277]:
            - img [ref=e279]
            - generic [ref=e280]: ¡Blissey usó Golpe Cuerpo!
          - generic [ref=e281]:
            - img [ref=e283]
            - generic [ref=e284]: ¡Mew recibió daño!
          - generic [ref=e285]:
            - img [ref=e287]
            - generic [ref=e288]: ¡Mew usó Jet Punch!
          - generic [ref=e289]:
            - img [ref=e291]
            - generic [ref=e292]: ¡Blissey recibió daño!
          - generic [ref=e293]:
            - img [ref=e295]
            - generic [ref=e296]: ¡Blissey se debilitó!
          - generic [ref=e297]:
            - img [ref=e299]
            - generic [ref=e300]: "¡El combate ha terminado! Ganador: Player"
          - generic [ref=e301]:
            - img [ref=e303]
            - generic [ref=e304]: Blissey fue derrotado!
          - generic [ref=e305]:
            - img [ref=e307]
            - generic [ref=e308]: ¡Ganaste ₽12000 en total!
          - generic [ref=e309]:
            - img [ref=e311]
            - generic [ref=e312]: ¡Obtuviste 1200 Battle Coins en total!
          - generic [ref=e313]:
            - img [ref=e315]
            - generic [ref=e316]: ¡Ganaste 1200 EXP de entrenador!
        - generic [ref=e317]:
          - generic:
            - complementary:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: B
                    - generic:
                      - generic:
                        - generic:
                          - img "pokemon"
                    - generic:
                      - generic:
                        - generic: P-Poke1
                      - generic:
                        - generic: PSÍQUICO
                      - generic:
                        - generic:
                          - generic: Nv. 100
                  - generic:
                    - generic:
                      - generic: D
                    - generic:
                      - generic:
                        - generic:
                          - img "pokemon"
                    - generic:
                      - generic:
                        - generic: P-Poke2
                      - generic:
                        - generic: PSÍQUICO
                      - generic:
                        - generic:
                          - generic: Nv. 100
                  - generic:
                    - generic:
                      - generic: C
                    - generic:
                      - generic:
                        - generic:
                          - img "pokemon"
                    - generic:
                      - generic:
                        - generic: P-Poke3
                      - generic:
                        - generic: PSÍQUICO
                      - generic:
                        - generic:
                          - generic: Nv. 100
                  - generic:
                    - generic:
                      - generic: D
                    - generic:
                      - generic:
                        - generic:
                          - img "pokemon"
                    - generic:
                      - generic:
                        - generic: P-Poke4
                      - generic:
                        - generic: PSÍQUICO
                      - generic:
                        - generic:
                          - generic: Nv. 100
                  - generic:
                    - generic:
                      - generic: C
                    - generic:
                      - generic:
                        - generic:
                          - img "pokemon"
                    - generic:
                      - generic:
                        - generic: P-Poke5
                      - generic:
                        - generic: PSÍQUICO
                      - generic:
                        - generic:
                          - generic: Nv. 100
                  - generic:
                    - generic:
                      - generic: C
                    - generic:
                      - generic:
                        - generic:
                          - img "pokemon"
                    - generic:
                      - generic:
                        - generic: P-Poke6
                      - generic:
                        - generic: PSÍQUICO
                      - generic:
                        - generic:
                          - generic: Nv. 100
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: "?"
                    - 'button "JET PUNCH AGUA POT: 60 PREC: 100 CAT: ⚔️ Físico PP 11/15" [disabled]':
                      - generic:
                        - generic: JET PUNCH
                        - generic: AGUA
                      - generic:
                        - generic:
                          - generic: "POT:"
                          - generic: "60"
                        - generic:
                          - generic: "PREC:"
                          - generic: "100"
                        - generic:
                          - generic: "CAT:"
                          - generic:
                            - generic: ⚔️ Físico
                        - generic:
                          - generic: PP
                          - generic: 11/15
                  - generic:
                    - generic:
                      - generic: "?"
                    - 'button "SENTENCIA NORMAL POT: 100 PREC: 100 CAT: ✨ Especial PP 10/10" [disabled]':
                      - generic:
                        - generic: SENTENCIA
                        - generic: NORMAL
                      - generic:
                        - generic:
                          - generic: "POT:"
                          - generic: "100"
                        - generic:
                          - generic: "PREC:"
                          - generic: "100"
                        - generic:
                          - generic: "CAT:"
                          - generic:
                            - generic: ✨ Especial
                        - generic:
                          - generic: PP
                          - generic: 10/10
                  - generic:
                    - generic:
                      - generic: "?"
                    - 'button "CURA SELVáTICA PLANTA POT: - PREC: ♾️ CAT: 🔮 Estado PP 10/10" [disabled]':
                      - generic:
                        - generic: CURA SELVáTICA
                        - generic: PLANTA
                      - generic:
                        - generic:
                          - generic: "POT:"
                          - generic: "-"
                        - generic:
                          - generic: "PREC:"
                          - generic:
                            - generic: ♾️
                        - generic:
                          - generic: "CAT:"
                          - generic:
                            - generic: 🔮 Estado
                        - generic:
                          - generic: PP
                          - generic: 10/10
                  - generic:
                    - generic:
                      - generic: "?"
                    - 'button "DESARME SINIESTRO POT: 65 PREC: 100 CAT: ⚔️ Físico PP 20/20" [disabled]':
                      - generic:
                        - generic: DESARME
                        - generic: SINIESTRO
                      - generic:
                        - generic:
                          - generic: "POT:"
                          - generic: "65"
                        - generic:
                          - generic: "PREC:"
                          - generic: "100"
                        - generic:
                          - generic: "CAT:"
                          - generic:
                            - generic: ⚔️ Físico
                        - generic:
                          - generic: PP
                          - generic: 20/20
              - generic:
                - generic:
                  - button "🔄 CAMBIAR" [disabled]:
                    - generic: 🔄
                    - generic: CAMBIAR
                  - generic:
                    - button [disabled]
                  - button "🎒 MOCHILA" [disabled]:
                    - generic: 🎒
                    - generic: MOCHILA
            - complementary:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img "Poción"
                        - generic: x3
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img "Pokéball"
                        - generic: x10
          - generic [ref=e319] [cursor=pointer]:
            - button "⚔️ ¡COMBATIR!" [ref=e320]:
              - generic [ref=e321]: ⚔️
              - generic [ref=e322]: ¡COMBATIR!
            - button "🗺️ VOLVER AL MAPA" [ref=e323]:
              - generic [ref=e324]: 🗺️
              - generic [ref=e325]: VOLVER AL MAPA
    - button [ref=e326] [cursor=pointer]
  - generic [ref=e328]:
    - button "🕹️ DEBUG" [ref=e330] [cursor=pointer]:
      - generic [ref=e331]: 🕹️
      - generic [ref=e332]: DEBUG
    - button "✨ EFECTOS" [ref=e334] [cursor=pointer]:
      - generic [ref=e335]: ✨
      - generic [ref=e336]: EFECTOS
    - button "⌛ TIEMPO" [ref=e338] [cursor=pointer]:
      - generic [ref=e339]: ⌛
      - generic [ref=e340]: TIEMPO
```

# Test source

```ts
  123 |     const count = await page.locator('.quick-card-override').count();
  124 |     console.log(`[E2E] Total .quick-card-override buttons: ${count}`);
  125 |     for (let i = 0; i < count; i++) {
  126 |       const cls = await page.locator('.quick-card-override').nth(i).getAttribute('class');
  127 |       console.log(`[E2E] Button index ${i} class list: "${cls}"`);
  128 |     }
  129 |     await activeSwitchBtn.waitFor({ state: 'visible', timeout: 5000 });
  130 |     await activeSwitchBtn.click({ force: true });
  131 |   } else {
  132 |     // En un turno normal, preferir usar movimiento si está visible o se vuelve visible en 2 segundos.
  133 |     console.log(`[E2E] In normal turn block.`);
  134 |     const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
  135 |     try {
  136 |       await activeMoveBtn.waitFor({ state: 'visible', timeout: 2000 });
  137 |       await activeMoveBtn.click({ force: true });
  138 |     } catch (_e) {
  139 |       // Si no hay movimientos disponibles (o están ocultos/cargando), intentar cambiar voluntariamente.
  140 |       console.log(`[E2E] Move button not visible. Attempting voluntary switch...`);
  141 |       const changeBtn = page.locator('button:has-text("CAMBIAR")').first();
  142 |       if (await changeBtn.isVisible()) {
  143 |         await changeBtn.click({ force: true });
  144 |         console.log(`[E2E] Clicked CAMBIAR button. Waiting for activeSwitchBtn to be visible...`);
  145 |         await activeSwitchBtn.waitFor({ state: 'visible', timeout: 5000 });
  146 |         await activeSwitchBtn.click({ force: true });
  147 |       } else {
  148 |         // Como último recurso, esperar un poco.
  149 |         console.log(`[E2E] CAMBIAR button not visible. Waiting 200ms...`);
  150 |         await page.waitForTimeout(200);
  151 |       }
  152 |     }
  153 |   }
  154 | }
  155 | 
  156 | // Helper: Bucle de ejecución automática de turnos
  157 | async function executeAutoBattle(page: Page, batchIndex: number, startingTurn = 0) {
  158 |   let turnCount = startingTurn;
  159 |   const maxTurns = 150;
  160 |   let lastSimulatorTurn = 0;
  161 |   let lastSubState = '';
  162 | 
  163 |   while (turnCount < maxTurns) {
  164 |     // Verificar si la batalla ya concluyó en el store
  165 |     const isOver = await page.evaluate(async () => {
  166 |       const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  167 |       const store = useBattleStore();
  168 |       return !store.state || store.state.over;
  169 |     });
  170 | 
  171 |     if (isOver) {
  172 |       break;
  173 |     }
  174 | 
  175 |     await waitForWaitInput(page, turnCount, batchIndex, lastSimulatorTurn, lastSubState);
  176 | 
  177 |     // Re-verificar estado de finalización
  178 |     const isOverAfterWait = await page.evaluate(async () => {
  179 |       const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  180 |       const store = useBattleStore();
  181 |       return !store.state || store.state.over;
  182 |     });
  183 | 
  184 |     if (isOverAfterWait) {
  185 |       break;
  186 |     }
  187 | 
  188 |     // Verificar paridad DOM/Store
  189 |     await verifyHpParity(page);
  190 | 
  191 |     // Guardar el turnCount actual antes de ejecutar la acción
  192 |     const stateInfo = await page.evaluate(async () => {
  193 |       const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  194 |       const store = useBattleStore();
  195 |       return {
  196 |         turn: store.state?.turnCount ?? 1,
  197 |         subState: store.currentSubState
  198 |       };
  199 |     });
  200 |     lastSimulatorTurn = stateInfo.turn;
  201 |     lastSubState = stateInfo.subState;
  202 | 
  203 |     // Procesar acción del turno
  204 |     await handleBattleInput(page);
  205 | 
  206 |     // Esperar a que la FSM salga de los estados de input para no leer el estado viejo en la próxima iteración
  207 |     await page.waitForFunction(() => {
  208 |       const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
  209 |       if (!resolver) return false;
  210 |       const store = resolver();
  211 |       return store.currentSubState !== 'WAIT_INPUT' && store.currentSubState !== 'SWITCH_MENU';
  212 |     }, undefined, { timeout: 5000 });
  213 | 
  214 |     turnCount++;
  215 |   }
  216 | 
  217 |   // Validar que el combate finalizó correctamente sin errores críticos
  218 |   const battleOverSuccess = await page.evaluate(async () => {
  219 |     const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  220 |     const store = useBattleStore();
  221 |     return !store.state || store.state.over;
  222 |   });
> 223 |   expect(battleOverSuccess).toBe(true);
      |                             ^ Error: expect(received).toBe(expected) // Object.is equality
  224 | }
  225 | 
  226 | test.describe('Battle FSM & GSAP Synchronization - Full Coverage', () => {
  227 |   // Configurar Playwright para correr todos los tests de este archivo en paralelo maximizando la concurrencia
  228 |   test.describe.configure({ mode: 'parallel' });
  229 | 
  230 |   // Generar todos los lotes de cobertura para movimientos y habilidades (tamaño de lote = 6)
  231 |   const batches = generateTestBatches(6);
  232 | 
  233 |   test.beforeEach(async ({ page }) => {
  234 |     page.on('console', msg => {
  235 |       const text = msg.text();
  236 |       if (
  237 |         text.includes('BRIDGE') ||
  238 |         text.includes('E2E') ||
  239 |         text.toLowerCase().includes('error') ||
  240 |         text.includes('Showdown') ||
  241 |         text.includes('FSM') ||
  242 |         text.includes('BattleStore') ||
  243 |         text.includes('BattleTurn') ||
  244 |         text.includes('SYNC')
  245 |       ) {
  246 |         console.log(`[BROWSER] ${text}`);
  247 |       }
  248 |     });
  249 |     // Configurar tiempo de espera de cada test a 120 segundos para evitar timeouts bajo alta concurrencia
  250 |     test.setTimeout(120000);
  251 | 
  252 |     // 1. Inyectar configuraciones de E2E y mockear permisos
  253 |     await page.addInitScript(() => {
  254 |       (window as unknown as Record<string, unknown>).__E2E__ = true;
  255 |       localStorage.setItem('pwa_permissions_accepted', 'true');
  256 |       localStorage.setItem('auto-battle', 'false');
  257 |       if ('Notification' in window) {
  258 |         Object.defineProperty(Notification, 'permission', {
  259 |           get() { return 'granted'; }
  260 |         });
  261 |       }
  262 |     });
  263 | 
  264 |     // 2. Navegar al Login
  265 |     await page.goto('/login');
  266 | 
  267 |     // 3. Seleccionar servidor local
  268 |     const localTab = page.locator('button:has-text("Local")');
  269 |     await localTab.click();
  270 | 
  271 |     // 4. Iniciar sesión con un usuario dedicado para pruebas locales
  272 |     const testUser = `TEST_USER_${Date.now()}`;
  273 |     await page.fill('input[placeholder="Nombre de Entrenador"]', testUser);
  274 |     await page.click('button:has-text("JUGAR LOCAL")');
  275 | 
  276 |     // 5. Elegir inicial si aparece
  277 |     const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
  278 |     try {
  279 |       await starterCard.waitFor({ state: 'attached', timeout: 30000 });
  280 |       await starterCard.click({ force: true });
  281 |     } catch (_e) {
  282 |       // Ignorar si no aparece
  283 |     }
  284 | 
  285 |     // 6. Esperar a que cargue la interfaz principal (aumentado a 45s para soportar carga concurrente pesada)
  286 |     const mapaBtn = page.locator('button:has-text("MAPA")').first();
  287 |     await mapaBtn.waitFor({ state: 'attached', timeout: 45000 });
  288 |   });
  289 | 
  290 |   // Generar dinámicamente un caso de prueba de Playwright para cada lote de simulación.
  291 |   batches.forEach((batch, index) => {
  292 |     test(`debería simular el lote #${index + 1} (${batch.movesToTest.length} movimientos, ${batch.abilitiesToTest.length} habilidades) sin bloqueos de FSM`, async ({ page }) => {
  293 |       // 1. Construir e inyectar el equipo del jugador y del enemigo en la sesión del navegador
  294 |       await page.evaluate(async (b) => {
  295 |         const { pokemonDebugService } = await import('../../src/logic/debug/pokemonDebugService.ts');
  296 |         const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  297 |         const { useGameStore } = await import('../../src/stores/game.ts');
  298 |         
  299 |         const battleStore = useBattleStore();
  300 |         const gameStore = useGameStore();
  301 |         
  302 |         // Generar equipo local para el jugador usando la API de depuración
  303 |         const localPlayerTeam = b.playerTeam.map((set: TeamSet) => {
  304 |           return pokemonDebugService.generate({
  305 |             id: set.species.toLowerCase(),
  306 |             level: set.level || 100,
  307 |             ability: set.ability,
  308 |             moves: set.moves,
  309 |             heldItem: set.item,
  310 |             nickname: set.name
  311 |           });
  312 |         });
  313 | 
  314 |         // Generar equipo local para el enemigo (NPC)
  315 |         const localEnemyTeam = b.enemyTeam.map((set: TeamSet) => {
  316 |           return pokemonDebugService.generate({
  317 |             id: set.species.toLowerCase(),
  318 |             level: set.level || 100,
  319 |             ability: set.ability,
  320 |             moves: set.moves,
  321 |             heldItem: set.item,
  322 |             nickname: set.name
  323 |           });
```