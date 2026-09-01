/**
 * scripts/economy_simulator/agentBehaviors.ts
 * Lógica de comportamiento diario por clase para la simulación económica.
 */

import type { PlayerAgent } from './types.ts';
import type { SimulatedMarketEngine } from './marketEngine.ts';
import { RAW_MATERIALS } from '../../src/data/economy/craftingCatalog.ts';

export function simulateAgentDay(
  agent: PlayerAgent,
  hours: number,
  day: number,
  market: SimulatedMarketEngine,
  allAgentsMap: Map<string, PlayerAgent>
) {
  const actions = Math.round(hours * 70); // 70 acciones activas por hora

  switch (agent.playerClass) {
    case 'cazabichos':
      simulateCazabichosDay(agent, actions, day, market);
      break;
    case 'rocket':
      simulateRocketDay(agent, actions, day, market, allAgentsMap);
      break;
    case 'criador':
      simulateCriadorDay(agent, actions, hours, day, market);
      break;
    case 'entrenador':
      simulateEntrenadorDay(agent, actions, day, market);
      break;
  }
}

// ----------------------------------------------------------------------
// 1. CAZABICHOS (Maestro de Captura y Botín Silvestre)
// ----------------------------------------------------------------------
function simulateCazabichosDay(agent: PlayerAgent, actions: number, day: number, market: SimulatedMarketEngine) {
  let streak = 0;

  for (let i = 0; i < actions; i++) {
    // 1. Recompensa básica de combate salvaje (Grifo)
    const wildWinP = 80;
    agent.wallet += wildWinP;
    agent.totalEarnedFromFaucets += wildWinP;

    // 2. Coste de Pokéball básica (Sumidero oficial)
    agent.wallet -= 200;
    agent.totalSpentOnSinks += 200;

    // 3. Intento de captura
    const catchSuccess = Math.random() < 0.82; // Sinergia de captura de bicho
    if (catchSuccess) {
      agent.capturedCount++;
      streak = Math.min(25, streak + 1);

      // Kit de Campo: 1 Poké Ball gratis cada 10 capturas (Ahorro de sumidero)
      if (streak % 10 === 0) {
        agent.wallet += 200;
        agent.totalSpentOnSinks -= 200;
      }

      // Red Maestra: 20% de probabilidad de 2x1 si es tipo Bicho
      const count = Math.random() < 0.20 ? 2 : 1;

      for (let s = 0; s < count; s++) {
        // Racha de capturas: aumenta el piso de IVs
        const ivFloor = Math.min(95, 25 + streak * 3);
        const totalIVs = ivFloor + Math.floor(Math.random() * (186 - ivFloor));

        // Evaluación de captura para el Mercado
        if (totalIVs >= 160) {
          // Grado A o Competitivo: Listar en el Mercado entre jugadores
          market.postListing(agent, 'pokemon_grade_a', 'pokemon_high_iv', `Pokémon Silvestre Nv.30 (${totalIVs} IVs)`);
          agent.highIvStock++;
        } else if (totalIVs >= 135) {
          // Descarte bueno: venta al NPC coleccionista por 2,500 ₽
          agent.wallet += 2500;
          agent.totalEarnedFromFaucets += 2500;
        } else {
          // Común: venta en tienda básica por 300 ₽
          agent.wallet += 300;
          agent.totalEarnedFromFaucets += 300;
        }

        // Tirada de Shiny (aumentada con racha)
        const shinyChance = (1 / 3000) * (1 + (streak / 25) * 1.5);
        if (Math.random() < shinyChance) {
          market.postListing(agent, 'pokemon_shiny', 'pokemon_shiny_specimen', `✨ Pokémon Variocolor Silvestre`);
        }
      }

      // Recolección pasiva de materiales de campo
      if (Math.random() < 0.30) {
        // Hilo de seda: Listar lote de materiales en el Mercado
        market.postListing(agent, 'material', 'silk_spool', 'Lote de Hilos de Seda x3', 3);
      }
      if (Math.random() < 0.05) {
        // Miel Silvestre rara
        market.postListing(agent, 'material', 'wild_honey', 'Frasco de Miel Silvestre');
      }
    } else {
      streak = Math.max(0, streak - 5);
    }
  }
}

