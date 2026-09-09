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
import { setupValidation } from '../../lib/validationBase.ts';

const EXEMPT_DATA_FILES = new Set([ // runtime-set: Fast O(1) membership lookup set
  'pokemonFeetDatabase.ts',
  'spriteMapping.ts'
]);

const EXEMPT_LOGIC_FILES = new Set([ // runtime-set: Fast O(1) membership lookup set
  'assetService.ts',
  'assetResolver.ts'
]);

async function getFilesRecursively(dir: string, extension: string): Promise<string[]> {
  const results: string[] = []; // no-domain: Non-domain utility collection or data structure
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await getFilesRecursively(fullPath, extension);
        results.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory might not exist in test setups
  }
  return results;
}

async function main() {
  const validator = setupValidation({
    title: 'ASSET USAGE AUDITOR',
    family: 'assets',
    requiredFiles: [
      path.resolve(process.cwd(), 'src/logic/services/assetService.ts')
    ]
  });

  await validator.checkFiles();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  let scannedVueFiles = 0;
  let scannedLogicFiles = 0;
  let scannedDataFiles = 0;
  let verifiedAssets = 0;

  // 1. Audit Vue Component Templates
  validator.logProgress('Scanning Vue components for raw asset paths and bypasses...');
  const componentsDir = path.resolve(process.cwd(), 'src/components');
  const viewsDir = path.resolve(process.cwd(), 'src/views');

  const vueFiles = [
    ...(await getFilesRecursively(componentsDir, '.vue')),
    ...(await getFilesRecursively(viewsDir, '.vue'))
  ];

  for (const file of vueFiles) {
    scannedVueFiles++;
    const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
    const content = await fs.readFile(file, 'utf-8');

    // Extract template section
    const templateMatch = content.match(/<template[\s\S]*<\/template>/);
    if (!templateMatch) continue;
    const template = templateMatch[0];

    // Check for static src="/assets/..." or src="/sprites/..." or src="/public/..."
    const staticSrcRegex = /(?:<img|<source|<video)[^>]*\s+src=["']\/(?:assets|sprites|public)\/[^"']+["']/gi;
    let match: RegExpExecArray | null;
    while ((match = staticSrcRegex.exec(template)) !== null) {
      const errorMsg = `[${relFile}] Hardcoded static asset path in template: '${match[0]}'. Must use getAssetUrl(ASSET_TYPES.<CATEGORY>, id) instead.`;
      errors.push(errorMsg);
      validator.addError(errorMsg, relFile);
    }

    // Check for :src="'/assets/...'" or :src="'/sprites/...'"
    const literalBoundSrcRegex = /:src=["']'(\/(?:assets|sprites|public)\/[^']+)'["']/gi;
    while ((match = literalBoundSrcRegex.exec(template)) !== null) {
      const errorMsg = `[${relFile}] Hardcoded literal asset path in binding: '${match[1]}'. Must use getAssetUrl(ASSET_TYPES.<CATEGORY>, id) instead.`;
      errors.push(errorMsg);
      validator.addError(errorMsg, relFile);
    }

    // Check for direct banner binding without getAssetUrl (e.g. :src="currentTheme.bannerImage")
    const rawBannerBindingRegex = /:src=["'](?:currentTheme|resolvedTheme|theme)\.bannerImage["']/gi;
    while ((match = rawBannerBindingRegex.exec(template)) !== null) {
      const errorMsg = `[${relFile}] Direct binding of bannerImage without getAssetUrl: '${match[0]}'. Must wrap with getAssetUrl(ASSET_TYPES.BANNER, ...).`;
      errors.push(errorMsg);
      validator.addError(errorMsg, relFile);
    }
  }

  // 2. Audit TypeScript Logic in Components, Views, Stores, and Composables
  validator.logProgress('Scanning TypeScript code for unmediated asset path returns...');
  const logicDirs = [
    path.resolve(process.cwd(), 'src/components'),
    path.resolve(process.cwd(), 'src/views'),
    path.resolve(process.cwd(), 'src/stores'),
    path.resolve(process.cwd(), 'src/composables')
  ];

  const tsLogicFiles: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const dir of logicDirs) {
    const files = await getFilesRecursively(dir, '.ts');
    tsLogicFiles.push(...files);
  }

  for (const file of tsLogicFiles) {
    const filename = path.basename(file);
    if (EXEMPT_LOGIC_FILES.has(filename)) continue;

    scannedLogicFiles++;
    const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.includes('// asset-url-ok') || line.includes('// domain-ok:')) continue;

      // Detect unmediated returns or assignments of asset paths:
      // e.g. return `/public/assets/...` or return `/assets/...` or = `/assets/...` without resolveAsset or getAssetUrl
      if (
        /(?:return|=)\s*[`'"]\/?(?:public\/)?assets\/(?:sprites|ui|maps)/i.test(line) &&
        !line.includes('resolveAsset(') &&
        !line.includes('getAssetUrl(')
      ) {
        const errorMsg = `[${relFile}:${i + 1}] Unmediated asset path string construction without getAssetUrl/resolveAsset: ${line.trim()}`;
        errors.push(errorMsg);
        validator.addError(errorMsg, relFile, i + 1);
      }
    }
  }

  // 3. Audit src/data/ for Hardcoded Asset Paths
  validator.logProgress('Scanning src/data/ for hardcoded asset paths...');
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const tsDataFiles = await getFilesRecursively(dataDir, '.ts');
  const jsonDataFiles = await getFilesRecursively(dataDir, '.json');

  for (const file of [...tsDataFiles, ...jsonDataFiles]) {
    const filename = path.basename(file);
    if (EXEMPT_DATA_FILES.has(filename)) continue;

    scannedDataFiles++;
    const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
    const content = await fs.readFile(file, 'utf-8');

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.includes('// asset-url-ok') || line.includes('// domain-ok: Asset path URI string')) {
        continue;
      }

      if (/:\s*['"]\/(?:assets|sprites)\/[^'"]+['"]/i.test(line)) {
        const errorMsg = `[${relFile}:${i + 1}] Static data stores hardcoded asset path instead of canonical ID: ${line.trim()}`;
        errors.push(errorMsg);
        validator.addError(errorMsg, relFile, i + 1);
      }
    }
  }

  // 4. Physical Asset Existence for Seasonal Tournament Banners
  validator.logProgress('Verifying physical existence of seasonal tournament banners...');
  try {
    const rankedDataFile = path.resolve(process.cwd(), 'src/data/system/rankedData.ts');
    const rankedContent = await fs.readFile(rankedDataFile, 'utf-8');
    const bannerMatches = rankedContent.matchAll(/bannerImage:\s*['"]([^'"]+)['"]/g);

    const eventsDir = path.resolve(process.cwd(), 'public/assets/ui/events');

    for (const bMatch of bannerMatches) {
      verifiedAssets++;
      const rawBanner = bMatch[1];
      if (!rawBanner) continue;
      const cleanBanner = rawBanner.replace(/^\/?assets\/ui\/events\//, '').replace(/\.webp$/, '');
      const bannerPath = path.join(eventsDir, `${cleanBanner}.webp`);

      if (!existsSync(bannerPath)) {
        const errorMsg = `Physical asset file missing: '${bannerPath}' (referenced in rankedData.ts as '${rawBanner}')`;
        errors.push(errorMsg);
        validator.addError(errorMsg, 'src/data/system/rankedData.ts');
      }
    }
  } catch (err) {
    warnings.push(`Could not verify seasonal tournament banners: ${(err as Error).message}`);
  }

  await validator.finish(
    {
      'Vue files scanned': scannedVueFiles,
      'Logic files scanned': scannedLogicFiles,
      'Data files scanned': scannedDataFiles,
      'Physical assets verified': verifiedAssets,
      'Asset violations detected': errors.length
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(`💥 Fatal Error in validate_asset_usage: ${(err as Error).message}`);
  process.exit(1);
});
