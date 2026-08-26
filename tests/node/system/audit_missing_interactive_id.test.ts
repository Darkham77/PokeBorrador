import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { missingInteractiveId } from '@/../scripts/maintenance/audit_rules.ts';

function auditSnippet(templateContent: string, filePath = '/src/components/MyComponent.vue'): boolean[] {
  missingInteractiveId.regex.lastIndex = 0;
  const violations: boolean[] = [];
  let match: RegExpExecArray | null;
  while ((match = missingInteractiveId.regex.exec(templateContent)) !== null) {
    if (missingInteractiveId.check?.(templateContent, match, filePath)) {
      violations.push(true);
    }
  }
  return violations;
}

describe('Auditor: Interactive UI Elements Missing ID Detector', () => {
  it('detects single-line and multi-line buttons without ID', () => {
    const singleLineButton = '<template><button class="btn-primary" @click="doAction">Click</button></template>';
    const violations1 = auditSnippet(singleLineButton);
    assert.strictEqual(violations1.length, 1);

    const multiLineButton = `<template>
      <button
        class="retro-btn action"
        :disabled="isLoading"
        @click.stop="handleClick"
      >
        Action
      </button>
    </template>`;
    const violations2 = auditSnippet(multiLineButton);
    assert.strictEqual(violations2.length, 1);
  });

  it('allows buttons and interactive elements with explicit id, :id, or v-bind:id', () => {
    const staticIdButton = '<template><button id="save-btn" class="btn" @click="save">Save</button></template>';
    const violations1 = auditSnippet(staticIdButton);
    assert.strictEqual(violations1.length, 0);

    const dynamicIdButton = `<template>
      <button
        :id="'select-mon-' + pokemon.uid"
        class="mon-item"
        @click="select"
      >
        Select
      </button>
    </template>`;
    const violations2 = auditSnippet(dynamicIdButton);
    assert.strictEqual(violations2.length, 0);
  });

  it('detects interactive inputs, selects, textareas, and click handlers on divs without ID', () => {
    const inputWithoutId = '<template><input type="text" class="input-field" v-model="name" /></template>';
    const violations1 = auditSnippet(inputWithoutId);
    assert.strictEqual(violations1.length, 1);

    const selectWithoutId = '<template><select class="custom-select"><option>A</option></select></template>';
    const violations2 = auditSnippet(selectWithoutId);
    assert.strictEqual(violations2.length, 1);

    const divWithClickWithoutId = '<template><div class="clickable-card" @click="openCard">Content</div></template>';
    const violations3 = auditSnippet(divWithClickWithoutId);
    assert.strictEqual(violations3.length, 1);

    const divWithClickWithId = '<template><div id="card-item-1" class="clickable-card" @click="openCard">Content</div></template>';
    const violations4 = auditSnippet(divWithClickWithId);
    assert.strictEqual(violations4.length, 0);
  });

  it('supports escape hatch id-ok when explicitly marked', () => {
    const exemptedButton = '<template><button class="exempted" @click="doMagic" id-ok>Click</button></template>';
    const violations = auditSnippet(exemptedButton);
    assert.strictEqual(violations.length, 0);
  });
});
