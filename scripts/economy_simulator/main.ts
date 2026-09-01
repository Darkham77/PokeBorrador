/**
 * scripts/economy_simulator/main.ts
 * Simulador de Economía Multi-Agente Basado en Eventos (30 Días de Servidor con 100 Jugadores Concurrentes).
 * 
 * Evalúa:
 * 1. Masa Monetaria Global (M0) y Tasa de Inflación.
 * 2. Ratio Grifos vs Sumideros (Faucets vs Sinks).
 * 3. Paridad Económica entre las 4 Clases para Jugadores Casuales (1h), Regulares (3.5h) y Hardcore (9h).
 * 4. Dinámica real del Mercado con Oferta, Demanda e Impuestos del 5%.
 * 
 * Ejecución: npx tsx scripts/economy_simulator/main.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PlayerAgent, PlayerClassId, PlayerArchetype, DailyEconomyMetrics } from './types.ts';
import { ARCHETYPE_HOURS } from './types.ts';
import { SimulatedMarketEngine } from './marketEngine.ts';
import { simulateAgentDay } from './agentBehaviors.ts';

const TOTAL_PLAYERS = 100;
const SIMULATION_DAYS = 30; // 1 Mes completo de vida de servidor

// Generador de Población Equilibrada (25 de cada clase con mix de perfiles)
function generatePopulation(): PlayerAgent[] {
  const agents: PlayerAgent[] = [];
  const classes: PlayerClassId[] = ['cazabichos', 'rocket', 'criador', 'entrenador'];
  let idCounter = 1;

  for (const cls of classes) {
    // Para cada clase: 8 casuales (1h), 12 regulares (3.5h), 5 hardcore (9h)
    const archetypes: PlayerArchetype[] = [
      ...Array(8).fill('casual'),
      ...Array(12).fill('regular'),
      ...Array(5).fill('hardcore')
    ];

    for (const arc of archetypes) {
      agents.push({
        id: `agent_${idCounter++}`,
        name: `${cls.toUpperCase()}_${arc.toUpperCase()}_${idCounter}`,
        playerClass: cls,
        archetype: arc,
        wallet: 15000, // Billetera inicial de bienvenida al juego (15,000 ₽)
        bankSavings: 0,
        inventory: {},
        totalEarnedFromFaucets: 0,
        totalSpentOnSinks: 0,
        marketBoughtAmount: 0,
        marketSoldAmount: 0,
        capturedCount: 0,
        bredCount: 0,
        gymsDefeatedCount: 0,
        highIvStock: 0
      });
    }
  }

  return agents;
}

export function runFullEconomySimulation() {
  console.log('\n================================================================');
  console.log('  SIMULADOR DE ECONOMÍA REAL DE MMO: 30 DÍAS DE SERVIDOR ACTIVO');
  console.log('  (100 Jugadores Concurrentes: 4 Clases x 3 Arquetipos de Juego)');
  console.log('================================================================\n');

  const agents = generatePopulation();
  const agentsMap = new Map<string, PlayerAgent>(agents.map(a => [a.id, a]));
  const market = new SimulatedMarketEngine();

  const dailyLogs: DailyEconomyMetrics[] = [];
  let cumulativeFaucets = 0;
  let cumulativeSinks = 0;

  for (let day = 1; day <= SIMULATION_DAYS; day++) {
    let dayFaucetsStart = agents.reduce((acc, a) => acc + a.totalEarnedFromFaucets, 0);
    let daySinksStart = agents.reduce((acc, a) => acc + a.totalSpentOnSinks, 0);
    const taxesBefore = market.totalTaxesDestroyed;

    // 1. Cada jugador juega su sesión diaria según su arquetipo de horas
    for (const agent of agents) {
      const hours = ARCHETYPE_HOURS[agent.archetype];
      simulateAgentDay(agent, hours, day, market, agentsMap);
    }

    // 2. Procesar elasticidad diaria de precios y vencimientos en el Mercado
    market.processDailyMarketCycles(day, agentsMap);

    const dayFaucetsEnd = agents.reduce((acc, a) => acc + a.totalEarnedFromFaucets, 0);
    const daySinksEnd = agents.reduce((acc, a) => acc + a.totalSpentOnSinks, 0);
    const taxesToday = market.totalTaxesDestroyed - taxesBefore;

    const dayInjected = dayFaucetsEnd - dayFaucetsStart;
    const dayDestroyed = (daySinksEnd - daySinksStart) + taxesToday;

    cumulativeFaucets += dayInjected;
    cumulativeSinks += dayDestroyed;

    const totalM0 = agents.reduce((acc, a) => acc + a.wallet, 0);

    // Calcular patrimonio promedio por clase
    const avgClassNetWorth: Record<PlayerClassId, number> = {
      cazabichos: 0,
      rocket: 0,
      criador: 0,
      entrenador: 0
    };
    const classCounts: Record<PlayerClassId, number> = { cazabichos: 0, rocket: 0, criador: 0, entrenador: 0 };

    for (const a of agents) {
      avgClassNetWorth[a.playerClass] += a.wallet;
      classCounts[a.playerClass]++;
    }
    for (const c of Object.keys(avgClassNetWorth) as PlayerClassId[]) {
      avgClassNetWorth[c] = Math.round(avgClassNetWorth[c] / (classCounts[c] || 1));
    }

    // Calcular patrimonio por arquetipo
    const avgArchetypeNetWorth: Record<PlayerArchetype, number> = { casual: 0, regular: 0, hardcore: 0 };
    const archCounts: Record<PlayerArchetype, number> = { casual: 0, regular: 0, hardcore: 0 };
    for (const a of agents) {
      avgArchetypeNetWorth[a.archetype] += a.wallet;
      archCounts[a.archetype]++;
    }
    for (const arc of Object.keys(avgArchetypeNetWorth) as PlayerArchetype[]) {
      avgArchetypeNetWorth[arc] = Math.round(avgArchetypeNetWorth[arc] / (archCounts[arc] || 1));
    }

    dailyLogs.push({
      day,
      totalM0MoneySupply: totalM0,
      dailyFaucetInjected: dayInjected,
      dailySinkDestroyed: dayDestroyed,
      dailyMarketVolume: market.totalVolumeTraded,
      dailyMarketTaxesDestroyed: market.totalTaxesDestroyed,
      averageNetWorthByClass: avgClassNetWorth,
      averageNetWorthByArchetype: avgArchetypeNetWorth,
      activeListingsCount: market.getActiveListings().length
    });
  }

  // ==========================================
  // PRESENTACIÓN DE RESULTADOS FINALES TRAS 30 DÍAS
  // ==========================================
  console.log('--- 1. SALUD MACROECONÓMICA DEL SERVIDOR (MES 1) ---');
  console.log(`Dinero Total Inyectado (Grifos NPC):    ₽ ${Math.round(cumulativeFaucets).toLocaleString()}`);
  console.log(`Dinero Total Destruido (Sumideros/Tax): ₽ ${Math.round(cumulativeSinks).toLocaleString()}`);
  const sinkRatio = (cumulativeSinks / cumulativeFaucets) * 100;
  console.log(`Ratio de Destrucción (Sinks / Faucets): ${sinkRatio.toFixed(1)}%`);

  const initialM0 = TOTAL_PLAYERS * 15000;
  const finalM0 = agents.reduce((acc, a) => acc + a.wallet, 0);
  const inflationRate = ((finalM0 - initialM0) / initialM0) * 100;
  console.log(`Masa Monetaria Inicial:                 ₽ ${initialM0.toLocaleString()}`);
  console.log(`Masa Monetaria Final (Día 30):          ₽ ${Math.round(finalM0).toLocaleString()}`);
  console.log(`Crecimiento Económico Mensual:          +${inflationRate.toFixed(1)}%\n`);

  console.log('--- 2. PARIDAD DE RIQUEZA POR CLASE TRAS 30 DÍAS DE JUEGO ---');
  console.log('| Clase | Casual (1h/d) | Regular (3.5h/d) | Hardcore (9h/d) | Promedio Clase | Ratio Global |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');

  const finalAvgByClass: Record<PlayerClassId, { casual: number; regular: number; hardcore: number; overall: number }> = {
    cazabichos: { casual: 0, regular: 0, hardcore: 0, overall: 0 },
    rocket: { casual: 0, regular: 0, hardcore: 0, overall: 0 },
    criador: { casual: 0, regular: 0, hardcore: 0, overall: 0 },
    entrenador: { casual: 0, regular: 0, hardcore: 0, overall: 0 }
  };

  for (const c of ['cazabichos', 'rocket', 'criador', 'entrenador'] as PlayerClassId[]) {
    const classAgents = agents.filter(a => a.playerClass === c);
    const casuals = classAgents.filter(a => a.archetype === 'casual');
    const regulars = classAgents.filter(a => a.archetype === 'regular');
    const hardcores = classAgents.filter(a => a.archetype === 'hardcore');

    const avgCas = casuals.reduce((acc, a) => acc + a.wallet, 0) / casuals.length;
    const avgReg = regulars.reduce((acc, a) => acc + a.wallet, 0) / regulars.length;
    const avgHar = hardcores.reduce((acc, a) => acc + a.wallet, 0) / hardcores.length;
    const avgAll = classAgents.reduce((acc, a) => acc + a.wallet, 0) / classAgents.length;

    finalAvgByClass[c] = { casual: avgCas, regular: avgReg, hardcore: avgHar, overall: avgAll };
  }

  const globalAvg = Object.values(finalAvgByClass).reduce((acc, v) => acc + v.overall, 0) / 4;

  for (const [cls, vals] of Object.entries(finalAvgByClass)) {
    const ratio = ((vals.overall / globalAvg) * 100).toFixed(1);
    console.log(
      `| ${cls.padEnd(12)} | ₽ ${Math.round(vals.casual).toLocaleString().padStart(9)} | ₽ ${Math.round(vals.regular).toLocaleString().padStart(12)} | ₽ ${Math.round(vals.hardcore).toLocaleString().padStart(11)} | ₽ ${Math.round(vals.overall).toLocaleString().padStart(10)} | ${ratio.padStart(5)}% |`
    );
  }

  console.log('\n--- 3. ACTIVIDAD DEL MERCADO Y OFERTA/DEMANDA ---');
  console.log(`Volumen Total Transaccionado:            ₽ ${Math.round(market.totalVolumeTraded).toLocaleString()}`);
  console.log(`Impuestos Destruidos del Mercado (5%):   ₽ ${Math.round(market.totalTaxesDestroyed).toLocaleString()}`);
  console.log(`Subastas Activas al Final del Mes:       ${market.getActiveListings().length} ítems`);
  console.log('Precios de Mercado Finales por Categoría:');
  for (const [cat, price] of Object.entries(market.currentMarketPrices)) {
    console.log(`  - ${cat.padEnd(20)}: ₽ ${price.toLocaleString()}`);
  }

  // Guardar reporte completo en scratch/
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const reportPath = path.join(scratchDir, 'economy_simulation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalPlayers: TOTAL_PLAYERS,
      simulationDays: SIMULATION_DAYS,
      cumulativeFaucets,
      cumulativeSinks,
      sinkRatioPct: sinkRatio,
      finalM0,
      inflationRatePct: inflationRate,
      globalAverageWealth: globalAvg,
      finalAveragesByClass: finalAvgByClass,
      finalMarketPrices: market.currentMarketPrices
    },
    dailyLogs
  }, null, 2));

  console.log(`\n📄 Reporte detallado de auditoría exportado a: ${reportPath}`);
  console.log('================================================================\n');
}

runFullEconomySimulation();
