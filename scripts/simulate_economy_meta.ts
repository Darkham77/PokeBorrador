/**
 * scripts/simulate_economy_meta.ts
 * Simulador de Economía Monte Carlo: Evaluación de Paridad y Meta del "Chino Farmer" (24hs continuas).
 * 
 * Simula el comportamiento óptimo de cada clase durante 24 horas continuas (1,440 minutos de juego activo)
 * para medir el Ingreso Neto proyectado, balancear los multiplicadores y verificar la convergencia económica.
 * 
 * Ejecución: npx tsx scripts/simulate_economy_meta.ts
 */

import { RAW_MATERIALS, CRAFTING_RECIPES } from '../src/data/economy/craftingCatalog.ts';

// Configuración de la Simulación
const SIMULATED_DAYS_PER_CLASS = 200; // 200 días de 24 horas por clase (4,800 horas de juego simulado)
const HOURS_PER_DAY = 24;
const ACTIONS_PER_HOUR = 75; // 75 acciones activas por hora (1 acción cada 48 segundos: combate, captura o ruta)

interface SimulationResult {
  className: string;
  totalGrossMoney: number;
  operationalCosts: number;
  marketGoodsValue: number;
  netWealth: number;
  hourlyAverage: number;
  itemsProducedCount: number;
  rarePokemonProducedCount: number;
}

// Modelado de Precios de Mercado y Absorción Diaria Realista
const MARKET_PRICES = {
  pokemon_iv_perfect_grade_s: 180000,  // Pokémon 5 IVs perfectos (31) + Naturaleza competitiva (Criador)
  pokemon_iv_high_grade_a: 15000,      // Pokémon 3-4 IVs altos (total IVs > 155)
  pokemon_iv_mid_breedject: 4000,      // Pokémon con IVs aceptables (total IVs 130-154)
  pokemon_shiny_wild: 180000,          // Shiny silvestre capturado
  tm_earthquake_official: 40000,       // MT26 Terremoto canjeada de Reputación
  star_piece_market: 6500,             // Trozo de Estrella para crafteos
  fossil_helix_market: 9000,           // Fósil para revivir
  turn_ball_crafted: 3500,             // Turno Ball terminada
  super_incubator_crafted: 22000,      // Súper Incubadora lista
  rare_candy_equivalent: 12000         // Caramelo Raro obtenido por Recogida
};

// ==========================================
// 1. SIMULACIÓN: CAZABICHOS (El Amo del Campo)
// ==========================================
function simulateCazabichos(days: number): SimulationResult {
  let totalGross = 0;
  let totalCosts = 0;
  let marketValue = 0;
  let rarePokes = 0;
  let itemsCount = 0;

  for (let d = 0; d < days; d++) {
    let streak = 0;
    let dailyMarketSalesGradeA = 0; // El mercado absorbe máx 6 Pokémon Grade A al día por jugador

    for (let h = 0; h < HOURS_PER_DAY; h++) {
      for (let a = 0; a < ACTIONS_PER_HOUR; a++) {
        // En cada acción en la hierba alta:
        totalGross += 80;

        // Coste de Pokéball básica
        totalCosts += 200;

        // Probabilidad de captura (80% éxito con sinergia de clase)
        if (Math.random() < 0.80) {
          streak = Math.min(25, streak + 1);

          // Kit de campo: cada 10 capturas recupera 1 Pokéball (+200 ₽ ahorro)
          if (streak % 10 === 0) totalCosts -= 200;

          // Red Maestra: 20% de probabilidad de duplicar si es tipo Bicho
          const isDuplicated = Math.random() < 0.20;
          const specimens = isDuplicated ? 2 : 1;

          for (let s = 0; s < specimens; s++) {
            // Racha de capturas: cada racha da +5 IVs garantizados (piso de IVs)
            const ivFloor = Math.min(95, 25 + streak * 3);
            const rolledTotalIVs = ivFloor + Math.floor(Math.random() * (186 - ivFloor));

            // Evaluación de mercado del Pokémon capturado
            if (rolledTotalIVs >= 160) {
              // Especimen excepcional
              if (dailyMarketSalesGradeA < 6) {
                marketValue += MARKET_PRICES.pokemon_iv_high_grade_a;
                dailyMarketSalesGradeA++;
              } else {
                totalGross += 3500; // Venta a NPC coleccionista
              }
              rarePokes++;
            } else if (rolledTotalIVs >= 135) {
              marketValue += MARKET_PRICES.pokemon_iv_mid_breedject;
              rarePokes++;
            } else {
              // Liberación o venta básica
              totalGross += 400;
            }

            // Tirada de Shiny (aumentada con racha máxima)
            const shinyChance = (1 / 3000) * (1 + (streak / 25) * 1.5);
            if (Math.random() < shinyChance) {
              marketValue += MARKET_PRICES.pokemon_shiny_wild;
              rarePokes++;
            }
          }

          // Recolección pasiva de materiales biológicos (Hilos de seda, resina, miel)
          if (Math.random() < 0.35) {
            marketValue += RAW_MATERIALS.silk_spool.basePrice;
            itemsCount++;
          }
          if (Math.random() < 0.07) {
            marketValue += RAW_MATERIALS.wild_honey.basePrice;
            itemsCount++;
          }

          // Pasiva Ojo Compuesto: Hallazgo de objetos equipados en salvajes (Pepitas, Polvo Plateado)
          if (Math.random() < 0.04) {
            marketValue += 3000;
            itemsCount++;
          }
        } else {
          // Si huye o falla, la racha se reduce
          streak = Math.max(0, streak - 5);
        }
      }
    }
  }

  const netWealth = (totalGross + marketValue - totalCosts) / days;
  return {
    className: 'Cazabichos',
    totalGrossMoney: totalGross / days,
    operationalCosts: totalCosts / days,
    marketGoodsValue: marketValue / days,
    netWealth,
    hourlyAverage: Math.round(netWealth / HOURS_PER_DAY),
    itemsProducedCount: Math.round(itemsCount / days),
    rarePokemonProducedCount: Math.round(rarePokes / days)
  };
}

