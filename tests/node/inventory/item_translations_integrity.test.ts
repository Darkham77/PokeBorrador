/**
 * tests/node/inventory/item_translations_integrity.test.ts
 *
 * Automated regression test asserting that 100% of items in SHOP_ITEMS
 * have Spanish localized names and descriptions with 0 English leak patterns.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { SHOP_ITEMS } from '../../../src/data/inventory/items.ts';

describe('Item Translations & Localization Integrity', () => {
  const FORBIDDEN_DESC_PATTERNS = [
    /\bholder('s)?\b/i,
    /\braises?\b/i,
    /\blowers?\b/i,
    /\bboosts?\b/i,
    /\bincreases?\b/i,
    /\bsingle use\b/i,
    /\battacks?\b/i,
    /\bcannot\b/i,
    /\bheals?\b/i,
    /\bprevents?\b/i,
    /\bused for\b/i,
    /\bevolves?\b/i,
    /\bif held by\b/i,
    /\bgains?\b/i,
    /\baccuracy\b/i,
    /\bhalves\b/i,
    /\bphysical attacks?\b/i,
    /\bspecial attacks?\b/i,
    /\bmoves last\b/i,
    /\bjudgment is\b/i,
    /\bwhen held\b/i,
    /\bis (calculated|raised|lowered)\b/i,
    /\bno competitive use\b/i,
    /\bchanges its forme\b/i,
  ];

  const FORBIDDEN_NAME_PATTERNS = [
    /\b(Berry|Sweet|Plate|Orb|Specs|Vest|Herb|Policy|Drive|Memory|Mirror|Feather|Cap|Incense|Belt|Glasses)\b/i
  ];

  it('all items in SHOP_ITEMS have non-empty Spanish name and desc', () => {
    for (const item of SHOP_ITEMS) {
      assert.ok(item.name && item.name.trim().length > 0, `Item ${item.id} must have a non-empty name`);
      assert.ok(item.desc && item.desc.trim().length > 0, `Item ${item.id} must have a non-empty desc`);
    }
  });

  it('no item in SHOP_ITEMS has English leak patterns in its description', () => {
    const leaks: string[] = [];

    for (const item of SHOP_ITEMS) {
      const desc = item.desc || '';
      for (const pattern of FORBIDDEN_DESC_PATTERNS) {
        if (pattern.test(desc)) {
          leaks.push(`[${item.id}] desc "${desc}" matched English pattern ${pattern}`);
        }
      }
    }

    assert.equal(leaks.length, 0, `Detected English leaks in item descriptions:\n${leaks.join('\n')}`);
  });

  it('no item in SHOP_ITEMS has untranslated English suffixes in its name', () => {
    const leaks: string[] = [];

    for (const item of SHOP_ITEMS) {
      const name = item.name || '';
      for (const pattern of FORBIDDEN_NAME_PATTERNS) {
        if (pattern.test(name)) {
          leaks.push(`[${item.id}] name "${name}" matched English token ${pattern}`);
        }
      }
    }

    assert.equal(leaks.length, 0, `Detected English leaks in item names:\n${leaks.join('\n')}`);
  });
});
