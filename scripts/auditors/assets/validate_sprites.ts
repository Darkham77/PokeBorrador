/**
 * scripts/auditors/assets/validate_sprites.ts
 * 
 * SPRITE INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Scans all 9 generations of Pokémon species to verify their sprite assets exist.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '@francogp/auditor';
import { Dex } from '@pkmn/sim';

enableCompileCache();

const STATIC_SPRITES_DIR = path.resolve(process.cwd(), 'public/assets/sprites/pokemon/static');

const CASTFORM_NATIONAL_DEX_ID_TEXT = '351';

const SPECIAL_FORMS = [
  { id: 'castform', num: CASTFORM_NATIONAL_DEX_ID_TEXT },
  { id: 'castformsunny', num: `${CASTFORM_NATIONAL_DEX_ID_TEXT}_1` },
  { id: 'castformrainy', num: `${CASTFORM_NATIONAL_DEX_ID_TEXT}_2` },
  { id: 'castformsnowy', num: `${CASTFORM_NATIONAL_DEX_ID_TEXT}_3` }
] as const;

export type SpriteRuleId = 'sprite-missing-asset';

export const SPRITE_RULES: readonly SpriteRuleId[] = [
  'sprite-missing-asset'
] as const;

function buildSpritePaths(num: string): Record<string, string> {
  const match = num.match(/^(\d+)(.*)$/);
  const baseNum = match ? match[1] : num;
  const suffix = match ? match[2] : '';
  const animFilename = `${baseNum}i${suffix}.webp`;

  return {
    staticFront: path.join(STATIC_SPRITES_DIR, `${num}.webp`),
    staticFrontShiny: path.join(STATIC_SPRITES_DIR, `shiny/${num}.webp`),
    animatedFront: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Front/${animFilename}`),
    animatedBack: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Back/${animFilename}`),
    animatedFrontShiny: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Front shiny/${animFilename}`),
    animatedBackShiny: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Back shiny/${animFilename}`)
  };
}

async function checkPathsExist(paths: Record<string, string>): Promise<string[]> {
  const missing: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const [key, filePath] of Object.entries(paths)) {
    try {
      await fs.access(filePath);
    } catch { // catch-ok: file does not exist
      missing.push(key);
    }
  }
  return missing;
}

export interface SpriteValidationItem {
  id: string;
  num: string;
}

export class SpriteAuditor extends BaseAuditor<SpriteRuleId> {
  private collectItemsToValidate(): SpriteValidationItem[] {
    const allSpecies = Dex.forGen(9).species.all();
    const checkedNumbers = new Set<string>();
    const itemsToValidate: SpriteValidationItem[] = [];

    for (const species of allSpecies) {
      if (species.num <= 0) continue;
      const numStr = String(species.num);
      if (checkedNumbers.has(numStr)) continue;
      checkedNumbers.add(numStr);

      itemsToValidate.push({ id: species.id, num: numStr });
    }

    for (const form of SPECIAL_FORMS) {
      itemsToValidate.push(form);
    }

    return itemsToValidate;
  }

  private async validateSingleSpriteSet(item: SpriteValidationItem): Promise<boolean> {
    const { id, num } = item;
    const paths = buildSpritePaths(num);
    const missingDetails = await checkPathsExist(paths);

    if (missingDetails.length > 0) {
      this.addViolation({
        ruleId: 'sprite-missing-asset',
        severity: 'warning',
        file: `public/assets/sprites/pokemon/${id}`,
        line: 1,
        message: `[${id}] (Number: ${num}) is missing: ${missingDetails.join(', ')}`,
        context: num
      });
      return false;
    }
    return true;
  }

  constructor() {
    super({
      id: 'validate_sprites',
      configKey: 'assets.sprites',
      defaultConfig: {
        enabled: true
      },
      name: 'Pokemon Sprite Auditor',
      description: 'Sprites faltantes en catálogo de assets de Pokémon',
      icon: '👾',
      family: 'assets',
      packageName: 'Sprites',
      ruleIds: SPRITE_RULES,
      ruleDescriptions: {
        'sprite-missing-asset': 'Sprite no encontrado en Pokémon'
      },
      requiredFiles: [STATIC_SPRITES_DIR],
      coverage: {
        include: ['public/assets/sprites/pokemon/**']
      }
    });
  }

  public override async runAudit(): Promise<void> {
    this.markRuleEvaluated('sprite-missing-asset');

    this.context.logStep(1, 2, 'Collecting unique species across Gen 1-9...');
    const itemsToValidate = this.collectItemsToValidate();

    this.context.logStep(2, 2, `Validating ${itemsToValidate.length} sprite sets...`);

    let missingCount = 0;
    for (const item of itemsToValidate) {
      const isValid = await this.validateSingleSpriteSet(item);
      if (!isValid) missingCount++;
    }

    this.context.setMetric('Total species checked', itemsToValidate.length);
    this.context.setMetric('Complete sprite sets', itemsToValidate.length - missingCount);
    this.context.setMetric('Incomplete sprite sets', missingCount);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SpriteAuditor());
}
