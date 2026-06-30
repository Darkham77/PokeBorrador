# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_fsm_sync.spec.ts >> Battle FSM & GSAP Synchronization - Full Coverage >> debería simular el lote #20 (24 movimientos, 6 habilidades) sin bloqueos de FSM
- Location: tests\e2e\test_fsm_sync.spec.ts:292:5

# Error details

```
Error: Bloqueo detectado: La FSM de combate se quedó trabada en el turno 19. Captura guardada en scratch/.
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
                - generic [ref=e8]: TEST_USER_1782811705
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
        - generic [ref=e147]: "[ERROR 1/1] (Console Error - console.error) Message: INVALID_CHOICE: Elección \"move rest\" (resuelta a \"move rest\") rechazada por el simulador para p1. ActiveMon: P-Poke2, Simulator Moves: [\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recycle\",\"id\":\"recycle\",\"pp\":10,\"maxpp\":16,\"target\":\"self\",\"disabled\":false},{\"move\":\"Reflect\",\"id\":\"reflect\",\"pp\":32,\"maxpp\":32,\"target\":\"allySide\",\"disabled\":false},{\"move\":\"Reflect Type\",\"id\":\"reflecttype\",\"pp\":24,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Relic Song\",\"id\":\"relicsong\",\"pp\":16,\"maxpp\":16,\"target\":\"allAdjacentFoes\",\"disabled\":false}],\"canTerastallize\":\"Psychic\"}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"5/331 brn\",\"active\":true,\"stats\":{\"atk\":210,\"def\":206,\"spa\":225,\"spd\":195,\"spe\":231},\"moves\":[\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":234,\"def\":253,\"spa\":227,\"spd\":200,\"spe\":230},\"moves\":[\"rapidspin\",\"razorleaf\",\"razorshell\",\"recover\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":211,\"def\":213,\"spa\":219,\"spd\":216,\"spe\":210},\"moves\":[\"rest\",\"retaliate\",\"revelationdance\",\"reversal\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"321/321\",\"active\":false,\"stats\":{\"atk\":230,\"def\":225,\"spa\":189,\"spd\":209,\"spe\":206},\"moves\":[\"revivalblessing\",\"risingvoltage\",\"roar\",\"roaroftime\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":213,\"def\":192,\"spa\":205,\"spd\":236,\"spe\":238},\"moves\":[\"rockblast\",\"rockpolish\",\"rockslide\",\"rocksmash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":208,\"def\":214,\"spa\":228,\"spd\":213,\"spe\":211},\"moves\":[\"rockthrow\",\"rocktomb\",\"rockwrecker\",\"roleplay\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} Stack: Error: INVALID_CHOICE: Elección \"move rest\" (resuelta a \"move rest\") rechazada por el simulador para p1. ActiveMon: P-Poke2, Simulator Moves: [\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recycle\",\"id\":\"recycle\",\"pp\":10,\"maxpp\":16,\"target\":\"self\",\"disabled\":false},{\"move\":\"Reflect\",\"id\":\"reflect\",\"pp\":32,\"maxpp\":32,\"target\":\"allySide\",\"disabled\":false},{\"move\":\"Reflect Type\",\"id\":\"reflecttype\",\"pp\":24,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Relic Song\",\"id\":\"relicsong\",\"pp\":16,\"maxpp\":16,\"target\":\"allAdjacentFoes\",\"disabled\":false}],\"canTerastallize\":\"Psychic\"}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"5/331 brn\",\"active\":true,\"stats\":{\"atk\":210,\"def\":206,\"spa\":225,\"spd\":195,\"spe\":231},\"moves\":[\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":234,\"def\":253,\"spa\":227,\"spd\":200,\"spe\":230},\"moves\":[\"rapidspin\",\"razorleaf\",\"razorshell\",\"recover\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":211,\"def\":213,\"spa\":219,\"spd\":216,\"spe\":210},\"moves\":[\"rest\",\"retaliate\",\"revelationdance\",\"reversal\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"321/321\",\"active\":false,\"stats\":{\"atk\":230,\"def\":225,\"spa\":189,\"spd\":209,\"spe\":206},\"moves\":[\"revivalblessing\",\"risingvoltage\",\"roar\",\"roaroftime\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":213,\"def\":192,\"spa\":205,\"spd\":236,\"spe\":238},\"moves\":[\"rockblast\",\"rockpolish\",\"rockslide\",\"rocksmash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":208,\"def\":214,\"spa\":228,\"spd\":213,\"spe\":211},\"moves\":[\"rockthrow\",\"rocktomb\",\"rockwrecker\",\"roleplay\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} at chooseOrThrow (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:98:13) at self.onmessage (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:103:6) Payload: {\"p1Choice\":\"move rest\",\"p2Choice\":\"move bodyslam\",\"p1Hps\":{\"4627aa07-23da-4009-8c9d-09c5101638b7\":0,\"439435ab-0f43-416a-9a38-4ce51cbcfa20\":0,\"3defb313-b7dc-4626-9443-b154a8b6ea12\":332,\"0311f1a6-686b-49cc-bca4-ed6a20b49a31\":321,\"391801f2-e3dc-4b64-9643-dccf8877117b\":332,\"93ac20c6-1937-45f8-a55f-52a4b6b90d75\":329},\"p2Hps\":{\"68ed4ee2-665c-4559-bf8b-5fec42437cfb\":0,\"2263bd07-048a-408b-aac7-fe80a713350f\":0,\"80381761-4251-428e-bb58-e0e42fbc2946\":223,\"689919be-1498-4b02-8254-ddc52fbd419a\":641,\"2ca5fb28-bff5-4082-b365-80b4952c016b\":625,\"4dabc21c-ca1f-4b5d-a4ad-327290fd6451\":651},\"p1Statuses\":{\"4627aa07-23da-4009-8c9d-09c5101638b7\":\"par\",\"439435ab-0f43-416a-9a38-4ce51cbcfa20\":\"brn\",\"3defb313-b7dc-4626-9443-b154a8b6ea12\":\"\",\"0311f1a6-686b-49cc-bca4-ed6a20b49a31\":\"\",\"391801f2-e3dc-4b64-9643-dccf8877117b\":\"\",\"93ac20c6-1937-45f8-a55f-52a4b6b90d75\":\"\"},\"p2Statuses\":{\"68ed4ee2-665c-4559-bf8b-5fec42437cfb\":\"par\",\"2263bd07-048a-408b-aac7-fe80a713350f\":\"\",\"80381761-4251-428e-bb58-e0e42fbc2946\":\"brn\",\"689919be-1498-4b02-8254-ddc52fbd419a\":\"\",\"2ca5fb28-bff5-4082-b365-80b4952c016b\":\"\",\"4dabc21c-ca1f-4b5d-a4ad-327290fd6451\":\"\"},\"p1Skip\":false,\"p2Skip\":false} Stack: InvalidChoiceError: INVALID_CHOICE: Elección \"move rest\" (resuelta a \"move rest\") rechazada por el simulador para p1. ActiveMon: P-Poke2, Simulator Moves: [\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recycle\",\"id\":\"recycle\",\"pp\":10,\"maxpp\":16,\"target\":\"self\",\"disabled\":false},{\"move\":\"Reflect\",\"id\":\"reflect\",\"pp\":32,\"maxpp\":32,\"target\":\"allySide\",\"disabled\":false},{\"move\":\"Reflect Type\",\"id\":\"reflecttype\",\"pp\":24,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Relic Song\",\"id\":\"relicsong\",\"pp\":16,\"maxpp\":16,\"target\":\"allAdjacentFoes\",\"disabled\":false}],\"canTerastallize\":\"Psychic\"}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"5/331 brn\",\"active\":true,\"stats\":{\"atk\":210,\"def\":206,\"spa\":225,\"spd\":195,\"spe\":231},\"moves\":[\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":234,\"def\":253,\"spa\":227,\"spd\":200,\"spe\":230},\"moves\":[\"rapidspin\",\"razorleaf\",\"razorshell\",\"recover\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":211,\"def\":213,\"spa\":219,\"spd\":216,\"spe\":210},\"moves\":[\"rest\",\"retaliate\",\"revelationdance\",\"reversal\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"321/321\",\"active\":false,\"stats\":{\"atk\":230,\"def\":225,\"spa\":189,\"spd\":209,\"spe\":206},\"moves\":[\"revivalblessing\",\"risingvoltage\",\"roar\",\"roaroftime\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":213,\"def\":192,\"spa\":205,\"spd\":236,\"spe\":238},\"moves\":[\"rockblast\",\"rockpolish\",\"rockslide\",\"rocksmash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":208,\"def\":214,\"spa\":228,\"spd\":213,\"spe\":211},\"moves\":[\"rockthrow\",\"rocktomb\",\"rockwrecker\",\"roleplay\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} Stack: Error: INVALID_CHOICE: Elección \"move rest\" (resuelta a \"move rest\") rechazada por el simulador para p1. ActiveMon: P-Poke2, Simulator Moves: [\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recycle\",\"id\":\"recycle\",\"pp\":10,\"maxpp\":16,\"target\":\"self\",\"disabled\":false},{\"move\":\"Reflect\",\"id\":\"reflect\",\"pp\":32,\"maxpp\":32,\"target\":\"allySide\",\"disabled\":false},{\"move\":\"Reflect Type\",\"id\":\"reflecttype\",\"pp\":24,\"maxpp\":24,\"target\":\"normal\",\"disabled\":false},{\"move\":\"Relic Song\",\"id\":\"relicsong\",\"pp\":16,\"maxpp\":16,\"target\":\"allAdjacentFoes\",\"disabled\":false}],\"canTerastallize\":\"Psychic\"}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"5/331 brn\",\"active\":true,\"stats\":{\"atk\":210,\"def\":206,\"spa\":225,\"spd\":195,\"spe\":231},\"moves\":[\"recycle\",\"reflect\",\"reflecttype\",\"relicsong\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"0 fnt\",\"active\":false,\"stats\":{\"atk\":234,\"def\":253,\"spa\":227,\"spd\":200,\"spe\":230},\"moves\":[\"rapidspin\",\"razorleaf\",\"razorshell\",\"recover\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":211,\"def\":213,\"spa\":219,\"spd\":216,\"spe\":210},\"moves\":[\"rest\",\"retaliate\",\"revelationdance\",\"reversal\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"321/321\",\"active\":false,\"stats\":{\"atk\":230,\"def\":225,\"spa\":189,\"spd\":209,\"spe\":206},\"moves\":[\"revivalblessing\",\"risingvoltage\",\"roar\",\"roaroftime\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"332/332\",\"active\":false,\"stats\":{\"atk\":213,\"def\":192,\"spa\":205,\"spd\":236,\"spe\":238},\"moves\":[\"rockblast\",\"rockpolish\",\"rockslide\",\"rocksmash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":208,\"def\":214,\"spa\":228,\"spd\":213,\"spe\":211},\"moves\":[\"rockthrow\",\"rocktomb\",\"rockwrecker\",\"roleplay\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} at chooseOrThrow (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:98:13) at self.onmessage (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:103:6) Payload: {\"p1Choice\":\"move rest\",\"p2Choice\":\"move bodyslam\",\"p1Hps\":{\"4627aa07-23da-4009-8c9d-09c5101638b7\":0,\"439435ab-0f43-416a-9a38-4ce51cbcfa20\":0,\"3defb313-b7dc-4626-9443-b154a8b6ea12\":332,\"0311f1a6-686b-49cc-bca4-ed6a20b49a31\":321,\"391801f2-e3dc-4b64-9643-dccf8877117b\":332,\"93ac20c6-1937-45f8-a55f-52a4b6b90d75\":329},\"p2Hps\":{\"68ed4ee2-665c-4559-bf8b-5fec42437cfb\":0,\"2263bd07-048a-408b-aac7-fe80a713350f\":0,\"80381761-4251-428e-bb58-e0e42fbc2946\":223,\"689919be-1498-4b02-8254-ddc52fbd419a\":641,\"2ca5fb28-bff5-4082-b365-80b4952c016b\":625,\"4dabc21c-ca1f-4b5d-a4ad-327290fd6451\":651},\"p1Statuses\":{\"4627aa07-23da-4009-8c9d-09c5101638b7\":\"par\",\"439435ab-0f43-416a-9a38-4ce51cbcfa20\":\"brn\",\"3defb313-b7dc-4626-9443-b154a8b6ea12\":\"\",\"0311f1a6-686b-49cc-bca4-ed6a20b49a31\":\"\",\"391801f2-e3dc-4b64-9643-dccf8877117b\":\"\",\"93ac20c6-1937-45f8-a55f-52a4b6b90d75\":\"\"},\"p2Statuses\":{\"68ed4ee2-665c-4559-bf8b-5fec42437cfb\":\"par\",\"2263bd07-048a-408b-aac7-fe80a713350f\":\"\",\"80381761-4251-428e-bb58-e0e42fbc2946\":\"brn\",\"689919be-1498-4b02-8254-ddc52fbd419a\":\"\",\"2ca5fb28-bff5-4082-b365-80b4952c016b\":\"\",\"4dabc21c-ca1f-4b5d-a4ad-327290fd6451\":\"\"},\"p1Skip\":false,\"p2Skip\":false} at Worker.handler (http://localhost:5173/src/logic/battle/orchestrator.ts?t=1782796901994:99:17)"
      - generic [ref=e148]:
        - generic [ref=e149]: "ESTADO DEL JUEGO:"
        - generic [ref=e150]:
          - strong [ref=e151]: "Entrenador:"
          - text: TEST_USER_1782811705 (Nv. 1)
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
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                      - generic: 🔥
                - img [ref=e190]
        - generic:
          - generic [ref=e193]:
            - generic [ref=e194]:
              - generic [ref=e195]: Blissey
              - generic [ref=e196]: ♀
            - generic [ref=e197]:
              - generic [ref=e198]: Nv. 100
              - generic [ref=e200]: NORMAL
            - generic [ref=e211]: "HP: 223/636"
            - generic [ref=e212]:
              - generic [ref=e214]: 🔥
              - generic [ref=e216]: 🧠
              - generic [ref=e218]: 🎒
          - generic [ref=e221]:
            - generic [ref=e223]: Mew
            - generic [ref=e224]:
              - generic [ref=e225]: Nv. 100
              - generic [ref=e227]: PSÍQUICO
            - generic [ref=e239]: "HP: 332/332"
            - generic [ref=e242]: 🧠
        - generic [ref=e243]:
          - button "+" [disabled] [ref=e244]
          - button "-" [ref=e245] [cursor=pointer]
      - generic [ref=e248]:
        - generic [ref=e249]:
          - img [ref=e251]
          - generic [ref=e252]: ¡El movimiento de Mew falló!
        - generic [ref=e253]:
          - img [ref=e255]
          - generic [ref=e256]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e257]:
          - img [ref=e259]
          - generic [ref=e260]: ¡Mew recibió daño!
        - generic [ref=e261]:
          - img [ref=e263]
          - generic [ref=e264]: ¡Mew usó Reciclaje!
        - generic [ref=e265]:
          - img [ref=e267]
          - generic [ref=e268]: ¡El movimiento de Mew falló!
        - generic [ref=e269]:
          - img [ref=e271]
          - generic [ref=e272]: ¡Blissey usó Rayo!
        - generic [ref=e273]:
          - img [ref=e275]
          - generic [ref=e276]: ¡Mew recibió daño!
        - generic [ref=e277]:
          - img [ref=e279]
          - generic [ref=e280]: ¡Mew usó Reciclaje!
        - generic [ref=e281]:
          - img [ref=e283]
          - generic [ref=e284]: ¡El movimiento de Mew falló!
        - generic [ref=e285]:
          - img [ref=e287]
          - generic [ref=e288]: ¡Blissey usó Lanzallamas!
        - generic [ref=e289]:
          - generic [ref=e291]: ⚡
          - generic [ref=e292]: ¡Golpe crítico!
        - generic [ref=e293]:
          - img [ref=e295]
          - generic [ref=e296]: ¡Mew recibió daño!
        - generic [ref=e297]:
          - img [ref=e299]
          - generic [ref=e300]: "¡Mew sufrió un problema de estado: BRN!"
        - generic [ref=e301]:
          - img [ref=e303]
          - generic [ref=e304]: "¡Blissey sufrió un problema de estado: BRN!"
        - generic [ref=e305]:
          - img [ref=e307]
          - generic [ref=e308]: ¡Mew recibió daño!
        - generic [ref=e309]:
          - img [ref=e311]
          - generic [ref=e312]: ¡Blissey recibió daño!
        - generic [ref=e313]:
          - img [ref=e315]
          - generic [ref=e316]: ¡Mew sufre quemaduras! (-41 HP)
        - generic [ref=e317]:
          - img [ref=e319]
          - generic [ref=e320]: ¡Blissey sufre quemaduras! (-79 HP)
        - generic [ref=e321]:
          - img [ref=e323]
          - generic [ref=e324]: ¡Mew usó Reciclaje!
        - generic [ref=e325]:
          - img [ref=e327]
          - generic [ref=e328]: ¡El movimiento de Mew falló!
        - generic [ref=e329]:
          - img [ref=e331]
          - generic [ref=e332]: ¡Blissey usó Rayo!
        - generic [ref=e333]:
          - img [ref=e335]
          - generic [ref=e336]: ¡Mew recibió daño!
        - generic [ref=e337]:
          - img [ref=e339]
          - generic [ref=e340]: ¡Mew recibió daño!
        - generic [ref=e341]:
          - img [ref=e343]
          - generic [ref=e344]: ¡Blissey recibió daño!
        - generic [ref=e345]:
          - img [ref=e347]
          - generic [ref=e348]: ¡Mew sufre quemaduras! (-41 HP)
        - generic [ref=e349]:
          - img [ref=e351]
          - generic [ref=e352]: ¡Blissey sufre quemaduras! (-79 HP)
        - generic [ref=e353]:
          - img [ref=e355]
          - generic [ref=e356]: ¡Mew se ha debilitado!
        - generic [ref=e357]:
          - img [ref=e359]
          - generic [ref=e360]: ¡Elige a tu próximo Pokémon!
        - generic [ref=e361]:
          - img [ref=e363]
          - generic [ref=e364]: ¡Adelante, Mew!
        - generic [ref=e367]: ¡Ocurrió un error al ejecutar el movimiento!
      - generic [ref=e369]:
        - complementary [ref=e370]:
          - generic [ref=e372]:
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
            - generic [ref=e373] [cursor=pointer]:
              - generic [ref=e375]: D
              - img "pokemon" [ref=e379]
              - generic [ref=e380]:
                - generic [ref=e382]: P-Poke3
                - generic [ref=e384]: PSÍQUICO
                - generic [ref=e387]: Nv. 100
            - generic [ref=e390] [cursor=pointer]:
              - generic [ref=e392]: F
              - img "pokemon" [ref=e396]
              - generic [ref=e397]:
                - generic [ref=e399]: P-Poke4
                - generic [ref=e401]: PSÍQUICO
                - generic [ref=e404]: Nv. 100
            - generic [ref=e407] [cursor=pointer]:
              - generic [ref=e409]: D
              - generic [ref=e413]: "31"
              - img "pokemon" [ref=e417]
              - generic [ref=e418]:
                - generic [ref=e420]: P-Poke5
                - generic [ref=e422]: PSÍQUICO
                - generic [ref=e425]: Nv. 100
            - generic [ref=e428] [cursor=pointer]:
              - generic [ref=e430]: D
              - img "pokemon" [ref=e434]
              - generic [ref=e435]:
                - generic [ref=e437]: P-Poke6
                - generic [ref=e439]: PSÍQUICO
                - generic [ref=e442]: Nv. 100
        - generic [ref=e445]:
          - generic [ref=e447]:
            - generic [ref=e448]:
              - generic [ref=e450]: "?"
              - 'button "DESCANSO PSÍQUICO POT: - PREC: ♾️ CAT: 🔮 Estado PP 4/5" [ref=e451] [cursor=pointer]':
                - generic [ref=e452]:
                  - generic [ref=e453]: DESCANSO
                  - generic [ref=e454]: PSÍQUICO
                - generic [ref=e455]:
                  - generic [ref=e456]:
                    - generic [ref=e457]: "POT:"
                    - generic [ref=e458]: "-"
                  - generic [ref=e459]:
                    - generic [ref=e460]: "PREC:"
                    - generic [ref=e462]: ♾️
                  - generic [ref=e463]:
                    - generic [ref=e464]: "CAT:"
                    - generic [ref=e466]: 🔮 Estado
                  - generic [ref=e467]:
                    - generic [ref=e468]: PP
                    - generic [ref=e469]: 4/5
            - generic [ref=e470]:
              - generic [ref=e472]: "?"
              - 'button "REPRESALIA NORMAL POT: 70 PREC: 100 CAT: ⚔️ Físico PP 5/5" [ref=e473] [cursor=pointer]':
                - generic [ref=e474]:
                  - generic [ref=e475]: REPRESALIA
                  - generic [ref=e476]: NORMAL
                - generic [ref=e477]:
                  - generic [ref=e478]:
                    - generic [ref=e479]: "POT:"
                    - generic [ref=e480]: "70"
                  - generic [ref=e481]:
                    - generic [ref=e482]: "PREC:"
                    - generic [ref=e483]: "100"
                  - generic [ref=e484]:
                    - generic [ref=e485]: "CAT:"
                    - generic [ref=e487]: ⚔️ Físico
                  - generic [ref=e488]:
                    - generic [ref=e489]: PP
                    - generic [ref=e490]: 5/5
            - generic [ref=e491]:
              - generic [ref=e493]: "?"
              - 'button "DANZA DESPERTAR NORMAL POT: 90 PREC: 100 CAT: ✨ Especial PP 15/15" [ref=e494] [cursor=pointer]':
                - generic [ref=e495]:
                  - generic [ref=e496]: DANZA DESPERTAR
                  - generic [ref=e497]: NORMAL
                - generic [ref=e498]:
                  - generic [ref=e499]:
                    - generic [ref=e500]: "POT:"
                    - generic [ref=e501]: "90"
                  - generic [ref=e502]:
                    - generic [ref=e503]: "PREC:"
                    - generic [ref=e504]: "100"
                  - generic [ref=e505]:
                    - generic [ref=e506]: "CAT:"
                    - generic [ref=e508]: ✨ Especial
                  - generic [ref=e509]:
                    - generic [ref=e510]: PP
                    - generic [ref=e511]: 15/15
            - generic [ref=e512]:
              - generic [ref=e514]: "?"
              - 'button "INVERSIóN LUCHA POT: - PREC: 100 CAT: ⚔️ Físico PP 15/15" [ref=e515] [cursor=pointer]':
                - generic [ref=e516]:
                  - generic [ref=e517]: INVERSIóN
                  - generic [ref=e518]: LUCHA
                - generic [ref=e519]:
                  - generic [ref=e520]:
                    - generic [ref=e521]: "POT:"
                    - generic [ref=e522]: "-"
                  - generic [ref=e523]:
                    - generic [ref=e524]: "PREC:"
                    - generic [ref=e525]: "100"
                  - generic [ref=e526]:
                    - generic [ref=e527]: "CAT:"
                    - generic [ref=e529]: ⚔️ Físico
                  - generic [ref=e530]:
                    - generic [ref=e531]: PP
                    - generic [ref=e532]: 15/15
          - generic [ref=e534]:
            - button "🔄 CAMBIAR" [ref=e535] [cursor=pointer]:
              - generic [ref=e536]: 🔄
              - generic [ref=e537]: CAMBIAR
            - button [disabled] [ref=e539]
            - button "🎒 MOCHILA" [ref=e540] [cursor=pointer]:
              - generic [ref=e541]: 🎒
              - generic [ref=e542]: MOCHILA
        - complementary [ref=e543]:
          - generic [ref=e545]:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - img "Poción"
                  - generic: x3
  - generic [ref=e546]:
    - button "🕹️ DEBUG" [ref=e548] [cursor=pointer]:
      - generic [ref=e549]: 🕹️
      - generic [ref=e550]: DEBUG
    - button "✨ EFECTOS" [ref=e552] [cursor=pointer]:
      - generic [ref=e553]: ✨
      - generic [ref=e554]: EFECTOS
    - button "⌛ TIEMPO" [ref=e556] [cursor=pointer]:
      - generic [ref=e557]: ⌛
      - generic [ref=e558]: TIEMPO
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
      |           ^ Error: Bloqueo detectado: La FSM de combate se quedó trabada en el turno 19. Captura guardada en scratch/.
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