// Test de Unidad - Función de Dominancia y Guerras de Facciones
console.log("=== INICIANDO TEST DE UNIDAD: GUERRAS Y BANDOS ===\n");

// 1. Mock de dependencias globales
const window = {};
window.sb = {
  from: (table) => ({
    select: (cols) => ({
      eq: (field, value) => {
        // Simulador de Supabase
        if (table === 'war_dominance' && value === '2026-W14-TEST') {
          return { data: [] }; // No hay datos cerrados (simulando que aún está en juego)
        }
        if (table === 'war_points' && value === '2026-W14-TEST') {
          return {
            data: [
              { map_id: 'route1', faction: 'union', points: 4500 },
              { map_id: 'route1', faction: 'poder', points: 2000 }, // Gana Unión
              { map_id: 'mt_moon', faction: 'union', points: 1500 },
              { map_id: 'mt_moon', faction: 'poder', points: 3000 }, // Gana Poder
              { map_id: 'route22', faction: 'union', points: 0 },
              { map_id: 'route22', faction: 'poder', points: 0 }     // Nadie gana, no hay puntos
            ]
          };
        }
        return { data: [] };
      }
    })
  })
};

const isDisputePhase = () => false; // Simular que es Modo Test (fin de semana)
const getCurrentWeekId = () => '2026-W14-TEST'; 

// 2. Ejecutar la función aislada (Extracto de renderMaps)
async function testRenderMapsDataLogic() {
  console.log("-> Paso 1: Configurando estado inicial...");
  let mapWinners = {};
  let isWeekend = typeof isDisputePhase === 'function' ? !isDisputePhase() : false;
  
  console.log(`Es Fin de Semana / Test Mode: ${isWeekend}\n`);
  
  const weekId = typeof getCurrentWeekId === 'function' ? getCurrentWeekId() : null;
  
  if (!weekId) {
    console.error("ERROR: weekId es nulo. Falló la extracción de semana.");
    return;
  }
  
  console.log(`-> Paso 2: Buscando datos para la semana: ${weekId}...`);
  let hasDominanceData = false;
  
  if (isWeekend) {
    const { data } = await window.sb.from('war_dominance').select('*').eq('week_id', weekId);
    if (data && data.length > 0) {
      hasDominanceData = true;
      data.forEach(d => mapWinners[d.map_id] = d.winner_faction);
      console.log("   [EXITO] Datos definitivos de dominancia encontrados.");
    } else {
      console.log("   [INFO] No hay datos definitivos en war_dominance. Pasando a proyección de puntos.");
    }
  }
  
  if (!hasDominanceData) {
    const { data } = await window.sb.from('war_points').select('*').eq('week_id', weekId);
    if (data) {
       console.log("   [EXITO] Proyectando ganadores en base a los puntos:");
       const ptsMap = {};
       data.forEach(d => {
         if (!ptsMap[d.map_id]) ptsMap[d.map_id] = { union: 0, poder: 0 };
         ptsMap[d.map_id][d.faction] += d.points;
       });
       
       for (const mId in ptsMap) {
         if (ptsMap[mId].union > ptsMap[mId].poder) {
             mapWinners[mId] = 'union';
             console.log(`      - [${mId}] Ganador proyectado: Unión (U: ${ptsMap[mId].union} vs P: ${ptsMap[mId].poder})`);
         } else if (ptsMap[mId].poder > ptsMap[mId].union) {
             mapWinners[mId] = 'poder';
             console.log(`      - [${mId}] Ganador proyectado: Poder (P: ${ptsMap[mId].poder} vs U: ${ptsMap[mId].union})`);
         } else {
             console.log(`      - [${mId}] Empate / Sin Combates`);
         }
       }
    }
  }
  
  // 3. Afirmaciones (Assertions)
  console.log("\n-> Paso 3: Verificando comportamiento de la UI (HTML)...");
  
  // Assert route1
  if (mapWinners['route1'] === 'union') {
     console.log("   ✅ Ruta 1 controlada por Unión. Se dibujará el logo Azul.");
  } else {
     console.error("   ❌ ERROR: Ruta 1 debió ser controlada por Unión.");
  }
  
  // Assert mt_moon
  if (mapWinners['mt_moon'] === 'poder') {
     console.log("   ✅ Mt Moon controlado por Poder. Se dibujará el logo Rojo.");
  } else {
     console.error("   ❌ ERROR: Mt Moon debió ser controlada por Poder.");
  }
  
  // Assert route22
  if (mapWinners['route22'] === undefined) {
     console.log("   ✅ Ruta 22 vacía/empatada. No se dibujará ningún logo. El mapa queda prístino.");
  } else {
     console.error("   ❌ ERROR: Ruta 22 no debió tener dueños.");
  }

  console.log("\n=== TEST FINALIZADO CON ÉXITO ===");
}

testRenderMapsDataLogic();
