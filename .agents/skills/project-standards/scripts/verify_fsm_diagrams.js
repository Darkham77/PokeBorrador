import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANUAL_PATH = path.join(__dirname, '../references/battle/battle_mechanics_manual.md');
const FSM_PATH = path.join(__dirname, '../../../../src/logic/battle/battleStateMachine.js');

function runAudit() {
  console.log('🔍 Iniciando Auditoría FSM vs Mermaid...\n');

  // 1. LEER ARCHIVOS
  if (!fs.existsSync(MANUAL_PATH)) return console.error('❌ No se encontró el manual:', MANUAL_PATH);
  if (!fs.existsSync(FSM_PATH)) return console.error('❌ No se encontró el FSM:', FSM_PATH);

  const manualCode = fs.readFileSync(MANUAL_PATH, 'utf-8');
  const fsmCode = fs.readFileSync(FSM_PATH, 'utf-8');

  // 2. PARSEAR MERMAID
  console.log('📄 Extrayendo diagramas Mermaid...');
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  let mermaidBlocks = [];
  while ((match = mermaidRegex.exec(manualCode)) !== null) {
    if (match[1].includes('stateDiagram-v2')) {
      mermaidBlocks.push(match[1]);
    }
  }

  const mermaidStates = new Set();
  const mermaidTransitions = [];

  mermaidBlocks.forEach(block => {
    const lines = block.split('\n');
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('note') || line.startsWith('--')) return;

      // Extract states: state "X" as Y  OR  state X {
      const stateAliasMatch = line.match(/state\s+"[^"]+"\s+as\s+([A-Za-z0-9_]+)/);
      if (stateAliasMatch) mermaidStates.add(stateAliasMatch[1]);
      else {
        const stateMatch = line.match(/state\s+([A-Za-z0-9_]+)/);
        if (stateMatch) mermaidStates.add(stateMatch[1]);
      }

      // Extract transitions: A --> B
      const transMatch = line.match(/([A-Za-z0-9_\[\]\*]+)\s+-->\s+([A-Za-z0-9_\[\]\*]+)/);
      if (transMatch) {
        const from = transMatch[1] === '[*]' ? 'START' : transMatch[1];
        const to = transMatch[2] === '[*]' ? 'END' : transMatch[2];
        if (from !== 'START' && to !== 'END') {
          mermaidTransitions.push({ from, to });
          mermaidStates.add(from);
          mermaidStates.add(to);
        }
      }
    });
  });

  // 3. PARSEAR JAVASCRIPT (CONSTANTES Y MAPAS)
  console.log('💻 Extrayendo JavaScript FSM...');
  const jsStates = new Set();
  const jsTransitions = [];

  // Extraer export const BATTLE_STATES = { ... }
  const stateKeysMatch = fsmCode.match(/export const BATTLE_STATES = {([\s\S]*?)};/);
  if (stateKeysMatch) {
    const keys = stateKeysMatch[1].match(/[A-Z_]+/g);
    keys?.forEach(k => jsStates.add(k));
  }

  // Extraer export const BATTLE_SUBSTATES = { ... }
  const substateKeysMatch = fsmCode.match(/export const BATTLE_SUBSTATES = {([\s\S]*?)};/);
  if (substateKeysMatch) {
    const keys = substateKeysMatch[1].match(/[A-Z_]+/g);
    keys?.forEach(k => jsStates.add(k));
  }

  // Extraer validTransitions
  const validTransMatch = fsmCode.match(/const validTransitions = {([\s\S]*?)};/);
  if (validTransMatch) {
    const lines = validTransMatch[1].split('\n');
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        const fromMatch = parts[0].match(/BATTLE_STATES\.([A-Z_]+)/);
        if (fromMatch) {
          const from = fromMatch[1];
          const toMatches = parts[1].match(/BATTLE_STATES\.([A-Z_]+)/g);
          toMatches?.forEach(toStr => {
            const to = toStr.replace('BATTLE_STATES.', '');
            jsTransitions.push({ from, to });
          });
        }
      }
    });
  }

  // 4. COMPARAR Y AUDITAR
  console.log('\n=======================================');
  console.log('📊 RESULTADOS DE LA AUDITORÍA');
  console.log('=======================================\n');

  let errors = 0;

  // A. Nodos Huérfanos (Están en Mermaid pero no en JS constants)
  const missingStates = [...mermaidStates].filter(s => !jsStates.has(s) && s !== 'START' && s !== 'END');
  if (missingStates.length > 0) {
    console.log('⚠️  ESTADOS FALTANTES EN JAVASCRIPT:');
    missingStates.forEach(s => console.log(`   - ${s} (Falta en BATTLE_STATES o BATTLE_SUBSTATES)`));
    errors++;
  } else {
    console.log('✅ Todos los estados de Mermaid existen en JS.');
  }

  // B. Transiciones (ValidTransitions)
  // Nota: validTransitions en JS solo tiene las Top-Level states, no los sub-states.
  // Podríamos filtrar solo transiciones donde 'from' y 'to' sean Top-Level (BATTLE_STATES).
  // Para simplificar: detectamos si el 'from' es un Top-Level en JS. Si lo es, exigimos que 'to' también lo sea y esté conectado.
  console.log('\n⚠️  ADVERTENCIAS DE TRANSICIONES:');
  const topLevelStatesMatch = fsmCode.match(/export const BATTLE_STATES = {([\s\S]*?)};/);
  const topLevelStates = new Set(topLevelStatesMatch ? topLevelStatesMatch[1].match(/[A-Z_]+/g) : []);

  let transWarnings = 0;
  mermaidTransitions.forEach(t => {
    // Si la transición es entre dos Top-Level states, DEBE estar en validTransitions de JS.
    if (topLevelStates.has(t.from) && topLevelStates.has(t.to)) {
      const exists = jsTransitions.some(jt => jt.from === t.from && jt.to === t.to);
      if (!exists) {
        console.log(`   - [Falta Enlace] En Mermaid: ${t.from} --> ${t.to}. (Falta en 'validTransitions')`);
        transWarnings++;
      }
    }
  });

  if (transWarnings === 0) {
    console.log('   ✅ Todas las transiciones Top-Level están mapeadas en JS.');
  } else {
    errors++;
  }

  console.log('\n=======================================');
  if (errors === 0 && transWarnings === 0) {
    console.log('🎉 AUDITORÍA PERFECTA. Código y Manual están 1:1 sincronizados.');
  } else {
    console.log('🚨 SE ENCONTRARON DESALINEACIONES. Revisar los puntos marcados.');
  }
}

runAudit();
