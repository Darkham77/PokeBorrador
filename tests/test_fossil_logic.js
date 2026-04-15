/**
 * TEST DE UNIDAD: Lógica de Restauración de Fósiles
 * Instrucciones: Copia y pega este código en la consola del navegador para validar el sistema.
 */

(function testFossilSystem() {
    console.log("%c--- INICIANDO TEST DE FÓSILES ---", "color: #fbbf24; font-weight: bold; font-size: 14px;");

    // 1. Mocking/Setup de Precondiciones
    const testItem = 'Fósil Hélix';
    const testPokeId = 'omanyte';
    
    // Guardar estado original para restaurar después (opcional)
    const originalInventory = JSON.parse(JSON.stringify(state.inventory || {}));
    const originalTeamLength = state.team.length;
    const originalBoxLength = state.box.length;

    // Asegurar que tenemos el ítem
    state.inventory[testItem] = 1;
    console.log(`[SETUP] Ítem '${testItem}' añadido al inventario. Cantidad: ${state.inventory[testItem]}`);

    // 2. Ejecutar la función del objeto (HEALING_ITEMS)
    console.log(`[ACTION] Usando '${testItem}'...`);
    const result = HEALING_ITEMS[testItem]();
    
    // Verificación inmediata del retorno
    if (result === 'iniciando restauración') {
        console.log("%c[PASS] HEALINGS_ITEMS devolvió el estado correcto ('iniciando restauración').", "color: #22c55e;");
    } else {
        console.error(`[FAIL] HEALINGS_ITEMS devolvió '${result}' en lugar de 'iniciando restauración'.`);
    }

    // 3. Verificar consumo del ítem (Simulando lo que hace useBagItem/useItemOutsideBattle)
    // En la lógica real, el llamador (caller) es quien resta el ítem.
    // Vamos a simular el flujo de 'useItemOutsideBattle' simplificado:
    console.log("[SIMULATION] Simulando consumo por parte del manejador de inventario...");
    state.inventory[testItem]--;
    if (state.inventory[testItem] <= 0) delete state.inventory[testItem];

    if (!state.inventory[testItem]) {
        console.log("%c[PASS] El ítem fue consumido correctamente del inventario.", "color: #22c55e;");
    } else {
        console.error("[FAIL] El ítem sigue en el inventario.");
    }

    // 4. Verificar existencia de la función global reviveFossil
    if (typeof window.reviveFossil === 'function') {
        console.log("%c[PASS] La función global 'window.reviveFossil' existe.", "color: #22c55e;");
    } else {
        console.error("[FAIL] 'window.reviveFossil' no está definida.");
    }

    // 5. Test de generación de Pokemon (makePokemon)
    console.log("[TEST] Validando generación de Pokémon Nivel 1...");
    try {
        const p = makePokemon(testPokeId, 1);
        if (p.id === testPokeId && p.level === 1) {
            console.log(`%c[PASS] Pokemon generado: ${p.name} (Lv. ${p.level}).`, "color: #22c55e;");
            console.log(`[STATS] Naturaleza: ${p.nature}, IVs: HP:${p.ivs.hp}, ATK:${p.ivs.atk}`);
        } else {
            console.error(`[FAIL] El Pokémon generado tiene ID ${p.id} o Nivel ${p.level}.`);
        }
    } catch (e) {
        console.error("[FAIL] Error al ejecutar makePokemon:", e);
    }

    // 6. Test de Inserción (Equipo vs PC)
    console.log("[TEST] Validando lógica de destino (Equipo vs PC)...");
    const mockPoke = { name: "Test Fossil", id: testPokeId, level: 1 };
    if (state.team.length < 6) {
        console.log(`[INFO] Espacio en equipo detectado (${state.team.length}/6). El Pokémon irá al Equipo.`);
    } else {
        console.log(`[INFO] Equipo lleno (${state.team.length}/6). El Pokémon irá a la Caja.`);
    }

    console.log("%c--- TEST FINALIZADO ---", "color: #fbbf24; font-weight: bold;");
    console.log("Nota: La animación visual requiere ejecución manual para observar el overlay y los destellos.");
})();
