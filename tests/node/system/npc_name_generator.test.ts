import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  detectGenderFromSprite,
  generateNpcName,
  MALE_NAMES,
  FEMALE_NAMES
} from '../../../src/logic/utils/npcNameGenerator.ts';

describe('npcNameGenerator', () => {
  it('detects feminine gender correctly from sprite IDs', () => {
    assert.equal(detectGenderFromSprite('nurse'), 'F');
    assert.equal(detectGenderFromSprite('battlegirl-gen6'), 'F');
    assert.equal(detectGenderFromSprite('doctorf-gen8'), 'F');
    assert.equal(detectGenderFromSprite('scientistf'), 'F');
    assert.equal(detectGenderFromSprite('skyla'), 'F');
    assert.equal(detectGenderFromSprite('erika'), 'F');
  });

  it('detects masculine gender correctly from sprite IDs', () => {
    assert.equal(detectGenderFromSprite('blackbelt'), 'M');
    assert.equal(detectGenderFromSprite('hiker-gen3'), 'M');
    assert.equal(detectGenderFromSprite('bugcatcher'), 'M');
    assert.equal(detectGenderFromSprite('oak'), 'M');
    assert.equal(detectGenderFromSprite('gentleman'), 'M');
    assert.equal(detectGenderFromSprite('policeman'), 'M');
  });

  it('formats titles with correct grammatical gender', () => {
    const maleCientifico = generateNpcName({
      spriteId: 'scientist',
      archetype: 'cientifico',
      includeTitle: true
    });
    assert.match(maleCientifico, /^Científico /);

    const femaleCientifico = generateNpcName({
      spriteId: 'scientistf',
      archetype: 'cientifico',
      includeTitle: true
    });
    assert.match(femaleCientifico, /^Científica /);

    const maleNadador = generateNpcName({
      spriteId: 'swimmer',
      archetype: 'nadador',
      gender: 'M',
      includeTitle: true
    });
    assert.match(maleNadador, /^Nadador /);

    const femaleNadador = generateNpcName({
      spriteId: 'swimmerf',
      archetype: 'nadador',
      gender: 'F',
      includeTitle: true
    });
    assert.match(femaleNadador, /^Nadadora /);
  });

  it('generates names from respective male/female pools', () => {
    for (let i = 0; i < 20; i++) {
      const maleName = generateNpcName({ gender: 'M', includeTitle: false });
      assert.ok((MALE_NAMES as readonly string[]).includes(maleName), `Male name ${maleName} should be in MALE_NAMES`);

      const femaleName = generateNpcName({ gender: 'F', includeTitle: false });
      assert.ok((FEMALE_NAMES as readonly string[]).includes(femaleName), `Female name ${femaleName} should be in FEMALE_NAMES`);
    }
  });

  it('ensures statistical diversity across 100 generations', () => {
    const generated = new Set<string>();
    for (let i = 0; i < 100; i++) {
      generated.add(generateNpcName({ spriteId: 'youngster', includeTitle: false }));
    }
    assert.ok(generated.size >= 25, `Expected high diversity, got ${generated.size} unique names out of 100`);
  });
});
