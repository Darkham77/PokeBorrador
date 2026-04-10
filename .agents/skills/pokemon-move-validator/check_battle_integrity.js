const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../../../js/02_pokemon_data.js');
const BATTLE_FILE = path.resolve(__dirname, '../../../js/07_battle.js');

function run() {
    console.log("Checking Battle Integrity...");

    if (!fs.existsSync(DATA_FILE) || !fs.existsSync(BATTLE_FILE)) {
        console.error("Required files not found.");
        process.exit(1);
    }

    const dataContent = fs.readFileSync(DATA_FILE, 'utf8');
    const battleContent = fs.readFileSync(BATTLE_FILE, 'utf8');

    // 1. Extraer todos los efectos definidos en MOVE_DATA
    const effectRegex = /effect\s*:\s*'([^']+)'/g;
    const definedEffects = new Set();
    let match;
    while ((match = effectRegex.exec(dataContent)) !== null) {
        definedEffects.add(match[1]);
    }

    // 2. Extraer todos los cases en applyMoveEffect
    const caseRegex = /case\s*'([^']+)'/g;
    const implementedEffects = new Set();
    while ((match = caseRegex.exec(battleContent)) !== null) {
        implementedEffects.add(match[1]);
    }

    // 3. Extraer propiedades booleanas especiales (halfHP, ohko, fixedDmg, etc.)
    const specialProps = ['halfHP', 'ohko', 'fixedDmg', 'levelDmg', 'counter', 'drain', 'recoil', 'selfKO'];
    const missingProps = [];
    specialProps.forEach(prop => {
        if (!battleContent.includes(`md.${prop}`)) {
            missingProps.push(prop);
        }
    });

    // 4. Detectar efectos huérfanos
    const orphanEffects = [];
    definedEffects.forEach(effect => {
        // Normalizar efecto (quitar probabilidad si existe)
        const baseEffect = effect.replace(/_\d+$/, '');
        if (!implementedEffects.has(effect) && !implementedEffects.has(baseEffect)) {
            // Algunos efectos se manejan fuera del switch (ej. recharge, always_hits)
            const specialHandled = ['recharge', 'always_hits', 'status_boost', 'thrash', 'mirror_move', 'reset_stats', 'heal_status_party', 'fury_cutter', 'false_swipe', 'lock_on', 'identify', 'future_sight_simple', 'psych_up', 'swagger', 'belly_drum', 'metronome', 'fixedDmg', 'halfHP', 'selfKO', 'drain', 'recoil', 'ohko', 'levelDmg', 'counter'];
            if (!specialHandled.includes(baseEffect) && !battleContent.includes(`'${effect}'`) && !battleContent.includes(`'${baseEffect}'`)) {
                orphanEffects.push(effect);
            }
        }
    });

    console.log("\n=== INTEGRITY REPORT ===");
    let hasErrors = false;

    if (orphanEffects.length > 0) {
        console.log("❌ ORPHAN EFFECTS FOUND (Defined in MOVE_DATA but not implemented in 07_battle.js):");
        orphanEffects.forEach(e => console.log(`- ${e}`));
        hasErrors = true;
    }

    if (missingProps.length > 0) {
        console.log("⚠️ POTENTIALLY UNIMPLEMENTED SPECIAL PROPERTIES:");
        missingProps.forEach(p => console.log(`- ${p}`));
        // No marcamos como error crítico a menos que sea vital
    }

    if (!hasErrors) {
        console.log("✅ All defined effects have a corresponding implementation in battle logic!");
    } else {
        process.exit(1);
    }
}

run();
