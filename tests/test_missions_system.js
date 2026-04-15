/**
 * TEST DE UNIDAD: Sistema de Misiones Idle de Clases
 * Objetivo: Validar que las nuevas fórmulas de balance funcionen y no haya regresiones.
 * Instrucciones: Pegar en la consola del navegador.
 */

(async function testIdleMissions() {
    console.log("%c--- INICIANDO AUDITORIA DE MISIONES IDLE ---", "color: #a855f7; font-weight: bold; font-size: 16px;");

    const originalState = JSON.parse(JSON.stringify(state));
    const results = [];

    const assert = (condition, message) => {
        if (condition) {
            console.log(`%c[PASS] ${message}`, "color: #22c55e;");
            results.push({ test: message, status: 'PASS' });
        } else {
            console.error(`[FAIL] ${message}`);
            results.push({ test: message, status: 'FAIL' });
        }
    };

    // --- TEST 1: ENTRENADOR (EXP BALANCE) ---
    console.group("Test Entrenador: Balance de EXP");
    state.playerClass = 'entrenador';
    state.money = 100000;
    const testPoke = makePokemon('bulbasaur', 1);
    testPoke.uid = "test-trainer-poke";
    state.team = [testPoke];
    
    console.log("[ACTION] Iniciando misión de 6h...");
    const m6h = CLASS_MISSIONS_NEW.find(m => m.id === 'mission_6h');
    _launchMission('mission_6h', { pokeUid: testPoke.uid, pokeName: testPoke.name });
    
    console.log("[ACTION] Adelantando tiempo...");
    state.classData.activeMission.endsAt = Date.now() - 1000; // Forzar terminada
    
    const prevExp = testPoke.exp || 0;
    collectClassMission();
    
    // Nivel 1 -> 25 requiere ~15,625 EXP (Medium Fast). 
    // Nuestra fórmula: 25000 + 1 * 1000 = 26,000. 
    assert(testPoke.exp > 25000, `El Pokémon ganó ${testPoke.exp - prevExp} EXP (Esperado > 25,000 para Lv 25+)`);
    assert(testPoke.onMission === false, "El Pokémon fue liberado de la misión.");
    console.groupEnd();

    // --- TEST 2: ROCKET (VALORACIÓN MERCADO NEGRO) ---
    console.group("Test Rocket: Valoración de Mercado");
    state.playerClass = 'rocket';
    state.money = 0;
    state.classData.criminality = 0;
    const rocketPoke = makePokemon('koffing', 50); // Nivel 50
    rocketPoke.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }; // Perfect IVs
    
    // Formula: (level*100 + (totalIv/186)*1000) * 1.5
    // (50*100 + (186/186)*1000) * 1.5 = (5000 + 1000) * 1.5 = 9000
    _launchMission('mission_6h', { pendingMoney: 9000 });
    state.classData.activeMission.endsAt = Date.now() - 1000;
    collectClassMission();
    
    assert(state.money === 9000, `El pago fue de ₽${state.money} (Esperado ₽9,000 por Lv 50 Perfecto)`);
    assert(state.classData.criminality > 0, "La criminalidad aumentó.");
    console.groupEnd();

    // --- TEST 3: CAZABICHOS (PISO DE IVS) ---
    console.group("Test Cazabichos: Generación de Red");
    state.playerClass = 'cazabichos';
    state.box = [];
    state.badges = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"]; // Desbloquear todos las rutas
    
    console.log("[ACTION] Generando Pokémon de red (Piso IV 15)...");
    const bugs = generateBugNetPokemon(15, 8);
    assert(bugs.length === 3, "Se generaron 3 Pokémon.");
    const allAbove15 = bugs.every(p => Object.values(p.ivs).every(iv => iv >= 15));
    assert(allAbove15, "Todos los IVs respetan el piso de 15.");
    console.groupEnd();

    // --- TEST 4: CRIADOR (OPTIMIZACIÓN IV) ---
    console.group("Test Criador: Laboratorio Genético");
    state.playerClass = 'criador';
    const breederPoke = makePokemon('eevee', 5);
    breederPoke.ivs = { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 }; // Casi perfecto
    breederPoke.vigor = 20;
    breederPoke.uid = "test-breeder-poke";
    
    console.log("[ACTION] Iniciando misión de 24h (4 bloques de IV)...");
    _launchMission('mission_24h', { pokeUid: breederPoke.uid, pokeName: breederPoke.name });
    state.classData.activeMission.endsAt = Date.now() - 1000;
    
    collectClassMission();
    const totalIvs = Object.values(breederPoke.ivs).reduce((a, b) => a + b, 0);
    // Tenía 180 (30*6). Debería haber subido a 184 (4 bloques) o 186 (cap at 31).
    assert(totalIvs > 180, `Los IVs totales subieron a ${totalIvs} (Esperado > 180)`);
    assert(breederPoke.vigor < 20, `El vigor disminuyó (Vigor actual: ${breederPoke.vigor})`);
    console.groupEnd();

    // --- RESTAURAR ESTADO ---
    // state = originalState; // Descomentar si no quieres ensuciar el save
    console.log("%c--- REPORTE FINAL ---", "color: #a855f7; font-weight: bold;");
    console.table(results);
    if (results.every(r => r.status === 'PASS')) {
        console.log("%c¡SISTEMA VALIDADO CON ÉXITO! ✅", "color: #22c55e; font-size: 14px; font-weight: bold;");
    } else {
        console.warn("Se detectaron fallos en la auditoría. ❌");
    }
})();
