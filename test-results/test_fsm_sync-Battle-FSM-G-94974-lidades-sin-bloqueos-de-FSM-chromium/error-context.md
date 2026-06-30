# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_fsm_sync.spec.ts >> Battle FSM & GSAP Synchronization - Full Coverage >> debería simular el lote #12 (24 movimientos, 6 habilidades) sin bloqueos de FSM
- Location: tests\e2e\test_fsm_sync.spec.ts:292:5

# Error details

```
TimeoutError: page.waitForFunction: Timeout 5000ms exceeded.
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
                - generic [ref=e8]: TEST_USER_1782811641
                - generic [ref=e10]: Nivel 1
            - generic [ref=e12]:
              - button "👤 Perfil" [ref=e13] [cursor=pointer]:
                - generic [ref=e14]: 👤
                - generic [ref=e15]: Perfil
              - button "⚙️ Ajustes" [ref=e16] [cursor=pointer]:
                - generic [ref=e17]: ⚙️
                - generic [ref=e18]: Ajustes
              - button "📖 Libro" [ref=e19] [cursor=pointer]:
                - generic [ref=e20]: 📖
                - generic [ref=e21]: Libro
            - generic [ref=e22]:
              - generic [ref=e24] [cursor=pointer]:
                - generic [ref=e25]: ₱
                - generic [ref=e26]: 3,000
              - generic [ref=e28] [cursor=pointer]:
                - generic [ref=e29]: 
                - generic [ref=e30]: "0"
              - generic [ref=e32] [cursor=pointer]:
                - generic [ref=e33]: ⚔️
                - generic [ref=e34]: "0"
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
                  - generic [ref=e36] [cursor=pointer]: 🌅⛄🥶
                  - generic:
                    - generic:
                      - generic [ref=e37] [cursor=pointer]:
                        - img [ref=e39]
                        - generic [ref=e40]: GUARDIÁN
                      - generic [ref=e42] [cursor=pointer]: 🌅⛄🥶
                  - generic [ref=e44] [cursor=pointer]: 🌅⛄
                  - generic [ref=e46] [cursor=pointer]: 🌅⛄
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 1 MEDALLAS
                      - generic [ref=e48]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 1 MEDALLAS
                      - generic [ref=e50]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 1 MEDALLAS
                      - generic [ref=e52]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e54]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e56]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e58]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e60]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e62]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 2 MEDALLAS
                      - generic [ref=e64]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e66]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e68]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 3 MEDALLAS
                      - generic [ref=e70]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 5 MEDALLAS
                      - generic [ref=e72]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 4 MEDALLAS
                      - generic [ref=e74]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 4 MEDALLAS
                      - generic [ref=e76]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 4 MEDALLAS
                      - generic [ref=e78]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 5 MEDALLAS
                      - generic [ref=e80]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE TICKET SAFARI
                      - generic [ref=e82]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 6 MEDALLAS
                      - generic [ref=e84]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 7 MEDALLAS
                      - generic [ref=e86]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 8 MEDALLAS
                      - generic [ref=e88]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 8 MEDALLAS
                      - generic [ref=e90]: 🔒
                  - generic:
                    - generic:
                      - generic:
                        - generic: REQUIERE 8 MEDALLAS
                      - generic [ref=e92]: 🔒
          - generic:
            - button "💬 Chat" [ref=e94] [cursor=pointer]:
              - generic [ref=e95]: 💬
              - generic [ref=e96]: Chat
            - button "🛠️ DEBUG" [ref=e98] [cursor=pointer]:
              - generic [ref=e99]: 🛠️
              - generic [ref=e100]: DEBUG
          - generic [ref=e102]:
            - button "🗺️ MAPA" [ref=e103] [cursor=pointer]:
              - generic [ref=e104]: 🗺️
              - generic [ref=e105]: MAPA
            - button "⚡ POKÉMON" [ref=e107] [cursor=pointer]:
              - generic [ref=e108]: ⚡
              - generic [ref=e109]: POKÉMON
            - button "🎒 MOCHILA" [ref=e111] [cursor=pointer]:
              - generic [ref=e112]: 🎒
              - generic [ref=e113]: MOCHILA
            - button "🏆 GIMS 8" [ref=e115] [cursor=pointer]:
              - generic [ref=e116]: 🏆
              - generic [ref=e117]: GIMS
              - generic [ref=e118]: "8"
            - button "Huevo Pokémon CRIANZA" [ref=e120] [cursor=pointer]:
              - img "Huevo Pokémon" [ref=e124]
              - generic [ref=e125]: CRIANZA
            - button "🏪 MARKET" [ref=e127] [cursor=pointer]:
              - generic [ref=e128]: 🏪
              - generic [ref=e129]: MARKET
            - button "👪 SOCIAL" [ref=e131] [cursor=pointer]:
              - generic [ref=e132]: 👪
              - generic [ref=e133]: SOCIAL
  - generic [ref=e136]:
    - generic [ref=e138] [cursor=pointer]: 🌅⛄🥶
    - generic [ref=e140]:
      - generic [ref=e141]:
        - generic [ref=e142]:
          - generic:
            - generic:
              - generic:
                - img
              - generic:
                - img [ref=e145]
                - img [ref=e148]
                - generic [ref=e152]:
                  - img [ref=e156]
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
                - generic [ref=e160]:
                  - img [ref=e164]
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
        - generic:
          - generic [ref=e167]:
            - generic [ref=e168]:
              - generic [ref=e169]: Blissey
              - generic [ref=e170]: ♀
            - generic [ref=e171]:
              - generic [ref=e172]: Nv. 100
              - generic [ref=e174]: NORMAL
            - generic [ref=e185]: "HP: 238/647"
            - generic [ref=e186]:
              - generic [ref=e188]: ⚡
              - generic [ref=e190]: 🧠
              - generic [ref=e192]: 🎒
          - generic [ref=e195]:
            - generic [ref=e197]: Mew
            - generic [ref=e198]:
              - generic [ref=e199]: Nv. 100
              - generic [ref=e201]: PSÍQUICO
            - generic [ref=e213]: "HP: 299/333"
            - generic [ref=e214]:
              - generic [ref=e216]: ⚡
              - generic [ref=e218]: 🧠
        - generic [ref=e219]:
          - button "+" [disabled] [ref=e220]
          - button "-" [ref=e221] [cursor=pointer]
      - generic [ref=e224]:
        - generic [ref=e225]:
          - img [ref=e227]
          - generic [ref=e228]: ¡Mew se curó de su estado alterado!
        - generic [ref=e229]:
          - img [ref=e231]
          - generic [ref=e232]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e233]:
          - img [ref=e235]
          - generic [ref=e236]: ¡Mew recibió daño!
        - generic [ref=e237]:
          - img [ref=e239]
          - generic [ref=e240]: ¡Mew usó Campana Cura!
        - generic [ref=e241]:
          - img [ref=e243]
          - generic [ref=e244]: ¡El movimiento de Mew falló!
        - generic [ref=e245]:
          - img [ref=e247]
          - generic [ref=e248]: ¡Blissey usó Surf!
        - generic [ref=e249]:
          - img [ref=e251]
          - generic [ref=e252]: ¡Mew recibió daño!
        - generic [ref=e253]:
          - img [ref=e255]
          - generic [ref=e256]: ¡Mew usó Deseo Cura!
        - generic [ref=e257]:
          - img [ref=e259]
          - generic [ref=e260]: ¡Mew se debilitó!
        - generic [ref=e261]:
          - img [ref=e263]
          - generic [ref=e264]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e265]:
          - img [ref=e267]
          - generic [ref=e268]: ¡El movimiento de Blissey falló!
        - generic [ref=e269]:
          - img [ref=e271]
          - generic [ref=e272]: ¡Mew se ha debilitado!
        - generic [ref=e273]:
          - img [ref=e275]
          - generic [ref=e276]: ¡Elige a tu próximo Pokémon!
        - generic [ref=e277]:
          - img [ref=e279]
          - generic [ref=e280]: ¡Adelante, Mew!
        - generic [ref=e281]:
          - img [ref=e283]
          - generic [ref=e284]: ¡Mew usó Golpe Calor!
        - generic [ref=e285]:
          - img [ref=e287]
          - generic [ref=e288]: ¡Blissey recibió daño!
        - generic [ref=e289]:
          - img [ref=e291]
          - generic [ref=e292]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e293]:
          - img [ref=e295]
          - generic [ref=e296]: ¡Mew recibió daño!
        - generic [ref=e297]:
          - img [ref=e299]
          - generic [ref=e300]: "¡Mew sufrió un problema de estado: PAR!"
        - generic [ref=e301]:
          - img [ref=e303]
          - generic [ref=e304]: ¡El movimiento de Blissey falló!
        - generic [ref=e305]:
          - img [ref=e307]
          - generic [ref=e308]: ¡Mew usó Golpe Calor!
        - generic [ref=e309]:
          - img [ref=e311]
          - generic [ref=e312]: ¡Blissey recibió daño!
        - generic [ref=e313]:
          - img [ref=e315]
          - generic [ref=e316]: ¡Blissey está paralizado y no puede moverse!
        - generic [ref=e317]:
          - img [ref=e319]
          - generic [ref=e320]: ¡Mew usó Golpe Calor!
        - generic [ref=e321]:
          - img [ref=e323]
          - generic [ref=e324]: ¡Blissey recibió daño!
        - generic [ref=e325]:
          - img [ref=e327]
          - generic [ref=e328]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e329]:
          - img [ref=e331]
          - generic [ref=e332]: ¡Mew recibió daño!
        - generic [ref=e333]:
          - img [ref=e335]
          - generic [ref=e336]: ¡Simulador E2E usó Hiper Poción en Blissey!
        - generic [ref=e337]:
          - img [ref=e339]
          - generic [ref=e340]: ¡Blissey recuperó salud!
        - generic [ref=e341]:
          - img [ref=e343]
          - generic [ref=e344]: ¡Mew está paralizado y no puede moverse!
      - generic [ref=e346]:
        - complementary [ref=e347]:
          - generic [ref=e349]:
            - generic:
              - generic:
                - generic: D
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
            - generic [ref=e350] [cursor=pointer]:
              - generic [ref=e352]: B
              - img "pokemon" [ref=e356]
              - generic [ref=e357]:
                - generic [ref=e359]: P-Poke3
                - generic [ref=e361]: PSÍQUICO
                - generic [ref=e364]: Nv. 100
            - generic [ref=e367] [cursor=pointer]:
              - generic [ref=e369]: C
              - img "pokemon" [ref=e373]
              - generic [ref=e374]:
                - generic [ref=e376]: P-Poke4
                - generic [ref=e378]: PSÍQUICO
                - generic [ref=e381]: Nv. 100
            - generic [ref=e384] [cursor=pointer]:
              - generic [ref=e386]: C
              - img "pokemon" [ref=e390]
              - generic [ref=e391]:
                - generic [ref=e393]: P-Poke5
                - generic [ref=e395]: PSÍQUICO
                - generic [ref=e398]: Nv. 100
            - generic [ref=e401] [cursor=pointer]:
              - generic [ref=e403]: C
              - img "pokemon" [ref=e407]
              - generic [ref=e408]:
                - generic [ref=e410]: P-Poke6
                - generic [ref=e412]: PSÍQUICO
                - generic [ref=e415]: Nv. 100
        - generic [ref=e418]:
          - generic [ref=e420]:
            - generic [ref=e421]:
              - generic [ref=e423]: "?"
              - 'button "GOLPE CALOR FUEGO POT: - PREC: 100 CAT: ⚔️ Físico PP 6/10" [ref=e424] [cursor=pointer]':
                - generic [ref=e425]:
                  - generic [ref=e426]: GOLPE CALOR
                  - generic [ref=e427]: FUEGO
                - generic [ref=e428]:
                  - generic [ref=e429]:
                    - generic [ref=e430]: "POT:"
                    - generic [ref=e431]: "-"
                  - generic [ref=e432]:
                    - generic [ref=e433]: "PREC:"
                    - generic [ref=e434]: "100"
                  - generic [ref=e435]:
                    - generic [ref=e436]: "CAT:"
                    - generic [ref=e438]: ⚔️ Físico
                  - generic [ref=e439]:
                    - generic [ref=e440]: PP
                    - generic [ref=e441]: 6/10
            - generic [ref=e442]:
              - generic [ref=e444]: "?"
              - 'button "ONDA íGNEA FUEGO POT: 95 PREC: 90 CAT: ✨ Especial PP 10/10" [ref=e445] [cursor=pointer]':
                - generic [ref=e446]:
                  - generic [ref=e447]: ONDA íGNEA
                  - generic [ref=e448]: FUEGO
                - generic [ref=e449]:
                  - generic [ref=e450]:
                    - generic [ref=e451]: "POT:"
                    - generic [ref=e452]: "95"
                  - generic [ref=e453]:
                    - generic [ref=e454]: "PREC:"
                    - generic [ref=e455]: "90"
                  - generic [ref=e456]:
                    - generic [ref=e457]: "CAT:"
                    - generic [ref=e459]: ✨ Especial
                  - generic [ref=e460]:
                    - generic [ref=e461]: PP
                    - generic [ref=e462]: 10/10
            - generic [ref=e463]:
              - generic [ref=e465]: "?"
              - 'button "CUERPO PESADO ACERO POT: - PREC: 100 CAT: ⚔️ Físico PP 10/10" [ref=e466] [cursor=pointer]':
                - generic [ref=e467]:
                  - generic [ref=e468]: CUERPO PESADO
                  - generic [ref=e469]: ACERO
                - generic [ref=e470]:
                  - generic [ref=e471]:
                    - generic [ref=e472]: "POT:"
                    - generic [ref=e473]: "-"
                  - generic [ref=e474]:
                    - generic [ref=e475]: "PREC:"
                    - generic [ref=e476]: "100"
                  - generic [ref=e477]:
                    - generic [ref=e478]: "CAT:"
                    - generic [ref=e480]: ⚔️ Físico
                  - generic [ref=e481]:
                    - generic [ref=e482]: PP
                    - generic [ref=e483]: 10/10
            - generic [ref=e484]:
              - generic [ref=e486]: "?"
              - 'button "REFUERZO NORMAL POT: - PREC: ♾️ CAT: 🔮 Estado PP 20/20" [ref=e487] [cursor=pointer]':
                - generic [ref=e488]:
                  - generic [ref=e489]: REFUERZO
                  - generic [ref=e490]: NORMAL
                - generic [ref=e491]:
                  - generic [ref=e492]:
                    - generic [ref=e493]: "POT:"
                    - generic [ref=e494]: "-"
                  - generic [ref=e495]:
                    - generic [ref=e496]: "PREC:"
                    - generic [ref=e498]: ♾️
                  - generic [ref=e499]:
                    - generic [ref=e500]: "CAT:"
                    - generic [ref=e502]: 🔮 Estado
                  - generic [ref=e503]:
                    - generic [ref=e504]: PP
                    - generic [ref=e505]: 20/20
          - generic [ref=e507]:
            - button "🔄 CAMBIAR" [ref=e508] [cursor=pointer]:
              - generic [ref=e509]: 🔄
              - generic [ref=e510]: CAMBIAR
            - button [disabled] [ref=e512]
            - button "🎒 MOCHILA" [ref=e513] [cursor=pointer]:
              - generic [ref=e514]: 🎒
              - generic [ref=e515]: MOCHILA
        - complementary [ref=e516]:
          - generic [ref=e521] [cursor=pointer]:
            - generic [ref=e523]:
              - img "Poción"
            - generic [ref=e524]: x3
  - generic [ref=e525]:
    - button "🕹️ DEBUG" [ref=e527] [cursor=pointer]:
      - generic [ref=e528]: 🕹️
      - generic [ref=e529]: DEBUG
    - button "✨ EFECTOS" [ref=e531] [cursor=pointer]:
      - generic [ref=e532]: ✨
      - generic [ref=e533]: EFECTOS
    - button "⌛ TIEMPO" [ref=e535] [cursor=pointer]:
      - generic [ref=e536]: ⌛
      - generic [ref=e537]: TIEMPO
```

# Test source

```ts
  107 | }
  108 | 
  109 | // Helper: Determinar qué botones están activos en la pantalla y clickear
  110 | async function handleBattleInput(page: Page) {
  111 |   const subState = await page.evaluate(async () => {
  112 |     const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  113 |     return useBattleStore().currentSubState;
  114 |   });
  115 | 
  116 |   console.log(`[E2E] handleBattleInput started. subState is: "${subState}"`);
  117 | 
  118 |   const activeSwitchBtn = page.locator('.quick-card-override:not(.is-active):not(.is-fainted):not(.is-disabled)').first();
  119 | 
  120 |   if (subState === 'SWITCH_MENU') {
  121 |     // Si la máquina de estados nos pide obligatoriamente elegir reemplazo, esperamos que el botón esté visible y clickeamos.
  122 |     console.log(`[E2E] In SWITCH_MENU block. Waiting for activeSwitchBtn...`);
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
> 207 |     await page.waitForFunction(() => {
      |                ^ TimeoutError: page.waitForFunction: Timeout 5000ms exceeded.
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
  223 |   expect(battleOverSuccess).toBe(true);
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
```