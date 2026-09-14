/**
 * scripts/auditors/assets/validate_asset_usage.ts
 *
 * ASSET USAGE & ANTI-BYPASS AUDITOR (Node.js 26+ Native)
 * Enforces the Mandatory Centralized Asset Management Mandate:
 * 1. Prohibits static and dynamic hardcoded asset paths (/assets/..., /sprites/..., /public/...) in .vue templates.
 * 2. Prohibits direct bindings of theme/event banner paths without getAssetUrl.
 * 3. Prohibits code in src/components/, src/views/, and src/stores/ from constructing raw asset paths without resolveAsset/getAssetUrl.
 * 4. Prohibits static datasets in src/data/ from storing hardcoded asset URLs instead of canonical IDs.
 * 5. Validates that referenced visual assets (e.g. seasonal tournament banners) physically exist on disk.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/assets/validate_asset_usage.ts
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { BaseAuditor } from '../../lib/auditorBase.ts';

export type AssetUsageRuleId =
  | 'asset-hardcoded-path-template'
  | 'asset-literal-bound-src'
  | 'asset-direct-banner-binding'
  | 'asset-unmediated-logic-path'
  | 'asset-hardcoded-data-path'
  | 'asset-physical-file-missing';

export const ASSET_USAGE_RULES: readonly AssetUsageRuleId[] = [
  'asset-hardcoded-path-template',
  'asset-literal-bound-src',
  'asset-direct-banner-binding',
  'asset-unmediated-logic-path',
  'asset-hardcoded-data-path',
  'asset-physical-file-missing'
];

const EXEMPT_DATA_FILES = new Set([ // runtime-set: Fast O(1) membership lookup set
  'pokemonFeetDatabase.ts',
  'spriteMapping.ts'
]);

const EXEMPT_LOGIC_FILES = new Set([ // runtime-set: Fast O(1) membership lookup set
  'assetService.ts',
  'assetResolver.ts'
]);

export class AssetUsageAuditor extends BaseAuditor<AssetUsageRuleId> {
  private scannedVueFiles = 0;
  private scannedLogicFiles = 0;
  private scannedDataFiles = 0;
  private verifiedAssets = 0;

  constructor() {
    super({
      id: 'validate_asset_usage',
      name: 'Asset Usage & Anti-Bypass Auditor',
      description: 'Rutas de assets cableadas o bypass de getAssetUrl',
      family: 'assets',
      ruleIds: ASSET_USAGE_RULES,
      ruleDescriptions: {
        'asset-hardcoded-path-template': 'Ruta de asset cableada en template Vue',
        'asset-literal-bound-src': 'Atributo :src con ruta literal cableada',
        'asset-direct-banner-binding': 'Binding directo de banner sin getAssetUrl',
        'asset-unmediated-logic-path': 'Ruta de asset construida sin assetService',
        'asset-hardcoded-data-path': 'Ruta de asset en datos en vez de ID canónico',
        'asset-physical-file-missing': 'Archivo de asset no encontrado en disco'
      },
      requiredFiles: [
        path.resolve(process.cwd(), 'src/logic/services/assetService.ts')
      ]
    });
  }

  public override async runAudit(): Promise<void> {
    // 1. Audit Vue Component Templates
    const vueFiles = [
      ...this.context.collectFiles(['src/components'], new Set(['.vue'])),
      ...this.context.collectFiles(['src/views'], new Set(['.vue']))
    ];

    for (const file of vueFiles) {
      this.scannedVueFiles++;
      this.filesScannedCount++;
      const relFile = path.relative(this.projectRoot, file).replace(/\\/g, '/');
      const content = await fs.readFile(file, 'utf-8');

      const templateMatch = content.match(/<template[\s\S]*<\/template>/);
      if (!templateMatch) continue;
      const template = templateMatch[0];

      // Check for static src="/assets/..." or src="/sprites/..." or src="/public/..."
      const staticSrcRegex = /(?:<img|<source|<video)[^>]*\s+src=["']\/(?:assets|sprites|public)\/[^"']+["']/gi;
      let match: RegExpExecArray | null;
      while ((match = staticSrcRegex.exec(template)) !== null) {
        this.addViolation({
          ruleId: 'asset-hardcoded-path-template',
          severity: 'error',
          file: relFile,
          line: 1,
          message: `Hardcoded static asset path in template: '${match[0]}'. Must use getAssetUrl(ASSET_TYPES.<CATEGORY>, id) instead.`,
          context: match[0]
        });
      }

      // Check for :src="'/assets/...'" or :src="'/sprites/...'"
      const literalBoundSrcRegex = /:src=["']'(\/(?:assets|sprites|public)\/[^']+)'["']/gi;
      while ((match = literalBoundSrcRegex.exec(template)) !== null) {
        this.addViolation({
          ruleId: 'asset-literal-bound-src',
          severity: 'error',
          file: relFile,
          line: 1,
          message: `Hardcoded literal asset path in binding: '${match[1]}'. Must use getAssetUrl(ASSET_TYPES.<CATEGORY>, id) instead.`,
          context: match[0]
        });
      }

      // Check for direct banner binding without getAssetUrl
      const rawBannerBindingRegex = /:src=["'](?:currentTheme|resolvedTheme|theme)\.bannerImage["']/gi;
      while ((match = rawBannerBindingRegex.exec(template)) !== null) {
        this.addViolation({
          ruleId: 'asset-direct-banner-binding',
          severity: 'error',
          file: relFile,
          line: 1,
          message: `Direct binding of bannerImage without getAssetUrl: '${match[0]}'. Must wrap with getAssetUrl(ASSET_TYPES.BANNER, ...).`,
          context: match[0]
        });
      }
    }

    // 2. Audit TypeScript Logic in Components, Views, Stores, and Composables
    const logicDirs = ['src/components', 'src/views', 'src/stores', 'src/composables'];
    const tsLogicFiles = this.context.collectFiles(logicDirs, new Set(['.ts']));

    for (const file of tsLogicFiles) {
      const filename = path.basename(file);
      if (EXEMPT_LOGIC_FILES.has(filename)) continue;

      this.scannedLogicFiles++;
      this.filesScannedCount++;
      const relFile = path.relative(this.projectRoot, file).replace(/\\/g, '/');
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.includes('// asset-url-ok') || line.includes('// domain-ok:')) continue;

        if (
          /(?:return|=)\s*[`'"]\/?(?:public\/)?assets\/(?:sprites|ui|maps)/i.test(line) &&
          !line.includes('resolveAsset(') &&
          !line.includes('getAssetUrl(')
        ) {
          this.addViolation({
            ruleId: 'asset-unmediated-logic-path',
            severity: 'error',
            file: relFile,
            line: i + 1,
            message: `Unmediated asset path string construction without getAssetUrl/resolveAsset: ${line.trim()}`,
            context: line.trim()
          });
        }
      }
    }

    // 3. Audit src/data/ for Hardcoded Asset Paths
    const tsDataFiles = this.context.collectFiles(['src/data'], new Set(['.ts']));
    const jsonDataFiles = this.context.collectFiles(['src/data'], new Set(['.json']));

    for (const file of [...tsDataFiles, ...jsonDataFiles]) {
      const filename = path.basename(file);
      if (EXEMPT_DATA_FILES.has(filename)) continue;

      this.scannedDataFiles++;
      this.filesScannedCount++;
      const relFile = path.relative(this.projectRoot, file).replace(/\\/g, '/');
      const content = await fs.readFile(file, 'utf-8');

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.includes('// asset-url-ok') || line.includes('// domain-ok: Asset path URI string')) {
          continue;
        }

        if (/:\s*['"]\/(?:assets|sprites)\/[^'"]+['"]/i.test(line)) {
          this.addViolation({
            ruleId: 'asset-hardcoded-data-path',
            severity: 'error',
            file: relFile,
            line: i + 1,
            message: `Static data stores hardcoded asset path instead of canonical ID: ${line.trim()}`,
            context: line.trim()
          });
        }
      }
    }

    // 4. Physical Asset Existence for Seasonal Tournament Banners
    try {
      const rankedDataFile = path.resolve(this.projectRoot, 'src/data/system/rankedData.ts');
      const rankedContent = await fs.readFile(rankedDataFile, 'utf-8');
      const bannerMatches = rankedContent.matchAll(/bannerImage:\s*['"]([^'"]+)['"]/g);

      const eventsDir = path.resolve(this.projectRoot, 'public/assets/ui/events');

      for (const bMatch of bannerMatches) {
        this.verifiedAssets++;
        const rawBanner = bMatch[1];
        if (!rawBanner) continue;
        const cleanBanner = rawBanner.replace(/^\/?assets\/ui\/events\//, '').replace(/\.webp$/, '');
        const bannerPath = path.join(eventsDir, `${cleanBanner}.webp`);

        if (!existsSync(bannerPath)) {
          this.addViolation({
            ruleId: 'asset-physical-file-missing',
            severity: 'error',
            file: 'src/data/system/rankedData.ts',
            line: 1,
            message: `Physical asset file missing: '${bannerPath}' (referenced in rankedData.ts as '${rawBanner}')`,
            context: rawBanner
          });
        }
      }
    } catch (err) {
      this.context.addWarning(`Could not verify seasonal tournament banners: ${(err as Error).message}`);
    }

    this.context.setMetric('Vue files scanned', this.scannedVueFiles);
    this.context.setMetric('Logic files scanned', this.scannedLogicFiles);
    this.context.setMetric('Data files scanned', this.scannedDataFiles);
    this.context.setMetric('Physical assets verified', this.verifiedAssets);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('validate_asset_usage.ts') || process.argv[1].endsWith('validate_asset_usage.js'))) {
  await BaseAuditor.runCli(new AssetUsageAuditor());
}
