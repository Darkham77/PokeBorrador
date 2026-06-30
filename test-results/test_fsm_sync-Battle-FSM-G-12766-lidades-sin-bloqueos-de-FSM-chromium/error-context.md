# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_fsm_sync.spec.ts >> Battle FSM & GSAP Synchronization - Full Coverage >> debería simular el lote #19 (24 movimientos, 6 habilidades) sin bloqueos de FSM
- Location: tests\e2e\test_fsm_sync.spec.ts:292:5

# Error details

```
Error: Bloqueo detectado: La FSM de combate se quedó trabada en el turno 2. Captura guardada en scratch/.
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
                - generic [ref=e8]: TEST_USER_1782811680
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
        - generic [ref=e147]: "[ERROR 1/1] (Console Error - console.error) Message: INVALID_CHOICE: Elección \"move prismaticlaser\" (resuelta a \"move prismaticlaser\") rechazada por el simulador para p1. ActiveMon: P-Poke1, Simulator Moves: [\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recharge\",\"id\":\"recharge\"}],\"trapped\":true}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"321/339\",\"active\":true,\"stats\":{\"atk\":231,\"def\":220,\"spa\":253,\"spd\":197,\"spe\":230},\"moves\":[\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"325/325\",\"active\":false,\"stats\":{\"atk\":243,\"def\":195,\"spa\":230,\"spd\":229,\"spe\":221},\"moves\":[\"psychic\",\"psychicfangs\",\"psychicnoise\",\"psychicterrain\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":233,\"def\":253,\"spa\":189,\"spd\":216,\"spe\":212},\"moves\":[\"psychoboost\",\"psychocut\",\"psychup\",\"psyshieldbash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"315/315\",\"active\":false,\"stats\":{\"atk\":211,\"def\":233,\"spa\":227,\"spd\":226,\"spe\":223},\"moves\":[\"psyshock\",\"psystrike\",\"pyroball\",\"quash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":214,\"def\":207,\"spa\":227,\"spd\":225,\"spe\":229},\"moves\":[\"quickattack\",\"quickguard\",\"quiverdance\",\"ragefist\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":225,\"def\":222,\"spa\":206,\"spd\":206,\"spe\":219},\"moves\":[\"ragepowder\",\"ragingbull\",\"ragingfury\",\"raindance\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} Stack: Error: INVALID_CHOICE: Elección \"move prismaticlaser\" (resuelta a \"move prismaticlaser\") rechazada por el simulador para p1. ActiveMon: P-Poke1, Simulator Moves: [\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recharge\",\"id\":\"recharge\"}],\"trapped\":true}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"321/339\",\"active\":true,\"stats\":{\"atk\":231,\"def\":220,\"spa\":253,\"spd\":197,\"spe\":230},\"moves\":[\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"325/325\",\"active\":false,\"stats\":{\"atk\":243,\"def\":195,\"spa\":230,\"spd\":229,\"spe\":221},\"moves\":[\"psychic\",\"psychicfangs\",\"psychicnoise\",\"psychicterrain\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":233,\"def\":253,\"spa\":189,\"spd\":216,\"spe\":212},\"moves\":[\"psychoboost\",\"psychocut\",\"psychup\",\"psyshieldbash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"315/315\",\"active\":false,\"stats\":{\"atk\":211,\"def\":233,\"spa\":227,\"spd\":226,\"spe\":223},\"moves\":[\"psyshock\",\"psystrike\",\"pyroball\",\"quash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":214,\"def\":207,\"spa\":227,\"spd\":225,\"spe\":229},\"moves\":[\"quickattack\",\"quickguard\",\"quiverdance\",\"ragefist\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":225,\"def\":222,\"spa\":206,\"spd\":206,\"spe\":219},\"moves\":[\"ragepowder\",\"ragingbull\",\"ragingfury\",\"raindance\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} at chooseOrThrow (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:98:13) at self.onmessage (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:103:6) Payload: {\"p1Choice\":\"move prismaticlaser\",\"p2Choice\":\"move bodyslam\",\"p1Hps\":{\"3ccb2545-0349-47aa-9274-26bf0320ec88\":321,\"8660865f-ab9f-45be-aa25-7525a1d2399c\":325,\"a6fba876-0a74-448c-8fae-d25b2fa20530\":336,\"9921f757-1d16-4fa3-a4cc-8795eb512c73\":315,\"7d43a890-1620-4a3c-a3b5-7fdbfb1826a7\":336,\"fad63aff-0bd0-4b58-86c8-6457ae89cc26\":329},\"p2Hps\":{\"c7c8829e-7cc0-47b1-992c-db05fe023fce\":507,\"0c631362-f8be-40fa-9225-b7f3c089f111\":631,\"889821e3-8287-4eca-be0a-f7cdb575f42f\":634,\"b764a58a-6242-4d76-8759-1cb356370724\":620,\"bc2933d0-6737-4e85-8792-88abe261b0e4\":643,\"8c8e8637-d9bd-4096-9818-040eebf41f76\":643},\"p1Statuses\":{\"3ccb2545-0349-47aa-9274-26bf0320ec88\":\"\",\"8660865f-ab9f-45be-aa25-7525a1d2399c\":\"\",\"a6fba876-0a74-448c-8fae-d25b2fa20530\":\"\",\"9921f757-1d16-4fa3-a4cc-8795eb512c73\":\"\",\"7d43a890-1620-4a3c-a3b5-7fdbfb1826a7\":\"\",\"fad63aff-0bd0-4b58-86c8-6457ae89cc26\":\"\"},\"p2Statuses\":{\"c7c8829e-7cc0-47b1-992c-db05fe023fce\":\"\",\"0c631362-f8be-40fa-9225-b7f3c089f111\":\"\",\"889821e3-8287-4eca-be0a-f7cdb575f42f\":\"\",\"b764a58a-6242-4d76-8759-1cb356370724\":\"\",\"bc2933d0-6737-4e85-8792-88abe261b0e4\":\"\",\"8c8e8637-d9bd-4096-9818-040eebf41f76\":\"\"},\"p1Skip\":false,\"p2Skip\":false} Stack: InvalidChoiceError: INVALID_CHOICE: Elección \"move prismaticlaser\" (resuelta a \"move prismaticlaser\") rechazada por el simulador para p1. ActiveMon: P-Poke1, Simulator Moves: [\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recharge\",\"id\":\"recharge\"}],\"trapped\":true}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"321/339\",\"active\":true,\"stats\":{\"atk\":231,\"def\":220,\"spa\":253,\"spd\":197,\"spe\":230},\"moves\":[\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"325/325\",\"active\":false,\"stats\":{\"atk\":243,\"def\":195,\"spa\":230,\"spd\":229,\"spe\":221},\"moves\":[\"psychic\",\"psychicfangs\",\"psychicnoise\",\"psychicterrain\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":233,\"def\":253,\"spa\":189,\"spd\":216,\"spe\":212},\"moves\":[\"psychoboost\",\"psychocut\",\"psychup\",\"psyshieldbash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"315/315\",\"active\":false,\"stats\":{\"atk\":211,\"def\":233,\"spa\":227,\"spd\":226,\"spe\":223},\"moves\":[\"psyshock\",\"psystrike\",\"pyroball\",\"quash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":214,\"def\":207,\"spa\":227,\"spd\":225,\"spe\":229},\"moves\":[\"quickattack\",\"quickguard\",\"quiverdance\",\"ragefist\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":225,\"def\":222,\"spa\":206,\"spd\":206,\"spe\":219},\"moves\":[\"ragepowder\",\"ragingbull\",\"ragingfury\",\"raindance\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} Stack: Error: INVALID_CHOICE: Elección \"move prismaticlaser\" (resuelta a \"move prismaticlaser\") rechazada por el simulador para p1. ActiveMon: P-Poke1, Simulator Moves: [\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"], Request: {\"active\":[{\"moves\":[{\"move\":\"Recharge\",\"id\":\"recharge\"}],\"trapped\":true}],\"side\":{\"name\":\"Player\",\"id\":\"p1\",\"pokemon\":[{\"ident\":\"p1: P-Poke1\",\"details\":\"Mew\",\"condition\":\"321/339\",\"active\":true,\"stats\":{\"atk\":231,\"def\":220,\"spa\":253,\"spd\":197,\"spe\":230},\"moves\":[\"prismaticlaser\",\"protect\",\"psybeam\",\"psyblade\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke2\",\"details\":\"Mew\",\"condition\":\"325/325\",\"active\":false,\"stats\":{\"atk\":243,\"def\":195,\"spa\":230,\"spd\":229,\"spe\":221},\"moves\":[\"psychic\",\"psychicfangs\",\"psychicnoise\",\"psychicterrain\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke3\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":233,\"def\":253,\"spa\":189,\"spd\":216,\"spe\":212},\"moves\":[\"psychoboost\",\"psychocut\",\"psychup\",\"psyshieldbash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke4\",\"details\":\"Mew\",\"condition\":\"315/315\",\"active\":false,\"stats\":{\"atk\":211,\"def\":233,\"spa\":227,\"spd\":226,\"spe\":223},\"moves\":[\"psyshock\",\"psystrike\",\"pyroball\",\"quash\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke5\",\"details\":\"Mew\",\"condition\":\"336/336\",\"active\":false,\"stats\":{\"atk\":214,\"def\":207,\"spa\":227,\"spd\":225,\"spe\":229},\"moves\":[\"quickattack\",\"quickguard\",\"quiverdance\",\"ragefist\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"},{\"ident\":\"p1: P-Poke6\",\"details\":\"Mew\",\"condition\":\"329/329\",\"active\":false,\"stats\":{\"atk\":225,\"def\":222,\"spa\":206,\"spd\":206,\"spe\":219},\"moves\":[\"ragepowder\",\"ragingbull\",\"ragingfury\",\"raindance\"],\"baseAbility\":\"synchronize\",\"item\":\"\",\"pokeball\":\"pokeball\",\"ability\":\"synchronize\",\"commanding\":false,\"reviving\":false,\"teraType\":\"Psychic\",\"terastallized\":\"\"}]}} at chooseOrThrow (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:98:13) at self.onmessage (http://localhost:5173/src/logic/battle/showdown.worker.ts?worker_file&type=module:103:6) Payload: {\"p1Choice\":\"move prismaticlaser\",\"p2Choice\":\"move bodyslam\",\"p1Hps\":{\"3ccb2545-0349-47aa-9274-26bf0320ec88\":321,\"8660865f-ab9f-45be-aa25-7525a1d2399c\":325,\"a6fba876-0a74-448c-8fae-d25b2fa20530\":336,\"9921f757-1d16-4fa3-a4cc-8795eb512c73\":315,\"7d43a890-1620-4a3c-a3b5-7fdbfb1826a7\":336,\"fad63aff-0bd0-4b58-86c8-6457ae89cc26\":329},\"p2Hps\":{\"c7c8829e-7cc0-47b1-992c-db05fe023fce\":507,\"0c631362-f8be-40fa-9225-b7f3c089f111\":631,\"889821e3-8287-4eca-be0a-f7cdb575f42f\":634,\"b764a58a-6242-4d76-8759-1cb356370724\":620,\"bc2933d0-6737-4e85-8792-88abe261b0e4\":643,\"8c8e8637-d9bd-4096-9818-040eebf41f76\":643},\"p1Statuses\":{\"3ccb2545-0349-47aa-9274-26bf0320ec88\":\"\",\"8660865f-ab9f-45be-aa25-7525a1d2399c\":\"\",\"a6fba876-0a74-448c-8fae-d25b2fa20530\":\"\",\"9921f757-1d16-4fa3-a4cc-8795eb512c73\":\"\",\"7d43a890-1620-4a3c-a3b5-7fdbfb1826a7\":\"\",\"fad63aff-0bd0-4b58-86c8-6457ae89cc26\":\"\"},\"p2Statuses\":{\"c7c8829e-7cc0-47b1-992c-db05fe023fce\":\"\",\"0c631362-f8be-40fa-9225-b7f3c089f111\":\"\",\"889821e3-8287-4eca-be0a-f7cdb575f42f\":\"\",\"b764a58a-6242-4d76-8759-1cb356370724\":\"\",\"bc2933d0-6737-4e85-8792-88abe261b0e4\":\"\",\"8c8e8637-d9bd-4096-9818-040eebf41f76\":\"\"},\"p1Skip\":false,\"p2Skip\":false} at Worker.handler (http://localhost:5173/src/logic/battle/orchestrator.ts?t=1782796901994:99:17)"
      - generic [ref=e148]:
        - generic [ref=e149]: "ESTADO DEL JUEGO:"
        - generic [ref=e150]:
          - strong [ref=e151]: "Entrenador:"
          - text: TEST_USER_1782811680 (Nv. 1)
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
                - img [ref=e182]
                - img [ref=e190]
        - generic:
          - generic [ref=e193]:
            - generic [ref=e194]:
              - generic [ref=e195]: Blissey
              - generic [ref=e196]: ♀
            - generic [ref=e197]:
              - generic [ref=e198]: Nv. 100
              - generic [ref=e200]: NORMAL
            - generic [ref=e211]: "HP: 507/651"
            - generic [ref=e212]:
              - generic [ref=e214]: 🧠
              - generic [ref=e216]: 🎒
          - generic [ref=e219]:
            - generic [ref=e221]: Mew
            - generic [ref=e222]:
              - generic [ref=e223]: Nv. 100
              - generic [ref=e225]: PSÍQUICO
            - generic [ref=e237]: "HP: 321/339"
            - generic [ref=e240]: 🧠
        - generic [ref=e241]:
          - button "+" [disabled] [ref=e242]
          - button "-" [ref=e243] [cursor=pointer]
      - generic [ref=e246]:
        - generic [ref=e247]:
          - img [ref=e249]
          - generic [ref=e250]: ¡Simulador E2E te desafía!
        - generic [ref=e251]:
          - img [ref=e253]
          - generic [ref=e254]: ¡Mew usó Láser Prisma!
        - generic [ref=e255]:
          - img [ref=e257]
          - generic [ref=e258]: ¡Blissey recibió daño!
        - generic [ref=e259]:
          - img [ref=e261]
          - generic [ref=e262]: ¡Mew debe recargar!
        - generic [ref=e263]:
          - img [ref=e265]
          - generic [ref=e266]: ¡Blissey usó Golpe Cuerpo!
        - generic [ref=e267]:
          - img [ref=e269]
          - generic [ref=e270]: ¡Mew recibió daño!
        - generic [ref=e273]: ¡Ocurrió un error al ejecutar el movimiento!
      - generic [ref=e275]:
        - complementary [ref=e276]:
          - generic [ref=e278]:
            - generic [ref=e279] [cursor=pointer]:
              - generic [ref=e281]: B
              - img "pokemon" [ref=e285]
              - generic [ref=e286]:
                - generic [ref=e288]: P-Poke1
                - generic [ref=e290]: PSÍQUICO
                - generic [ref=e293]: Nv. 100
            - generic [ref=e296] [cursor=pointer]:
              - generic [ref=e298]: C
              - img "pokemon" [ref=e302]
              - generic [ref=e303]:
                - generic [ref=e305]: P-Poke2
                - generic [ref=e307]: PSÍQUICO
                - generic [ref=e310]: Nv. 100
            - generic [ref=e313] [cursor=pointer]:
              - generic [ref=e315]: C
              - img "pokemon" [ref=e319]
              - generic [ref=e320]:
                - generic [ref=e322]: P-Poke3
                - generic [ref=e324]: PSÍQUICO
                - generic [ref=e327]: Nv. 100
            - generic [ref=e330] [cursor=pointer]:
              - generic [ref=e332]: C
              - img "pokemon" [ref=e336]
              - generic [ref=e337]:
                - generic [ref=e339]: P-Poke4
                - generic [ref=e341]: PSÍQUICO
                - generic [ref=e344]: Nv. 100
            - generic [ref=e347] [cursor=pointer]:
              - generic [ref=e349]: C
              - img "pokemon" [ref=e353]
              - generic [ref=e354]:
                - generic [ref=e356]: P-Poke5
                - generic [ref=e358]: PSÍQUICO
                - generic [ref=e361]: Nv. 100
            - generic [ref=e364] [cursor=pointer]:
              - generic [ref=e366]: D
              - img "pokemon" [ref=e370]
              - generic [ref=e371]:
                - generic [ref=e373]: P-Poke6
                - generic [ref=e375]: PSÍQUICO
                - generic [ref=e378]: Nv. 100
        - generic [ref=e381]:
          - generic [ref=e383]:
            - generic [ref=e384]:
              - generic [ref=e386]: "?"
              - 'button "LáSER PRISMA PSÍQUICO POT: 240 ▲ PREC: 100 CAT: ✨ Especial PP 8/10" [ref=e387] [cursor=pointer]':
                - generic [ref=e388]:
                  - generic [ref=e389]: LáSER PRISMA
                  - generic [ref=e390]: PSÍQUICO
                - generic [ref=e391]:
                  - generic [ref=e392]:
                    - generic [ref=e393]: "POT:"
                    - generic [ref=e394]:
                      - text: "240"
                      - generic [ref=e395]: ▲
                  - generic [ref=e396]:
                    - generic [ref=e397]: "PREC:"
                    - generic [ref=e398]: "100"
                  - generic [ref=e399]:
                    - generic [ref=e400]: "CAT:"
                    - generic [ref=e402]: ✨ Especial
                  - generic [ref=e403]:
                    - generic [ref=e404]: PP
                    - generic [ref=e405]: 8/10
            - generic [ref=e406]:
              - generic [ref=e408]: "?"
              - 'button "PROTECCIóN NORMAL POT: - PREC: ♾️ CAT: 🔮 Estado PP 10/10" [ref=e409] [cursor=pointer]':
                - generic [ref=e410]:
                  - generic [ref=e411]: PROTECCIóN
                  - generic [ref=e412]: NORMAL
                - generic [ref=e413]:
                  - generic [ref=e414]:
                    - generic [ref=e415]: "POT:"
                    - generic [ref=e416]: "-"
                  - generic [ref=e417]:
                    - generic [ref=e418]: "PREC:"
                    - generic [ref=e420]: ♾️
                  - generic [ref=e421]:
                    - generic [ref=e422]: "CAT:"
                    - generic [ref=e424]: 🔮 Estado
                  - generic [ref=e425]:
                    - generic [ref=e426]: PP
                    - generic [ref=e427]: 10/10
            - generic [ref=e428]:
              - generic [ref=e430]: "?"
              - 'button "PSICORRAYO PSÍQUICO POT: 98 ▲ PREC: 100 CAT: ✨ Especial PP 20/20" [ref=e431] [cursor=pointer]':
                - generic [ref=e432]:
                  - generic [ref=e433]: PSICORRAYO
                  - generic [ref=e434]: PSÍQUICO
                - generic [ref=e435]:
                  - generic [ref=e436]:
                    - generic [ref=e437]: "POT:"
                    - generic [ref=e438]:
                      - text: "98"
                      - generic [ref=e439]: ▲
                  - generic [ref=e440]:
                    - generic [ref=e441]: "PREC:"
                    - generic [ref=e442]: "100"
                  - generic [ref=e443]:
                    - generic [ref=e444]: "CAT:"
                    - generic [ref=e446]: ✨ Especial
                  - generic [ref=e447]:
                    - generic [ref=e448]: PP
                    - generic [ref=e449]: 20/20
            - generic [ref=e450]:
              - generic [ref=e452]: "?"
              - 'button "PSICOHOJAS PSÍQUICO POT: 120 ▲ PREC: 100 CAT: ⚔️ Físico PP 15/15" [ref=e453] [cursor=pointer]':
                - generic [ref=e454]:
                  - generic [ref=e455]: PSICOHOJAS
                  - generic [ref=e456]: PSÍQUICO
                - generic [ref=e457]:
                  - generic [ref=e458]:
                    - generic [ref=e459]: "POT:"
                    - generic [ref=e460]:
                      - text: "120"
                      - generic [ref=e461]: ▲
                  - generic [ref=e462]:
                    - generic [ref=e463]: "PREC:"
                    - generic [ref=e464]: "100"
                  - generic [ref=e465]:
                    - generic [ref=e466]: "CAT:"
                    - generic [ref=e468]: ⚔️ Físico
                  - generic [ref=e469]:
                    - generic [ref=e470]: PP
                    - generic [ref=e471]: 15/15
          - generic [ref=e473]:
            - button "🔄 CAMBIAR" [ref=e474] [cursor=pointer]:
              - generic [ref=e475]: 🔄
              - generic [ref=e476]: CAMBIAR
            - button [disabled] [ref=e478]
            - button "🎒 MOCHILA" [ref=e479] [cursor=pointer]:
              - generic [ref=e480]: 🎒
              - generic [ref=e481]: MOCHILA
        - complementary [ref=e482]:
          - generic [ref=e484]:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - img "Poción"
                  - generic: x3
  - generic [ref=e485]:
    - button "🕹️ DEBUG" [ref=e487] [cursor=pointer]:
      - generic [ref=e488]: 🕹️
      - generic [ref=e489]: DEBUG
    - button "✨ EFECTOS" [ref=e491] [cursor=pointer]:
      - generic [ref=e492]: ✨
      - generic [ref=e493]: EFECTOS
    - button "⌛ TIEMPO" [ref=e495] [cursor=pointer]:
      - generic [ref=e496]: ⌛
      - generic [ref=e497]: TIEMPO
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
      |           ^ Error: Bloqueo detectado: La FSM de combate se quedó trabada en el turno 2. Captura guardada en scratch/.
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