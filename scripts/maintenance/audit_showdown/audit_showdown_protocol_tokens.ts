import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getFilesRecursively } from './audit_helpers.ts';

export interface ProtocolTokenAuditResult {
  unhandledProtocolTokens: string[];
  totalTokensFound: number;
}

/**
 * Script de Auditoría de Parseo de Tokens de Protocolo de Showdown.
 * Escanea dinámicamente todos los tokens de protocolo emitidos por Showdown en external/
 * y audita dinámicamente todos los archivos TypeScript en src/logic/battle para verificar su soporte.
 */
export function auditShowdownProtocolTokens(showdownCodePath: string, bridgePath: string): ProtocolTokenAuditResult {
  const unhandledProtocolTokens: string[] = []; // no-domain: Non-domain utility collection or data structure
  const foundTokens = new Set<string>();

  if (!existsSync(showdownCodePath) || !existsSync(bridgePath)) {
    return { unhandledProtocolTokens, totalTokensFound: 0 };
  }

  // 1. Escanea archivos sim en external/
  let simDir = join(showdownCodePath, 'sim', 'sim');
  if (!existsSync(simDir)) {
    simDir = join(showdownCodePath, 'sim');
  }
  if (existsSync(simDir)) {
    const files = readdirSync(simDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
      const content = readFileSync(join(simDir, file), 'utf-8');
      const matches = content.matchAll(/this\.add\(['"]\|?([a-z0-9_-]+)/gi);
      for (const match of matches) {
        if (match[1] && match[1].length > 1) {
          foundTokens.add(match[1].toLowerCase());
        }
      }
    }
  }

  // 2. Escanea recursivamente TODOS los archivos en la carpeta de lógica de batalla de src/
  const bridgeFiles = getFilesRecursively(bridgePath).filter(f => f.endsWith('.ts'));
  let combinedBridge = '';
  for (const file of bridgeFiles) {
    combinedBridge += `\n${readFileSync(file, 'utf-8').toLowerCase()}`;
  }

  // 3. Comprueba qué tokens no están contemplados en los handlers
  for (const token of foundTokens) {
    if (!combinedBridge.includes(`case '-${token}'`) &&
        !combinedBridge.includes(`case '|${token}'`) &&
        !combinedBridge.includes(`case '${token}'`)) {
      unhandledProtocolTokens.push(token);
    }
  }

  return {
    unhandledProtocolTokens: unhandledProtocolTokens.sort(),
    totalTokensFound: foundTokens.size
  };
}
