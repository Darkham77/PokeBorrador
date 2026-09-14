/**
 * scripts/auditors/assets/validate_sprites.ts
 * 
 * SPRITE INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Scans all 9 generations of Pokémon species to verify their sprite assets exist.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { Dex } from '@pkmn/sim';

enableCompileCache();

const STATIC_SPRITES_DIR = path.resolve(process.cwd(), 'public/assets/sprites/pokemon/static');

const CASTFORM_NATIONAL_DEX_ID_TEXT = '351';

const SPECIAL_FORMS = [
  { id: 'castform', num: CASTFORM_NATIONAL_DEX_ID_TEXT },
  { id: 'castform-sunny', num: `${CASTFORM_NATIONAL_DEX_ID_TEXT}_1` },
  { id: 'castform-rainy', num: `${CASTFORM_NATIONAL_DEX_ID_TEXT}_2` },
  { id: 'castform-snowy', num: `${CASTFORM_NATIONAL_DEX_ID_TEXT}_3` }
] as const;

export type SpriteRuleId = 'sprite-missing-asset';

export const SPRITE_RULES: readonly SpriteRuleId[] = [
  'sprite-missing-asset'
] as const;

export class SpriteAuditor extends BaseAuditor<SpriteRuleId> {
  constructor() {
    super({
      id: 'validate_sprites',
      name: 'Pokemon Sprite Auditor',
      description: 'Sprites faltantes en catálogo de assets de Pokémon',
      family: 'assets',
      ruleIds: SPRITE_RULES,
      ruleDescriptions: {
        'sprite-missing-asset': 'Sprite no encontrado en assets de Pokémon'
      },
      requiredFiles: [STATIC_SPRITES_DIR]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Collecting unique species across Gen 1-9...');
    const allSpecies = Dex.forGen(9).species.all();
    const checkedNumbers = new Set<string>();
    const itemsToValidate: Array<{ id: string; num: string }> = [];

    for (const species of allSpecies) {
      if (species.num <= 0) continue;
      const numStr = String(species.num);
      if (checkedNumbers.has(numStr)) continue;
      checkedNumbers.add(numStr);

      itemsToValidate.push({
        id: species.id,
        num: numStr
      });
    }

    for (const form of SPECIAL_FORMS) {
      itemsToValidate.push(form);
    }

    this.filesScannedCount = itemsToValidate.length;
    this.context.logStep(2, 2, `Validating ${itemsToValidate.length} sprite sets...`);

    let missingCount = 0;
    for (const item of itemsToValidate) {
      const { id, num } = item;

      const staticPaths = {
        staticFront: path.join(STATIC_SPRITES_DIR, `${num}.webp`),
        staticFrontShiny: path.join(STATIC_SPRITES_DIR, `shiny/${num}.webp`)
      };

      const match = num.match(/^(\d+)(.*)$/);
      const baseNum = match ? match[1] : num;
      const suffix = match ? match[2] : '';
      const animFilename = `${baseNum}i${suffix}.webp`;

      const animatedPaths = {
        animatedFront: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Front/${animFilename}`),
        animatedBack: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Back/${animFilename}`),
        animatedFrontShiny: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Front shiny/${animFilename}`),
        animatedBackShiny: path.join(process.cwd(), `public/assets/sprites/pokemon/animated/Back shiny/${animFilename}`)
      };

      const missingDetails: string[] = [];
      for (const [key, filePath] of Object.entries(staticPaths)) {
        try {
          await fs.access(filePath);
        } catch {
          missingDetails.push(key);
        }
      }

      for (const [key, filePath] of Object.entries(animatedPaths)) {
        try {
          await fs.access(filePath);
        } catch {
          missingDetails.push(key);
        }
      }

      if (missingDetails.length > 0) {
        missingCount++;
        this.addViolation({
          ruleId: 'sprite-missing-asset',
          severity: 'warning',
          file: `public/assets/sprites/pokemon/${id}`,
          line: 1,
          message: `[${id}] (Number: ${num}) is missing: ${missingDetails.join(', ')}`,
          context: num
        });
      }
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
