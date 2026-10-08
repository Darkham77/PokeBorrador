import type { SaveDataDto } from '@/logic/validation/schemas';

export function sanitizeNumericFields(sanitizedData: SaveDataDto, issues: string[]): void {
  if (sanitizedData.money < 0) {
    sanitizedData.money = 0;
    issues.push('Dinero negativo corregido');
  }
  if (sanitizedData.battleCoins < 0) {
    sanitizedData.battleCoins = 0;
    issues.push('BattleCoins negativos corregidos');
  }
  if (sanitizedData.trainerLevel < 1) {
    sanitizedData.trainerLevel = 1;
    issues.push('Nivel inválido corregido');
  }
}

export function sanitizeInventoryQuantities(inventory: Record<string, number> | undefined, issues: string[]): void {
  if (!inventory) return;
  for (const item of Object.keys(inventory)) {
    const qty = inventory[item];
    if (typeof qty === 'number' && qty < 0) {
      inventory[item] = 0;
      issues.push(`Cantidad negativa de ${item} corregida`);
    }
  }
}

export function filterDuplicateUids(sanitizedData: SaveDataDto): void {
  const finalUids = new Set<string>();
  if (Array.isArray(sanitizedData.team)) {
    sanitizedData.team = sanitizedData.team.filter((p) => {
      if (!p || !p.uid) return true;
      if (finalUids.has(p.uid)) return false;
      finalUids.add(p.uid);
      return true;
    });
  }
  if (Array.isArray(sanitizedData.box)) {
    sanitizedData.box = sanitizedData.box.filter((p) => {
      if (!p || !p.uid) return true;
      if (finalUids.has(p.uid)) return false;
      finalUids.add(p.uid);
      return true;
    });
  }
}

export function parseMarketSoldSeenIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const validIds = (rawIds as (string | number)[])
    .map(id => (id !== null && id !== undefined ? String(id).trim() : ''))
    .filter(id => id.length > 0 && !id.includes('invalid'));
  return [...new Set(validIds)];
}

export function sanitizeMarketSoldIds(data: SaveDataDto): void {
  if (Array.isArray(data.marketSoldSeenIds)) {
    data.marketSoldSeenIds = parseMarketSoldSeenIds(data.marketSoldSeenIds);
  }
}