// ==========================================
// 2. SIMULACIÓN: EQUIPO ROCKET (El Extorsionador)
// ==========================================
function simulateRocket(days: number): SimulationResult {
  let totalGross = 0;
  let totalCosts = 0;
  let marketValue = 0;
  let itemsCount = 0;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < HOURS_PER_DAY; h++) {
      for (let a = 0; a < ACTIONS_PER_HOUR; a++) {
        // El Rocket farmea rutas de entrenadores NPC y extorsión
        // Base de dinero por entrenador NPC: ~1,800 P¥
        // Bono de Extorsión de Ruta: x1.5 P¥
        const isTrainer = Math.random() < 0.70;
        if (isTrainer) {
          totalGross += 1800 * 1.5;

          // Robo Rápido (30% de robar un ítem al iniciar batalla vs entrenador)
          if (Math.random() < 0.30) {
            // Roba pepitas, pociones o piedras evolutivas
            const stolenValue = Math.random() < 0.15 ? 5000 : 1200;
            totalGross += stolenValue; // Venta directa inmediata en el mercado negro
            itemsCount++;
          }

          // Penalización de curación: Centro Pokémon cobra sobrecargo del 100% (x2)
          totalCosts += 160;
        } else {
          // Combate salvaje esporádico: lo vende directo en PC sin mirar IVs (P¥ 500 + Nivel x 10)
          totalGross += 500 + (35 * 10);
        }

        // Compra de suministros con sobrecargo del 20% en Pokémarts oficiales
        totalCosts += 210;
      }
    }

    // El Rocket reinvierte parte de su fortuna comprando 2 Pokémon competitivos en el mercado
    // para sus batallas de dominancia (compra lo que producen Criadores y Cazabichos)
    totalCosts += 350000;
  }

  const netWealth = (totalGross + marketValue - totalCosts) / days;
  return {
    className: 'Equipo Rocket',
    totalGrossMoney: totalGross / days,
    operationalCosts: totalCosts / days,
    marketGoodsValue: marketValue / days,
    netWealth,
    hourlyAverage: Math.round(netWealth / HOURS_PER_DAY),
    itemsProducedCount: Math.round(itemsCount / days),
    rarePokemonProducedCount: 0 // El Rocket no produce genética, la compra
  };
}

// ==========================================
// 3. SIMULACIÓN: CRIADOR POKÉMON (El Maestro Genético)
// ==========================================
function simulateCriador(days: number): SimulationResult {
  let totalGross = 0;
  let totalCosts = 0;
  let marketValue = 0;
  let rarePokes = 0;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < HOURS_PER_DAY; h++) {
      // El Criador mantiene la Guardería y Rancho trabajando al máximo
      // 2 parejas criando en simultáneo
      totalCosts += 1500;

      // Eclosiona aproximadamente 3.5 huevos por hora
      const eggsHatchedThisHour = 3.5;

      for (let e = 0; e < eggsHatchedThisHour; e++) {
        const isGradeS = Math.random() < 0.16; // 16% de éxito con padres optimizados
        const isGradeA = Math.random() < 0.38; // 38% de espécimen de 4 IVs

        if (isGradeS) {
          marketValue += MARKET_PRICES.pokemon_iv_perfect_grade_s;
          rarePokes++;
        } else if (isGradeA) {
          marketValue += MARKET_PRICES.pokemon_iv_high_grade_a;
          rarePokes++;
        } else {
          // Cría común vendida a precio estándar
          totalGross += 3500;
        }

        // Coste de uso de incubadora y suministros
        totalCosts += 1100;
      }

      // Ingreso menor por combates en ruta (-10% EXP y menos atención a NPC)
      totalGross += 850;
    }

    // Producción del Rancho: La Huerta de Bayas del Criador
    // Cosecha 2 veces al día en sus 8 parcelas (Bayas Zidra y Zanama cotizadas)
    marketValue += (8 * 4 * 2) * RAW_MATERIALS.berry_sitrus_raw.basePrice; // ~38,400 ₽

    // Venta de Elixires y Pociones caseras procesadas en el Mortero del Rancho
    marketValue += 75000;

    // Servicios Genéticos Especiales: Clientes que encargan Pokémon con Movimientos Huevo
    marketValue += 140000;
  }

  const netWealth = (totalGross + marketValue - totalCosts) / days;
  return {
    className: 'Criador Pokémon',
    totalGrossMoney: totalGross / days,
    operationalCosts: totalCosts / days,
    marketGoodsValue: marketValue / days,
    netWealth,
    hourlyAverage: Math.round(netWealth / HOURS_PER_DAY),
    itemsProducedCount: 0,
    rarePokemonProducedCount: Math.round(rarePokes / days)
  };
}

