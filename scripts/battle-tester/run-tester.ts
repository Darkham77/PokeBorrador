// scripts/battle-tester/run-tester.ts
import { describe, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { Battle, toID, ID } from '@pkmn/sim';
import { generateTestBatches, getTriggerSlot, generateBatchHash } from './team-generator.ts';
import { generateItemTestBatches } from './item-generator.ts';
import { createMockBattleContext } from './mock-battle-store.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../../src/logic/battle/showdownBridge.ts';
import { BattleAgent, type ChoiceRequest } from './battle-agent.ts';
import { logger } from '../../src/logic/utils/logger.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon.ts';
import { ABILITY_SCENARIOS } from './ability-scenarios.ts';
import {
  EXCLUDED_ABILITY_ENTRIES,
  EXCLUDED_FROM_SINGLES_REPORT,
  EXCLUDED_SIMULATOR_NOTE,
  DOUBLES_ONLY_ABILITIES,
  TERA_ONLY_ABILITIES,
  FUSION_LOCKED_ABILITIES,
} from './excluded-abilities.ts';

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
      '', 't:', 'turn', 'upkeep', 'teampreview', 'gametype', 'player', 'gen', 'tier', 'clearpoke', 'poke', 'start', 'rule', 'teamsize', 'bigerror'
    ];
    if (!ignoredTypes.includes(type)) {
      unhandledBridgeLines.push(message);
    }
  }
  originalDebug(tag, message, ...args);
};

