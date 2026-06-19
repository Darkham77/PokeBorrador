export interface ArchaeologyWeights {
  fossil: number;
  stone: number;
  common: number;
  rare: number;
}

export function calculateArchaeologyWeights(pickaxeType: string | null, brushType: string | null): ArchaeologyWeights {
  const categoryWeights = {
    fossil: 45,
    stone: 25,
    common: 20,
    rare: 10
  };

  if (pickaxeType === 'good' || pickaxeType === 'super') {
    const budget = pickaxeType === 'good' ? 500 : 1000;
    const affected = [
      { key: 'rare', base: 10 },
      { key: 'common', base: 20 },
      { key: 'stone', base: 25 }
    ];
    let remaining = budget;
    for (let i = 0; i < affected.length; i++) {
      const item = affected[i]!;
      let added = 0;
      if (i === affected.length - 1) {
        added = remaining;
      } else {
        added = Math.round(remaining * 0.5);
      }
      categoryWeights[item.key as 'rare' | 'common' | 'stone'] += added;
      remaining -= added;
    }
  }

  if (brushType === 'good' || brushType === 'super') {
    const budget = brushType === 'good' ? 500 : 1000;
    categoryWeights.fossil += budget;
  }

  return categoryWeights;
}
