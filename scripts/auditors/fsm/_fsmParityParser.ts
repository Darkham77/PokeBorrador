import { collectRepositoryFiles } from '@francogp/auditor';

const FSM_SCANNABLE_EXTS = new Set(['.ts', '.vue']);

export function collectFsmFiles(dir: string): string[] {
  return collectRepositoryFiles(dir, process.cwd(), [], FSM_SCANNABLE_EXTS);
}
