# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_fsm_sync.spec.ts >> Battle FSM & GSAP Synchronization - Full Coverage >> debería simular el lote #26 (24 movimientos, 6 habilidades) sin bloqueos de FSM
- Location: tests\e2e\test_fsm_sync.spec.ts:292:5

# Error details

```
Error: Bloqueo detectado: La FSM de combate se quedó trabada en el turno 46. Captura guardada en scratch/.
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
                - generic [ref=e8]: TEST_USER_1782811768
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
  - generic [ref=e135]:
    - generic [ref=e136]:
      - generic [ref=e137]: ⚠️
      - generic [ref=e138]: ERROR EN EL JUEGO
    - generic [ref=e139]:
      - paragraph [ref=e140]: ¡Uy! Algo salió mal. Pasale una captura de esto al desarrollador para que pueda arreglarlo.
      - generic [ref=e141]:
        - generic [ref=e142]:
          - text: ¿QUÉ ESTABAS HACIENDO?
          - textbox "¿QUÉ ESTABAS HACIENDO?" [ref=e143]:
            - /placeholder: "Ej: Estaba por cambiar de Pokémon en batalla..."
        - generic [ref=e144]: Esta información nos ayuda a reproducir and arreglar el error más rápido.
      - generic [ref=e145]:
        - generic [ref=e146]: "DETALLES TÉCNICOS:"
        - generic [ref=e147]: "[ERROR 1/1] (Console Error - console.error) Message: INVALID_CHOICE: Elección \"move bodyslam\" (resuelta a \"move bodyslam\") rechazada por el simulador para p2. ActiveMon: E-Poke2, Simulator Moves: [\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Thunderbolt\",\"id\":\"thunderbolt\",\"pp\":22,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Surf\",\"id\":\"surf\",\"pp\":23,\"maxpp\":24,\"target\":\"allAdjacent\",\"disabled\":false},{\"move\":\"Flamethrower\",\"id\":\"flamethrower\",\"pp\":21,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Body Slam\",\"id\":\"bodyslam\",\"pp\":0,\"maxpp\":24,\"target\":\"normal\",\"disabled\":true,\"disabledSource\":\"\"}],\"canTerastallize\":\"Normal\"}],\"side\":{\"name\":\"Simulador E2E\",\"id\":\"p2\",\"pokemon\":[{\"ident\":\"p2: E-Poke2\",\"details\":\"Blissey, M\",\"condition\":\"400/648 par\",\"active\":true,\"stats\":{\"atk\":55,\"def\":56,\"spa\":174,\"spd\":257,\"spe\":154},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke1\",\"details\":\"Blissey, F\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":40,\"def\":54,\"spa\":153,\"spd\":276,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke3\",\"details\":\"Blissey, M\",\"condition\":\"624/624\",\"active\":false,\"stats\":{\"atk\":29,\"def\":40,\"spa\":161,\"spd\":276,\"spe\":115},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke4\",\"details\":\"Blissey, M\",\"condition\":\"634/634\",\"active\":false,\"stats\":{\"atk\":31,\"def\":59,\"spa\":171,\"spd\":267,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke5\",\"details\":\"Blissey, M\",\"condition\":\"623/623\",\"active\":false,\"stats\":{\"atk\":28,\"def\":43,\"spa\":155,\"spd\":333,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke6\",\"details\":\"Blissey, M\",\"condition\":\"626/626\",\"active\":false,\"stats\":{\"atk\":35,\"def\":36,\"spa\":173,\"spd\":305,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"}]},\"update\":true} Stack: Error: INVALID_CHOICE: Elección \"move bodyslam\" (resuelta a \"move bodyslam\") rechazada por el simulador para p2. ActiveMon: E-Poke2, Simulator Moves: [\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Thunderbolt\",\"id\":\"thunderbolt\",\"pp\":22,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Surf\",\"id\":\"surf\",\"pp\":23,\"maxpp\":24,\"target\":\"allAdjacent\",\"disabled\":false},{\"move\":\"Flamethrower\",\"id\":\"flamethrower\",\"pp\":21,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Body Slam\",\"id\":\"bodyslam\",\"pp\":0,\"maxpp\":24,\"target\":\"normal\",\"disabled\":true,\"disabledSource\":\"\"}],\"canTerastallize\":\"Normal\"}],\"side\":{\"name\":\"Simulador E2E\",\"id\":\"p2\",\"pokemon\":[{\"ident\":\"p2: E-Poke2\",\"details\":\"Blissey, M\",\"condition\":\"400/648 par\",\"active\":true,\"stats\":{\"atk\":55,\"def\":56,\"spa\":174,\"spd\":257,\"spe\":154},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke1\",\"details\":\"Blissey, F\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":40,\"def\":54,\"spa\":153,\"spd\":276,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke3\",\"details\":\"Blissey, M\",\"condition\":\"624/624\",\"active\":false,\"stats\":{\"atk\":29,\"def\":40,\"spa\":161,\"spd\":276,\"spe\":115},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke4\",\"details\":\"Blissey, M\",\"condition\":\"634/634\",\"active\":false,\"stats\":{\"atk\":31,\"def\":59,\"spa\":171,\"spd\":267,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke5\",\"details\":\"Blissey, M\",\"condition\":\"623/623\",\"active\":false,\"stats\":{\"atk\":28,\"def\":43,\"spa\":155,\"spd\":333,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke6\",\"details\":\"Blissey, M\",\"condition\":\"626/626\",\"active\":false,\"stats\":{\"atk\":35,\"def\":36,\"spa\":173,\"spd\":305,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"}]},\"update\":true} at chooseOrThrow (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:98:13) at self.onmessage (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:111:6) Payload: {\"p1Choice\":\"move terastarstorm\",\"p2Choice\":\"move bodyslam\",\"p1Hps\":{\"e6f2fba8-d05d-4836-bec4-6e1f18f042d4\":0,\"fafff30b-415e-4752-815e-c69a40b7dc43\":0,\"b4c78fc5-60a5-4a6a-954b-c8fd823a2f56\":0,\"afc6f00b-ef87-4118-ba09-54100bcbf2b0\":327,\"cf642e63-77c6-406e-9e41-008cd3b907bd\":317,\"07f079d2-5f37-4e6d-be34-9ef5c4773b43\":326},\"p2Hps\":{\"6dae2029-3184-4745-8f31-0eaad560031c\":0,\"aff5aa65-bbf6-47b2-962f-f27c24a6d655\":400,\"1e3a4ca6-22e2-4c81-a1b0-9e32b67addbd\":624,\"4a80e767-af66-47c3-97d7-087294a9a73a\":634,\"970034ae-e6af-4108-9ec8-5ebd713e31cf\":623,\"c1d79a1a-3d29-4c55-9aef-c2296ad861f9\":626},\"p1Statuses\":{\"e6f2fba8-d05d-4836-bec4-6e1f18f042d4\":\"par\",\"fafff30b-415e-4752-815e-c69a40b7dc43\":\"\",\"b4c78fc5-60a5-4a6a-954b-c8fd823a2f56\":\"par\",\"afc6f00b-ef87-4118-ba09-54100bcbf2b0\":\"\",\"cf642e63-77c6-406e-9e41-008cd3b907bd\":\"\",\"07f079d2-5f37-4e6d-be34-9ef5c4773b43\":\"\"},\"p2Statuses\":{\"6dae2029-3184-4745-8f31-0eaad560031c\":\"\",\"aff5aa65-bbf6-47b2-962f-f27c24a6d655\":\"par\",\"1e3a4ca6-22e2-4c81-a1b0-9e32b67addbd\":\"\",\"4a80e767-af66-47c3-97d7-087294a9a73a\":\"\",\"970034ae-e6af-4108-9ec8-5ebd713e31cf\":\"\",\"c1d79a1a-3d29-4c55-9aef-c2296ad861f9\":\"\"},\"p1Skip\":false,\"p2Skip\":false} Stack: InvalidChoiceError: INVALID_CHOICE: Elección \"move bodyslam\" (resuelta a \"move bodyslam\") rechazada por el simulador para p2. ActiveMon: E-Poke2, Simulator Moves: [\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Thunderbolt\",\"id\":\"thunderbolt\",\"pp\":22,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Surf\",\"id\":\"surf\",\"pp\":23,\"maxpp\":24,\"target\":\"allAdjacent\",\"disabled\":false},{\"move\":\"Flamethrower\",\"id\":\"flamethrower\",\"pp\":21,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Body Slam\",\"id\":\"bodyslam\",\"pp\":0,\"maxpp\":24,\"target\":\"normal\",\"disabled\":true,\"disabledSource\":\"\"}],\"canTerastallize\":\"Normal\"}],\"side\":{\"name\":\"Simulador E2E\",\"id\":\"p2\",\"pokemon\":[{\"ident\":\"p2: E-Poke2\",\"details\":\"Blissey, M\",\"condition\":\"400/648 par\",\"active\":true,\"stats\":{\"atk\":55,\"def\":56,\"spa\":174,\"spd\":257,\"spe\":154},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke1\",\"details\":\"Blissey, F\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":40,\"def\":54,\"spa\":153,\"spd\":276,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke3\",\"details\":\"Blissey, M\",\"condition\":\"624/624\",\"active\":false,\"stats\":{\"atk\":29,\"def\":40,\"spa\":161,\"spd\":276,\"spe\":115},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke4\",\"details\":\"Blissey, M\",\"condition\":\"634/634\",\"active\":false,\"stats\":{\"atk\":31,\"def\":59,\"spa\":171,\"spd\":267,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke5\",\"details\":\"Blissey, M\",\"condition\":\"623/623\",\"active\":false,\"stats\":{\"atk\":28,\"def\":43,\"spa\":155,\"spd\":333,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke6\",\"details\":\"Blissey, M\",\"condition\":\"626/626\",\"active\":false,\"stats\":{\"atk\":35,\"def\":36,\"spa\":173,\"spd\":305,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"}]},\"update\":true} Stack: Error: INVALID_CHOICE: Elección \"move bodyslam\" (resuelta a \"move bodyslam\") rechazada por el simulador para p2. ActiveMon: E-Poke2, Simulator Moves: [\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Thunderbolt\",\"id\":\"thunderbolt\",\"pp\":22,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Surf\",\"id\":\"surf\",\"pp\":23,\"maxpp\":24,\"target\":\"allAdjacent\",\"disabled\":false},{\"move\":\"Flamethrower\",\"id\":\"flamethrower\",\"pp\":21,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Body Slam\",\"id\":\"bodyslam\",\"pp\":0,\"maxpp\":24,\"target\":\"normal\",\"disabled\":true,\"disabledSource\":\"\"}],\"canTerastallize\":\"Normal\"}],\"side\":{\"name\":\"Simulador E2E\",\"id\":\"p2\",\"pokemon\":[{\"ident\":\"p2: E-Poke2\",\"details\":\"Blissey, M\",\"condition\":\"400/648 par\",\"active\":true,\"stats\":{\"atk\":55,\"def\":56,\"spa\":174,\"spd\":257,\"spe\":154},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke1\",\"details\":\"Blissey, F\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":40,\"def\":54,\"spa\":153,\"spd\":276,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke3\",\"details\":\"Blissey, M\",\"condition\":\"624/624\",\"active\":false,\"stats\":{\"atk\":29,\"def\":40,\"spa\":161,\"spd\":276,\"spe\":115},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke4\",\"details\":\"Blissey, M\",\"condition\":\"634/634\",\"active\":false,\"stats\":{\"atk\":31,\"def\":59,\"spa\":171,\"spd\":267,\"spe\":127},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke5\",\"details\":\"Blissey, M\",\"condition\":\"623/623\",\"active\":false,\"stats\":{\"atk\":28,\"def\":43,\"spa\":155,\"spd\":333,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"},{\"ident\":\"p2: E-Poke6\",\"details\":\"Blissey, M\",\"condition\":\"626/626\",\"active\":false,\"stats\":{\"atk\":35,\"def\":36,\"spa\":173,\"spd\":305,\"spe\":139},\"moves\":[\"thunderbolt\",\"surf\",\"flamethrower\",\"bodyslam\"],\"baseAbility\":\"naturalcure\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"naturalcure\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Normal\",\"terastallized\":\"\"}]},\"update\":true} at chooseOrThrow (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:98:13) at self.onmessage (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:111:6) Payload: {\"p1Choice\":\"move terastarstorm\",\"p2Choice\":\"move bodyslam\",\"p1Hps\":{\"e6f2fba8-d05d-4836-bec4-6e1f18f042d4\":0,\"fafff30b-415e-4752-815e-c69a40b7dc43\":0,\"b4c78fc5-60a5-4a6a-954b-c8fd823a2f56\":0,\"afc6f00b-ef87-4118-ba09-54100bcbf2b0\":327,\"cf642e63-77c6-406e-9e41-008cd3b907bd\":317,\"07f079d2-5f37-4e6d-be34-9ef5c4773b43\":326},\"p2Hps\":{\"6dae2029-3184-4745-8f31-0eaad560031c\":0,\"aff5aa65-bbf6-47b2-962f-f27c24a6d655\":400,\"1e3a4ca6-22e2-4c81-a1b0-9e32b67addbd\":624,\"4a80e767-af66-47c3-97d7-087294a9a73a\":634,\"970034ae-e6af-4108-9ec8-5ebd713e31cf\":623,\"c1d79a1a-3d29-4c55-9aef-c2296ad861f9\":626},\"p1Statuses\":{\"e6f2fba8-d05d-4836-bec4-6e1f18f042d4\":\"par\",\"fafff30b-415e-4752-815e-c69a40b7dc43\":\"\",\"b4c78fc5-60a5-4a6a-954b-c8fd823a2f56\":\"par\",\"afc6f00b-ef87-4118-ba09-54100bcbf2b0\":\"\",\"cf642e63-77c6-406e-9e41-008cd3b907bd\":\"\",\"07f079d2-5f37-4e6d-be34-9ef5c4773b43\":\"\"},\"p2Statuses\":{\"6dae2029-3184-4745-8f31-0eaad560031c\":\"\",\"aff5aa65-bbf6-47b2-962f-f27c24a6d655\":\"par\",\"1e3a4ca6-22e2-4c81-a1b0-9e32b67addbd\":\"\",\"4a80e767-af66-47c3-97d7-087294a9a73a\":\"\",\"970034ae-e6af-4108-9ec8-5ebd713e31cf\":\"\",\"c1d79a1a-3d29-4c55-9aef-c2296ad861f9\":\"\"},\"p1Skip\":false,\"p2Skip\":false} at Worker.handler (http://localhost:5173/src/logic/battle/orchestrator.ts?t=1782796901994:99:17)"
      - generic [ref=e148]:
        - generic [ref=e149]: "ESTADO DEL JUEGO:"
        - generic [ref=e150]:
          - strong [ref=e151]: "Entrenador:"
          - text: TEST_USER_1782811768 (Nv. 1)
        - generic [ref=e152]:
          - strong [ref=e153]: "Medallas:"
          - text: "0"
    - generic [ref=e154]:
      - button " COPIAR ERROR" [ref=e155] [cursor=pointer]:
        - generic [ref=e156]: 
        - text: COPIAR ERROR
      - button " REINICIAR JUEGO" [ref=e157] [cursor=pointer]:
        - generic [ref=e158]: 
        - text: REINICIAR JUEGO
      - button "✕ CERRAR" [ref=e159] [cursor=pointer]
  - generic [ref=e162]:
    - generic [ref=e164] [cursor=pointer]: 🌅⛄🥶
    - generic [ref=e166]:
      - generic [ref=e167]:
        - generic [ref=e168]:
          - generic:
            - generic:
              - generic:
                - img
              - generic:
                - img [ref=e171]
                - img [ref=e174]
                - generic [ref=e178]:
                  - img [ref=e182]
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
                - img [ref=e190]
        - generic:
          - generic [ref=e193]:
            - generic [ref=e194]:
              - generic [ref=e195]: Blissey
              - generic [ref=e196]: ♂
            - generic [ref=e197]:
              - generic [ref=e198]: Nv. 100
              - generic [ref=e200]: NORMAL
            - generic [ref=e211]: "HP: 400/648"
            - generic [ref=e212]:
              - generic [ref=e214]: ⚡
              - generic [ref=e216]: 🧠
              - generic [ref=e218]: 🎒
              - generic [ref=e220]:
                - text: 🛡️
                - generic [ref=e221]: ▼6
              - generic [ref=e223]:
                - text: 💨
                - generic [ref=e224]: ▼6
          - generic [ref=e227]:
            - generic [ref=e229]: Mew
            - generic [ref=e230]:
              - generic [ref=e231]: Nv. 100
              - generic [ref=e233]: PSÍQUICO
            - generic [ref=e245]: "HP: 327/327"
            - generic [ref=e248]: 🧠
        - generic [ref=e249]:
          - button "+" [disabled] [ref=e250]
          - button "-" [ref=e251] [cursor=pointer]
      - generic [ref=e254]:
        - generic [ref=e255]:
          - img [ref=e257]
          - generic [ref=e258]: ¡Blissey está confundido y se lastimó!
        - generic [ref=e259]:
          - img [ref=e261]
          - generic [ref=e262]: ¡Blissey recibió daño!
        - generic [ref=e263]:
          - img [ref=e265]
          - generic [ref=e266]: ¡Mew usó Danza Caos!
        - generic [ref=e267]:
          - img [ref=e269]
          - generic [ref=e270]: ¡El movimiento de Mew falló!
        - generic [ref=e271]:
          - img [ref=e273]
          - generic [ref=e274]: ¡Blissey está confundido y se lastimó!
        - generic [ref=e275]:
          - img [ref=e277]
          - generic [ref=e278]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e279]:
          - img [ref=e281]
          - generic [ref=e282]: ¡Mew recibió daño!
        - generic [ref=e283]:
          - img [ref=e285]
          - generic [ref=e286]: "¡Mew sufrió un problema de estado: PAR!"
        - generic [ref=e287]:
          - img [ref=e289]
          - generic [ref=e290]: "¡Blissey sufrió un problema de estado: PAR!"
        - generic [ref=e291]:
          - img [ref=e293]
          - generic [ref=e294]: ¡Mew usó Danza Caos!
        - generic [ref=e295]:
          - img [ref=e297]
          - generic [ref=e298]: ¡El movimiento de Mew falló!
        - generic [ref=e299]:
          - img [ref=e301]
          - generic [ref=e302]: ¡Blissey está confundido y se lastimó!
        - generic [ref=e303]:
          - img [ref=e305]
          - generic [ref=e306]: ¡Blissey usó Lanzallamas!
        - generic [ref=e307]:
          - img [ref=e309]
          - generic [ref=e310]: ¡Mew recibió daño!
        - generic [ref=e311]:
          - img [ref=e313]
          - generic [ref=e314]: ¡Mew usó Danza Caos!
        - generic [ref=e315]:
          - img [ref=e317]
          - generic [ref=e318]: ¡El movimiento de Mew falló!
        - generic [ref=e319]:
          - img [ref=e321]
          - generic [ref=e322]: ¡Blissey está paralizado y no puede moverse!
        - generic [ref=e323]:
          - img [ref=e325]
          - generic [ref=e326]: ¡Mew usó Danza Caos!
        - generic [ref=e327]:
          - img [ref=e329]
          - generic [ref=e330]: ¡Blissey está confundido y se lastimó!
        - generic [ref=e331]:
          - img [ref=e333]
          - generic [ref=e334]: ¡Blissey usó Rayo!
        - generic [ref=e335]:
          - img [ref=e337]
          - generic [ref=e338]: ¡Mew recibió daño!
        - generic [ref=e339]:
          - img [ref=e341]
          - generic [ref=e342]: ¡Mew usó Danza Caos!
        - generic [ref=e343]:
          - img [ref=e345]
          - generic [ref=e346]: ¡El movimiento de Mew falló!
        - generic [ref=e347]:
          - img [ref=e349]
          - generic [ref=e350]: ¡Blissey usó Rayo!
        - generic [ref=e351]:
          - img [ref=e353]
          - generic [ref=e354]: ¡Mew recibió daño!
        - generic [ref=e355]:
          - img [ref=e357]
          - generic [ref=e358]: ¡Mew se debilitó!
        - generic [ref=e359]:
          - img [ref=e361]
          - generic [ref=e362]: ¡Mew se ha debilitado!
        - generic [ref=e363]:
          - img [ref=e365]
          - generic [ref=e366]: ¡Elige a tu próximo Pokémon!
        - generic [ref=e367]:
          - img [ref=e369]
          - generic [ref=e370]: ¡Adelante, Mew!
        - generic [ref=e373]: ¡Ocurrió un error al ejecutar el movimiento!
      - generic [ref=e375]:
        - complementary [ref=e376]:
          - generic [ref=e378]:
            - generic:
              - generic:
                - generic: C
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
                - generic: C
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
            - generic [ref=e379] [cursor=pointer]:
              - generic [ref=e381]: D
              - img "pokemon" [ref=e385]
              - generic [ref=e386]:
                - generic [ref=e388]: P-Poke4
                - generic [ref=e390]: PSÍQUICO
                - generic [ref=e393]: Nv. 100
            - generic [ref=e396] [cursor=pointer]:
              - generic [ref=e398]: C
              - img "pokemon" [ref=e402]
              - generic [ref=e403]:
                - generic [ref=e405]: P-Poke5
                - generic [ref=e407]: PSÍQUICO
                - generic [ref=e410]: Nv. 100
            - generic [ref=e413] [cursor=pointer]:
              - generic [ref=e415]: C
              - generic [ref=e419]: "31"
              - img "pokemon" [ref=e423]
              - generic [ref=e424]:
                - generic [ref=e426]: P-Poke6
                - generic [ref=e428]: PSÍQUICO
                - generic [ref=e431]: Nv. 100
        - generic [ref=e434]:
          - generic [ref=e436]:
            - generic [ref=e437]:
              - generic [ref=e439]: "?"
              - 'button "TERACLúSTER NORMAL POT: 120 PREC: 100 CAT: ✨ Especial PP 4/5" [ref=e440] [cursor=pointer]':
                - generic [ref=e441]:
                  - generic [ref=e442]: TERACLúSTER
                  - generic [ref=e443]: NORMAL
                - generic [ref=e444]:
                  - generic [ref=e445]:
                    - generic [ref=e446]: "POT:"
                    - generic [ref=e447]: "120"
                  - generic [ref=e448]:
                    - generic [ref=e449]: "PREC:"
                    - generic [ref=e450]: "100"
                  - generic [ref=e451]:
                    - generic [ref=e452]: "CAT:"
                    - generic [ref=e454]: ✨ Especial
                  - generic [ref=e455]:
                    - generic [ref=e456]: PP
                    - generic [ref=e457]: 4/5
            - generic [ref=e458]:
              - generic [ref=e460]: "?"
              - 'button "PULSO DE CAMPO NORMAL POT: 50 PREC: 100 CAT: ✨ Especial PP 10/10" [ref=e461] [cursor=pointer]':
                - generic [ref=e462]:
                  - generic [ref=e463]: PULSO DE CAMPO
                  - generic [ref=e464]: NORMAL
                - generic [ref=e465]:
                  - generic [ref=e466]:
                    - generic [ref=e467]: "POT:"
                    - generic [ref=e468]: "50"
                  - generic [ref=e469]:
                    - generic [ref=e470]: "PREC:"
                    - generic [ref=e471]: "100"
                  - generic [ref=e472]:
                    - generic [ref=e473]: "CAT:"
                    - generic [ref=e475]: ✨ Especial
                  - generic [ref=e476]:
                    - generic [ref=e477]: PP
                    - generic [ref=e478]: 10/10
            - generic [ref=e479]:
              - generic [ref=e481]: "?"
              - 'button "LADRóN SINIESTRO POT: 60 PREC: 100 CAT: ⚔️ Físico PP 25/25" [ref=e482] [cursor=pointer]':
                - generic [ref=e483]:
                  - generic [ref=e484]: LADRóN
                  - generic [ref=e485]: SINIESTRO
                - generic [ref=e486]:
                  - generic [ref=e487]:
                    - generic [ref=e488]: "POT:"
                    - generic [ref=e489]: "60"
                  - generic [ref=e490]:
                    - generic [ref=e491]: "PREC:"
                    - generic [ref=e492]: "100"
                  - generic [ref=e493]:
                    - generic [ref=e494]: "CAT:"
                    - generic [ref=e496]: ⚔️ Físico
                  - generic [ref=e497]:
                    - generic [ref=e498]: PP
                    - generic [ref=e499]: 25/25
            - generic [ref=e500]:
              - generic [ref=e502]: "?"
              - 'button "GOLPE NORMAL POT: 120 PREC: 100 CAT: ⚔️ Físico PP 10/10" [ref=e503] [cursor=pointer]':
                - generic [ref=e504]:
                  - generic [ref=e505]: GOLPE
                  - generic [ref=e506]: NORMAL
                - generic [ref=e507]:
                  - generic [ref=e508]:
                    - generic [ref=e509]: "POT:"
                    - generic [ref=e510]: "120"
                  - generic [ref=e511]:
                    - generic [ref=e512]: "PREC:"
                    - generic [ref=e513]: "100"
                  - generic [ref=e514]:
                    - generic [ref=e515]: "CAT:"
                    - generic [ref=e517]: ⚔️ Físico
                  - generic [ref=e518]:
                    - generic [ref=e519]: PP
                    - generic [ref=e520]: 10/10
          - generic [ref=e522]:
            - button "🔄 CAMBIAR" [ref=e523] [cursor=pointer]:
              - generic [ref=e524]: 🔄
              - generic [ref=e525]: CAMBIAR
            - button [disabled] [ref=e527]
            - button "🎒 MOCHILA" [ref=e528] [cursor=pointer]:
              - generic [ref=e529]: 🎒
              - generic [ref=e530]: MOCHILA
        - complementary [ref=e531]:
          - generic [ref=e533]:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - img "Poción"
                  - generic: x3
  - generic [ref=e534]:
    - button "🕹️ DEBUG" [ref=e536] [cursor=pointer]:
      - generic [ref=e537]: 🕹️
      - generic [ref=e538]: DEBUG
    - button "✨ EFECTOS" [ref=e540] [cursor=pointer]:
      - generic [ref=e541]: ✨
      - generic [ref=e542]: EFECTOS
    - button "⌛ TIEMPO" [ref=e544] [cursor=pointer]:
      - generic [ref=e545]: ⌛
      - generic [ref=e546]: TIEMPO
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { generateTestBatches } from '../../scripts/battle-tester/team-generator.ts';
  3   | 
  4   | interface TeamSet {
  5   |   species: string;
  6   |   level?: number;
  7   |   ability?: string;
  8   |   moves?: string[];
  9   |   item?: string;
  10  |   name?: string;
  11  | }
  12  | 
  13  | // Helper: Esperar a que la máquina de estados retorne a WAIT_INPUT o SWITCH_MENU (el turno anterior y sus animaciones terminaron)
  14  | // Y además asegurar que hayamos avanzado de turno (si no es el primer turno de la simulación)
  15  | async function waitForWaitInput(page: Page, turnCount: number, batchIndex: number, expectedSimulatorTurn: number, lastSubState: string) {
  16  |   try {
  17  |     let resolved = false;
  18  |     while (!resolved) {
  19  |       await page.waitForFunction(({ expectedTurn, lastSub, isFirst }) => {
  20  |         const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
  21  |         if (!resolver) return false;
  22  |         const store = resolver();
  23  |         const isReady = (store.currentFsmState === 'ACTIVE_BATTLE' && 
  24  |                         (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
  25  |                         !store.state || store.state.over;
  26  |         const currentTurn = store.state?.turnCount ?? 1;
  27  |         const currentSubState = store.currentSubState;
  28  |         
  29  |         console.log(`[E2E-FSM-Wait] turnCount: ${expectedTurn}, lastSub: "${lastSub}", isFirst: ${isFirst}, currentSubState: "${store.currentSubState}", currentTurn: ${currentTurn}, isReady: ${isReady}`);
  30  |         
  31  |         if (!isReady) return false;
  32  |         const isCorrectTurn = isFirst || currentSubState === 'SWITCH_MENU' || currentTurn > expectedTurn || (currentTurn === expectedTurn && currentSubState !== lastSub) || store.state?.over;
  33  |         return isCorrectTurn;
  34  |       }, { expectedTurn: expectedSimulatorTurn, lastSub: lastSubState, isFirst: turnCount === 0 }, { timeout: 12000 });
  35  | 
  36  |       // Esperar 100ms para asegurar que no caímos en un microtask gap donde el turnCount subió pero la FSM aún no transitó a EXEC_TURN/APPLY_MOVE
  37  |       await page.waitForTimeout(100);
  38  | 
  39  |       // Re-verificar si seguimos en un estado listo para input (WAIT_INPUT o SWITCH_MENU o batalla terminada)
  40  |       const stillReady = await page.evaluate(() => {
  41  |         const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
  42  |         if (!resolver) return false;
  43  |         const store = resolver();
  44  |         return (store.currentFsmState === 'ACTIVE_BATTLE' && 
  45  |                 (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
  46  |                 !store.state || store.state.over;
  47  |       });
  48  | 
  49  |       if (stillReady) {
  50  |         resolved = true;
  51  |       } else {
  52  |         console.log(`[E2E] Falsa alarma detectada (microtask gap). Re-esperando FSM...`);
  53  |       }
  54  |     }
  55  |   } catch (_e) {
  56  |     await page.screenshot({ path: `scratch/lock-batch-${batchIndex}-turn-${turnCount}.png` });
> 57  |     throw new Error(`Bloqueo detectado: La FSM de combate se quedó trabada en el turno ${turnCount}. Captura guardada en scratch/.`);
      |           ^ Error: Bloqueo detectado: La FSM de combate se quedó trabada en el turno 46. Captura guardada en scratch/.
  58  |   }
  59  | }
  60  | 
  61  | // Helper: Confirmar e iniciar combate real clickeando ¡COMBATIR!
  62  | async function confirmAndStartBattle(page: Page) {
  63  |   const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
  64  |   await combatirBtn.waitFor({ state: 'attached', timeout: 5000 });
  65  |   await combatirBtn.click({ force: true });
  66  | }
  67  | 
  68  | // Helper: Verificación de paridad 1:1 entre Store (Showdown) y DOM (Interfaz Gráfica)
  69  | // Lee store y DOM simultáneamente en el mismo polling loop para evitar snapshots desactualizados.
  70  | async function verifyHpParity(page: Page) {
  71  |   // Verificar paridad: espera hasta que el DOM refleje exactamente lo que el store tiene EN ESE MOMENTO
  72  |   try {
  73  |     await page.waitForFunction(() => {
  74  |       const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
  75  |       if (!resolver) return false;
  76  |       const store = resolver();
  77  |       const playerHp = store.state?.player?.hp ?? 0;
  78  |       const playerMaxHp = store.state?.player?.maxHp ?? 1;
  79  |       const enemyHp = store.state?.enemy?.hp ?? 0;
  80  |       const enemyMaxHp = store.state?.enemy?.maxHp ?? 1;
  81  | 
  82  |       if (playerHp > 0) {
  83  |         const el = document.querySelector('.player-card .hp-values');
  84  |         const text = el?.textContent ?? '';
  85  |         if (!text.includes(`${playerHp}/${playerMaxHp}`)) return false;
  86  |       }
  87  |       if (enemyHp > 0) {
  88  |         const el = document.querySelector('.enemy-card .hp-values');
  89  |         const text = el?.textContent ?? '';
  90  |         if (!text.includes(`${enemyHp}/${enemyMaxHp}`)) return false;
  91  |       }
  92  |       return true;
  93  |     }, undefined, { timeout: 15000 });
  94  |   } catch (err) {
  95  |     const diagnosis = await page.evaluate(async () => {
  96  |       const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
  97  |       const store = useBattleStore();
  98  |       const storePlayer = `${store.state?.player?.hp}/${store.state?.player?.maxHp}`;
  99  |       const storeEnemy  = `${store.state?.enemy?.hp}/${store.state?.enemy?.maxHp}`;
  100 |       const domPlayer   = document.querySelector('.player-card .hp-values')?.textContent ?? 'null';
  101 |       const domEnemy    = document.querySelector('.enemy-card .hp-values')?.textContent ?? 'null';
  102 |       return { storePlayer, storeEnemy, domPlayer, domEnemy };
  103 |     });
  104 |     console.error(`[E2E ERROR] HP Mismatch — Store player: ${diagnosis.storePlayer}, DOM player: "${diagnosis.domPlayer}" | Store enemy: ${diagnosis.storeEnemy}, DOM enemy: "${diagnosis.domEnemy}"`);
  105 |     throw err;
  106 |   }
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
```