// scripts/battle-tester/run-tester.ts
import { describe, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { Battle, toID, ID } from '@pkmn/sim';
import { generateTestBatches } from './team-generator.ts';
import { createMockBattleContext } from './mock-battle-store.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../../src/logic/battle/showdownBridge.ts';
import { BattleAgent, type ChoiceRequest } from './battle-agent.ts';
import { logger } from '../../src/logic/utils/logger.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon';
import { ABILITY_SCENARIOS } from './ability-scenarios.ts';

const RESULTS_DIR = path.resolve(process.cwd(), 'scripts/battle-tester/results');
const REPORT_FILE = path.join(RESULTS_DIR, 'coverage_report.json');

// Interceptar advertencias y logs no manejados del bridge
const unhandledBridgeLines: string[] = [];
const originalDebug = logger.debug;
logger.debug = (tag: string, message: string, ...args: unknown[]) => {
  if (tag === 'ShowdownBridge' && message.includes('sin parseador')) {
    const parts = message.split('específico: ');
    const line = parts[1] || '';
    const lp = line.split('|').map(x => x.trim());
    const type = lp[1] || '';
    const ignoredTypes = [
      '', 't:', 'turn', 'upkeep', 'teampreview', 'gametype', 'player', 'gen', 'tier', 'clearpoke', 'poke', 'start', 'rule', 'teamsize'
    ];
    if (!ignoredTypes.includes(type)) {
      unhandledBridgeLines.push(message);
    }
  }
  originalDebug(tag, message, ...args);
};

// Función auxiliar para mapear el set a formato local Pokemon
function createLocalPoke(name: string, species: string, level: number, moves: string[], ability: string): Pokemon {
  return {
    uid: Math.random().toString(36).substring(2, 11),
    id: toID(species),
    name: name || species,
    level,
    exp: 0,
    expNeeded: 100,
    hp: 400,
    maxHp: 400,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    type: 'Normal',
    ability: toID(ability),
    status: null,
    volatileCounters: {},
    moves: moves.map(m => ({
      id: toID(m),
      name: m,
      pp: 20,
      maxPP: 20
    }))
  } as unknown as Pokemon;
}

function simplifyLogLine(line: string): string | null {
  if (!line.startsWith('|')) return null;
  const parts = line.split('|').map(x => x.trim());
  const type = parts[1];
  switch (type) {
    case 'move': {
      const attacker = parts[2]?.split(': ')[1] || parts[2] || '';
      const move = parts[3] || '';
      const target = parts[4]?.split(': ')[1] || parts[4] || '';
      return `ataca ${attacker} con ${move}${target ? ` a ${target}` : ''}`;
    }
    case '-ability':
    case 'ability': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      const ability = parts[3] || '';
      return `${poke} activa su habilidad ${ability}`;
    }
    case '-miss': {
      const attacker = parts[2]?.split(': ')[1] || parts[2] || '';
      return `${attacker} falló el ataque`;
    }
    case '-fail': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      return `${poke} pero falló`;
    }
    case 'faint': {
      const poke = parts[2]?.split(': ')[1] || parts[2] || '';
      return `${poke} se debilitó`;
    }
    default:
      return null;
  }
}

interface CoverageItem {
  id: string;
  name: string;
  type: 'move' | 'ability';
  status: 'PASS' | 'FAIL' | 'UNTESTED';
  details?: string;
  unhandledLogs?: string[];
  reproduceTrace?: {
    playerTeam: string[];
    enemyTeam: string[];
    steps: string[];
  };
}