// ==========================================
// 4. SIMULACIÓN: ENTRENADOR (El Campeón Oficial)
// ==========================================
function simulateEntrenador(days: number): SimulationResult {
  let totalGross = 0;
  let totalCosts = 0;
  let marketValue = 0;
  let itemsCount = 0;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < HOURS_PER_DAY; h++) {
      for (let a = 0; a < ACTIONS_PER_HOUR; a++) {
        // Combates de alto nivel: Gimnasios, Revanchas y Líderes
        totalGross += 1350; // Premio oficial de combate

        // Acumulación de Reputación y Battle Coins (BC)
        if (Math.random() < 0.065) {
          marketValue += MARKET_PRICES.star_piece_market;
          itemsCount++;
        }

        // Canje de MT26 Terremoto
        if (Math.random() < 0.014) {
          marketValue += MARKET_PRICES.tm_earthquake_official;
          itemsCount++;
        }

        // Coste de consumibles de alta competición y medicinas
        totalCosts += 380;
      }
    }
  }

  const netWealth = (totalGross + marketValue - totalCosts) / days;
  return {
    className: 'Entrenador',
    totalGrossMoney: totalGross / days,
    operationalCosts: totalCosts / days,
    marketGoodsValue: marketValue / days,
    netWealth,
    hourlyAverage: Math.round(netWealth / HOURS_PER_DAY),
    itemsProducedCount: Math.round(itemsCount / days),
    rarePokemonProducedCount: 0
  };
}

// ==========================================
// EJECUCIÓN PRINCIPAL Y TABLA DE BALANCE
// ==========================================
export function runEconomySimulation() {
  console.log('\n================================================================');
  console.log('  SIMULADOR DE PARIDAD ECONÓMICA MONTE CARLO: "EL CHINO FARMER"');
  console.log('  (24hs de Juego Continuo Optimizado - 200 Días Simulados / Clase)');
  console.log('================================================================\n');

  const results: SimulationResult[] = [
    simulateCazabichos(SIMULATED_DAYS_PER_CLASS),
    simulateRocket(SIMULATED_DAYS_PER_CLASS),
    simulateCriador(SIMULATED_DAYS_PER_CLASS),
    simulateEntrenador(SIMULATED_DAYS_PER_CLASS)
  ];

  const avgNet = results.reduce((acc, r) => acc + r.netWealth, 0) / results.length;

  console.log('| Clase | P¥ Directo/Día | Valor Mercado/Día | Costes/Día | Riqueza Neta Diaria | P¥ / Hora | Ratio Meta |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const r of results) {
    const ratio = ((r.netWealth / avgNet) * 100).toFixed(1);
    const pDirect = Math.round(r.totalGrossMoney).toLocaleString();
    const pMarket = Math.round(r.marketGoodsValue).toLocaleString();
    const pCosts = Math.round(r.operationalCosts).toLocaleString();
    const pNet = Math.round(r.netWealth).toLocaleString();
    const pHour = r.hourlyAverage.toLocaleString();

    console.log(`| ${r.className.padEnd(14)} | ₽ ${pDirect.padStart(11)} | ₽ ${pMarket.padStart(13)} | ₽ ${pCosts.padStart(8)} | ₽ ${pNet.padStart(13)} | ₽ ${pHour.padStart(7)}/h | ${ratio.padStart(5)}% |`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  PROMEDIO DEL META GLOBAL: ₽ ${Math.round(avgNet).toLocaleString()} / Día  (₽ ${Math.round(avgNet / 24).toLocaleString()} / Hora)`);
  
  const maxDev = Math.max(...results.map(r => Math.abs(100 - (r.netWealth / avgNet) * 100)));
  console.log(`  DISPERSIÓN MÁXIMA ENTRE CLASES: ±${maxDev.toFixed(1)}%`);
  
  if (maxDev <= 7.0) {
    console.log('  [ESTADO DE EQUILIBRIO]: EXCELENTE (Las 4 clases producen riqueza equivalente dentro del margen ±7%).');
  } else {
    console.log('  [ESTADO DE EQUILIBRIO]: REQUIERE CALIBRACIÓN (Alguna clase supera el margen de tolerancia).');
  }
  console.log('================================================================\n');
}

// Ejecutar automáticamente al invocar el script
runEconomySimulation();