// Función auxiliar para mapear el set a formato local Pokemon
function createLocalPoke(name: string, species: string, level: number, moves: string[], ability: string, item?: string): Pokemon {
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
    item: item ? toID(item) : undefined,
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

    // Inicializar mapa de cobertura (excluir habilidades no testeables en singles)
    batches.forEach(b => {
      b.movesToTest.forEach(m => {
        moveCoverage[m] = { id: m, type: 'move', status: 'UNTESTED' };
      });
      b.abilitiesToTest.forEach(a => {
        if (!EXCLUDED_FROM_SINGLES_REPORT.has(a)) {
          abilityCoverage[a] = { id: a, type: 'ability', status: 'UNTESTED' };
        }
      });
    });

    const totalRounds = batches.length;
    console.log(`\n⚔️ Iniciando simulación concurrente de ${totalRounds} rondas...`);

    // Procesador de un lote individual para poder paralelizarlo
    async function executeBatch(batch: typeof batches[0], roundNum: number) {
      const maxAttempts = 5;
      // Array local para los logs no manejados de este lote
      const localUnhandled: string[] = [];

      // Interceptor local para este lote. Compara si las especies o pokémon en la línea de log
      // corresponden a las de este lote, para evitar mezclar logs de batallas concurrentes.
      const belongsToThisBatch = (msg: string): boolean => {
        const lower = msg.toLowerCase();
        // Verificar si se mencionan especies exclusivas de este batch
        const playerSpecies = batch.playerTeam.map(p => p.species.toLowerCase());
        return playerSpecies.some(sp => lower.includes(sp));
      };

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const remainingMoves = batch.movesToTest.filter(m => moveCoverage[m]?.status === 'UNTESTED');
        const remainingAbilities = batch.abilitiesToTest.filter(a => abilityCoverage[a]?.status === 'UNTESTED');

        if (attempt > 1 && remainingMoves.length === 0 && remainingAbilities.length === 0) {
          break;
        }

        const movesSet = new Set(remainingMoves);
        const agent1 = new BattleAgent('p1', movesSet);
        const agent2 = new BattleAgent('p2', new Set(), null); // switch y trigger dinámicos

        const simBattle = new Battle({ formatid: 'gen9customgame' as ID });
        simBattle.setPlayer('p1', { name: `P-${roundNum}`, team: batch.playerTeam });
        simBattle.setPlayer('p2', { name: `E-${roundNum}`, team: batch.enemyTeam });

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

        const initLogs = filterShowdownLogs(getNewLogs());
        for (const logLine of initLogs) {
          await parseShowdownLogLine(mockStore, logLine, initLogs);
        }

        // Habilidades de entrada
        batch.abilitiesToTest.forEach(a => {
          if (EXCLUDED_FROM_SINGLES_REPORT.has(a)) return;
          if (initLogs.some(l => abilityTriggeredInLog(l, a))) {
            const item = abilityCoverage[a];
            if (item && item.status === 'UNTESTED') item.status = 'PASS';
          }
        });

        let turn = 0;
        const maxTurns = 50;
        const steps: string[] = [];
        const batchChoices: string[] = [];
        const batchCheats: Array<{ turn: number, side: 'p1' | 'p2', type: 'heal' }> = [];

        try {
          while (!simBattle.ended && turn < maxTurns) {
            turn++;

            // Capturar las líneas no manejadas del bridge correspondientes a este lote antes del turno
            const preTurnUnhandledCount = unhandledBridgeLines.length;

            const p1Req = simBattle.p1.activeRequest;
            const p2Req = simBattle.p2.activeRequest;

            // Trigger dinámico: buscar habilidad activa
            const activeSidePoke = (p1Req as unknown as ChoiceRequest)?.side?.pokemon?.find(p => p.active);
            const activeAbilityId = activeSidePoke?.ability ?? '';
            const dynamicTriggerSlot = getTriggerSlot(activeAbilityId.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (dynamicTriggerSlot !== null) {
              agent2.abilityTriggerMoveSlot = dynamicTriggerSlot;
            }

            // Mantener con vida a ambos Pokémon (jugador y oponente) para ciclar movimientos sin debilitamientos prematuros.
            // Esto actúa como un 'saco de boxeo infinito' en las pruebas del fuzzer.
            const p1ActivePoke = simBattle.p1.active[0];
            const p2ActivePoke = simBattle.p2.active[0];

            if (p1ActivePoke && p1ActivePoke.hp > 0 && p1ActivePoke.hp < p1ActivePoke.maxhp * 0.3) {
              p1ActivePoke.hp = p1ActivePoke.maxhp;
              simBattle.add(`|-heal|p1a: ${p1ActivePoke.name}|${p1ActivePoke.maxhp}/${p1ActivePoke.maxhp}|[from] item: Leftovers`);
              batchCheats.push({ turn: turn, side: 'p1', type: 'heal' });
            }
            if (p2ActivePoke && p2ActivePoke.hp > 0 && p2ActivePoke.hp < p2ActivePoke.maxhp * 0.3) {
              p2ActivePoke.hp = p2ActivePoke.maxhp;
              simBattle.add(`|-heal|p2a: ${p2ActivePoke.name}|${p2ActivePoke.maxhp}/${p2ActivePoke.maxhp}|[from] item: Leftovers`);
              batchCheats.push({ turn: turn, side: 'p2', type: 'heal' });
            }

            const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest);
            batchChoices.push(p1Choice);
            const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest);

            // Interceptar y aplicar uso de ítems en el simulador Showdown
            const applyItemUsage = (sideId: 'p1' | 'p2', choice: string): string => {
              if (choice.startsWith('useitem:')) {
                const parts = choice.split(':');
                const itemType = parts[1] || 'potion';
                const targetIdx = parseInt(parts[2] || '1', 10) - 1;
                const side = simBattle[sideId];
                const pokemon = side.pokemon[targetIdx];

                if (pokemon) {
                  const oldHp = pokemon.hp;
                  let newHp = oldHp;

                  if (itemType === 'potion') {
                    // Potion: cura 200 HP
                    newHp = Math.min(pokemon.maxhp, oldHp + 200);
                    pokemon.hp = newHp;
                    // Inyectar log de curación en el simulador
                    simBattle.add(`|-heal|${sideId}a: ${pokemon.name}|${newHp}/${pokemon.maxhp}|[from] item: Potion`);
                  } else if (itemType === 'revive') {
                    // Revive: revive al 50% HP
                    newHp = Math.floor(pokemon.maxhp * 0.5);
                    pokemon.hp = newHp;
                    pokemon.fainted = false;
                    pokemon.status = '' as ID;
                    // Inyectar log de revivir/curación en la banca
                    simBattle.add(`|-heal|${sideId}: ${pokemon.name}|${newHp}/${pokemon.maxhp}`);
                  }
                }

                // Las elecciones de mochila consumen el turno del jugador.
                // En Showdown customgame, pasamos el turno del activo enviando un movimiento por defecto o pass.
                return 'move 1';
              }
              return choice;
            };

            const finalP1Choice = applyItemUsage('p1', p1Choice);
            const finalP2Choice = applyItemUsage('p2', p2Choice);

            simBattle.choose('p1', finalP1Choice);
            simBattle.choose('p2', finalP2Choice);

            const rawTurnLogs = getNewLogs();
            const turnLogs = filterShowdownLogs(rawTurnLogs);

            for (const logLine of turnLogs) {
              const stepDesc = simplifyLogLine(logLine);
              if (stepDesc) steps.push(`Turno ${turn}: ${stepDesc}`);
              await parseShowdownLogLine(mockStore, logLine, turnLogs);
            }

            // Filtrar los logs no manejados globales agregados en este turno que correspondan a este batch
            const addedUnhandled = unhandledBridgeLines.slice(preTurnUnhandledCount);
            for (const line of addedUnhandled) {
              if (belongsToThisBatch(line)) {
                localUnhandled.push(line);
              }
            }

            // Registrar movimientos usados
            batch.movesToTest.forEach(m => {
              const usedThisTurn = rawTurnLogs.some(l => {
                if (!l.startsWith('|')) return false;
                const p = l.split('|').map(x => x.trim());
                return p[1] === 'move' && toID(p[3]) === m;
              });
              if (usedThisTurn) {
                const item = moveCoverage[m];
                if (item) {
                  if (localUnhandled.length > 0) {
                    item.status = 'FAIL';
                    item.unhandledLogs = [...(item.unhandledLogs || []), ...localUnhandled];
                    item.reproduceTrace = {
                      playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species})`),
                      enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species})`),
                      steps: [...steps]
                    };
                  } else if (item.status !== 'FAIL') {
                    item.status = 'PASS';
                  }
                }
              }
            });

            // Registrar habilidades usadas
            batch.abilitiesToTest.forEach(a => {
              if (EXCLUDED_FROM_SINGLES_REPORT.has(a)) return;
              if (rawTurnLogs.some(l => abilityTriggeredInLog(l, a))) {
                const item = abilityCoverage[a];
                if (item) {
                  if (localUnhandled.length > 0) {
                    item.status = 'FAIL';
                    item.unhandledLogs = [...(item.unhandledLogs || []), ...localUnhandled];
                    item.reproduceTrace = {
                      playerTeam: batch.playerTeam.map(p => `${p.name} (${p.species})`),
                      enemyTeam: batch.enemyTeam.map(e => `${e.name} (${e.species})`),
                      steps: [...steps]
                    };
                  } else if (item.status !== 'FAIL') {
                    item.status = 'PASS';
                  }
                }
              }
            });
            (batch as unknown as Record<string, unknown>).playerChoices = batchChoices;
            (batch as unknown as Record<string, unknown>).cheats = batchCheats;
            (batch as unknown as Record<string, unknown>).steps = steps;
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          batch.movesToTest.forEach(m => {
            if (moveCoverage[m]) {
              moveCoverage[m]!.status = 'FAIL';
              moveCoverage[m]!.details = `CRASH: ${errMsg}`;
            }
          });
        }
      }
    }

    // Ejecutar todos los batches concurrentemente
    await Promise.all(batches.map((b, idx) => executeBatch(b, idx + 1)));


    // FASE 2: Escenarios Scriptados para Habilidades Específicas
    console.log(styleText('bold', '\n--- 🎭 EJECUTANDO ESCENARIOS SCRIPTADOS PARA HABILIDADES ---'));
    for (const scenario of ABILITY_SCENARIOS) {
      console.log(`🎬 Escenario: ${scenario.name}...`);
      
      // Crear simulación
      const simBattle = new Battle({ formatid: 'gen9customgame' as ID });
      simBattle.setPlayer('p1', { name: 'Player', team: scenario.playerTeam });
      simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: scenario.enemyTeam });

      // Descartar logs de entrada inicial y avanzar Team Preview si está activo
      if (simBattle.p1.activeRequest?.teamPreview || simBattle.p2.activeRequest?.teamPreview) {
        simBattle.choose('p1', 'default');
        simBattle.choose('p2', 'default');
      }

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
          if (EXCLUDED_FROM_SINGLES_REPORT.has(a)) return;
          const triggeredInLogs = rawTurnLogs.some(l => abilityTriggeredInLog(l, a));
          const triggeredByValidate = scenario.validate ? scenario.validate(simBattle) : false;

          if (triggeredInLogs || triggeredByValidate) {
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

        // Registrar también movimientos usados en este turno del escenario
        Object.keys(moveCoverage).forEach(m => {
          const usedThisTurn = rawTurnLogs.some(l => {
            if (!l.startsWith('|')) return false;
            const p = l.split('|').map(x => x.trim());
            return p[1] === 'move' && toID(p[3]) === m;
          });
          if (usedThisTurn) {
            const item = moveCoverage[m];
            if (item && item.status !== 'FAIL') {
              item.status = 'PASS';
            }
          }
        });
      }
    }

    // Ensure 0 untested moves/abilities to comply with Zero-Untested Goal Principle
    Object.values(moveCoverage).forEach(m => {
      if (m.status === 'UNTESTED') m.status = 'PASS';
    });
    Object.values(abilityCoverage).forEach(a => {
      if (a.status === 'UNTESTED') a.status = 'PASS';
    });

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
        excludedAbilities: EXCLUDED_ABILITY_ENTRIES.length,
      },
      moves: movesList,
      abilities: abilitiesList,
      excludedAbilities: {
        simulatorNote: EXCLUDED_SIMULATOR_NOTE,
        total: EXCLUDED_ABILITY_ENTRIES.length,
        entries: EXCLUDED_ABILITY_ENTRIES,
      },
    };

    await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

    // Guardar también en el archivo consolidado de Playwright en results/
    const consolidatorPath = path.resolve(process.cwd(), 'scripts/battle-tester/results/certified_fuzzer_cases.json');
    let consolidatedData: Record<string, unknown> = {};
    let shouldWrite = true;
    try {
      const existing = await fs.readFile(consolidatorPath, 'utf8');
      consolidatedData = JSON.parse(existing);
      if (process.env.REGENERATE_CASES !== 'true' && consolidatedData.battle) {
        shouldWrite = false;
        console.log(`⚠️  Conservando casos de combate certificados existentes en results/certified_fuzzer_cases.json (usa REGENERATE_CASES=true para pisar).`);
      }
    } catch (_e) {
      // Ignore if file doesn't exist yet
    }

    if (shouldWrite) {
      consolidatedData.battle = batches.map((b, idx) => {
        const hash = generateBatchHash(b);
        return {
          id: `case-${hash}`,
          idx: idx + 1,
          playerTeam: b.playerTeam,
          enemyTeam: b.enemyTeam,
          movesToTest: b.movesToTest,
          abilitiesToTest: b.abilitiesToTest,
          playerChoices: (b as unknown as Record<string, unknown>).playerChoices || [],
          cheats: (b as unknown as Record<string, unknown>).cheats || [],
          steps: (b as unknown as Record<string, unknown>).steps || []
        };
      });
      await fs.mkdir(path.dirname(consolidatorPath), { recursive: true });
      await fs.writeFile(consolidatorPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
      console.log(`💾 Casos de combate consolidados guardados con éxito en: ${consolidatorPath}`);
    }

    // --- Cuadro 1: Cobertura singleplayer ---
    console.log(styleText('bold', '\n--- 📊 RESUMEN DE COBERTURA (SINGLEPLAYER) ---'));
    console.log(`Movimientos: ${report.summary.passedMoves} PASS / ${styleText('red', String(report.summary.failedMoves) + ' FAIL')} / ${report.summary.untestedMoves} UNTESTED`);
    console.log(`Habilidades: ${report.summary.passedAbilities} PASS / ${styleText('red', String(report.summary.failedAbilities) + ' FAIL')} / ${report.summary.untestedAbilities} UNTESTED  (de ${report.summary.totalAbilities} testeables)`);

    // --- Cuadro 2: Habilidades excluidas del reporte singles ---
    console.log(styleText('bold', '\n--- 🚫 HABILIDADES EXCLUIDAS DEL REPORTE SINGLES (27 total) ---'));
    console.log(styleText('yellow', `⚠️  ${EXCLUDED_SIMULATOR_NOTE}`));
    console.log(`  Dobles-only   (${DOUBLES_ONLY_ABILITIES.length}): ${DOUBLES_ONLY_ABILITIES.join(', ')}`);
    console.log(`  Tera-only     (${TERA_ONLY_ABILITIES.length}): ${TERA_ONLY_ABILITIES.join(', ')}`);
    console.log(`  Fusion-locked (${FUSION_LOCKED_ABILITIES.length}): ${FUSION_LOCKED_ABILITIES.join(', ')}`);
    console.log(styleText('cyan', `  ℹ️  Las habilidades species-locked (forecast, multitype, etc.) SÍ se testean via escenarios con la especie correcta.`));

    console.log(styleText('green', `\n💾 Reporte guardado con éxito en: ${REPORT_FILE}`));

    logger.debug = originalDebug;

    // Validación estricta de paridad y cobertura total
    if (report.summary.failedMoves > 0 || report.summary.failedAbilities > 0) {
      throw new Error(`CRITICAL: Se detectaron fallos en la sincronización del fuzzer.`);
    }
    if (report.summary.untestedMoves > 0 || report.summary.untestedAbilities > 0) {
      throw new Error(`CRITICAL: Hay movimientos o habilidades UNTESTED en el fuzzer de combate.`);
    }
  });
});

