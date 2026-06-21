import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS_EMOJI_MAP,
  STATUS_SHORT_LABEL_MAP,
  STATUS_NAME_MAP,
  STATUS_TOOLTIP_MAP
} from '../../../src/logic/battle/battleUiUtils.ts';

describe('Battle Status UI Mapping Integrity', () => {
  const expectedStatuses = ['brn', 'psn', 'slp', 'par', 'frz', 'tox'];

  it('contains mapping for every expected status in STATUS_EMOJI_MAP', () => {
    expectedStatuses.forEach(status => {
      const emoji = (STATUS_EMOJI_MAP as Record<string, string>)[status];
      assert.ok(emoji, `Missing emoji mapping for status: ${status}`);
    });
  });

  it('contains mapping for every expected status in STATUS_SHORT_LABEL_MAP', () => {
    expectedStatuses.forEach(status => {
      const label = (STATUS_SHORT_LABEL_MAP as Record<string, string>)[status];
      assert.ok(label, `Missing short label mapping for status: ${status}`);
    });
  });

  it('contains mapping for every expected status in STATUS_NAME_MAP', () => {
    expectedStatuses.forEach(status => {
      const name = (STATUS_NAME_MAP as Record<string, string>)[status];
      assert.ok(name, `Missing name mapping for status: ${status}`);
    });
  });

  it('contains mapping for every expected status in STATUS_TOOLTIP_MAP', () => {
    expectedStatuses.forEach(status => {
      const tooltip = (STATUS_TOOLTIP_MAP as Record<string, string>)[status];
      assert.ok(tooltip, `Missing tooltip description for status: ${status}`);
    });
  });
});