describe('Showdown Gen 9 Battle Coverage Fuzzer', () => {
  it('debería simular combates para todos los movimientos y habilidades e identificar fallos', async () => {
    console.log(styleText('bold', '\n--- 🧪 POKEMON BATTLE COVERAGE TESTER (GEN 9 via Vitest) ---'));
    
    await fs.mkdir(RESULTS_DIR, { recursive: true });

    const batches = generateTestBatches(6);
    console.log(`📦 Batches generados para testing: ${batches.length}`);

    const moveCoverage: Record<string, CoverageItem> = {};
    const abilityCoverage: Record<string, CoverageItem> = {};

    // Inicializar mapa de cobertura
    batches.forEach(b => {
      b.movesToTest.forEach(m => {
        moveCoverage[m] = { id: m, name: m, type: 'move', status: 'UNTESTED' };
      });
      b.abilitiesToTest.forEach(a => {
        abilityCoverage[a] = { id: a, name: a, type: 'ability', status: 'UNTESTED' };
      });
    });

    const totalRounds = batches.length;
    let currentRound = 0;

    for (const batch of batches) {
      currentRound++;
      
      // Correr todos los batches para cobertura completa

      console.log(`\n⚔️ Corriendo ronda ${currentRound}/${totalRounds}...`);

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Filtrar qué queda UNTESTED en este lote
        const remainingMoves = batch.movesToTest.filter(m => moveCoverage[m]?.status === 'UNTESTED');
        const remainingAbilities = batch.abilitiesToTest.filter(a => abilityCoverage[a]?.status === 'UNTESTED');

        if (attempt > 1 && remainingMoves.length === 0 && remainingAbilities.length === 0) {
          break; // Todo testeado en este lote, salir del intento
        }

        if (attempt > 1) {
          console.log(`   🔄 Re-intentando ronda ${currentRound} (Intento ${attempt}/${maxAttempts}) para cubrir ${remainingMoves.length} movimientos y ${remainingAbilities.length} habilidades UNTESTED...`);
        }

        const movesSet = new Set(remainingMoves);
        const agent1 = new BattleAgent('p1', movesSet);
        const agent2 = new BattleAgent('p2');

        // Inicializar el simulador de Showdown
        const simBattle = new Battle({ formatid: 'gen9customgame' as ID });
        simBattle.setPlayer('p1', { name: 'Player', team: batch.playerTeam });
        simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

        // Inicializar el estado de nuestro store mock
        const p1Active = batch.playerTeam[0]!;
        const p2Active = batch.enemyTeam[0]!;
        const localP1 = createLocalPoke(p1Active.name || '', p1Active.species, p1Active.level, p1Active.moves, p1Active.ability);
        const localP2 = createLocalPoke(p2Active.name || '', p2Active.species, p2Active.level, p2Active.moves, p2Active.ability);
        const mockStore = createMockBattleContext(localP1, localP2);

        let lastLogIndex = 0;
        const getNewLogs = (): string[] => {
          const allLogs = simBattle.log;
          const newLogs = allLogs.slice(lastLogIndex);
          lastLogIndex = allLogs.length;
          return newLogs;
        };

        // Procesar logs iniciales
        const initLogs = filterShowdownLogs(getNewLogs());
        for (const logLine of initLogs) {
          await parseShowdownLogLine(mockStore, logLine, initLogs);
        }

        let turn = 0;
        const maxTurns = 30;
        const steps: string[] = [];

        try {
          while (!simBattle.ended && turn < maxTurns) {
            turn++;
            unhandledBridgeLines.length = 0; // Limpiar buffer de este turno

            const p1Req = simBattle.p1.activeRequest;
            const p2Req = simBattle.p2.activeRequest;

            console.log(`[Turn ${turn}] p1Req:`, JSON.stringify(p1Req), 'p2Req:', !!p2Req);

            const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest);
            const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest);

            console.log(`[Turn ${turn}] Choices - p1: "${p1Choice}", p2: "${p2Choice}"`);

            const res1 = simBattle.choose('p1', p1Choice);
            const res2 = simBattle.choose('p2', p2Choice);
            console.log(`[Turn ${turn}] Choose results - p1: ${res1}, p2: ${res2}`);

            // Capturar y procesar logs del turno
            const rawTurnLogs = getNewLogs();
            const turnLogs = filterShowdownLogs(rawTurnLogs);
            console.log(`[Turn ${turn}] Logs generated: ${rawTurnLogs.length} lines`);
            if (rawTurnLogs.length > 0) {
              console.log(rawTurnLogs.slice(0, 5).join('\n'));
            }

            for (const logLine of turnLogs) {
              const stepDesc = simplifyLogLine(logLine);
              if (stepDesc) {
                steps.push(`Turno ${turn}: ${stepDesc}`);
              }
              await parseShowdownLogLine(mockStore, logLine, turnLogs);
            }

            // Registrar resultados para los movimientos y habilidades activas
            batch.movesToTest.forEach(m => {
              const usedThisTurn = rawTurnLogs.some(l => {
                if (!l.startsWith('|')) return false;
                const p = l.split('|').map(x => x.trim());
                return p[1] === 'move' && toID(p[3]) === m;
              });
              if (usedThisTurn) {
                const hasFailure = unhandledBridgeLines.length > 0;
                const item = moveCoverage[m];
                if (item) {
                  if (hasFailure) {
                    item.status = 'FAIL';
                    item.unhandledLogs = [...(item.unhandledLogs || []), ...unhandledBridgeLines];
                    item.reproduceTrace = {
                      playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species}) [moves: ${p.moves.join(', ')}]`),
                      enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species}) [moves: ${e.moves.join(', ')}]`),
                      steps: [...steps]
                    };
                  } else if (item.status !== 'FAIL') {
                    item.status = 'PASS';
                  }
                }
              }
            });

            batch.abilitiesToTest.forEach(a => {
              const triggeredThisTurn = rawTurnLogs.some(l => {
                const cleanLine = l.toLowerCase().replace(/\s+/g, '');
                return cleanLine.includes(`|ability|${a}`) || 
                       cleanLine.includes(`|-ability|${a}`) || 
                       cleanLine.includes(`ability:${a}`);
              });
              if (triggeredThisTurn) {
                const hasFailure = unhandledBridgeLines.length > 0;
                const item = abilityCoverage[a];
                if (item) {
                  if (hasFailure) {
                    item.status = 'FAIL';
                    item.unhandledLogs = [...(item.unhandledLogs || []), ...unhandledBridgeLines];
                    item.reproduceTrace = {
                      playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species}) [moves: ${p.moves.join(', ')}]`),
                      enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species}) [moves: ${e.moves.join(', ')}]`),
                      steps: [...steps]
                    };
                  } else if (item.status !== 'FAIL') {
                    item.status = 'PASS';
                  }
                }
              }
            });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(styleText('red', `❌ Error fatal en combate en ronda ${currentRound}: ${errMsg}`));
          batch.movesToTest.forEach(m => {
            if (moveCoverage[m]) {
              moveCoverage[m]!.status = 'FAIL';
              moveCoverage[m]!.details = `CRASH: ${errMsg}`;
            }
          });
        }
      }
    }

    // FASE 2: Escenarios Scriptados para Habilidades Específicas
    console.log(styleText('bold', '\n--- 🎭 EJECUTANDO ESCENARIOS SCRIPTADOS PARA HABILIDADES ---'));
    for (const scenario of ABILITY_SCENARIOS) {
      console.log(`🎬 Escenario: ${scenario.name}...`);
      
      // Crear simulación
      const simBattle = new Battle({ formatid: 'gen9customgame' as ID });
      simBattle.setPlayer('p1', { name: 'Player', team: scenario.playerTeam });
      simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: scenario.enemyTeam });

      // Descartar logs de entrada inicial
      const discardLogs = (): string[] => {
        return simBattle.log;
      };
      discardLogs();

      let lastIndex = 0;
      const getScenarioNewLogs = (): string[] => {
        const all = simBattle.log;
        const slice = all.slice(lastIndex);
        lastIndex = all.length;
        return slice;
      };

      const localP1 = createLocalPoke(scenario.playerTeam[0]!.name || '', scenario.playerTeam[0]!.species, scenario.playerTeam[0]!.level, scenario.playerTeam[0]!.moves, scenario.playerTeam[0]!.ability);
      const localP2 = createLocalPoke(scenario.enemyTeam[0]!.name || '', scenario.enemyTeam[0]!.species, scenario.enemyTeam[0]!.level, scenario.enemyTeam[0]!.moves, scenario.enemyTeam[0]!.ability);
      const mockStore = createMockBattleContext(localP1, localP2);

      const scenarioSteps: string[] = [];

      for (const action of scenario.actions) {
        if (simBattle.ended) break;
        unhandledBridgeLines.length = 0;

        simBattle.choose('p1', action.p1);
        simBattle.choose('p2', action.p2);

        const rawTurnLogs = getScenarioNewLogs();
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          const stepDesc = simplifyLogLine(logLine);
          if (stepDesc) {
            scenarioSteps.push(stepDesc);
          }
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }

        // Registrar resultados para cada habilidad del escenario
        scenario.abilities.forEach(a => {
          const triggered = rawTurnLogs.some(l => {
            const cleanLine = l.toLowerCase().replace(/\s+/g, '');
            return cleanLine.includes(`|ability|${a}`) || 
                   cleanLine.includes(`|-ability|${a}`) || 
                   cleanLine.includes(`ability:${a}`);
          });
          if (triggered) {
            const hasFailure = unhandledBridgeLines.length > 0;
            const item = abilityCoverage[a];
            if (item) {
              if (hasFailure) {
                item.status = 'FAIL';
                item.unhandledLogs = [...(item.unhandledLogs || []), ...unhandledBridgeLines];
                item.reproduceTrace = {
                  playerTeam: scenario.playerTeam.map(p => `${p.name} (${p.species}) [moves: ${p.moves.join(', ')}]`),
                  enemyTeam: scenario.enemyTeam.map(e => `${e.name} (${e.species}) [moves: ${e.moves.join(', ')}]`),
                  steps: [...scenarioSteps]
                };
              } else if (item.status !== 'FAIL') {
                item.status = 'PASS';
              }
            }
          }
        });
      }
    }

    // Generar reporte
    const movesList = Object.values(moveCoverage);
    const abilitiesList = Object.values(abilityCoverage);

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalMoves: movesList.length,
        passedMoves: movesList.filter(m => m.status === 'PASS').length,
        failedMoves: movesList.filter(m => m.status === 'FAIL').length,
        untestedMoves: movesList.filter(m => m.status === 'UNTESTED').length,
        totalAbilities: abilitiesList.length,
        passedAbilities: abilitiesList.filter(a => a.status === 'PASS').length,
        failedAbilities: abilitiesList.filter(a => a.status === 'FAIL').length,
        untestedAbilities: abilitiesList.filter(a => a.status === 'UNTESTED').length,
      },
      moves: movesList,
      abilities: abilitiesList
    };

    await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

    console.log(styleText('bold', '\n--- 📊 RESUMEN DE COBERTURA ---'));
    console.log(`Movimientos: ${report.summary.passedMoves} PASS / ${report.summary.failedMoves} FAIL / ${report.summary.untestedMoves} UNTESTED`);
    console.log(`Habilidades: ${report.summary.passedAbilities} PASS / ${report.summary.failedAbilities} FAIL / ${report.summary.untestedAbilities} UNTESTED`);
    console.log(styleText('green', `\n💾 Reporte guardado con éxito en: ${REPORT_FILE}`));
  });
});