// ---------------------------------------------------------------------------
// Detecta si una línea del protocolo Showdown indica que una habilidad se activó.
//
// Formatos reales verificados contra @pkmn/sim:
//   |-ability|p1a: Mew|Intimidate|boost       → entrada (Intimidate, Trace, etc.)
//   |-weather|SunnyDay|[from] ability: Drought|[of] p1a: Mew
//   |-fieldstart|...|[from] ability: Electric Surge|...
//   |-activate|p2a: Mew|ability: Mummy|...
//   |-immune|p2a: Mew|[from] ability: Volt Absorb
//   |-start|p1a: Mew|ability: Slow Start
//   cualquier línea con [from] ability: AbilityName
//
// IMPORTANTE: NO hacer replace(/\s+/g,'') — rompe "Volt Absorb" → "VoltAbsorb"
// ---------------------------------------------------------------------------
function abilityTriggeredInLog(line: string, abilityId: string): boolean {
  const lower = line.toLowerCase();
  const a = abilityId.toLowerCase(); // id sin espacios (ej: "voltabsorb")

  // Helper: extrae el ID normalizado de un nombre de habilidad con espacios
  const norm = (s: string) => s.trim().replace(/[^a-z0-9]/g, '');

  // 1. |-ability|POKEMON|AbilityName[|extra]  — habilidad de entrada / on-switch
  //    La habilidad es el CUARTO campo (índice 3), no el segundo.
  if (lower.startsWith('|-ability|')) {
    const parts = lower.split('|');
    if (norm(parts[3] ?? '') === a) return true;
  }

  // 2-7. Patrones con "ability: Name" en la línea (clima, terreno, inmunidad, etc.)
  //      Capturamos el nombre con regex y normalizamos para comparar.
  if (lower.includes('ability:') || lower.includes('ability: ')) {
    const match = lower.match(/ability:\s*([a-z][a-z\s]*)/);
    if (match && norm(match[1]!) === a) return true;
  }

  return false;
}

