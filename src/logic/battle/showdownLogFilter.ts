/**
 * src/logic/battle/showdownLogFilter.ts
 *
 * Filtering and branch resolution for Showdown protocol log lines.
 */

function isIgnoredShowdownProtocolLine(line: string): boolean {
  return line.startsWith('|debug|') || line.startsWith('|-hint|') || line === '|-nothing';
}

function resolveSplitLogBranch(
  splitLine: string,
  secretLine: string,
  publicLine: string,
  playerSide: string
): string {
  const parts = splitLine.split('|');
  const side = parts[2];
  return side === playerSide ? secretLine : publicLine;
}

/**
 * Filtra la lista de logs del simulador para evitar procesar líneas duplicadas generadas por |split|.
 */
export function filterShowdownLogs(logs: string[], playerSide: string = 'p1'): string[] {
  const filtered: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (let i = 0; i < logs.length; i++) {
    const line = logs[i] || '';
    if (line.startsWith('|split|')) {
      const chosenLine = resolveSplitLogBranch(line, logs[i + 1] || '', logs[i + 2] || '', playerSide);
      if (chosenLine) filtered.push(chosenLine);
      i += 2;
    } else if (!isIgnoredShowdownProtocolLine(line)) {
      filtered.push(line);
    }
  }
  return filtered;
}
