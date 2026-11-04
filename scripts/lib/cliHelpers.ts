/**
 * scripts/lib/cliHelpers.ts
 *
 * Centralized Single Source of Truth (SSoT) for parsing and normalizing
 * command-line arguments, unmatched positionals, and key=value syntax.
 */

export interface ParsedCliInput {
  paramMap: ReadonlyMap<string, string>;
  barePositionals: readonly string[];
  hasFlag: (flag: string) => boolean;
  getParam: (key: string, alias?: string) => string | undefined;
}

/**
 * Normalizes unparsed command-line elements from Citty (e.g. args._ or positional arguments)
 * into a typed dictionary and ordered bare positionals list.
 *
 * Supports:
 * - key=value pairs (e.g. `user=Ash`, `server=server_franco`)
 * - bare flags (e.g. `clean`, `all`, `reset`)
 * - bare positional values (e.g. `server_franco`, `case-1234`)
 */
export function parseUnmatchedArgs(rawEntries: unknown): ParsedCliInput {
  const items = Array.isArray(rawEntries)
    ? rawEntries
    : typeof rawEntries === 'string' && rawEntries.trim() !== ''
      ? [rawEntries]
      : [];

  const paramMap = new Map<string, string>();
  const barePositionals: string[] = [];

  for (const element of items) {
    if (typeof element === 'string') {
      const trimmed = element.trim();
      if (!trimmed) continue;

      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex > 0) {
        const key = trimmed.slice(0, delimiterIndex).toLowerCase();
        const value = trimmed.slice(delimiterIndex + 1);
        paramMap.set(key, value);
      } else {
        barePositionals.push(trimmed);
      }
    }
  }

  return {
    paramMap,
    barePositionals,
    hasFlag: (flag: string): boolean => {
      const lowerFlag = flag.toLowerCase();
      if (paramMap.get(lowerFlag) === 'true') {
        return true;
      }
      return barePositionals.some((item) => item.toLowerCase() === lowerFlag);
    },
    getParam: (key: string, alias?: string): string | undefined => {
      const primary = paramMap.get(key.toLowerCase());
      if (primary !== undefined) {
        return primary;
      }
      if (alias) {
        return paramMap.get(alias.toLowerCase());
      }
      return undefined;
    }
  };
}
