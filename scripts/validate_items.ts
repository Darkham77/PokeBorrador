/**
 * scripts/validate_items.ts
 * 
 * ITEM VALIDATOR SCRIPT (Node.js 26+)
 * Validates integrity of SHOP_ITEMS and HEALING_ITEMS across:
 *   - src/data/items.js            -> SHOP_ITEMS[]
 *   - src/logic/items/itemEffects.js -> HEALING_ITEMS{}
 *
 * Usage: npm run validate:items
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Runtime permission check
if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Este script requiere permisos de lectura. Ejecútalo con --permission --allow-fs-read=.\n'));
  process.exit(1);
}

const SHOP_FILE   = path.resolve(process.cwd(), 'src/data/items.ts');
const BATTLE_FILE = path.resolve(process.cwd(), 'src/logic/items/itemEffects.ts');

interface ShopItem {
  id: string;
  _line: number;
  name?: string | null;
  cat?: string | null;
  sprite?: string | null;
  icon?: string | null;
  desc?: string | null;
  type?: string | null;
  price?: number | null;
  market?: boolean | null;
  [key: string]: unknown;
}

async function main() {
  console.log(styleText('bold', '\n--- 🛡️  ITEM INTEGRITY VALIDATOR ---'));

  try {
    await fs.access(SHOP_FILE);
    await fs.access(BATTLE_FILE);
  } catch {
    console.error(styleText('red', `❌ Required files not found.\n   - ${SHOP_FILE}\n   - ${BATTLE_FILE}`));
    process.exit(1);
  }

  const shopContent   = await fs.readFile(SHOP_FILE, 'utf8');
  const battleContent = await fs.readFile(BATTLE_FILE, 'utf8');

  // ─── 1. Extract SHOP_ITEMS entries (line-based parser) ───────────────────────
  const shopLines = shopContent.split('\n');
  const shopItems: ShopItem[] = [];
  const shopStart = shopLines.findIndex(l => l.includes('export const SHOP_ITEMS'));
  const shopEnd   = shopLines.length;

  let current: ShopItem | null = null;

  for (let i = shopStart; i < shopEnd; i++) {
    const line = shopLines[i]!;
    const idMatch = line.match(/\bid:\s*'([^']+)'/);
    if (idMatch) {
      if (current && current.name && current.cat) shopItems.push(current);
      current = { id: idMatch[1]!, _line: i + 1 };
    }

    if (!current) continue;

    const tryMatch = (rx: RegExp) => { const m = line.match(rx); return m ? m[1] : null; };

    if (!current.name)   current.name   = tryMatch(/\bname:\s*'([^']+)'/);
    if (!current.cat)    current.cat    = tryMatch(/\bcat:\s*'([^']+)'/);
    if (!current.sprite) current.sprite = tryMatch(/\bsprite:\s*'([^']+)'/);
    if (!current.icon)   current.icon   = tryMatch(/\bicon:\s*'([^']+)'/);
    if (!current.desc)   current.desc   = tryMatch(/\bdesc:\s*'([^']+)'/);
    if (!current.type)   current.type   = tryMatch(/\btype:\s*'([^']+)'/);

    const priceM  = line.match(/\bprice:\s*(\d+)/);
    const marketM = line.match(/\bmarket:\s*(true|false)/);
    if (priceM  && current.price  == null) current.price  = parseInt(priceM[1]!);
    if (marketM && current.market == null) current.market = marketM[1] === 'true';
  }
  if (current && current.name && current.cat) shopItems.push(current);

  // ─── 2. Extract HEALING_ITEMS keys ───────────────────────────────────────────
  const healingItems = new Set<string>();
  const healingRegex = /^\s+'([^']+)':\s*\(?[\s\S]*?\)?\s*=>/gm;
  let m;
  while ((m = healingRegex.exec(battleContent)) !== null) {
    healingItems.add(m[1]!);
  }

  // ─── Run validations ──────────────────────────────────────────────────────────
  const errors: string[]   = [];
  const warnings: string[] = [];

  const MUST_BE_USABLE     = ['pociones', 'utility', 'booster', 'stones'];
  const MUST_NOT_BE_USABLE = ['held', 'pokeballs', 'breeding'];
  const REQUIRED_FIELDS    = ['id', 'name', 'cat', 'sprite', 'icon', 'desc', 'price'];
  const VALID_CATS         = [
    'pociones', 'utility', 'booster', 'especial', 'held', 'pokeballs', 'stones', 'breeding',
    'healing', 'tm', 'special', 'stone'
  ];

  shopItems.forEach(item => {
    const tag = `[${item.name || item.id} (line ~${item._line})]`;

    REQUIRED_FIELDS.forEach(f => {
      const val = item[f];
      if (val == null || val === '') {
        errors.push(`${tag} Missing required field: '${f}'`);
      }
    });

    if (item.cat && !VALID_CATS.includes(item.cat)) {
      errors.push(`${tag} Unknown category: '${item.cat}'`);
    }

    if (item.cat && MUST_BE_USABLE.includes(item.cat) && item.name && !healingItems.has(item.name)) {
      if (!item.name.startsWith('MT')) {
        errors.push(`${tag} cat='${item.cat}' but '${item.name}' has no entry in HEALING_ITEMS.`);
      }
    }

    if (item.cat && MUST_NOT_BE_USABLE.includes(item.cat) && item.name && healingItems.has(item.name)) {
      // 'Restaurador de Vigor' (vigor_restorer) is a breeding item that is explicitly usable to restore vigor
      if (item.id !== 'vigor_restorer') {
        errors.push(`${tag} cat='${item.cat}' should NOT be in HEALING_ITEMS.`);
      }
    }

    if (item.cat === 'held' && item.type !== 'held') {
      errors.push(`${tag} cat='held' but missing 'type: held'.`);
    }

    // TMs are handled dynamically in getDynamicItemEffect, so they don't need to be in the main object
    if (item.name?.startsWith('MT')) return;
  });
  
  const shopItemNames = new Set(shopItems.map(i => i.name));

  healingItems.forEach(name => {
    if (name.startsWith('MT')) return;
    if (!shopItemNames.has(name)) {
      warnings.push(`[PHANTOM] '${name}' is in HEALING_ITEMS but has NO entry in SHOP_ITEMS.`);
    }
  });

  console.log(`\n════════════════════════════════════`);
  console.log(`    ITEM INTEGRITY REPORT`);
  console.log(`════════════════════════════════════`);
  console.log(`📦 SHOP_ITEMS scanned:    ${shopItems.length}`);
  console.log(`💊 HEALING_ITEMS scanned: ${healingItems.size}`);
  console.log(`════════════════════════════════════\n`);

  if (warnings.length) {
    console.log(styleText('yellow', `⚠️  WARNINGS (${warnings.length}):`));
    warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  if (errors.length) {
    console.log(styleText('red', `❌ ERRORS (${errors.length}):`));
    errors.forEach(e => console.log(`   ${e}`));
    console.log('\n' + styleText('red', 'Fix these errors before considering items complete.'));
    process.exit(1);
  } else {
    console.log(styleText('green', '✅ All items passed validation! SHOP_ITEMS and HEALING_ITEMS are in sync.'));
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${err.message}`));
  process.exit(1);
});
