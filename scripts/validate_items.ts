/**
 * ITEM VALIDATOR SCRIPT
 * Validates integrity of SHOP_ITEMS and HEALING_ITEMS across:
 *   - src/data/items.js            -> SHOP_ITEMS[]
 *   - src/logic/items/itemEffects.js -> HEALING_ITEMS{}
 *
 * Usage: node .agents/skills/item-validator/validate_items.js
 */

const fs = require('fs');
const path = require('path');

const SHOP_FILE   = path.resolve(__dirname, '../../../src/data/items.js');
const BATTLE_FILE = path.resolve(__dirname, '../../../src/logic/items/itemEffects.js');

if (!fs.existsSync(SHOP_FILE) || !fs.existsSync(BATTLE_FILE)) {
  console.error(`❌ Required files not found.\n   - ${SHOP_FILE}\n   - ${BATTLE_FILE}`);
  process.exit(1);
}

const shopContent   = fs.readFileSync(SHOP_FILE, 'utf8');
const battleContent = fs.readFileSync(BATTLE_FILE, 'utf8');

// ─── 1. Extract SHOP_ITEMS entries (line-based parser) ───────────────────────
// Strategy: scan lines within SHOP_ITEMS block, group by item entry
const shopLines = shopContent.split('\n');
const shopItems = [];

// Find start of SHOP_ITEMS array
const shopStart = shopLines.findIndex(l => l.includes('SHOP_ITEMS') && l.includes('['));
const shopEnd   = shopLines.length; // scan to end

let current = null;

for (let i = shopStart; i < shopEnd; i++) {
  const line = shopLines[i];

  // Detect new item start: a line with `id:` that's inside an object literal
  const idMatch = line.match(/\bid:\s*'([^']+)'/);
  if (idMatch) {
    if (current && current.name && current.cat) shopItems.push(current);
    current = { id: idMatch[1], _line: i + 1 };
  }

  if (!current) continue;

  const tryMatch = (rx) => { const m = line.match(rx); return m ? m[1] : null; };

  if (!current.name)   current.name   = tryMatch(/\bname:\s*'([^']+)'/);
  if (!current.cat)    current.cat    = tryMatch(/\bcat:\s*'([^']+)'/);
  if (!current.sprite) current.sprite = tryMatch(/\bsprite:\s*'([^']+)'/);
  if (!current.icon)   current.icon   = tryMatch(/\bicon:\s*'([^']+)'/);
  if (!current.desc)   current.desc   = tryMatch(/\bdesc:\s*'([^']+)'/);
  if (!current.type)   current.type   = tryMatch(/\btype:\s*'([^']+)'/);

  const priceM  = line.match(/\bprice:\s*(\d+)/);
  const marketM = line.match(/\bmarket:\s*(true|false)/);
  if (priceM  && current.price  == null) current.price  = parseInt(priceM[1]);
  if (marketM && current.market == null) current.market = marketM[1] === 'true';
}
// Push last item
if (current && current.name && current.cat) shopItems.push(current);

// ─── 2. Extract HEALING_ITEMS keys ───────────────────────────────────────────
const healingItems = new Set();
// Match lines like:  'Nombre': (p) => {   OR   'Nombre': p => {
const healingRegex = /^\s+'([^']+)':\s*\(?(?:p|_)?\)?\s*=>/gm;
let m;
while ((m = healingRegex.exec(battleContent)) !== null) {
  healingItems.add(m[1]);
}

// ─── 3. Extract nonCombat list ────────────────────────────────────────────────
const nonCombatMatch = battleContent.match(/const nonCombat\s*=\s*\[([^\]]+)\]/s);
const nonCombatItems = new Set();
if (nonCombatMatch) {
  for (const e of nonCombatMatch[1].matchAll(/'([^']+)'/g)) {
    nonCombatItems.add(e[1]);
  }
}

// ─── Run validations ──────────────────────────────────────────────────────────
const errors   = [];
const warnings = [];

const MUST_BE_USABLE     = ['pociones', 'utility', 'booster'];
const MUST_NOT_BE_USABLE = ['held', 'pokeballs', 'stones', 'breeding'];
const REQUIRED_FIELDS    = ['id', 'name', 'cat', 'sprite', 'icon', 'desc', 'price'];
const VALID_CATS         = [
  'pociones', 'utility', 'booster', 'especial', 'held', 'pokeballs', 'stones', 'breeding',
  'healing', 'tm', 'special', 'stone'
];
// Items in 'especial' that are SELL-ONLY (not usable, not equippable)
const SELL_ONLY_ESPECIAL = new Set([
  'Pepita', 'Perla', 'Perla Grande', 'Polvo Estelar', 'Trozo Estrella', 'Escama Dragón'
]);

