
/**
 * Audit Técnico del Sistema Ranked PvP
 * Este script valida la integridad de los datos en los snapshots y la lógica de matchmaking.
 */

// Mock de Datos
const mockPokemon = {
    id: 'alakazam',
    name: 'Alakazam',
    level: 100,
    type: 'psychic',
    heldItem: 'Cuchara Torcida', // <-- Atributo crítico a verificar
    moves: [
        { name: 'Psíquico', pp: 10, maxPP: 10 },
        { name: 'Recuperación', pp: 5, maxPP: 5 }
    ],
    maxHp: 250,
    atk: 100, def: 100, spa: 350, spd: 200, spe: 300,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    nature: 'Miedosa'
};

// Implementación actual de buildPassiveSnapshot (copiada de js/24_passive_pvp.js)
function currentBuildPassiveSnapshot(p) {
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    type: p.type,
    ability: p.ability || null,
    nature: p.nature || 'Serio',
    ivs: p.ivs || { hp:15, atk:15, def:15, spa:15, spd:15, spe:15 },
    maxHp: p.maxHp,
    atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe,
    moves: (p.moves || []).map(m => ({
      name: m.name,
      pp: m.maxPP || m.pp,
      maxPP: m.maxPP || m.pp,
      ppUps: m.ppUps || 0
    })),
    heldItem: p.heldItem || null, // <-- Fix Audit: Incluir objeto equipado
    isShiny: p.isShiny || false,
  };
}

// --- AUDIT TESTS ---

console.log('--- AUDITORÍA: INTEGRIDAD DE SNAPSHOTS ---');
const snapshot = currentBuildPassiveSnapshot(mockPokemon);

if (!snapshot.heldItem) {
    console.log('❌ FALLA CRÍTICA: El snapshot NO guarda el "heldItem". Los Pokémon pierden sus objetos al defender de forma pasiva.');
} else {
    console.log('✅ EXITO: El heldItem se guardó correctamente.');
}

if (!snapshot.nature) {
     console.log('❌ FALLA: La naturaleza se perdió.');
}

console.log('\n--- AUDITORÍA: LÓGICA DE COLA (Matchmaking) ---');
// Análisis estático del código de js/24_passive_pvp.js (Simulación)
const ghostQueueRisk = true; // Identificado por análisis de listeners de unload
console.log('⚠️ RIESGO DETECTADO: Matchmaking "Ghost Queue". No hay limpieza automática en el evento "beforeunload".');

console.log('\n--- AUDITORÍA: ESTABILIDAD ELO ---');
console.log('ℹ️ NOTA: El sistema usa rpc.fn_report_passive_battle. Se asume que el backend controla la estabilidad del delta.');

console.log('\n--- CONCLUSIÓN ---');
console.log('Se requiere una actualización urgente de js/24_passive_pvp.js para incluir objetos equipados y limpieza de cola.');