// ----------------------------------------------------------------------
// 2. EQUIPO ROCKET (Extorsión, Robos y Comprador de Mercado)
// ----------------------------------------------------------------------
function simulateRocketDay(
  agent: PlayerAgent,
  actions: number,
  day: number,
  market: SimulatedMarketEngine,
  allAgentsMap: Map<string, PlayerAgent>
) {
  for (let i = 0; i < actions; i++) {
    const isTrainer = Math.random() < 0.70;

    if (isTrainer) {
      // Extorsión de Ruta: x1.5 dinero por victoria (Grifo masivo)
      const prizeMoney = 1800 * 1.5;
      agent.wallet += prizeMoney;
      agent.totalEarnedFromFaucets += prizeMoney;

      // Robo Rápido (30% chance de robar objeto a entrenador)
      if (Math.random() < 0.30) {
        const stolenVal = Math.random() < 0.15 ? 4500 : 1200;
        agent.wallet += stolenVal;
        agent.totalEarnedFromFaucets += stolenVal;
      }

      // Penalización: Centro Pokémon con recargo del 100% (Sumidero)
      const healFee = 160;
      agent.wallet -= healFee;
      agent.totalSpentOnSinks += healFee;
    } else {
      // Venta directa en PC al mercado negro (P¥ 500 + Nivel 35 x 10 = 850)
      const blackMarketSale = 850;
      agent.wallet += blackMarketSale;
      agent.totalEarnedFromFaucets += blackMarketSale;
    }

    // Compras de suministros con sobrecargo del 20% (Sumidero)
    const suppliesCost = 210;
    agent.wallet -= suppliesCost;
    agent.totalSpentOnSinks += suppliesCost;
  }

  // Comportamiento del Mercado: El Rocket es el Gran Comprador
  // Si tiene más de 150,000 ₽ en la billetera, compra en el mercado:
  if (agent.wallet > 150000) {
    // Intenta comprar un Pokémon Grado S (del Criador)
    const boughtS = market.attemptPurchase(agent, 'pokemon_grade_s', allAgentsMap);
    if (!boughtS) {
      // Si no hay Grado S, compra un Grado A (del Cazabichos)
      market.attemptPurchase(agent, 'pokemon_grade_a', allAgentsMap);
    }
    // Compra MT oficial (del Entrenador)
    market.attemptPurchase(agent, 'tm_official', allAgentsMap);
  }
}

// ----------------------------------------------------------------------
// 3. CRIADOR POKÉMON (Maestro Genético y Proveedor de Grado S)
// ----------------------------------------------------------------------
function simulateCriadorDay(agent: PlayerAgent, actions: number, hours: number, day: number, market: SimulatedMarketEngine) {
  // 1. Costes de guardería (Sumidero directo): 1,500 ₽ por hora
  const daycareFees = Math.round(hours * 1500);
  agent.wallet -= daycareFees;
  agent.totalSpentOnSinks += daycareFees;

  // 2. Ingresos menores por combates en ruta (Grifo)
  const routeP = Math.round(hours * 900);
  agent.wallet += routeP;
  agent.totalEarnedFromFaucets += routeP;

  // 3. Eclosión de huevos (3.5 huevos por hora de viaje con incubadora y bono)
  const eggsHatched = Math.floor(hours * 3.5);
  agent.bredCount += eggsHatched;

  for (let e = 0; e < eggsHatched; e++) {
    // Lazo Destino (4 IVs de padres optimizados)
    const isGradeS = Math.random() < 0.16; // 16% éxito 5x31 + Naturaleza
    const isGradeA = Math.random() < 0.38; // 38% éxito 4x31

    if (isGradeS) {
      // Listar en el Mercado como Joya Genética Grado S
      market.postListing(agent, 'pokemon_grade_s', 'pokemon_bred_grade_s', '🌟 Pokémon Competitivo Grado S (5x31 IVs + Naturaleza)');
      agent.highIvStock++;
    } else if (isGradeA) {
      // Listar en el Mercado como Grado A
      market.postListing(agent, 'pokemon_grade_a', 'pokemon_bred_grade_a', 'Pokémon Cría Grado A (4x31 IVs)');
      agent.highIvStock++;
    } else {
      // Venta de cría común al NPC por 3,500 ₽
      agent.wallet += 3500;
      agent.totalEarnedFromFaucets += 3500;
    }

    // Coste de reposición de incubadora (Sumidero de crafteo): 1,100 ₽ por huevo
    agent.wallet -= 1100;
    agent.totalSpentOnSinks += 1100;
  }

  // 4. Producción del Rancho (Huerta de Bayas y Pociones caseras)
  const potionSalesP = Math.round(hours * 3200);
  agent.wallet += potionSalesP;
  agent.totalEarnedFromFaucets += potionSalesP;
}

// ----------------------------------------------------------------------
// 4. ENTRENADOR (Campeón Oficial y Proveedor de MTs y Gemas)
// ----------------------------------------------------------------------
function simulateEntrenadorDay(agent: PlayerAgent, actions: number, day: number, market: SimulatedMarketEngine) {
  for (let i = 0; i < actions; i++) {
    // Combates oficiales de Gimnasio / Torre (Grifo)
    const gymReward = 1380;
    agent.wallet += gymReward;
    agent.totalEarnedFromFaucets += gymReward;
    agent.gymsDefeatedCount++;

    // Consumo de pociones y objetos oficiales de combate (Sumidero)
    const battleExpenses = 360;
    agent.wallet -= battleExpenses;
    agent.totalSpentOnSinks += battleExpenses;

    // Canje de puntos de Reputación y Battle Coins (Cada ~40 batallas)
    if (Math.random() < 0.065) {
      // Trozo de Estrella: Listar en el Mercado como material de crafteo
      market.postListing(agent, 'material', 'star_piece_market', 'Trozo de Estrella Brillante');
    }

    // Canje de MT26 Terremoto (MT oficial de alta demanda)
    if (Math.random() < 0.014) {
      market.postListing(agent, 'tm_official', 'tm_earthquake', 'MT26 Terremoto (Oficial)');
    }
  }
}