shopItems.forEach(item => {
  const tag = `[${item.name || item.id} (line ~${item._line})]`;

  // 3a. Required fields
  REQUIRED_FIELDS.forEach(f => {
    if (item[f] == null || item[f] === '') {
      errors.push(`${tag} Missing required field: '${f}'`);
    }
  });

  // 3b. Valid category
  if (item.cat && !VALID_CATS.includes(item.cat)) {
    errors.push(`${tag} Unknown category: '${item.cat}'`);
  }

  // 3c. usable categories → must be in HEALING_ITEMS
  if (MUST_BE_USABLE.includes(item.cat) && !healingItems.has(item.name)) {
    const isTmEntry = item.name && item.name.startsWith('MT');
    if (!isTmEntry) {
      errors.push(`${tag} cat='${item.cat}' but '${item.name}' has no entry in HEALING_ITEMS → item cannot be used.`);
    }
  }

  // 3c2. 'especial' items: must be in HEALING_ITEMS OR have type='held' OR be a sell-only item
  //       (MT items with cat='especial' are handled in 3f)
  if (item.cat === 'especial' && !item.name?.startsWith('MT')) {
    const isHeld = item.type === 'held';
    const isUsable = healingItems.has(item.name);
    const isSellOnly = SELL_ONLY_ESPECIAL.has(item.name);
    if (!isHeld && !isUsable && !isSellOnly) {
      warnings.push(`${tag} cat='especial' but item is not in HEALING_ITEMS, not 'type: held', and not a known sell-only item. Is it intentional?`);
    }
  }

  // 3d. held/breeding/stone → must NOT be in HEALING_ITEMS
  if (MUST_NOT_BE_USABLE.includes(item.cat) && healingItems.has(item.name)) {
    errors.push(`${tag} cat='${item.cat}' should NOT be in HEALING_ITEMS.`);
  }

  // 3e. If held → must have type: 'held'
  if (item.cat === 'held' && item.type !== 'held') {
    errors.push(`${tag} cat='held' but missing 'type: held' → won't appear in equip menu (item effects logic).`);
  }

  // 3f. TM entries (MT prefix) should have a matching HEALING_ITEMS entry
  if (item.name && item.name.startsWith('MT')) {
    if (!healingItems.has(item.name)) {
      errors.push(`${tag} TM '${item.name}' has no entry in HEALING_ITEMS → cannot be taught.`);
    }
  }

  // 3g. Sprite URL warning
  if (item.sprite && !item.sprite.startsWith('http')) {
    warnings.push(`${tag} sprite doesn't look like a URL: '${item.sprite.substring(0, 60)}'`);
  }

  // 3h. price=0 warning
  if (item.price === 0 && item.market !== false) {
    warnings.push(`${tag} price=0 but market is not explicitly 'false'. Check if intentional.`);
  }
});

// 3i. HEALING_ITEMS with no SHOP_ITEMS entry → phantom items
const shopItemNames = new Set(shopItems.map(i => i.name));
healingItems.forEach(name => {
  if (name.startsWith('MT')) return; // TMs are validated above
  if (!shopItemNames.has(name)) {
    errors.push(`[PHANTOM] '${name}' is in HEALING_ITEMS but has NO entry in SHOP_ITEMS.`);
  }
});

// ─── Report ───────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════════`);
console.log(`    ITEM INTEGRITY REPORT`);
console.log(`════════════════════════════════════`);
console.log(`📦 SHOP_ITEMS scanned:    ${shopItems.length}`);
console.log(`💊 HEALING_ITEMS scanned: ${healingItems.size}`);
console.log(`════════════════════════════════════\n`);

if (warnings.length) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

if (errors.length) {
  console.log(`❌ ERRORS (${errors.length}):`);
  errors.forEach(e => console.log(`   ${e}`));
  console.log('\nFix these errors before considering items complete.');
  process.exit(1);
} else {
  console.log('✅ All items passed validation! SHOP_ITEMS and HEALING_ITEMS are in sync.');
}