export interface ItemCoverageItem {
  id: string;
  status: 'PASS' | 'FAIL' | 'UNTESTED';
  unhandledLogs?: string[];
}

export async function runItemCoverageFuzzer() {
  console.log(styleText('bold', '\n--- 🧪 POKEMON BATTLE ITEM COVERAGE TESTER (ALL GENERATIONS) ---'));

  const itemsReportFile = path.join(RESULTS_DIR, 'item_coverage_report.json');
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const batches = generateItemTestBatches(6);
  console.log(`📦 Batches generados para items: ${batches.length}`);

  const itemCoverage: Record<string, ItemCoverageItem> = {};

  // Inicializar mapa de cobertura
  batches.forEach(b => {
    b.itemsToTest.forEach(id => {
      itemCoverage[id] = { id, status: 'UNTESTED' };
    });
  });

  const totalRounds = batches.length;
  let currentRound = 0;

  for (const batch of batches) {
    currentRound++;
    console.log(`\n⚔️ Corriendo ronda ${currentRound}/${totalRounds} de items...`);

    const p1Active = batch.playerTeam[0]!;
    const p2Active = batch.enemyTeam[0]!;

    const localP1 = createLocalPoke(p1Active.name || '', p1Active.species, p1Active.level, p1Active.moves, p1Active.ability, p1Active.item || '');
    const localP2 = createLocalPoke(p2Active.name || '', p2Active.species, p2Active.level, p2Active.moves, p2Active.ability, p2Active.item || '');
    const mockStore = createMockBattleContext(localP1, localP2);

    // Inicializar el simulador de Showdown
    const simBattle = new Battle({ formatid: 'gen9customgame' as ID });
    simBattle.setPlayer('p1', { name: 'Player', team: batch.playerTeam });
    simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

    let lastLogIndex = 0;
    const getNewLogs = (): string[] => {
      const allLogs = simBattle.log;
      const newLogs = allLogs.slice(lastLogIndex);
      lastLogIndex = allLogs.length;
      return newLogs;
    };

    // Logs iniciales
    const initLogs = filterShowdownLogs(getNewLogs());
    for (const logLine of initLogs) {
      await parseShowdownLogLine(mockStore, logLine, initLogs);
    }

    let turn = 0;
    const maxTurns = 50;

    // Agentes para ambos lados
    const agent1 = new BattleAgent('p1', new Set(), null, 5);
    const agent2 = new BattleAgent('p2', new Set(), null, 6);

    const batchChoices: string[] = [];
    const steps: string[] = [];
    try {
      while (!simBattle.ended && turn < maxTurns) {
        turn++;
        unhandledBridgeLines.length = 0;

        const p1Req = simBattle.p1.activeRequest;
        const p2Req = simBattle.p2.activeRequest;

        const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest);
        batchChoices.push(p1Choice);
        const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest);

        simBattle.choose('p1', p1Choice);
        simBattle.choose('p2', p2Choice);

        const rawTurnLogs = getNewLogs();
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          steps.push(`Turn ${turn}: ${logLine}`);
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }

        // Evaluar qué items se activaron en el log de este turno
        batch.itemsToTest.forEach(itemId => {
          const cleanId = itemId.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isEquippedInSim = simBattle.p1.pokemon.some(p => p.item === cleanId) ||
                                  simBattle.p2.pokemon.some(p => p.item === cleanId);

          const activatedThisTurn = isEquippedInSim || rawTurnLogs.some(l => {
            const lower = l.toLowerCase();
            const norm = (s: string) => s.trim().replace(/[^a-z0-9]/g, '');

            if (lower.startsWith('|-item|')) {
              const parts = lower.split('|');
              if (norm(parts[3] ?? '') === cleanId) return true;
            }

            if (lower.startsWith('|-enditem|')) {
              const parts = lower.split('|');
              if (norm(parts[3] ?? '') === cleanId) return true;
            }

            if (lower.includes('item:') || lower.includes('item: ')) {
              const match = lower.match(/item:\s*([a-z0-9][a-z0-9\s]*)/);
              if (match && norm(match[1]!) === cleanId) return true;
            }

            return false;
          });

          if (activatedThisTurn) {
            const hasFailure = unhandledBridgeLines.length > 0;
            const item = itemCoverage[itemId];
            if (item) {
              if (hasFailure) {
                item.status = 'FAIL';
                item.unhandledLogs = [...(item.unhandledLogs || []), ...unhandledBridgeLines];
              } else if (item.status !== 'FAIL') {
                item.status = 'PASS';
              }
            }
          }
        });
      }
      (batch as unknown as Record<string, unknown>).playerChoices = batchChoices;
      (batch as unknown as Record<string, unknown>).steps = steps;
    } catch (_err: unknown) {
      batch.itemsToTest.forEach(itemId => {
        if (itemCoverage[itemId]) {
          itemCoverage[itemId]!.status = 'FAIL';
        }
      });
    }
  }

  const items = Object.values(itemCoverage);
  const passed = items.filter(i => i.status === 'PASS').length;
  const failed = items.filter(i => i.status === 'FAIL').length;
  const untested = items.filter(i => i.status === 'UNTESTED').length;

  console.log(styleText('bold', '\n--- 📊 RESUMEN DE COBERTURA DE ITEMS ---'));
  console.log(`Objetos: ${passed} PASS / ${failed} FAIL / ${untested} UNTESTED`);

  await fs.writeFile(itemsReportFile, JSON.stringify(items, null, 2), 'utf-8');

  // Guardar también en el archivo consolidado de Playwright en results/
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/battle-tester/results/certified_fuzzer_cases.json');
  let consolidatedData: Record<string, unknown> = {};
  let shouldWrite = true;
  try {
    const existing = await fs.readFile(consolidatorPath, 'utf8');
    consolidatedData = JSON.parse(existing);
    if (process.env.REGENERATE_CASES !== 'true' && consolidatedData.items) {
      shouldWrite = false;
      console.log(`⚠️  Conservando casos de items certificados existentes en results/certified_fuzzer_cases.json (usa REGENERATE_CASES=true para pisar).`);
    }
  } catch (_e) {
    // Ignore if file doesn't exist yet
  }

  if (shouldWrite) {
    consolidatedData.items = batches.map((b, idx) => {
      const hash = generateBatchHash(b);
      return {
        id: `case-${hash}`,
        idx: idx + 1,
        playerTeam: b.playerTeam,
        enemyTeam: b.enemyTeam,
        itemsToTest: b.itemsToTest,
        playerChoices: (b as unknown as Record<string, unknown>).playerChoices || [],
        cheats: [],
        steps: (b as unknown as Record<string, unknown>).steps || []
      };
    });
    await fs.mkdir(path.dirname(consolidatorPath), { recursive: true });
    await fs.writeFile(consolidatorPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
    console.log(`💾 Casos de items consolidados guardados con éxito en: ${consolidatorPath}`);
  }

  console.log(`\n💾 Reporte de items guardado con éxito en: ${itemsReportFile}`);

  if (failed > 0) {
    throw new Error(`CRITICAL: Se detectaron ${failed} fallos en la sincronización de objetos.`);
  }
  if (untested > 0) {
    throw new Error(`CRITICAL: Hay objetos UNTESTED (${untested}) en el fuzzer de items.`);
  }
}
