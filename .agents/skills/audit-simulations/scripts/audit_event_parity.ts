import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Utility script to help audit event listener keys and stream handlers in src/
 * against Showdown event outputs.
 */
export function auditShowdownEvents(showdownSimPath: string): string[] {
  const eventsFound: string[] = [];
  try {
    const files = readdirSync(showdownSimPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
      const content = readFileSync(join(showdownSimPath, file), 'utf-8');
      const matches = content.matchAll(/this\.add\(['"]\|([a-z0-9_-]+)/gi);
      for (const match of matches) {
        if (match[1] && !eventsFound.includes(match[1])) {
          eventsFound.push(match[1]);
        }
      }
    }
  } catch (err) {
    console.error('Error auditing Showdown events:', err);
  }
  return eventsFound.sort();
}
